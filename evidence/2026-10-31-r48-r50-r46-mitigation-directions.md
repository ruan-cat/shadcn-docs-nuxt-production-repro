# R48 / R49 / R50：R46 三规避方向的实证证据（2026-10-31）

> 对应档案：[experiments/R48.md](../docs/task-artifacts/experiments/R48.md)、[R49.md](../docs/task-artifacts/experiments/R49.md)、[R50.md](../docs/task-artifacts/experiments/R50.md)。
> 原始日志（易失）：`%TEMP%\r48-build.log` / `%TEMP%\r49-build.log` / `%TEMP%\r50-build.log` / `%TEMP%\r50-server.log`——本文件为关键原文摘抄，%TEMP% 丢失后以本文件为准。
> control：R48 = main @ `f927b54`；R49 / R50 = main @ `6175702`（其后 docs-only 提交，依赖态相同 = nitro 2.13.4 / unstorage 1.17.5 / content 2.13.9）；R46 失败态参照：nitro 2.13.5 / unstorage 1.17.6 / content 2.13.9 ⇒ prerender 500（[R46.md](../docs/task-artifacts/experiments/R46.md)）。

## R48（钉 unstorage 1.17.5，分支 `experiment/r48-pin-unstorage-1175` @ `5e458e1`）

lockfile 解析证据（override `unstorage: "1.17.5"` + `nitropack: "2.13.5"`）：

```text
grep -c "unstorage@1.17.6" pnpm-lock.yaml  → 0
grep -c "unstorage@1.17.5" pnpm-lock.yaml  → 4
grep -o  "nitropack@2\.13\.[0-9]*"         → nitropack@2.13.5（唯一）
```

构建（`pnpm install` exit 0 / 24.6s → `build:packages` exit 0 → docs build **exit 0**）：

```text
[nitro] ℹ Prerendered 11 routes in 12.081 seconds
✔ Server built in 14676ms
└  ✨ Build complete!
```

产物缓存位（与 control / R46b 同形态，5 条）：

```text
nitro:bundled:cache:content:content-index.json
nitro:bundled:cache:content:parsed:content:1.guide:0.index.md
nitro:bundled:cache:content:parsed:content:1.guide:1.baseline.md
nitro:bundled:cache:content:parsed:content:1.guide:2.failure-domains.md
nitro:bundled:cache:content:parsed:content:index.md
```

探针（`pnpm probe:content apps/docs/.output/server/index.mjs`）：

```text
PASS /api/_content/cache.1793418443932.json (cache) 200 application/json bytes=12244
PASS /api/_content/search-1793418443932 (search) 200 text/plain bytes=6977
…（13/13 PASS，含 4 条 must-404 反向断言）# 全部通过
probe:closure → exit 0
```

## R49（content 2.13.9→2.14.1，分支 `experiment/r49-content-2141-nitro-2135` @ `89c1534`）

解析证据：`apps/docs/node_modules/@ztl-uwu/nuxt-content/package.json` = `"version": "2.14.1"`；unstorage 1.17.6 回归（2 处）+ 1.17.5 共存（2 处，nuxt 自有依赖链）。

构建（install exit 0 / 13.3s → docs build **exit 1**）——堆栈与 R46 逐字节同构：

```text
ERROR [request error] [unhandled] [GET] http://localhost/
 [unstorage] Invalid key: "/"
  [cause]: [unstorage] Invalid key: "/"
    at itemKey (…/unstorage@1.17.6_db0@0.3.4_ioredis@5.11.1/…/unstorage.lWbgcyKt.mjs:102:13)
    at nsStorage.<computed> [as setItem] (…/unstorage.lWbgcyKt.mjs:113:25)
    at Object.render (apps/docs/.nuxt/prerender/chunks/_/renderer.mjs:390:22)
    at async Object.handler (…/.nuxt/prerender/chunks/_/nitro.mjs:2466:22)
    at async Object.handler (…/h3@1.15.11/…/h3/dist/index.mjs:2017:19)

Errors prerendering:
  ├─ / (881ms)
  │ ├── [500] Server Error
  │ └── Linked from /guide
  │ └── Linked from /guide/failure-domains
  │ └── Linked from /guide/baseline
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @repro/docs@0.0.0 build: `nuxt build`  Exit status 1
```

## R50（payloadExtraction:false，分支 `experiment/r50-payload-extraction-off` @ `dac335d`）

结构性取证（拦截点为何不可达，R48 分支构建产物 `renderer.mjs`）：

```js
// apps/docs/.nuxt/prerender/chunks/_/renderer.mjs
108: const NUXT_PAYLOAD_EXTRACTION = true;
188: const payloadCache = useStorage("internal:nuxt:prerender:payload") ;   // ← 模块作用域解析
331: const _PAYLOAD_EXTRACTION = !ssrContext.noSSR && (NUXT_PAYLOAD_EXTRACTION);
390: await payloadCache.setItem(ssrContext.url === "/" ? "/" : ssrContext.url.replace(/\/$/, ""), renderPayloadResponse(ssrContext));
```

⇒ 校验在 unstorage 1.17.6 `prefixStorage` 包装器**内联**（itemKey 先于 driver 委托抛错），包装器由 renderer 模块作用域的 `useStorage()` 创建且每次调用新建 ⇒ nitro 插件 / 自定义 driver / 根 storage patch 均在校验**下游**，字面「拦截改写 key」不可达。唯一可达路径 = 让生成器把 `NUXT_PAYLOAD_EXTRACTION` 置 false（`experimental.payloadExtraction: false`），模板把 ：386 写入分支整体裁剪。

构建（install exit 0 / 12s → docs build **exit 0**）：

```text
[nitro] ℹ Prerendered 7 routes in 12.336 seconds      ← control/R48 为 11
└  ✨ Build complete!
find apps/docs/.output/public -name "_payload.json"   → 0 个
grep -n "NUXT_PAYLOAD_EXTRACTION = " renderer.mjs      → 无输出（变量随 false 分支被模板消除；
                                                          payloadCache 仍在，setItem 仅存于 isRenderingPayload 分支）
```

探针与 SSR 完好性：

```text
probe:content apps/docs/.output/server/index.mjs → 13/13 PASS（含指纹路由 200 与 4 条 must-404）
probe:closure → exit 0
NITRO_PORT=3415 node .output/server/index.mjs → GET / = 200 / 107432 B（control 参照 107359 B，+73 B）
                                                 首页 landing 文案存在（SSR 完好）；3415 端口用后即释，无孤儿进程
```
