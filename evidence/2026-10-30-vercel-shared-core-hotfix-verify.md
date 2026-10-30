# 2026-10-30 Vercel 生产构建失败事故：根因定位、hotfix 与生产级复验

> 性质：生产故障事故记录 + 修复验证（非故障实验）。触发：用户报告「vercel 部署出现故障了，main 主分支出现故障了」。
> 事故档案（方法论层）：`.agents/skills/fix-bug/record-bug-fix-memory/2026-10-30-vercel-shared-core-incremental-no-emit.md`。

## 1. 故障现象与第一失败门

| 项                 | 实测值                                                                          |
| ------------------ | ------------------------------------------------------------------------------- |
| 受影响部署         | Vercel docs Project `prj_nRhiR3d9kkcWp8U9prKNUh5cHdt1`                          |
| 失败部署 ID        | `dpl_NmhoQN68qKhTC9pz5FragviFiFgj`（SHA `c26c887`）                             |
| 部署状态           | `state=ERROR`，`errorCode=invalid_packagejson`，`errorStep=buildStep`           |
| 同 SHA 的 api 部署 | READY（故障域锁定在 docs 构建链）                                               |
| 构建日志首个错误行 | `[commonjs--resolver] Failed to resolve entry for package "@repro/shared-core"` |
| 伴随警告           | `WARNING no output files found for task @repro/shared-core#build`               |

**第一失败门**：G1 install ✅ → G2 dependency tree ✅ → G3 prepare ✅ → **G4 docs build ❌ `invalid_packagejson`** → G5 部署未发生。

## 2. 决定性对比（同平台、同仓库，仅缓存状态不同）

| 部署               | SHA       | turbo 结果                                                 | 结论                               |
| ------------------ | --------- | ---------------------------------------------------------- | ---------------------------------- |
| 上次成功 `d452ea1` | `d452ea1` | `Time: 928ms >>> FULL TURBO` / `Cached: 3 cached, 3 total` | 全缓存命中，**从未执行 tsc**       |
| 本次失败 `c26c887` | `c26c887` | `Cached: 0 cached, 3 total`                                | 远程缓存失效，**首次真实执行 tsc** |

→ 缺陷不是「新引入的代码改动」，而是**一直存在、只在缓存失效时才被执行**的构建不幂等。

## 3. 隔离探针实证（S1/S2/S3，工作树零污染）

在 TEMP 副本中复现（复制包到临时目录，不改仓库）：

| 探针  | 条件                           | `tsc` 退出码 | 产物 emit       | 判定         |
| ----- | ------------------------------ | ------------ | --------------- | ------------ |
| S1    | 全新构建（无 tsbuildinfo）     | 0            | ✅ 4 文件       | 正常         |
| S2    | 陈旧 tsbuildinfo + dist 缺失   | **0**        | ❌ 零 emit      | **复现故障** |
| S3    | typecheck 污染后再 build       | **0**        | ❌ 零 emit      | **复现故障** |
| FIX-A | `--incremental false` 连续两次 | 0            | ✅ 每次完整产出 | 修复有效     |

## 4. 根因

`packages/shared-core/tsconfig.json` 同时设置 `incremental: true` 与 `tsBuildInfoFile: ./node_modules/.cache/tsconfig.tsbuildinfo`：

- TypeScript 增量模式下，**tsbuildinfo 存在即认为已最新** → `exit 0` 且**零 emit**（哪怕 `dist/` 已缺失）；
- Vercel 跨构建**还原 `node_modules/.cache/`** → 陈旧 tsbuildinfo 存活 → shared-core 无 `dist/`；
- docs 的 vite 解析 `@repro/shared-core` 的 `main`/`exports`（`./dist/index.js`）失败 → `commonjs--resolver` 报错 → `invalid_packagejson`。

**放大器**：tsbuildinfo 位于 `node_modules/.cache/`，被 Vercel 视为可还原缓存；tsconfig 根因 + 缓存还原 = 仅 Vercel 触发。

**结构性假阴性**：CI（runner 全新 checkout，无陈旧缓存）、Cloudflare Workers Builds（不还原 `node_modules/.cache/`）、本地全新构建**全绿** —— 故「其余平台绿」不能作为排除依据。

## 5. 有效修复（职责分离，不动 tsconfig 的 incremental）

`packages/shared-core/tsconfig.json` 的 `incremental` 保留 —— 它服务 tsserver/IDE 内存优化（来源见 `docs/reports/2026-10-17-init-skills-audit-and-apply.md` §3.1）；构建层用 CLI 覆盖实现幂等：

