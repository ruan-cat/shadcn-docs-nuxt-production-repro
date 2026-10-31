# R51 轴 A 证据：Nuxt4 / Nuxt3 生成 renderer 字节级对比（2026-10-31）

> **实验**：R51 轴 A（renderer 模板轴，[R51.md](../docs/task-artifacts/experiments/R51.md)）
> **臂 1** = `main` @ `ee0f51a`（Nuxt 3.21.2 + nitro 2.13.4，docs-only tip，构建图与 `dfa1bb2` 一致）
> **臂 2** = `experiment/nuxt4-generation-migration` @ `7714f5d`（Nuxt 4.6.3 + nitro 2.13.5，R45 现场复建）
> **证据等级**：本文全部为**实测**（本地构建产物 + 安装态实读 + symlink 归位）；推断处显式标注。
> **原始文件留存**：`%TEMP%\r51-axis-a\{arm1-main,arm2-nuxt4}\`（%TEMP% 易失，关键摘录以本文为准；当日抄录纪律）。

## ① 臂 1（main，Nuxt 3 世代 control）

构建（前台串行，timeout 600s；日志 `%TEMP%\r51-arm1-{packages,docs}.log`）：

```text
build:packages exit=0
docs build    exit=0
✔ Server built in 21673ms
[nitro] ℹ Prerendered 11 routes in 18.713 seconds
```

probe 验收（control 健康）：`probe:content apps/docs/.output/server/index.mjs` **13/13**（含 4 条 must-404）+ `probe:closure` **exit 0**。

生成 renderer 指纹（`apps/docs/.nuxt/prerender/chunks/_/renderer.mjs`，构建后立即取证）：

```text
行数  = 523
sha256 = 2d9f1565788e6ec7a46dec169c354fcab262afddcafa4bc08a664598634e225b
```

payload 写入关键行（与 [R48 取证](2026-10-31-r48-r50-r46-mitigation-directions.md) 的 R48 现场摘录 :108/:188/:331/:390 **逐字一致** ⇒ nitro 2.13.4 与 2.13.5 的生成 renderer 同构，R46 已证）：

```js
108: const NUXT_PAYLOAD_EXTRACTION = true;
188: const payloadCache = useStorage("internal:nuxt:prerender:payload") ;
331:	const _PAYLOAD_EXTRACTION = !ssrContext.noSSR && (NUXT_PAYLOAD_EXTRACTION);
```

两个 `payloadCache.setItem` 写入点全文（`grep -an` 原始行号；**均无 try/catch、无 `.catch`**——`:381-383` 与 `:386-390` 的花括号是裸块，非异常包裹）：

```js
379:	if (isRenderingPayload) {
380:		const response = renderPayloadResponse(ssrContext);
381:		{
382:			await payloadCache.setItem(ssrContext.url, response);
383:		}
384:		return response;
385:	}
386:	if (_PAYLOAD_EXTRACTION && true) {
387:		// Hint nitro to prerender payload for this route
388:		appendResponseHeader(event, "x-nitro-prerender", joinURL(ssrContext.url.replace(/\?.*$/, ""), PAYLOAD_FILENAME));
389:		// Use same ssr context to generate payload for this route
390:		await payloadCache.setItem(ssrContext.url === "/" ? "/" : ssrContext.url.replace(/\/$/, ""), renderPayloadResponse(ssrContext));
391:	}
```

键形态判读（结合 [R46.md](../docs/task-artifacts/experiments/R46.md) 摘录的 unstorage 1.17.6 `normalizeKey`）：

- `:382` 直渲 payload 路由键 = `ssrContext.url`（形如 `/guide/_payload.json`）→ `normalizeKey` → `guide:_payload.json` 非空 ⇒ **校验通过**（R46/R49 报错栈不在 ：382 的原因）；
- `:390` 抽取写入键 = 三元 `"/"`（根路由）→ `normalizeKey("/")` → `""` falsy ⇒ **1.17.6 `itemKey` 抛 `Invalid key: "/"`** ⇒ 与 R46/R49 报错栈 `renderer.mjs:390:22` 精确吻合（列 22 = `payloadCache.setItem` 调用表达式起点）。

## ② 臂 2（`experiment/nuxt4-generation-migration` @ `7714f5d`，R45 现场复建）

隔离：5 个 `node_modules` → `node_modules.stale-r51-nuxt4-20261031-172947`（根 + apps/api + apps/docs + packages/shared-core + packages/ui，`Move` 改名隔离，未删除）。

```text
pnpm install --frozen-lockfile   exit=0   Done in 30.4s（warm store）
.pnpm 目录数 = 1118（Nuxt 4 依赖树更瘦，≥1000 合格）
apps/docs/node_modules/nuxt/bin/nuxt.mjs = OK
packages/shared-core/node_modules/typescript/bin/tsc = OK

