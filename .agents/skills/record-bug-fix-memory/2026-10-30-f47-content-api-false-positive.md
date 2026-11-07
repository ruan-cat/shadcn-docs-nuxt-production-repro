# 2026-10-30 F47 第二层定案：探针请求了 dev-only 路径名，catch-all 把「路由不存在」渲染成 HTTP 200

## 1. 问题现象

用户在 Vercel 生产复验时发现：`/api/_content/cache.json` 与 `/api/_content/search?q=绿色` 返回 **HTTP 200**，但响应体是 **HTML 404 错误页**（`<title>404 - shadcn-docs-nuxt 生产复现实验室</title>`，约 100 KB）。

现象在三个地方**逐字一致**：

| 环境                                | `/api/_content/cache.json` | `/api/_content/search` |
| ----------------------------------- | -------------------------- | ---------------------- |
| 本机 Windows node-server（control） | 200 + HTML 404 shell       | 200 + HTML 404 shell   |
| Vercel 生产（node preset）          | 200 + HTML 404 shell       | 200 + HTML 404 shell   |
| Cloudflare Workers 远端（workerd）  | 200 + HTML 404 shell       | 200 + HTML 404 shell   |

同时页面 SSR 内容完全正常（`/`、`/guide/baseline/` 均返回真实内容），构建日志与运行日志**零错误**。

**要表达的风险**：仅凭「状态码 200 + 空错误日志」会把「Content API 故障 / 路由不存在」误判为通过。这个假阳性从 2026-09-29 登记为 F47 起，持续了整整一个月。

## 2. 实际根因

**根因是「验收契约写错了 URL」，不是运行时故障。**

`@ztl-uwu/nuxt-content@2.13.9` 在**生产构建**下会给 Content API 路由名追加构建指纹，无后缀路径**只在 dev 模式存在**：

```js
// node_modules/@ztl-uwu/nuxt-content/dist/module.mjs
:207  const buildIntegrity = nuxt.options.dev ? void 0 : Date.now();
:238  route: nuxt.options.dev ? `${base}/cache.json` : `${base}/cache.${buildIntegrity}.json`,
:243  route: nuxt.options.dev ? `${base}/search`     : `${base}/search-${buildIntegrity}`,
:257  nitroConfig.prerender.routes.unshift(`${base}/cache.${buildIntegrity}.json`);
```

产物路由表实锤（`.output/server/chunks/_/nitro.mjs` 的 `handlers` 数组）：

```js
{ route: '/api/_content/query/:qid/**:params', handler: _SUhlj6, ... }
{ route: '/api/_content/query/:qid',            handler: _SUhlj6, ... }
{ route: '/api/_content/cache.1793336652904.json', handler: _DSDzhp, ... }
{ route: '/api/_content/search-1793336652904',     handler: _77rsGm, ... }
{ route: '/api/_content/navigation/:qid/**:params', ... }
{ route: '/api/_content/navigation/:qid', ... }
{ route: '/api/_content/navigation', ... }
{ route: '/_ipx/**', ... }
{ route: '/**', handler: _lazy_nDXe66, lazy: true, ... }   // ← catch-all 排在末位
```

**没有** `/api/_content/cache.json`，**没有** `/api/_content/search`。

假阳性的完整产生链条：

1. 请求未注册路径 → 落到 catch-all `/**` → Nuxt renderer；
2. renderer 匹配上游 layer `shadcn-docs-nuxt@1.1.9` 的 `pages/[...slug].vue`；
3. 该页面在内容未命中时（`!page?.body`）**内联渲染「404」文案，但不抛 `createError`、不设状态码**；
4. 页面**渲染成功** → Nitro 默认 **HTTP 200**。

因此：**handler 从未被调用，不存在「崩溃」**，也不存在 Nitro 错误处理改写状态码（对整个 layer grep `setResponseStatus|createError|showError|statusCode` → 零命中）。

**旧假设被证伪**：F47 原记录的「第二层 = content 运行时 DB/存储初始化在 serverless 一致失败 → handler 崩溃」**是错的**。带指纹路径在本机与 Vercel 生产**均返回 200 + 真实 JSON**：

- `/api/_content/cache.<ts>.json` → `application/json`，`contents` 3 篇（`/guide/baseline`、`/guide/failure-domains`、`/`），`title` 含「绿色控制组」；
- `/api/_content/search-<ts>` → `text/plain`，`documentCount: 8`、`documentIds` 8 条、命中「绿色控制组」。

→ **content 的运行时 DB/存储在 serverless 完全正常**。

**产物是自洽的**：指纹通过 `runtimeConfig.public.content.integrity` 暴露，应用自身客户端据此拼接带指纹路径（`chunks/build/server.mjs` 的 `searchRoute`、`chunks/build/client-db-*.mjs` 的 `cache.${integrity}.json`）。**只有外部探针在用 dev 路径**。

## 3. 关键误导点

