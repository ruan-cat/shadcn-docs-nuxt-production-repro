# R52 证据：content 吞异常轴（R45 内容库为空真因）——buildDir 错位实锤（2026-10-31）

> **实验**：R52（R51 轴 B 升格，[R52.md](../docs/task-artifacts/experiments/R52.md)）
> **分支**：`experiment/r52-content-cache-axis`（插桩 `b981900` / 增补 `0f4a…` / N4 版本集合 `a6fab32`）
> **证据等级**：全部**实测**（插桩日志原文 + fs mtime + 产物 grep）；推断处显式标注。
> **日志留存**：`%TEMP%\r52-arm-control-docs.log` / `r52-probe-control.log` / `r52-probe-nuxt4.log` / `r52-probe-nuxt4b.log`（当日抄录如下）。

## ① 静态锚点

- content `module.mjs:261-264`：`nitroConfig.devStorage["cache:content"] = { driver: "fs", base: resolve(nuxt.options.buildDir, "content-cache") }`——**base 由 nuxt.options.buildDir 解析**
- content `module.mjs:640-670`：`build:before` 预热钩子——独立 `createStorage()` 挂 sources + cache:content（fs）→ 把 `content:source` 的**原文**写入 `cache:content:parsed:*`（`key.substring(15)` 剥前缀）——**`.nuxt/content-cache/parsed/*` 的裸 markdown 是设计行为（预热），不是异常**
- content `module.mjs:275-276`：`nitroConfig.bundledStorage.push("/cache/content")`
- nitropack `core/index.mjs:1585`：`_snapshot(nitro)` 在 `buildProduction` 内 **rollup 之前**调用；`:1655-1660` 跳过条件 = bundledStorage 空 **或** `preset === "nitro-prerender"`；`:1083-1097` `snapshotStorage` = `nitro.storage.getKeys(base)` + `getItem` 逐条写 `buildDir/snapshot/`
- content 2.13.9 vs 2.14.1：`dist/runtime/server/storage.js` **逐字相同**（diff exit 0）；`module.mjs` 差异 = **仅版本常量 4 行**（R45「逐行相同」语义成立）

## ② control（N3 + content 2.13.9 + 插桩 b981900）实测

构建 exit 0；fs 时序（full-iso mtime）：`parsed/` 目录 **20:12:51**（预热）→ `parsed/content/index.md` **20:14:11** 内容 = **JSON**（2907 B，`{"parsed":{…}}`）→ `content-index.json` **20:14:12**——**80 秒差 = prerender 时段的运行时回写**；`.nuxt/snapshot/cache/content/` 存在且含全部 JSON；产物 bundled **5 条**。

插桩原文（`r52-probe-control.log`，两实例 buildDir 恒为 `.nuxt`）：

```text
[R52:nitro:init] devStorage=["root","src","content:source:content","cache:content","build","cache"] … cacheContentKeys=["cache:content:content-index.json","cache:content:parsed:content:index.md","cache:content:parsed:content:1.guide:0.index.md","cache:content:parsed:content:1.guide:1.baseline.md","cache:content:parsed:content:1.guide:2.failure-domains.md"]
[R52:nitro:close]（第 1 实例）… cacheContentKeys=[4 条 parsed]        ← index.json 被移除
[R52:nitro:init]（第 2 实例）… cacheContentKeys=[4 条 parsed]          ← fs 已被 prerender 回写为 JSON
[R52:nitro-build-before] devStorage 同上
[R52:prerender:init] … cacheContentKeys=[4 条 parsed]
[R52:nitro:close]（第 2 实例）… cacheContentKeys=[5 条，index.json 重建]
```

**N3 机理**：双 nitro 实例（nitro-prerender preset 独立 bundle 先构建并执行 → runtime `setItem` 落盘 fs 变 JSON → 主 bundle `_snapshot` 读 fs）→ **全程同一 buildDir（`.nuxt`），零错位** → bundled 5 条 → 运行时正常。

