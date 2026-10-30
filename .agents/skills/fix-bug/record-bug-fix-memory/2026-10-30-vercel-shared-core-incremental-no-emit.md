# 2026-10-30 Vercel 生产构建失败：TypeScript 增量缓存导致 tsc 零 emit

> 本案例是本仓 `record-bug-fix-memory` 的**首个**事故记录（索引见 SKILL.md §13）。

## 1. 问题现象

main 推送后，Vercel 生产项目 `shadcn-docs-nuxt-production-repro-docs` 部署失败：

- deployment `dpl_NmhoQN68qKhTC9pz5FragviFiFgj`，`state=ERROR`，`errorStep=buildStep`
- `errorCode=invalid_packagejson`
- `errorMessage=Command "turbo run build --filter=@repro/docs..." exited with 1`
- 构建日志首个错误行：
  `@repro/docs:build: ■ Nuxt build error: Error: [commonjs--resolver] Failed to resolve entry for package "@repro/shared-core".`
- 伴随警告：`WARNING no output files found for task @repro/shared-core#build`

**同一次故障的横切面**（这是定位的关键）：

| 环境                                                                      | 结果                      |
| ------------------------------------------------------------------------- | ------------------------- |
| Vercel docs 项目                                                          | ❌ ERROR                  |
| Vercel api 项目（同 SHA）                                                 | ✅ READY                  |
| Cloudflare docs/api 两个 Worker Builds（同 SHA）                          | ✅ success                |
| GitHub CI run #105（同 SHA，含 `pnpm build:fresh` + 4 路 artifact smoke） | ✅ 全绿                   |
| 本机 Windows 构建                                                         | ✅ 全绿（`dist/` 一直在） |

**只有 Vercel docs 一个环境红**——这个横切面是本次定位的起点，也是最大的误导源。

## 2. 实际根因

`packages/shared-core/tsconfig.json` 配了：

```json
"incremental": true,
"tsBuildInfoFile": "./node_modules/.cache/tsconfig.tsbuildinfo"
```

**TypeScript 在 incremental 模式下，只要 tsbuildinfo 存在且判定 up-to-date，`tsc` 会 `exit 0` 但不 emit 任何输出文件**——哪怕输出文件已经缺失。

隔离探针实测（复制 shared-core 到临时目录，零污染工作树）：

```text
S1 全新构建（无 tsbuildinfo、无 dist）        → dist = index.js/index.d.ts/index.js.map/index.d.ts.map   ✅
S2 tsbuildinfo 存在 + dist 缺失（= Vercel）   → dist = <NO DIST>，tsc exit=0 零 emit                      ❌ 复现故障
S3 typecheck(--noEmit) 污染后再构建            → dist = <NO DIST>，tsc exit=0 零 emit                      ❌
FIX-A `tsc -p tsconfig.json --incremental false` → dist 完整产出，连续两次均产出                             ✅
```

**完整因果链**：

1. `packages/shared-core/tsconfig.json` 的 `incremental` + `tsBuildInfoFile` 落点在 **`node_modules/.cache/`**——Vercel 构建缓存的默认命中目录，**跨构建存活**。
2. 陈旧 tsbuildinfo 存活 → tsc 判定 up-to-date → **exit 0 零 emit** → `packages/shared-core/dist/` 不存在。
3. turbo 报 `no output files found for task @repro/shared-core#build`（**只是 warning，task 仍计为成功**）。
4. `@repro/docs` 的 vite 按 `package.json` 的 `main`/`exports`（`./dist/index.js`）解析 `@repro/shared-core` → 入口不存在 → `[commonjs--resolver] Failed to resolve entry` → build exit 1。

**放大器：turbo 远程缓存**。上一批生产部署（`d452ea1`）是：

```text
Time: 928ms >>> FULL TURBO      Cached: 3 cached, 3 total
```

shared-core 的 `dist/**` 由 turbo 缓存还原，**tsc 从未执行过**。13 天后 turbo 远程缓存失效（`Cached: 0 cached, 3 total`），才第一次真实执行 tsc，暴露了这个潜伏 13 天的缺陷。

**为什么只有 Vercel 红**：只有 Vercel 会跨构建还原 `node_modules/.cache/`。CI runner 全新 checkout、Cloudflare Workers Builds 不还原该目录——两者结构性地踩不到这个坑。

## 3. 关键误导点