1. **「serverless 特有」的假设**：F47 矩阵把 `node-server` 记为 ✅、`vercel`/`cloudflare_module` 记为 ❌，于是所有排查都朝「serverless 运行时 / workerd 原生模块边界」方向走。真相是三处**完全一致**，差别只在于**谁在用错 URL**。
2. **`node-server ✅` 本身是弱断言假象**：`probes/artifact-smoke.ts` 只断言 `response.ok`，对 404 shell 恒绿；「✅」只证明探针没写内容断言。
3. **「handler 崩溃」是想象出来的失败模式**：没有任何错误被抛出，所以日志干净、状态码 200 —— 「零错误日志」在这里是**症状**而非「一切正常」的证据。
4. **`/api/_content/query/index.md` 这条「绿」门也是弱门**：无 `_params` 查询参数时 content 回退为空 query，`.find()` 返回**全部文档**，它根本不校验 `index.md` 本身（这是本轮附带发现的第二个假阳性门）。
5. **PowerShell 5.1 的编码假象**：`application/json` 无 charset 时 PS 5.1 按 Latin-1 解码，中文显示为乱码，容易被误判成「内容损坏」。必须用原始字节 + UTF-8 解码复核（本轮已用两轮对照消除该假象）。

## 4. 有效修复

**核心：让「路由不存在」在状态码上诚实。**

- 新增 `apps/docs/server/api/_content/[...].ts` 守卫：对未注册的 `/api/_content/**` 路径 `throw createError({ statusCode: 404 })`。
  - content 模块已注册的真实路由（`query`、`navigation`、`cache.<ts>.json`、`search-<ts>`）路由优先级更高，不受影响 —— **必须实测确认**。
  - 不改上游 layer、不改 `node_modules`、不写死任何指纹。

**配套：把「只看状态码」的探针升级为「响应体内容级断言」。**

- `probes/content-smoke.ts` 改造：
  - 路由来源从**构建产物**发现（扫 Nitro 路由表 / 读 `runtimeConfig.public.content.integrity`），**不得硬编码指纹**（`Date.now()` 每次构建都变）；
  - 断言真实路由 **200 + 非 `text/html` + `JSON.parse` 成功 + 含具体文档 `_path`/`title`**；
  - **反向断言**：canonical 路径 `/api/_content/cache.json`、`/api/_content/search` 必须返回**真实 404**。
- `.github/workflows/ci.yaml`：删除两条打 dev-only URL 的 smoke step（原 `ci.yaml:90-94`），换为内容级探针。
- 规格订正：`docs/task-artifacts/acceptance-gates.md` G4、`docs/task-artifacts/failure-catalog.md` F29 —— 原文把 dev 路径写成硬性契约，是规格缺陷本身。

**另一条独立修复（CI 防回归）**：新增 `tests/build-idempotency.test.mjs`，断言 `packages/shared-core` 的 `build` / `typecheck` 脚本必须含 `--incremental false`（详见同目录 `2026-10-30-vercel-shared-core-incremental-no-emit.md`）。

## 5. 验证方式

- **产物级**：构建后从 `.output/server/chunks/_/nitro.mjs` 的 `handlers` 数组读出真实 content 路由与新守卫路由，确认二者共存且真实路由在前。
- **运行态矩阵**（本机 standalone，fresh 进程 + fresh 日志）：
  - `/`、`/guide/baseline/` → 200 且含真实内容（「生产级复现实验室」「绿色控制组」）；
  - `/api/_content/query/index.md` → 200 + JSON + `_path` 集合 = `{"/guide/baseline","/guide/failure-domains","/"}`；
  - `/api/_content/cache.<ts>.json` → 200 + JSON + `contents` 含 `_path === "/guide/baseline"`；
  - `/api/_content/search-<ts>` → 200 + JSON + `documentIds` 含 `/guide/baseline`；
  - `/api/_content/cache.json`、`/api/_content/search` → **404**（修复前是 200 + shell）。
- **探针正反向**：`pnpm probe:content <server-entry>` → exit 0；把守卫文件 `Move-Item` 隔离出仓库并重建后 → **exit 1 且失败信息指向 canonical 路径返回 200/HTML shell**；移回并重建 → 再次 exit 0。**这一步证明探针真能抓住这类假阳性，而不是又造一个弱断言。**
- **契约门**：`pnpm test:contracts` 12/12 → 13/13 全绿。
- **生产级**：Vercel / Cloudflare 部署后，对真实指纹路由与 canonical 路径分别做响应体断言。

## 6. 后续约束

1. **禁止把 dev-only URL 写进任何验收契约**。content v2 的 API 路由名在生产构建下带构建指纹；契约必须写「从产物发现真实路由」，不得写死 `cache.json` / `search`，也不得写死 13 位时间戳。
2. **验收必须做响应体内容断言**，且要断言到**具体文档**（`_path` / `title`），不能只断言「非空」或「含某个词」——`/api/_content/query/index.md` 这条弱门已经证明了「含绿色控制组」不足以判通过。
3. **必须做反向断言**：对不存在的路径，期望是**真实非 200**；如果任何未注册路径返回 200 + HTML，那就是假阳性复发。
4. **「零错误日志 + 状态码 200」不是通过证据**。本仓 F47 的教训是：这两者同时成立时，真实情况可能是「根本没有 handler 被调用」。
5. **矩阵里的「✅」必须标注证据强度**（状态码级 / 响应体级）。F47 矩阵的 `node-server ✅` 长期是状态码级弱断言，导致一个跨 preset 的契约失配被误判成平台运行时故障整整一个月。
6. **PowerShell 5.1 下判定响应体内容前，先消除编码假象**：用原始字节 + UTF-8 严格解码复核，不要用 `Invoke-WebRequest` 的默认解码结果下结论。
7. **跨 preset 的现象先查契约再查平台**：本机 control 与远端表现**一致**时，优先怀疑「两边都在用同一个错的东西」（本例是同一个错 URL），而不是「平台差异」。
