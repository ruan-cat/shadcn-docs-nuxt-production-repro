# 2026-10-30 F47 第二层「HTTP 200 假阳性」修复证据

> 触发：`main` 生产部署故障排查中发现的**第二层假阳性**（构建期故障已于 2026-10-30 hotfix 修复，见 `evidence/2026-10-30-vercel-shared-core-hotfix-verify.md`）
> 事故档案（方法论层）：`.agents/skills/fix-bug/record-bug-fix-memory/2026-10-30-f47-content-api-false-positive.md`
> 台账：`docs/task-artifacts/failure-catalog.md`（F29 / F47）、`docs/task-artifacts/acceptance-gates.md`（G4）、`docs/task-artifacts/experiments/FINDINGS.md`（#9 / #19）

## 1. 第一失败门

生产响应体断言命中 F47 签名（`https://shadcn-docs-nuxt-production-repro-docs.vc.ruan-cat.com`）：

| URL                             | status  | Content-Type                | bytes  | 响应体特征                                             |
| ------------------------------- | ------- | --------------------------- | ------ | ------------------------------------------------------ |
| `/api/_content/cache.json`      | **200** | `text/html;charset=utf-8`   | 100448 | `<title>404 - shadcn-docs-nuxt 生产复现实验室</title>` |
| `/api/_content/search`          | **200** | `text/html;charset=utf-8`   | 100436 | 同上                                                   |
| `/api/_content/query/index.md`  | 200     | `application/json`          | 9745   | 真实 JSON（3 篇文档）                                  |
| `/api/_content/cache.<ts>.json` | 200     | `application/json`          | 10025  | 真实 JSON（`contents` 键）                             |
| `/api/_content/search-<ts>`     | 200     | `text/plain; charset=utf-8` | 4956   | 真实 JSON（`documentIds` 键）                          |

→ **带指纹路由完全正常，canonical 路径却 200**。这一条同时否定了「serverless 下 content DB 初始化失败 → handler 崩溃」的旧假设。

## 2. 根因（三线对齐）

### 2.1 模块源码

`node_modules/@ztl-uwu/nuxt-content/dist/module.mjs`：

```js
:207  const buildIntegrity = nuxt.options.dev ? void 0 : Date.now();
:238  route: nuxt.options.dev ? `${base}/cache.json` : `${base}/cache.${buildIntegrity}.json`
:243  route: nuxt.options.dev ? `${base}/search`     : `${base}/search-${buildIntegrity}`
:257  nitroConfig.prerender.routes.unshift(`${base}/cache.${buildIntegrity}.json`)
```

→ **canonical 路径是 dev-only**，生产构建里 `/api/_content/cache.json` 与 `/api/_content/search` **不是路由**。

### 2.2 产物路由表（`apps/docs/.output/server/chunks/_/nitro.mjs` handlers 数组）

修复后实测（16 条 handlers）：

```plain
9935→  { route: '/api/_content/**',                                    handler: _lazy_mWA5so }   ← 本次新增守卫
9941→  { route: '/api/_content/query/:qid/**:params',                   handler: _SUhlj6 }
9942→  { route: '/api/_content/query/:qid',                             handler: _SUhlj6 }
9943→  { route: '/api/_content/query',                                  handler: _SUhlj6 }
9944→  { route: '/api/_content/cache.1793338053454.json',                handler: _DSDzhp }
9945→  { route: '/api/_content/search-1793338053454',                    handler: _77rsGm }
9946→  { route: '/api/_content/navigation/:qid/**:params',               handler: _9FPAn3 }
9947→  { route: '/api/_content/navigation/:qid',                         handler: _9FPAn3 }
9948→  { route: '/api/_content/navigation',                              handler: _9FPAn3 }
9950→  { route: '/**',                                                   handler: _lazy_nDXe66 }   ← 页面 catch-all
```

**没有** `/api/_content/cache.json`、**没有** `/api/_content/search`。

### 2.3 上游 layer 的 200 掩码