build:packages exit=0
docs build     exit=0
● Nuxt 4.6.3 (with Nitro 2.13.5, Vite 8.3.5 and Vue 3.5.44)
✔ Server built in 8254ms
[nitro] ℹ Prerendered 11 routes in 14.971 seconds
◆ ✨ Build complete in 1m 09s!
```

R45 现场形态复现实测：

```text
find apps/docs/.output/public -name "_payload.json"  → 4 个（/、/guide、/guide/baseline、/guide/failure-domains）
apps/docs/.nuxt/content-cache/parsed/content/index.md 头部 = 裸 markdown（--- title: … 原文，非 JSON）
```

**`.nuxt/prerender` 目录在 Nuxt 4 臂不存在**（`find apps/docs/.nuxt -name "renderer.mjs" -o -name "nitro.mjs"` 零命中、`.nuxt` 顶层无 `prerender` 条目）⇒ Nuxt 3 世代「独立 prerender renderer bundle 落盘 `.nuxt/prerender/chunks/_/`」的布局在 Nuxt 4 世代消失，Nuxt 4 的 renderer 运行时化进 `.output` bundle（`createNuxtRenderer`，见 ⑤）。

## ③ unstorage 归位矩阵（symlink 实测，`readlink`）

| 包                                                   | main / Nuxt 3 臂    | nuxt4 臂（R45 现场）         |
| ---------------------------------------------------- | ------------------- | ---------------------------- |
| `nitropack@2.13.4`                                   | **1.17.5**          | —                            |
| `nitropack@2.13.5`                                   | —                   | **1.17.6（itemKey 有校验）** |
| `@nuxt/nitro-server@3.21.2`（两个 peer 变体同值）    | **1.17.5**          | —                            |
| `@nuxt/nitro-server@4.6.3`                           | —                   | **1.17.5**                   |
| `@ztl-uwu/nuxt-content@2.13.9`（两个 peer 变体同值） | **1.17.5**          | —                            |
| `@ztl-uwu/nuxt-content@2.14.1`                       | —                   | **1.17.5**                   |
| `nuxt@3.21.2` / `nuxt@4.6.3` 本体                    | 无 unstorage 直依赖 | 无 unstorage 直依赖          |

（store 内另有 `unstorage@2.0.0-alpha.7` ×4 变体，属 nitropack 2.13.5 的 optional/peer 面，未进入本仓运行时链，仅登记。）

## ④ Nuxt 3 侧：模板源三件套（`@nuxt/nitro-server@3.21.2`）

```text
dist/runtime/handlers/renderer.mjs = 307 行
sha256 = 3ff8543c1594415060424de43f9cae5b7133e9e6b313ec5ae665b9ba8968d46a（两个 peer 变体逐字节相同）
```

```js
74:	const _PAYLOAD_EXTRACTION = !ssrContext.noSSR && (import.meta.prerender && NUXT_PAYLOAD_EXTRACTION || NUXT_RUNTIME_PAYLOAD_EXTRACTION && (routeOptions.isr || routeOptions.cache));
132:			await payloadCache.setItem(ssrContext.url, response);
140:		await payloadCache.setItem(ssrContext.url === "/" ? "/" : ssrContext.url.replace(/\/$/, ""), renderPayloadResponse(ssrContext));
```

生成器常量注入（同包 `dist/index.mjs:258`）：

```js
`export const NUXT_PAYLOAD_EXTRACTION = ${!!nuxt.options.experimental.payloadExtraction}`,
```

⇒ 生成产物 ：108/:331/:390 即模板 :140 + 注入常量经条件折叠后的展开（模板含 `import.meta.prerender &&`，生成期折叠——**对比必须用生成产物**，模板≠产物）。

## ⑤ Nuxt 4 侧：27 行薄壳模板 + nuxt 包内 renderer 实现

`@nuxt/nitro-server@4.6.3/dist/runtime/handlers/renderer.mjs` = **27 行**（sha256 `d698cd28e38f27aeefae3812108fc4c0a8812f84c42a3a7f3eef062ef8355240`），全文：

```js
import { toRequestEvent } from "../utils/event.mjs";
import { applyPrerenderHints } from "../utils/prerender.mjs";
import { createResponseHeaderRecord } from "../utils/response.mjs";
import { rendererInstance } from "../utils/renderer/options.mjs";
import { setResponseHeader } from "h3";
import { defineRenderHandler } from "nitropack/runtime";
import { NUXT_ASYNC_CONTEXT } from "#internal/nuxt/nitro-config.mjs";
import { AsyncLocalStorage } from "node:async_hooks";
import { createNuxtRenderer } from "nuxt/internal/renderer";
// src/runtime/handlers/renderer.ts
if (NUXT_ASYNC_CONTEXT && !("AsyncLocalStorage" in globalThis)) globalThis.AsyncLocalStorage = AsyncLocalStorage;
const renderer = createNuxtRenderer(rendererInstance);
const handler = defineRenderHandler(async (event) => {
	const response = await renderer.fetch(toRequestEvent(event));
	for (const [name, value] of response.headers) {
		if (name === "set-cookie") continue;
		setResponseHeader(event, name, value);
	}
	if (import.meta.prerender) applyPrerenderHints(event);
	return {
		body: response.body,
		statusCode: response.status,
		statusMessage: response.statusText || void 0,
		headers: createResponseHeaderRecord(event.node.res),
	};
});
export { handler as default };
```

⇒ **模板零 payload 逻辑**：307 行 → 27 行，`payloadCache.setItem` 调用点从 nitro-server 模板中消失，渲染核心整体迁入 `nuxt/internal/renderer`。

payload 写入的新归属（`nuxt@4.6.3/dist/runtime/server/renderer/index.js`，实测）：

```js
676: function getPayloadCacheKey(url) {
677: 	const { pathname, search } = new URL(url, "http://localhost");
678: 	return (pathname === "/" ? "/" : pathname.replace(/\/$/, "")) + (search ? encodeURIComponent(search) : "") + ".json";
679: }
```

```js
267:		if (import.meta.prerender && payloadCache) await payloadCache.setItem(getPayloadCacheKey(ssrContext.url), response);
272:		if (payloadCache) await payloadCache.setItem(getPayloadCacheKey(ssrContext.url), renderPayloadResponse(ssrContext, event));
```

**键形态子机理正向实锤**：根路由 `"/"` → `getPayloadCacheKey` = `"/" + "" + ".json"` = **`"/.json"`** → `normalizeKey("/.json")` = `".json"` 非空 ⇒ 1.17.6 `itemKey` 校验**通过**。同一校验下 Nuxt 3 键 `"/"` 抛错、Nuxt 4 键 `"/.json"` 通过——R46/R49（500）vs R45/R51 臂 2（全绿）的分歧点在此。

**异常包裹子机理否定**：`:267`/`:272` 均为裸 `await`，无 try/catch、无 `.catch`（上下文 ：255-285 实读）⇒ Nuxt 4 不是靠吞异常活下来的，是键本身合法。

payloadCache 实例挂载链（全部实测）：

```text
@nuxt/nitro-server@4.6.3/dist/runtime/utils/cache.mjs:10
  const payloadCache = import.meta.prerender ? useStorage("internal:nuxt:prerender:payload") : null;
  （useStorage import 自 "nitropack/runtime" —— cache.mjs 第 1 行 ⇒ unstorage 归位 nitropack@2.13.5 → 1.17.6）