- `packages/shared-core/package.json`：`build` → `tsc -p tsconfig.json --incremental false`；`typecheck` → `tsc -p tsconfig.json --noEmit --incremental false`
- 根 `package.json` `clean`：补 `packages/**/node_modules/.cache` → `pnpm clean` 真正等价于冷构建

共享包仅 1 个源文件，关增量零性能代价。改动 scripts 同时使 turbo task hash 变化（旧 `b72bf9cba8629655` → 新 `4af19887ba66d90b`），旧的「成功但无产物」缓存条目自动失效。

### 提交（main，hotfix 直提不合入实验分支）

| 提交      | 内容                                                                          |
| --------- | ----------------------------------------------------------------------------- |
| `cfb8dd5` | 🐞 fix(shared-core): build 幂等化——tsc 显式关闭增量，杜绝「exit 0 但零 emit」 |
| `e35e315` | 🔧 config: clean 脚本补全 tsbuildinfo 缓存目录                                |
| `f211d3a` | 📃 docs: 沉淀 Vercel 构建失败事故档案 + 订正 Cloudflare 部署机制注释          |

## 6. 修复后部署与生产级复验

### 6.1 部署矩阵（`f211d3a`）

| 平台              | 目标                                    | 结果                                                 | 部署/构建 ID                                                                                   |
| ----------------- | --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Vercel            | docs Project                            | ● **READY**（`readyState=READY`，`aliasError=null`） | `dpl_H47KSPigrfP32j7R1dkJzK92UE66`                                                             |
| Vercel            | api Project                             | ● **READY**                                          | `dpl_61g3w4YZLTUg6WuLMtVr5xVMaZno`                                                             |
| CF Workers Builds | docs worker                             | build_outcome **success**                            | build `1f81cefe-91bf-4e92-9c23-5101b3f53543`（version `96c05775-ac8c-437f-bb99-85dec86fcc2c`） |
| CF Workers Builds | api worker                              | build_outcome **success**                            | build `3914336d-e920-45e7-8825-89d7d4228cfd`（version `2b311393-94ff-47a5-b4e1-c9134c067958`） |
| GitHub Actions    | 静态契约与依赖探针                      | success                                              | run `41004686401`                                                                              |
| GitHub Actions    | Windows 解析、prepare 与独立 API        | success                                              | 同上                                                                                           |
| GitHub Actions    | **Linux 完整生产构建与 artifact smoke** | success                                              | 同上                                                                                           |

### 6.2 构建日志全文核验（`vercel inspect --logs`，75,226 字符）

| 断言                               | 实测                                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `no output files` 出现次数         | **0**（原故障冒烟枪消失）                                                                                                    |
| `Failed to resolve entry` 出现次数 | **0**                                                                                                                        |
| `Tasks:`                           | `3 successful, 3 total`                                                                                                      |
| `Cached:`                          | `1 cached, 3 total`                                                                                                          |
| shared-core task                   | `@repro/shared-core:build: cache hit, replaying logs 4af19887ba66d90b` → 实际执行 `tsc -p tsconfig.json --incremental false` |
| docs build                         | `Server built in 35185ms` → `Prerendered 9 routes in 26.805 seconds` → `Nuxt Nitro server built` → `✨ Build complete!`      |
| 日志中 `error` 字样                | 12 处全部为 Nuxt 静态 chunk 名（`error-404-*.css/mjs`、`error-500-*.css/mjs`），**无真实错误**                               |

**远端 turbo 缓存条目健康性**（原未实证项）：shared-core 本次为 **cache hit**，且该缓存条目还原出了可用产物并驱动下游 vite 解析成功 → 新 hash 对应的远端缓存条目**健康**，不是「成功但无产物」的坏条目。

### 6.3 HTTP 响应体内容断言（Vercel 生产，F47 纪律：不只看 200）