`node_modules/.pnpm/shadcn-docs-nuxt@1.1.9_*/node_modules/shadcn-docs-nuxt/pages/[...slug].vue`（100 行）在 `!page?.body` 时**内联渲染 404 文案但不抛 `createError`**（layer 内 `setResponseStatus|createError|showError|statusCode` 零命中）→ 渲染成功即 **HTTP 200**。

假阳性链条：
`未匹配路径` → catch-all `/**` → Nuxt renderer → layer `pages/[...slug].vue` → 内联 404 UI → **HTTP 200 + HTML shell**。**handler 从未被调用，不存在崩溃。**

### 2.4 优先级判定依据

Nitro 用 **radix3 路由树**（`radix3@1.1.2`，与产物 `nitro.mjs:658-709` 字节一致）：逐段先试**静态子节点** → 再试**参数子节点** → 最后才回退**通配子节点**，回退时取**最深**的通配节点。

- `/api/_content/cache.<ts>.json` → 第 3 段命中静态子节点 → cache handler，**不经过守卫**；
- `/api/_content/query/index.md` → 第 3 段静态 `query` → 第 4 段参数 `:qid` → query handler，**不经过守卫**；
- `/api/_content/cache.json` → 第 3 段无静态/参数子节点 → 回退到 `/api/_content/**`（比 `/**` 更深）→ 守卫 → 404。

## 3. 修复

### 3.1 守卫：`apps/docs/server/api/_content/[...].ts` + `apps/docs/server/api/_content/index.ts`（新增）

`[...].ts` 注册 `/api/_content/**` 兜底路由，未注册的 Content API 路径抛 `createError({ statusCode: 404 })`。

- 用 Nitro **自动导入**的 `defineEventHandler` / `createError`（**不显式 `from "h3"`**），保证解析到 Nitro 内置的**同一代 h3**，规避仓库已知的 h3 v1/v2 世代串味。产物已证：`import { c as defineEventHandler, e as createError } from '../../../_/nitro.mjs'`。
- `index.ts` 补**零段裸前缀**：radix3 的 `/**` 要求前缀后**至少一段**，所以 `/api/_content` 与 `/api/_content/` 这两个零段前缀不会命中 `[...].ts`，仍会落到页面 catch-all → 又一次 200 + HTML shell。`index.ts` 把它们映射到 `/api/_content`，实测两者均已 404 + JSON。
- 作用域限定 `/api/_content*`，**不动页面 catch-all**（见 §6 遗留项）。

### 3.2 探针：`probes/content-smoke.ts`（原地重写）

| 维度     | 旧版                                                  | 新版                                                                                                        |
| -------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| URL      | 硬编码 dev-only `/api/_content/cache.json` / `search` | 运行时从产物发现真实路由                                                                                    |
| 断言     | `response.ok \|\| text.length === 0`                  | 200 + 非 `text/html` + `JSON.parse` + `_path`/`title`/`documentIds` 精确匹配                                |
| 反向断言 | 无                                                    | canonical 路径必须 **404** 且响应体非 HTML shell                                                            |
| 路由来源 | 无                                                    | `--route` > 产物路由表扫描 > `REPRO_CONTENT_ROUTES`；三者皆无 → **exit 1 说明原因，绝不静默通过**           |
| 指纹     | —                                                     | 源码内零写死（10 位以上数字字面量扫描为空），指纹运行时读 `runtimeConfig.public.content.integrity` / 路由表 |

`:qid` 与 `**:params` 的具体值**全部运行时派生**（qid 取 `/api/_content/query` 返回文档的 `_id` 去掉 `content:` 前缀并把 `:` 换成 `/`，取第一个返回 200 + 非 HTML 的候选；`**:params` 按 content v2.13.9 的 `encodeQueryParams` 同款 base64url 编码，`where` 必须是**数组**形式——对象形式会让 navigation handler 抛 500）。

### 3.3 CI`.github/workflows/ci.yaml`

`linux-production` job 原两条 dev-only URL 的 `probe:artifact` step（只断言 `response.ok`，对 404 shell **恒绿**）替换为一条 `pnpm probe:content apps/docs/.output/server/index.mjs`。其它 job / step / 顺序未动。

### 3.4 CI 防回归断言：`tests/build-idempotency.test.mjs`（新增）