@nuxt/nitro-server@4.6.3/dist/runtime/utils/renderer/options.mjs:3,34
  import { payloadCache, … } from "../cache.mjs"; → 挂入 renderer options
nuxt@4.6.3/dist/runtime/server/renderer/index.js:188
  const payloadCache = runtime.prerender?.payloadCache;
```

⇒ Nuxt 4 的 payload 写入**确实穿过 unstorage 1.17.6 校验**（nitropack 侧实例），键 `"/.json"` 合法故通过——不是换了无校验实例。

## ⑥ content runtime（`@ztl-uwu/nuxt-content@2.14.1` 安装态实读）

```js
// dist/runtime/server/storage.js 第 1-2、10 行（import 链）
import { prefixStorage } from "unstorage";
…
import { useNitroApp, useRuntimeConfig, useStorage } from "#imports";
```

```js
// :136-139（运行时消费，无兜底解析）
const cached = await cache.getItem(id);
if (isProduction && cached) {
	return cached.parsed;
}
// :162-164（写入点，被 .catch 吞）
await cache.setItem(id, { parsed, hash }).catch(() => {});
```

⇒ content 侧的 `prefixStorage` 包装器是 **content 自己 import 的 unstorage 1.17.5（无校验）**；且 cache id 形如文件派生 id（非全斜杠/空），即使走 1.17.6 也不会触发 `Invalid key`（该校验仅对 `normalizeKey` 归空串的 key 抛出）。⇒ **R45「内容库为空」与 unstorage 1.17.6 的 key 校验无关**——FINDINGS #32 发现 5 的「同一个根因、两种表象」表述据此订正（见 [FINDINGS.md](../docs/task-artifacts/experiments/FINDINGS.md) #34 与 #32 ✝️）。

## ⑦ 全链对照表（轴 A 定案）

| 环节                                  | Nuxt 3.21.2（control / R46 / R49 现场）                                                               | Nuxt 4.6.3（R45 / R51 臂 2）                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| renderer 模板                         | `@nuxt/nitro-server@3.21.2` 307 行（payload 内联）                                                    | `@nuxt/nitro-server@4.6.3` 27 行薄壳 + `nuxt/internal/renderer`                                     |
| 生成产物                              | `.nuxt/prerender/chunks/_/renderer.mjs`（523 行，独立 prerender bundle）                              | `.nuxt/prerender` 目录不存在；renderer 运行时化进 `.output`                                         |
| payload 写入调用点                    | 生成产物 :382（直渲，键 = url）+ :390（抽取，三元键）                                                 | `nuxt@…/renderer/index.js:267`（payload 路由）+ :272（抽取）                                        |
| 根路由键                              | **`"/"`** → 1.17.6 校验抛错 → prerender 500                                                           | **`"/.json"`**（`getPayloadCacheKey` 补 `.json` 后缀）→ 校验通过                                    |
| 异常包裹                              | 无（裸 await）                                                                                        | 无（裸 await）——**包裹子机理否定**                                                                  |
| payloadCache 实例                     | 生成物模块作用域 `useStorage("internal:nuxt:prerender:payload")`（nitro 侧 → 1.17.6 于 R46/R49 现场） | `runtime.prerender.payloadCache`（nitro-server cache.mjs → useStorage(nitropack/runtime) → 1.17.6） |
| unstorage 1.17.6 + 同 nitro 2.13.5 下 | **prerender 500**（R46/R49 实测）                                                                     | **构建全绿 + 4 个 `_payload.json`**（R45/R51 臂 2 实测）                                            |

**轴 A 定案**：FINDINGS #33 发现 2 的「Nuxt 4 renderer 模板差异」（原排除法定案）升级为**代码级正向实锤**；R49.md ✝️ 的「未做字节级对比」推断标注就此闭合；两个子机理分辨完成——**键形态子机理成立（实测），异常包裹子机理否定（实测）**。R45 内容库空为另一机理（content runtime 轴 = 轴 B，与 unstorage 1.17.6 校验无关），留待后续实验。