## ③ N4 轮（版本集合 `a6fab32` + 同插桩 + 增补 0f4a）实测

构建 exit 0、Prerendered 11 routes；产物 bundled **0 条**（`grep -c "nitro:bundled:cache:content"` = 0，红绿差分：与 R45/R51 臂 2 一致）；根 `.nuxt/content-cache` mtime **20:31:25**（预热时刻）保持裸 markdown；`node_modules/.cache/nuxt/` **整体不存在**。

插桩增补轮原文（`r52-probe-nuxt4b.log`，**base 值对比 = 断点铁证**）：

```text
[R52:nitro:init] buildDir=…/apps/docs/.nuxt cacheContentBase={"driver":"fs","base":"…/apps/docs/.nuxt/content-cache"} sourceBase={"…base":"…/apps/docs/content"} cacheContentKeys=[4 条 parsed]   ← 第 1 实例：旧 buildDir，能读到预热
[R52:nitro:close]（第 1 实例）buildDir=…/apps/docs/.nuxt … cacheContentKeys=[4 条 parsed]
[R52:nitro:init]（第 2 实例）buildDir=…/apps/docs/node_modules/.cache/nuxt/.nuxt cacheContentBase={"driver":"fs","base":"…/apps/docs/node_modules/.cache/nuxt/.nuxt/content-cache"} sourceBase=…/apps/docs/content cacheContentKeys=[]   ← ★ 主 bundle：新 buildDir，读空
[R52:nitro-build-before] buildDir=…/apps/docs/node_modules/.cache/nuxt/.nuxt cacheContentBase={"driver":"fs","base":"…/apps/docs/node_modules/.cache/nuxt/.nuxt/content-cache"}
[R52:prerender:init] buildDir=…/apps/docs/node_modules/.cache/nuxt/.nuxt … cacheContentKeys=[]    ← prerender 挂在读空的实例上
[R52:nitro:close]（第 2 实例）buildDir=…/apps/docs/node_modules/.cache/nuxt/.nuxt … cacheContentKeys=[]   ← 全程空
```

（base 已缩略 `D:/code/ruan-cat/shadcn-docs-nuxt-production-repro` → `…`，其余逐字。）

## ④ 因果链定案（R45 判负真因闭合）

1. **Nuxt 4 把 nitro 主 bundle 实例的 buildDir 改写为 `node_modules/.cache/nuxt/.nuxt`**（N3 恒为 `.nuxt`）——content 模块的 devStorage base 由 `nuxt.options.buildDir` 解析 → **随实例错位**。
2. content `build:before` 预热发生在 buildDir 改写前 → 裸 markdown 落在**旧** buildDir（`.nuxt/content-cache`，mtime 20:31:25）。
3. 主 bundle 实例的 `cache:content` 指向**新** buildDir 空目录 → `_snapshot` 读空 → **bundled 零条**（`.nuxt/snapshot` 不存在于两处 buildDir——零数据不 mkdir）。
4. prerender 期（挂在读空实例上）：`cache.getItem` miss（空目录）→ `sourceBase`（`apps/docs/content`，绝对路径，不受错位影响）命中 → 解析成功 → **页面渲染成功（假绿面）** → `setItem` 回写目标 = 新 buildDir 目录 → **`node_modules/.cache/nuxt/` 整体不存在 = 写丢失**，被 content `storage.js:163` 的 `.catch(() => {})` 吞（次级环节：workerd 内 fs 写的确切去向待深挖，不影响主结论）。
5. 生产运行时：bundled 空 → `cache:content:parsed` 无数据 → Content API 全空集合（R45 现象完全解释）；`content-index.json` 缺失同源。
6. **N3 无错位**（双实例同 buildDir）→ 全链正常。R45 的「未归因部分（control 为何写 JSON）」就此闭合：**不是 content 写入行为不同，是 N4 的快照读取目录错位**。