断言 `packages/shared-core/package.json` 的 `scripts.build` 含 `--incremental false`、`scripts.typecheck` 含 `--incremental false`、`scripts.build` 调用 `tsc`。契约测试 **12/12 → 13/13**。

## 4. 本机验证（node-server standalone，端口 3413）

### 4.1 冷构建（前台，6 次串行，全部 exit 0）

全部为 `pnpm turbo run build --filter=@repro/docs... --force`，每次 `Cached: 0 cached, 3 total`（**非 cache hit**）：

| #   | 执行者   | 阶段                       | 耗时               | exit |
| --- | -------- | -------------------------- | ------------------ | ---- |
| 1   | worker   | V1 带守卫                  | 3m4.934s（184.9s） | 0    |
| 2   | worker   | V4.2 守卫隔离              | 3m9.308s（189.3s） | 0    |
| 3   | worker   | V4.3 守卫恢复              | 3m0.493s（180.5s） | 0    |
| 4   | 独立复核 | 反向黑盒（无守卫）         | 159.6s             | 0    |
| 5   | 独立复核 | 恢复守卫                   | 160.9s             | 0    |
| 6   | 主代理   | 补裸前缀守卫（`index.ts`） | 151.2s             | 0    |

> 工具前台 timeout 上限 300s，实测 151.2s–189.3s，**无 exit 124、无 timeout 假象**。
> 构建日志出现 `.output/server/chunks/routes/api/_content/_..._.mjs` → 守卫被 Nitro 文件路由扫描器收录。
> 产物路由表（最终构建）实测含 **10 条** `/api/_content*` 路由：守卫 `/api/_content/**` + 守卫 `/api/_content` + 8 条真实 content 路由。

### 4.2 运行态矩阵（修复后，指纹 1793338053454）

| URL                                        | status  | Content-Type         | bytes   | 判定                                                             |
| ------------------------------------------ | ------- | -------------------- | ------- | ---------------------------------------------------------------- |
| `/`                                        | 200     | text/html            | 107206  | ✅ title「生产级复现实验室」                                     |
| `/guide/baseline/`                         | 200     | text/html            | 120716  | ✅ title「绿色控制组」                                           |
| `/api/_content/query`                      | 200     | application/json     | 9745    | ✅ `_path` 集合 = `{/guide/baseline, /guide/failure-domains, /}` |
| `/api/_content/query/index.md`             | 200     | application/json     | 9745    | ✅ 同上                                                          |
| `/api/_content/query/index.md/<base64url>` | 200     | application/json     | 5486    | ✅ 过滤后 `_path` = `{/guide/baseline}`                          |
| `/api/_content/cache.1793338053454.json`   | 200     | application/json     | 10025   | ✅ `contents` 键 + title「绿色控制组」                           |
| `/api/_content/search-1793338053454`       | 200     | text/plain           | 4956    | ✅ `documentIds` 值含 `/guide/baseline`                          |
| `/api/_content/navigation`                 | 200     | application/json     | 207     | ✅ 导航树含 `/guide/baseline`                                    |
| **`/api/_content/cache.json`**             | **404** | **application/json** | **223** | ✅ **真 404**（原 200 + HTML shell）                             |
| **`/api/_content/search`**                 | **404** | **application/json** | **215** | ✅ **真 404**（原 200 + HTML shell）                             |
| **`/api/_content`**                        | **404** | **application/json** | **201** | ✅ 裸前缀（补 `index.ts` 守卫后）                                |
| **`/api/_content/`**                       | **404** | **application/json** | **203** | ✅ 裸前缀（带尾斜杠）                                            |
| **`/api/_content/unknown/deep/path`**      | **404** | **application/json** | **237** | ✅ 未注册深层路径                                                |

canonical 响应体原文：

```json
{
	"error": true,
	"url": "…/api/_content/cache.json",
	"statusCode": 404,
	"statusMessage": "Content API route not found",
	"message": "未注册的 Content API 路径：/api/_content/cache.json"
}
```

### 4.3 探针正反向可判别（关键）

