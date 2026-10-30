# R45 证据：Nuxt 4 同代迁移（experiment/nuxt4-generation-migration）

- 日期：2026-10-30
- 基线：main `b004d0d` → 分支 `experiment/nuxt4-generation-migration`（**未 push**）
- 平台：Windows 10.0.19045 / Node 22.23.1（`D:\store\nvm-desktop\22.23.1\node.exe`）/ pnpm 10.33.0
- 结论：**❌ 判负（阻断级）**——Nuxt 4 同代迁移后生产产物内容库为空
- 关联档案：[R45.md](../docs/task-artifacts/experiments/R45.md)
- 原始日志副本：`%TEMP%\r45\`（`install*.log` / `build-packages*.log` / `build-docs*.log` / `probe-closure.log` / `probe-content.log` / `probe-content-clean.log`）、`%TEMP%\r45probe\`（`shadcn-docs-nuxt@1.2.2`、`shadcn-docs-nuxt@1.1.9`、`@ztl-uwu/nuxt-content@2.13.9`、`nitropack@2.13.4` 的 npm pack 解包）

---

## 1. 变量集合（相对 main `b004d0d`）

| 包                               | 基线    | R45                 | 说明                                                           |
| -------------------------------- | ------- | ------------------- | -------------------------------------------------------------- |
| `nuxt`                           | 3.21.2  | **4.6.3**           | 主题 1.2.2 的 devDeps 声明 `nuxt ^4.4.5`                       |
| `shadcn-docs-nuxt`               | 1.1.9   | **1.2.2**           | npm 实测最高 1.2.x                                             |
| `@ztl-uwu/nuxt-content`          | 2.13.9  | **2.14.1**          | 主题 1.2.2 声明 `^2.14.1`                                      |
| `nuxt-og-image`（root override） | 5.1.9   | **6.10.2**          | 主题 1.2.2 声明 `^6.5.0`（R-2：override 原低于主题声明最低版） |
| `vue-router`                     | 4.6.4   | **5.4.0**           | `nuxt@4.6.3` 依赖 `vue-router ^5.4.0`                          |
| `tailwindcss`                    | 4.2.2   | **4.3.3**           | 主题 / `@tailwindcss/vite` / `nuxt-og-image` 均为 4.3.3        |
| `vue`（apps/docs + packages/ui） | 3.5.30  | **3.5.44**          | `nuxt@4.6.3` 要求 `^3.5.44`                                    |
| `@iconify-json/lucide`           | 1.2.98  | **1.2.149**         | 主题声明 `^1.2.108`                                            |
| `h3`                             | 1.15.11 | **1.15.11（不变）** | 首版曾升 `2.0.8`，因 prerender 全 500 回退（见 §4）            |

- `pnpm-workspace.yaml`：**删除 4 条 `h3@1.15.11` packageExtensions**（动作保留，理由订正见 R45.md 的「✝️ 订正」节）。
- `apps/docs/server/api/_content/[...].ts`、`index.ts`、`server/middleware/content-query-guard.ts`：h3 v2 迁移**全部回退**。
- lockfile 收敛校验：`vue@3.5.30` / `tailwindcss@4.2.2` / `@iconify-json/lucide@1.2.98` / `nuxt@3.21.2` 各 **0 处**。
- 契约直跑（绕开 turbo 缓存）：`node --test tests/*.test.mjs` → **15/15 通过**。

---

## 2. 构建（通过）

```plain
Nuxt 4.6.3 (with Nitro 2.13.5, Vite 8.3.5 and Vue 3.5.44)
Server built in 6097ms
Prerendered 11 routes in 9.848 seconds
✨ Build complete in 48.0s!
```

- `build:packages` exit 0 / 3s；`build:docs` **exit 0 / 54s**。
- `probe:closure` exit 0（`dependencyCount = 186`，`apps/docs/.output/server/package.json` 存在）。

---

## 3. 首轮冒烟判废：探针打到 stale server（FINDINGS #28）

### 3.1 现象

第一轮 `probe:content` **exit 1 / 11 PASS / 2 FAIL**；两条 FAIL 是带构建指纹的路由：

```plain
FAIL /api/_content/cache.1793359064457.json
  状态码=404 Content-Type=application/json bytes=251
  - 期望 HTTP 200，实际 404
  "statusMessage": "Content API route not found",
  "message": "未注册的 Content API 路径：/api/_content/cache.1793359064457.json"
FAIL /api/_content/search-1793359064457
  状态码=404 Content-Type=application/json bytes=243
```

404 的响应体是**我们自己的** `apps/docs/server/api/_content/[...].ts` 守卫文案。

### 3.2 取证：占用者是谁

```plain
PORT 3413 PID 32500 CMD=node  index.mjs CREATED=2026/10/30 19:02:43
PORT 3414 PID 34764 CMD=node  index.mjs CREATED=2026/10/30 19:04:55
    父进程: cmd.exe /C node index.mjs
```

用各历史产物的构建指纹反查两个端口（`GET /api/_content/cache.<ts>.json`）：

| 产物                                              | 指纹 ts           | 3413    | 3414    |
| ------------------------------------------------- | ----------------- | ------- | ------- |
| `.output`（R45 自身）                             | 1793359064457     | 404     | 404     |
| `.output.stale-r42`                               | 1793354246337     | 404     | 404     |
| `.output.stale-r43`                               | 1793354913751     | 404     | 404     |
| `.output.stale-r44`                               | 1793355176497     | 404     | 404     |
| `.output.stale-r44b`                              | 1793355783614     | 404     | 404     |
| `.output.stale-r44c`                              | 1793355996476     | 404     | 404     |
| **`.worktrees/r22`（R22 的 `trace:false` 产物）** | **1793358021786** | **200** | **200** |

⇒ 两个 stale server 是 **R22 实验遗留的 standalone**（R22 产物构建于 19:00:21，服务起于 19:02:43 / 19:04:55；R45 构建于 19:17:44）。

### 3.3 机理（验收工具缺陷）

`probes/content-smoke.ts` 的 `waitForServer`：

```ts
for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
	if (child.exitCode !== null) {
		throw new Error(`standalone 在就绪前退出，exit=${child.exitCode}`);
	}
	try {
		await fetch(base, { redirect: "manual" });
		return;
	} catch {
		// ← 旧服务应答即判定 ready
		await sleep(READY_INTERVAL_MS);
	}
}
```

端口被占用时 spawn 出的子进程会因 EADDRINUSE 退出，但**首轮** `fetch` 已被旧服务应答 ⇒ 探针**从不校验应答者是不是自己 spawn 的进程** ⇒ 全部断言打在旧产物上。

### 3.4 处置

终止 PID 32500 / 34764 → 复验 `port 3413: FREE` / `port 3414: FREE` → 在干净端口重跑探针。

### 3.5 对既有结论的影响

**R42/R43/R44 的 `probe:content` 13/13 PASS 不受影响**（推论，非直接取证）：这三轮构建指纹互不相同，而**指纹路由断言是通过的** ⇒ 应答者必为同一构建；若被别的构建应答，带旧指纹的 `cache.<ts>.json` 必然 404。

---

## 4. 真缺陷：生产内容库为空（FINDINGS #28）

### 4.1 干净端口重跑结果（`probe:content` exit 1，9 项 FAIL）

```plain
FAIL /api/_content/query                      200  application/json  bytes=2      → []
FAIL /api/_content/cache.1793359064457.json   200  application/json  bytes=77
      {"generatedAt":1793359598336,"generateTime":14,"contents":[],"navigation":[]}
FAIL /api/_content/search-1793359064457       200  text/plain        bytes=202
      {"documentCount":0,"nextId":0,"documentIds":{},"index":[], ...}
FAIL /api/_content/navigation                 200  application/json  bytes=2      → []
PASS /api/_content/cache.json (must-404)      404
PASS /api/_content/search (must-404)          404
PASS /api/_content (must-404)                404
PASS /api/_content/ (must-404)               404
PASS /no-such-page-xyz (missing-page)        404
# 失败 9 项
```

⇒ **状态码全是 200，但内容全是空集合**（4 条内容断言 + qid 派生链的连带失败）。这比 F47 的「200 假阳性」更严重：**数据真的没有**。

### 4.2 构建期写入形态

|                                               | control（`.nuxt.stale-r44c/content-cache`）                            | R45（`.nuxt/content-cache`） |
| --------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| 文件数                                        | **5**                                                                  | **4**                        |
| `content-index.json`                          | 184 B                                                                  | **缺失**                     |
| `parsed/content/index.md`                     | **2907 B = 已解析 JSON**                                               | **851 B = 原始 markdown**    |
| `parsed/content/1.guide/0.index.md`           | 2245 B（JSON）                                                         | 724 B（原文）                |
| `parsed/content/1.guide/1.baseline.md`        | 5548 B（JSON）                                                         | 459 B（原文）                |
| `parsed/content/1.guide/2.failure-domains.md` | 1478 B（JSON）                                                         | 277 B（原文）                |
| mtime                                         | 18:27:32（= r44c 构建时刻；r42 17:58:20 / R22 worktree 19:01:33 同形） | 19:17:42（= R45 构建时刻）   |

源文件体积：`content/index.md` 851 / `1.guide/0.index.md` 724 / `1.guide/1.baseline.md` 459 / `1.guide/2.failure-domains.md` 277 ⇒ **R45 的缓存位里放的就是源文件原文**。

control 的 JSON 形态：`{"parsed":{"_path":"/","_dir":"","_draft":false,"title":"生产级复现实验室","body":{"type":"root","children":[{"type":"element","tag":"h1",…}]}}}`

### 4.3 产物内的服务器资产

```plain
control server/chunks/_/nitro.mjs:3450-3468
  ["nitro:bundled:cache:content:content-index.json"]           meta etag "b8-…"    (184 B)
  ["nitro:bundled:cache:content:parsed:content:index.md"]      meta etag "b5b-…"   (2907 B = JSON)
  ["nitro:bundled:cache:content:parsed:content:1.guide:0.index.md"]  etag "8c5-…"  (2245 B)
  ["nitro:bundled:cache:content:parsed:content:1.guide:1.baseline.md"] etag "15ac-…" (5548 B)
  ["nitro:bundled:cache:content:parsed:content:1.guide:2.failure-domains.md"] etag "5c6-…" (1478 B)

R45 server/chunks/_/nitro.mjs
  （无任何 nitro:bundled: 条目）
```

### 4.4 运行时不会兜底解析

`@ztl-uwu/nuxt-content/dist/runtime/server/storage.js:136-139`：

```js
const cached = await cache.getItem(id);
if (isProduction && cached) {
	return cached.parsed;
}
```

两版产物 `chunks/_/storage.mjs:1392-1395` **都被打包成**：

```js
const cached = await cache.getItem(id);
if (cached) {
	return cached.parsed;
}
```

（`isProduction` 被常量折叠掉）⇒ **缓存位里是原文时 `cached.parsed === undefined`，运行时直接返回 undefined，不会现场解析**。

### 4.5 content 包无责（已证伪）

```plain
2.13.9 → 2.14.1  dist/module.mjs 逐行比较：仅 1 行不同
  [2.14.1] const version = "2.14.1";
  [2.13.9] const version = "2.13.9";

整包文件级 diff（143 → 158）：差异**只有新增的 *.d.vue.ts 类型声明**
  ONLY-2.14.1  \runtime\app.d.vue.ts
  ONLY-2.14.1  \runtime\components\ContentDoc.d.vue.ts
  …（共 15 个 .d.vue.ts）
  DIFF         \runtime\components\ContentNavigation.vue.d.ts
  DIFF         \runtime\composables\search.d.ts
  DIFF         \module.json / \module.mjs / \web-types.json
（dist/runtime/** 的运行时实现文件全部相同）
```

### 4.6 content 模块的写入行为（2.13.9 / 2.14.1 相同）

`dist/module.mjs:640-667`：

```js
if (!nuxt.options.dev) {
  nuxt.hook("build:before", async () => {
    const storage = createStorage();
    const sources = useContentMounts(nuxt, contentContext.sources);
    sources["cache:content"] = { driver: "fs", base: resolve(nuxt.options.buildDir, "content-cache") };
    …
    let keys = await storage.getKeys("content:source");
    …
    await Promise.all(keys.map(async (key) => await storage.setItem(
      `cache:content:parsed:${key.substring(15)}`,
      await storage.getItem(key)          // ← 原样拷贝（未解析原文）
    )));
  });
}
```

⇒ **缓存位一旦被原文占据，运行时就永不解析**（与 §4.4 组合）。control 为何在**相同 module 代码**下写入的是 JSON，**本轮未逐行归因**。

### 4.7 nitro 2.13.4 → 2.13.5 的排查进度

- `dist/rollup/index.mjs` 的 `bundledStorage` 注入代码：2.13.4 `:1593-1628` vs 2.13.5 `:1598-1633` ⇒ **逐字等价**。
- `createStorage`（`storage` + `devStorage` 合并）：2.13.4 `:1067-1082` vs 2.13.5 `:1113-` ⇒ **逻辑等价**。
- `snapshotStorage`（`nitro.options.bundledStorage.map((base) => nitro.storage.getKeys(base))`）：2.13.4 `dist/core/index.mjs:1083-1098`；2.13.5 的 `core/index.mjs` **整体重构**（同一函数所在行号整体漂移 ≈30 行）⇒ **未逐行定位到具体改动点**（待归因，见 R45.md「后续建议」R46）。

---

## 5. h3 世代实测（FINDINGS #28）

- `nuxt@4.6.3` 构建日志：`Nuxt 4.6.3 (with Nitro 2.13.5, Vite 8.3.5 and Vue 3.5.44)`。
- `nitropack@2.13.5` → `dependencies.h3 = ^1.15.11`。
- npm 上**最新**的 `@nuxt/nitro-server@4.6.3` → `nitropack ^2.13.5` + `h3 ^1.15.11` ⇒ **没有任何 Nuxt 4.x 配 Nitro v3 / h3 v2 的官方组合**。
- `@ztl-uwu/nuxt-content@2.14.1` 自身**不声明 h3**；其 runtime 只 import `createError` / `getQuery` / `getCookie` / `defineEventHandler`，**不使用 `event.path` / `event.url`**。
- 首版（h3 升 `2.0.8` + 3 处 `event.url.pathname` 迁移）**构建 exit 1 / 38s**：client/server 构建通过（`Server built in 6149ms`），但 prerender 全部 500，根因：

  ```plain
  Cannot read properties of undefined (reading 'pathname')
  ```

  ⇒ `event.url` 在 h3 v1 运行时不存在。**已回退**：h3 保持 1.15.11，3 处 server 文件 `git checkout HEAD --` 恢复原样。

---

## 6. 环境处置记录

- 终止遗留 standalone：PID 32500（3413）、34764（3414）——均为 R22 实验遗留（`cmd.exe /C node index.mjs`）。
- 复验：`port 3413: FREE` / `port 3414: FREE`。
- 构建全程**串行前台**执行，无并发构建污染。
