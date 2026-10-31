# F48 上游 Issue（**已提交**：[nuxt/nuxt#36792](https://github.com/nuxt/nuxt/issues/36792)，2026-10-31 用户授权）

> **状态**：✅ **已提交**——主 issue = [nuxt/nuxt#36792](https://github.com/nuxt/nuxt/issues/36792)（F48 全文）；**F50 增补评论** = [issuecomment-6543587139](https://github.com/nuxt/nuxt/issues/36792#issuecomment-6543587139)（R52 buildDir 错位定案）。下方草稿保留为提交内容的存档底稿（投递版以英文撰写）。
> **证据链状态**：零推断环节（R51 轴 A 键形态分歧点代码级实锤，2026-10-31；R52 轴 B buildDir 错位实测）。
> **建议投向**：首选 **nuxt**（renderer 模板键形态是 Nuxt 侧产物，Nuxt 4 已隐性修复而 Nuxt 3 维持现状）；CC **unenv/unstorage**（校验只看 key 部分忽略非空 base 的语义问题）。草稿以 nuxt 仓为靶撰写，投 unstorage 时替换「标题/落点」两节。

---

## Title（nuxt 仓）

```plain
prerender 500 `[unstorage] Invalid key: "/"` with nitropack >= 2.13.5 (unstorage 1.17.6): Nuxt 3 renderer passes root payload key "/", Nuxt 4 already switched to "/.json" via getPayloadCacheKey
```

## Title（unstorage 仓，备用）

```plain
prefixStorage itemKey validation rejects non-empty physical keys when base is set: normalizeKey("/") === "" throws even though base + "/" is a valid key
```

## Environment

| 项               | 值                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| nuxt             | 3.21.2（`@nuxt/nitro-server@3.21.2`，模板 307 行）vs 4.6.3（27 行薄壳 + `nuxt/internal/renderer`） |
| nitropack        | 2.13.5（2.13.4 不触发——其 unstorage 为 1.17.5）                                                    |
| unstorage        | **1.17.6**（触发）/ 1.17.5（不触发）                                                               |
| @nuxt/content    | 2.13.9 / 2.14.1（均触发，与 content 版本无关）                                                     |
| Node / pnpm / OS | 22.x / 10.33.0 / Windows 11 + Linux CI（Ubuntu 24.04）双平台复现                                   |

## Minimal reproduction

仓库 `ruan-cat/shadcn-docs-nuxt-production-repro`（复现实验室，全部实验单变量留档）：

- **触发**：`experiment/r46-nitro-2135-bump`（nitro 2.13.4→2.13.5 单点 bump，唯一依赖增量 = unstorage ^1.17.5→^1.17.6）→ `pnpm build:docs` → prerender 500。
- **三重对照**（同仓同机）：R46b（nitro 2.13.5 + 钉 unstorage 1.17.5）全绿；R49（content 2.14.1 + 失败态）同签名 500；R48（钉 1.17.5）全绿。

## Root cause analysis（字节级证据链）

1. **unstorage 1.17.6**（`dist/shared/unstorage.lWbgcyKt.mjs:92-105`）给 `prefixStorage` 包装器新增 `itemKey(key)` 校验：

   ```js
   const itemKey = (key) => {
   	if (!normalizeKey(key)) {
   		throw new Error(`[unstorage] Invalid key: ${JSON.stringify(key)}`);
   	}
   	return base + key;
   };
   ```

   `normalizeKey("/")` → `":"` → `""` ⇒ falsy ⇒ 抛错。**1.17.5 的包装器是 `storage[property](base + key, …)`，无任何校验。**

2. **Nuxt 3 生成 renderer**（`.nuxt/prerender/chunks/_/renderer.mjs:390`）的 payload 抽取写入键为内联三元：

   ```js
   await payloadCache.setItem(
   	ssrContext.url === "/" ? "/" : ssrContext.url.replace(/\/$/, ""),
   	renderPayloadResponse(ssrContext),
   );
   ```

   根路由键 = `"/"` ⇒ `itemKey("/")` 抛错 ⇒ prerender 500（报错栈 `renderer.mjs:390:22`，R46/R49 逐字节同构）。同文件 `:382` 的 payload 直渲路由键（`/guide/_payload.json` 类）合法——失败只在根路由抽取写入。

3. **Nuxt 4 已隐性改变键形态**：写入迁入 `nuxt@4.6.3/dist/runtime/server/renderer/index.js:676-679`：

   ```js
   function getPayloadCacheKey(url) {
   	const { pathname, search } = new URL(url, "http://localhost");
   	return (
   		(pathname === "/" ? "/" : pathname.replace(/\/$/, "")) + (search ? encodeURIComponent(search) : "") + ".json"
   	);
   }
   ```

   根路由键 = `"/.json"` ⇒ `normalizeKey` 非空 ⇒ **同一校验通过**。且 `@nuxt/nitro-server@4.6.3` 的 renderer 模板仅 27 行薄壳（`createNuxtRenderer("nuxt/internal/renderer")`），payload 内联逻辑消失；Nuxt 3 的独立 prerender bundle（`.nuxt/prerender/chunks/_/`）布局随之消失。

4. **两侧写入点均无异常包裹**（N3 `:382`/`:390`、N4 `:267`/`:272` 均裸 await）——不是 catch 差异，是键形态差异。

5. **content runtime 无涉**：`@nuxt/content` 2.13.9/2.14.1 自 import 的 unstorage 解析为 1.17.5（symlink 实测），其 `storage.js:163` 的 `.catch(() => {})` 吞的不是 `Invalid key`。

## Impact

- Nuxt 3 + nitro ≥2.13.5（即当前 Nuxt 3 latest 依赖解析面）**生产构建必失败**（prerender 500）。
- 同一依赖态在 Nuxt 4 构建全绿但 **content runtime 存在独立的「内容库为空」阻断**（与本校验无关、机理未归因）——Nuxt 4 迁移 ≠ 解脱。

## Suggested fixes

1. **unstorage 侧**：`itemKey` 校验考虑 base 语义——base 非空时 `normalizeKey(key) === ""` 的物理键 `base + key` 仍非空且有意义（如根路由 payload 挂在前缀命名空间下），可放宽为仅当**物理键**归空才抛，或对 `"/"` 提供规范 escape。
2. **nuxt 侧**：Nuxt 3 的 renderer 模板把根路由键对齐到 Nuxt 4 形态（`getPayloadCacheKey` 的 `".json"` 后缀方案已在 Nuxt 4 验证）。

## Workarounds（已实证）

| 方案                                    | 形态                           | 代价                                                     |
| --------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| root override 钉 `unstorage: 1.17.5`    | workspace 全局钉               | 全保真；nitro 未来升级须重评                             |
| `experimental.payloadExtraction: false` | 调用点消除（模板裁剪写入分支） | prerender 11→7 路由、4 个 `_payload.json` 消失；SSR 完好 |
| content 升级 2.13.9→2.14.1              | ❌ 无效                        | 同签名 500（失败在 Nuxt renderer）                       |

## Evidence links（本仓留档，中文）

- 故障条目：`docs/task-artifacts/failure-catalog.md` **F48**；横向发现 FINDINGS **#32 / #33 / #34**
- 单变量档案：R46（归因）/ R46b（钉对照）/ R48 / R49 / R50（规避）/ R51（renderer 字节级对比）
- 字节级证据：`evidence/2026-10-30-r46-nitro-2135-attribution.md`、`evidence/2026-10-31-r48-r50-r46-mitigation-directions.md`、`evidence/2026-10-31-r51-axis-a-renderer-byte-diff.md`
- 实验分支（全部推送备份）：`experiment/r46-nitro-2135-bump` / `r48-pin-unstorage-1175` / `r49-content-2141-nitro-2135` / `r50-payload-extraction-off`