| 阶段                                                                              | 守卫            | 探针                                                                                                                                        | exit  |
| --------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 修复前产物（指纹 1793336652904）                                                  | 无              | 8 条真实路由 PASS；2 条 canonical **FAIL**：「期望 HTTP 404，实际 200（200 + HTML 404 shell 就是 F47 假阳性）」+「响应体是 HTML 404 shell」 | **1** |
| V4.1                                                                              | 有              | 10 条全 PASS（8 真实 + 2 canonical-404）                                                                                                    | **0** |
| V4.2（改名隔离到 `$env:TEMP\repro-guard-stash-20261030-132335`）                  | 无              | 8 条真实路由 PASS；2 条 canonical **FAIL**（同上报错）                                                                                      | **1** |
| V4.3（恢复，sha256 比对一致）                                                     | 有              | 10 条全 PASS                                                                                                                                | **0** |
| 独立复核·反向黑盒（守卫隔离到 `$env:TEMP\verifier-guard\`，新指纹 1793338652819） | 无              | 8 条真实路由 PASS；2 条 canonical **FAIL**（同上报错）                                                                                      | **1** |
| 独立复核·恢复（sha256 `720E50A0…7EB6` 与开工前逐字一致）                          | 有              | 10 条全 PASS                                                                                                                                | **0** |
| 主代理·补裸前缀守卫（指纹 1793339544866）                                         | 有 + `index.ts` | **12 条全 PASS**（8 真实 + 4 条 must-404：`cache.json` / `search` / `/api/_content` / `/api/_content/`）                                    | **0** |

→ 同一份探针代码在守卫缺失时 exit 1、在守卫在位时 exit 0，**证明探针不是又一个弱断言**。

### 4.4 路由来源三源实测

| 来源                           | 结果                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 全空                           | 「没有可用的 Content API 路由来源：--route 未给、构建产物路由表未扫到、REPRO_CONTENT_ROUTES 为空。」+「拒绝静默通过」 / **exit 1** |
| `--route`（可重复 + 逗号分隔） | `# 路由来源: explicit(--route)` / **exit 0**                                                                                       |
| `REPRO_CONTENT_ROUTES`         | `# 路由来源: env(REPRO_CONTENT_ROUTES)` / **exit 0**                                                                               |
| 产物路由表（默认）             | `# 路由来源: artifact(route-table)` / **exit 0**                                                                                   |

### 4.5 指纹未硬编码

`Select-String -Path probes\content-smoke.ts -Pattern '\d{10,}'` → **空**。六次构建指纹实测变化：`1793336652904`（修复前）→ `1793337599744`（守卫在位）→ `1793337830631`（守卫隔离）→ `1793338053454`（恢复后）→ `1793338652819`（复核反向）→ `1793338864037` / `1793339544866`（复核恢复 / 补裸前缀）。

### 4.6 契约与包级测试

```powershell
pnpm test:contracts   # 1..13 / # pass 13 / # fail 0 / exit 0
pnpm test             # Tasks: 6 successful, 6 total / exit 0
```

### 4.7 独立复核（`minimax/MiniMax-M3`，只读复核，零文件改动）

**结论：PASS**（无阻断项；附 2 项强制闭环 + 5 项次要，全部已在本轮闭环）。