| 断言                                                                                             | 结果                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docs `/` HTTP 200 + `<title>生产级复现实验室 - shadcn-docs-nuxt 生产复现实验室</title>`          | ✅ 真实内容                                                                                                                                             |
| docs `/guide/baseline/` HTTP 200 + `<title>绿色控制组 - shadcn-docs-nuxt 生产复现实验室</title>` | ✅ 真实内容                                                                                                                                             |
| docs `/api/_content/query/index.md`                                                              | ✅ 200 + **真实 JSON**（3 条 markdown：`/guide/baseline`、`/guide/failure-domains`、`/`，含 `workspace-runtime-probe` 组件节点与 `nuxt 3.21.2` 版本串） |
| api `/v1/health`                                                                                 | ✅ `{"ok":true,"service":"independent-nitro3-api","timestamp":"2026-10-30T04:51:54.154Z"}`                                                              |
| api `/v1/runtime`                                                                                | ✅ `{"descriptor":{"application":"api","runtime":"nitro","generation":"nitro3-h3v2"},"node":"v22.23.4","platform":"linux"}`                             |
| 404 shell 标记（`Page not found` / `__nuxt_error` / `error-404`）                                | 0 命中（首页与子页均无）                                                                                                                                |
| **F47 第二层（运行时）**：`/api/_content/cache.json`                                             | ❌ **200 + HTML 404 shell**（`<title>404 - …</title>`）                                                                                                 |
| **F47 第二层（运行时）**：`/api/_content/search?q=绿色`                                          | ❌ **200 + HTML 404 shell**，无「绿色控制组」命中                                                                                                       |

**F47 分层结论**：构建期问题已修复；运行时第二层假阳性（`cache.json` / `search` 返回 200 + 404 shell）在 Vercel 生产**复现且与 10-16 基线一致**，属**既有缺陷、非本次回归**，仍登记于 `failure-catalog.md:328` / `FINDINGS #9`。

### 6.4 运行时错误与遗留清理

- `get_runtime_errors`（48h 窗口）：docs / api 两项目 **No runtime errors found**。
- 探针隔离目录 `dist.pre-fix` / `dist.local-fix` 已移出仓库至 `C:\Users\pc\AppData\Local\Temp\pua-quarantine-20261030-123735\`（`.gitignore` 规则 `dist` 不匹配 `dist.pre-fix`，留在仓内会污染 `git status`）。
- 端口 3399 / 3401 / 3402 全部释放；`node_modules.stale-*` 无残留；`.pnpm` 目录数 **1209**（正常 ~1210），`apps/docs/node_modules/nuxt/bin/nuxt.mjs` ✓、`packages/shared-core/node_modules/typescript/bin/tsc` ✓。
- `cleanup-agent-team-node-processes` dry-run：`CandidateCount=0`、`WorkBuddyPoolCandidateCount=0`；唯一 WorkBuddy prewarm 池为 `blocked`（子树监听端口，受保护）。收窄 IncludePattern（`shadcn-docs-nuxt-production-repro|pua-quarantine|nuxt|nitro|turbo|shared-core`）复核后唯一命中项是审计命令自身的 PowerShell（`self-or-parent-chain` 受保护）→ **本 run 无孤儿进程残留**。

## 7. 遗留与后续约束（未在本轮修复）

1. **F47 第二层假阳性**：`/api/_content/cache.json` 与 `/api/_content/search` 200 + 404 shell；`probes/artifact-smoke.ts` 只断言 `response.ok`、从不做响应体检查 → CI 证据强度不足。建议单独立项。
2. **CI 防回归缺口**：`pnpm build:fresh` = `turbo run build --concurrency=1 --force`，`--force` 只强制重跑 task、**不清 tsbuildinfo**，且 runner 全新 checkout 无陈旧缓存 → 该类缺陷在 CI 中**结构性不可见**。建议在契约测试中断言 shared-core build script 含 `--incremental false`（改 `tests/` 需 gate）。
3. **远端 turbo 旧缓存条目**：旧 hash `b72bf9cba8629655` 是否仍留存未直接验证；因 hash 已变不再命中，无实际影响。

## 8. 结论（结论 ≤ 证据）

1. 本次 Vercel 生产失败的根因是**仓库内构建不幂等**（`packages/shared-core` 增量 tsc 的「exit 0 零 emit」），**不是** Vercel 平台配置问题——CF / CI / 本地全绿属结构性假阴性，已用 §2 对比与 §3 隔离探针双重实证。
2. 修复方案为**构建层职责分离**（CLI `--incremental false`），保留 tsconfig 的 `incremental` 供 tsserver/IDE 使用；共享包仅 1 源文件，性能代价为零。
3. 修复后 `f211d3a` 在 Vercel 双 Project、CF 双 Worker、CI 五条 check-run 全部成功；Vercel 构建日志 `no output files` 与 `Failed to resolve entry` 归零；生产响应体内容断言（首页 / 子页 / content query / api health / api runtime）全部命中真实内容。
4. F47 运行时第二层假阳性在生产复现且与基线一致，**属既有缺陷、未修复**，已连同 CI 防回归缺口一并登记为后续立项项。