1. **`errorCode=invalid_packagejson` 是误导。** Vercel 依据构建日志的首个错误行做分类，与 `package.json` 解析无关。真实错误是 commonjs resolver 找不到包入口。**拿 errorCode 当根因会跑偏整整一条路。**
2. **"同一 commit 的 api / CF / CI 都绿 ⇒ 不是代码问题" 是最大的误导。** 这三个环境之所以绿，是因为它们**不还原陈旧 tsbuildinfo**；本地绿是因为 `dist/` 一直在。**根因在仓库代码（构建不幂等），Vercel 只是唯一会触发它的平台。** 环境差异是**症状**，不是**病因**。
3. **CI 全绿是结构性假阴性。** CI 的 `pnpm build:fresh` = `turbo run build --concurrency=1 --force`——`--force` 只强制重跑 task，**不清 tsbuildinfo**；而 CI runner 全新 checkout，本就没有陈旧 tsbuildinfo。该缺陷在 CI 里**不可见**。
4. **本地全绿是假阴性。** `pnpm clean` 删了 `packages/**/dist`，**却没删 `packages/**/node_modules/.cache`**——陈旧 tsbuildinfo 活下来了。所以本地要 `pnpm clean` 后再 build 才可能现形（前提是 dist 确实缺失）。
5. **13 天前预警被放过。** `docs/reports/2026-10-17-init-skills-audit-and-apply.md` §4 验证证据里写着「**turbo outputs WARNING 为既有提示非失败**」——那个 WARNING 就是本次故障的先兆；且同一份报告的验证**只跑了 `tsc --noEmit`（typecheck），从未验证过 emit build**。
6. **turbo 的 "no output files found" 是 warning 不是 error。** turbo 仍把该 task 计为成功并**可以上传缓存**——一次「成功但无产物」的构建可能被缓存并长期复用。

## 4. 有效修复

`packages/shared-core/package.json`：

```diff
-    "build": "tsc -p tsconfig.json",
-    "typecheck": "tsc -p tsconfig.json --noEmit",
+    "build": "tsc -p tsconfig.json --incremental false",
+    "typecheck": "tsc -p tsconfig.json --noEmit --incremental false",
```

要点：

- **build 层无条件完整 emit**，对任何来源的陈旧 tsbuildinfo 完全免疫。
- shared-core 只有 1 个源文件（`src/index.ts`），关掉增量**零性能代价**。
- `tsconfig.json` 的 `incremental` / `tsBuildInfoFile` **保留不动**——那是给 tsserver/IDE 内存优化用的（来源见 2026-10-17 init-tsconfig 报告 §3.1），构建层用 CLI 覆盖即可，两层职责不混。
- `typecheck` 同步关增量，避免 `--noEmit` 状态写进 tsbuildinfo 污染 build 路径。
- 改 scripts 会改变 turbo task hash → 旧的「空产物」缓存自动失效。

## 5. 验证方式

**生产等价验证**（精确复现 Vercel 故障条件：tsbuildinfo 存在 + dist 缺失）：

```powershell
Test-Path packages\shared-core\node_modules\.cache\tsconfig.tsbuildinfo   # True（陈旧状态就位）
Rename-Item packages\shared-core\dist packages\shared-core\dist.pre-fix   # 隔离 dist，不删除
pnpm turbo run build --filter=@repro/docs...
```

结果：

```text
BUILD_EXIT_CODE=0
packages/shared-core/dist/index.js       存在（452 B，构建时刻新鲜）
packages/shared-core/dist/index.d.ts     存在
apps/docs/.output/server/index.mjs       存在
tsbuildinfo：14410 B / mtime 2026-10-17 21:09:35 —— 构建前后完全未被读写（免疫性实证）
```

**契约门**：`pnpm test:contracts` → `# tests 12 / # pass 12 / # fail 0`（exit 0）。

**部署验收**：`git push` 触发新部署 → Vercel docs 部署转 `READY` → 构建日志中 shared-core task **无** `no output files found` 警告 → 生产运行时做**响应体内容断言**（F47 纪律：200 假阳性存在，不可只看状态码）。

## 6. 后续约束

- **凡以 `tsc` 产出运行时产物的包，build 脚本必须带 `--incremental false`。** 增量缓存的价值在 IDE/tsserver，不在 CI 构建；`tsc` 一旦被当作产物生成器，增量就是负债。
- **判断「生产构建故障是代码问题还是平台问题」必须先取构建日志的首个 error 行**（Vercel：`npx vercel inspect <dpl> --logs`；本仓可用 Vercel MCP `list_deployment_events`）。**不得拿 errorCode 分类、不得拿「同 commit 其他环境绿」当结论。**
- **验收生产部署必须做响应体内容断言**，不能只看 HTTP 200（F47/F18 的 200 假阳性是本仓长期存在的陷阱）。
- **turbo 缓存会掩盖「成功但无产物」的构建**：`no output files found for task ...` 这条 warning 必须按错误处理，不得记为「既有提示」。
- **CI 的 fresh 构建不等于冷构建**：`--force` 只重跑 task，不清理 tsbuildinfo / 陈旧缓存。需要在 CI 暴露此类缺陷，得让 CI 具备与生产同构的缓存状态。
- **`pnpm clean` 的语义必须与「干净」一致**：删产物就要连同 `packages/**/node_modules/.cache` 一起删，否则本地复现路径会被自身残留堵死。