复核方独立重跑了红/绿差分：守卫隔离到 `C:\Users\pc\AppData\Local\Temp\verifier-guard\` → 冷构建（159.6s，`Cached: 0`）→ 探针 **exit 1**（精确报出 canonical 路径 200 + `text/html` 404 shell）；恢复守卫（sha256 `720E50A0…7EB6` 与开工前逐字一致）→ 冷构建（160.9s）→ 探针 **exit 0**。终态 `git status` 与开工基线一致，端口 3413 零监听。

复核方提出的 2 项强制闭环与 5 项次要，处置如下：

| 编号   | 问题                                                                       | 处置                                                                                                                                                                                |
| ------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 重要-1 | `QUEUE.md` 表 4 的 F47 排查项仍写「平台维度定案 / 待定案」，与 #19 矛盾    | ✅ 已改写为「已定案（待 CI 首跑回填）」，补 #19 引用并标注 preset 维度作废                                                                                                          |
| 重要-2 | FINDINGS **#19 与待合分支 `experiment/integrate-r18-r19` 撞号**            | ✅ 已在 FINDINGS #19 末尾加「编号保留说明」，并在 `BRANCH-MERGE-EVALUATION.md` §4 第 7 步写入强制前置的重编号方案（二选一，**不要两边都叫 #19**）；分支本身的改动留给合并授权时处理 |
| 次要-3 | 守卫漏掉裸前缀 `/api/_content` 与 `/api/_content/` → 仍是 200 + HTML shell | ✅ **已修**：新增 `apps/docs/server/api/_content/index.ts`，实测两条路径均 404 + JSON；探针反向断言从 2 条扩到 4 条                                                                 |
| 次要-4 | `failure-catalog.md` F47 标题仍以 preset 维度表述，与订正小节并存          | ✅ 已在标题下加指针（**原文措辞保留不改写**），指向节末订正与 FINDINGS #19                                                                                                          |
| 次要-5 | 探针用法注释未说明 `--base` 模式必须另配路由来源                           | ✅ 已在文件头注释补齐前置条件与两种补法                                                                                                                                             |
| 次要-6 | 本文件冷构建表「4 次」与表内 3 行 / 4 个耗时不符                           | ✅ 已改为 6 次串行并逐行列出执行者、阶段、耗时、exit                                                                                                                                |
| 次要-7 | 仓库内 `node_modules/node_modules/` 嵌套残留（创建于本轮之前，非本轮产物） | ⚠️ 不影响验收结论，作为环境卫生项上报给用户，未擅自处理                                                                                                                             |

复核方声明的**未验证项**：① Linux CI 实跑；② Vercel / Cloudflare 远端响应体复验；③ `probe:content` 在 CI job 内的真实行为；④ turbo 缓存命中路径下的产物一致性；⑤ GitHub 锚点实机渲染；⑥ 本证据文件未入库。前 5 项分别由 §7、CI 首跑与本次提交闭环。

## 5. 生产部署验证

见 §7（推送后回填）。

## 6. 遗留与未覆盖（交用户决策）

1. **「所有未知路径返回 200」是 layer catch-all 的通用行为**（如 `/no-such-page-xyz` 同样 200 + HTML）。本次把 `/api/_content*` **整族**（含 `/**` 与零段裸前缀）收窄成真 404，**页面 catch-all 未动**——覆盖它需要动上游 layer 的 `pages/[...slug].vue`，超出本轮范围，单独立项交用户决策。
2. **`/api/_content/query/index.md` 是弱门**：无 `_params` 时 `query.first` 为 false → 走 `.find()` 返回**全部文档**，根本不校验 `index.md` 本身。探针已按「集合恰好等于三篇」断言，但这层语义缺陷在 content 模块侧，未修。
3. **探针与内容结构耦合**：`_path` 集合被硬断言为恰好 `{/guide/baseline, /guide/failure-domains, /}`——新增任何一篇 `apps/docs/content` 文档都会让探针失败，必须同步更新 `EXPECTED_QUERY_PATHS`。这是刻意的强门。
4. **`**:params` 编码假设**：按 content v2.13.9 的 `encodeQueryParams`（base64url，`where` 数组形式）构造；上游改编码则该路由断言会失败，但失败信息会直接指出 URL 与响应体前 500 字符，不会静默。
5. **跨平台**：本轮仅 Windows 实测；Linux 由 CI `ubuntu-latest` job 覆盖（合并后运行）。
6. **远端形态**：Vercel 生产与 Cloudflare Workers 远端需在推送后各做一次响应体断言（见 §7）。

## 7. 生产部署响应体级复验（推送后回填）

提交：`e9a2105..acc4f62 main -> main`（4 笔：`06832db` 🐞 守卫 / `ad379fb` 🧪 探针+契约 / `ac75d39` 🐎 CI / `acc4f62` 📃 口径+档案）。

### 7.1 部署终态

| 平台               | 对象              | 部署 ID                                                                                        | 状态                                                                         |
| ------------------ | ----------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Vercel             | docs              | `dpl_93X1QKoNhXCDVfb5AyLkBdq87rNf`                                                             | **READY**（`aliasError=null`，custom domain `…docs.vc.ruan-cat.com` 已绑定） |
| Vercel             | api               | `dpl_FfnCCGUUw1uyNbXRM5TNJXUDQTqr`                                                             | **READY**                                                                    |
| Cloudflare Workers | docs              | Build `8bf16dec-4583-44e4-936b-950a748fe5f9`（version `4ca04d27-955a-40ca-ac47-d60220b54eb7`） | **success**                                                                  |
| Cloudflare Workers | api               | Build `fdf7b5ce-9214-42b7-9331-35c7d077ff15`（version `a02453a4-f838-44d1-b09c-610960d744ad`） | **success**                                                                  |
| GitHub Actions     | run `41011466735` | 5/5 check-runs 全 success                                                                      | **success**                                                                  |

> **CI 的 `Linux 完整生产构建与 artifact smoke` job 已在真实 `ubuntu-latest` 上实跑新的内容级探针并通过** → 独立复核声明的「未验证项 ①（Linux CI 实跑）」已闭环。
> Vercel docs 构建日志：`Tasks: 3 successful, 3 total` / `Cached: 2 cached, 3 total` / `Time: 3m5.972s` / `Build Completed in /vercel/output [3m]`；产物清单确认守卫已入包：`functions/__fallback.func/chunks/routes/api/_content/_..._.mjs (935 B)` 与 `chunks/routes/api/index.mjs (932 B)`。

### 7.2 远端指纹发现（不硬编码）

从远端首页的 79 个 `/_nuxt/*.js` chunk 中扫描 `/api/_content/search-\d+` 得到本次部署指纹：

| 平台            | 指纹            |
| --------------- | --------------- |
| Vercel docs     | `1793340012190` |
| Cloudflare docs | `1793340012740` |

> 两个平台的指纹**不同**（各自构建时刻不同）→ 再次印证探针绝不能硬编码指纹。

### 7.3 响应体级断言（双平台逐字一致）

| URL                             | Vercel docs                                                                                    | Cloudflare docs                        | 判定                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| `/api/_content/search-<ts>`     | 200 `text/plain` 4956B，`documentCount:8`、`documentIds` 含 `/guide/baseline` 与「绿色控制组」 | 200 `text/plain` 4956B，同上           | ✅ 真实内容                              |
| `/api/_content/cache-<ts>.json` | 200 `application/json` 10025B，`contents[0]._path=/guide/baseline`                             | 200 `application/json` 10024B，同上    | ✅ 真实内容                              |
| `/api/_content/query`           | 200 `application/json` 9745B，3 篇文档                                                         | 200 `application/json` 9745B，3 篇文档 | ✅ 真实内容                              |
| `/api/_content/cache.json`      | **404 `application/json`**                                                                     | **404 `application/json`**             | ✅ **真 404**（修复前 200 + HTML shell） |
| `/api/_content/search`          | **404 `application/json`**                                                                     | **404 `application/json`**             | ✅ **真 404**                            |
| `/api/_content`                 | **404 `application/json`** 242B                                                                | **404 `application/json`** 242B        | ✅ **真 404**                            |
| `/api/_content/`                | **404 `application/json`** 244B                                                                | **404 `application/json`** 244B        | ✅ **真 404**                            |
| `/`                             | 200 `text/html` 107416B，title「生产级复现实验室」                                             | 200 `text/html` 107214B，同上          | ✅ 页面不回归                            |
| `/guide/baseline/`              | 200 `text/html` 120926B，title「绿色控制组」                                                   | 200 `text/html` 120724B，同上          | ✅ 页面不回归                            |

### 7.4 其它对象

| 对象                                                | 结果                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Vercel api `/v1/health`                             | 200 `{"ok":true,"service":"independent-nitro3-api","timestamp":"2026-10-30T06:07:57.314Z"}` |
| Cloudflare api `/v1/health`                         | 200 `{"ok":true,"service":"independent-nitro3-api","timestamp":"2026-10-30T06:07:59.138Z"}` |
| Vercel docs 运行时错误（`get_runtime_errors`, 24h） | **No runtime errors found**                                                                 |

→ **F47 第二层假阳性在 Vercel 生产与 Cloudflare Workers 两个远端同时闭环。**
