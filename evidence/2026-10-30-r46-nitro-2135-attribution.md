# R46 证据：nitro 2.13.5 单点 bump 复现故障，根因精确到 `unstorage@1.17.6` 的 key 校验收紧

- 日期：2026-10-30
- 环境：Windows 10.0.19045 / Node v22.23.1 / pnpm 10.33.0
- 基线：`845e6b3`（main，control = Nuxt 3.21.2 / nitropack 2.13.4 / content 2.13.9 / h3 1.15.11）
- 实验分支：`experiment/r46-nitro-2135-bump`（提交 `b1e0bb8`，**未 push**）
- 部署额度消耗：0（未 push、未触发云端部署）
- 关联：[R46.md](../docs/task-artifacts/experiments/R46.md)、[FINDINGS #32](../docs/task-artifacts/experiments/FINDINGS.md)

## 三臂对照

| 臂       | nitropack  | unstorage  | docs build                        | probe:content          | 缓存位形态            | 产物 `nitro:bundled:cache:content:*` |
| -------- | ---------- | ---------- | --------------------------------- | ---------------------- | --------------------- | ------------------------------------ |
| control  | 2.13.4     | 1.17.5     | exit 0                            | exit 0，13/13 PASS     | `{parsed, hash}` JSON | 5 条                                 |
| **R46**  | **2.13.5** | **1.17.6** | **exit 1**（prerender 500）       | 未进行（无可用产物）   | —                     | —                                    |
| **R46b** | 2.13.5     | **1.17.5** | **exit 0**，Prerendered 11 routes | **exit 0，13/13 PASS** | `{parsed, hash}` JSON | 5 条                                 |

⇒ 根因**精确到 `unstorage@1.17.6`**，与 nitro 2.13.5 的其它改动无关。

## R46 故障原文

```plain
[request error] [unhandled] [GET] http://localhost/
  [unstorage] Invalid key: "/"
    at itemKey (…/unstorage@1.17.6_db0@0.3.4_ioredis@5.11.1/node_modules/unstorage/dist/shared/unstorage.lWbgcyKt.mjs:102:13)
    at nsStorage.<computed> [as setItem] (…/unstorage.lWbgcyKt.mjs:113:25)
    at Object.render (apps/docs/.nuxt/prerender/chunks/_/renderer.mjs:390:22)
    at runNextTicks (node:internal/process/task_queues:64:5)
    …
  [cause]: [unstorage] Invalid key: "/"
```

构建输出（同一次）：

```plain
•  Nuxt 3.21.2 (with Nitro 2.13.5, Vite 7.3.6 and Vue 3.5.30)
│  ├─ server built (16.2s)
[nitro] Initializing prerenderer
[nitro] Prerendering 6 initial routes with crawler
[request error] [unhandled] [GET] http://localhost/
[500] Server Error
Errors prerendering:
│  ├── [500] Server Error
```

**红绿差分自证**：移除诊断脚手架（`apps/docs/modules/r46-diag.ts`）后**仍稳定复现同一 500**
（`%TEMP%\r46-nodiag-build.log`）⇒ 故障与脚手架无关。

## 字节级根因取证

### ① nitro 2.13.5 的唯一依赖增量

```jsonc
// nitropack@2.13.4/package.json
"unstorage": "^1.17.5"
// nitropack@2.13.5/package.json
"unstorage": "^1.17.6"
```

nitro 自身在 storage 全链路上两版**逐字相同**（`core/index.mjs` 的 `createStorage` / `snapshotStorage` /
`_snapshot` / `buildProduction` / `build`，`rollup/index.mjs` 的 `storage(nitro)` / `resolveStorageOptions`）。

### ② unstorage 1.17.5 的 `prefixStorage`（无校验）

`unstorage@1.17.5/dist/shared/unstorage.zVDD2mZo.mjs:86-97`

```js
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) { return storage; }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      storage[property](base + key, ...args)      // ← 无 key 校验
    );
  }
```

### ③ unstorage 1.17.6 的 `prefixStorage`（新增校验）

`unstorage@1.17.6/dist/shared/unstorage.lWbgcyKt.mjs:92-115`

```js
function prefixStorage(storage, base) {
  if (base?.includes("?")) { throw new Error(`[unstorage] Invalid base: ${JSON.stringify(base)}`); }
  base = normalizeBaseKey(base);
  if (!base) { return storage; }
  const itemKey = (key) => {
    if (!normalizeKey(key)) {
      throw new Error(`[unstorage] Invalid key: ${JSON.stringify(key)}`);   // ← 新增
    }
    return base + key;
  };
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = nonItemKeyProperties.has(property) ? (key = "", ...args) => (
      storage[property](base + key, ...args)
    ) : async (key = "", ...args) => (
      storage[property](itemKey(key), ...args)   // ← 走校验
    );
  }
```

### ④ `"/"` 恰好被判非法

`unstorage@1.17.6/…:138-143`

```js
function normalizeKey(key) {
	if (!key) {
		return "";
	}
	return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
```

`"/"` → `":"` → `""` ⇒ **falsy** ⇒ `itemKey("/")` 抛 `Invalid key: "/"`。

## 为什么 R45 是「内容库为空」而 R46 是「prerender 500」

同一个缺陷，差别只在**该 `setItem` 调用点是否被 catch 包裹**：

| 调用点                                               | 是否被 catch 包裹                   | 表象                               |
| ---------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| content runtime `dist/runtime/server/storage.js:163` | ✅ `.catch(() => {})`——**静默吞掉** | JSON 写不回缓存位 ⇒ **内容库为空** |
| nitro prerender 写根路由 payload（key = `"/"`）      | ❌ 未包裹                           | 直接抛 ⇒ **prerender 500**         |

content 侧代码（`@ztl-uwu/nuxt-content@2.13.9/dist/runtime/server/storage.js:156-169`）：

```js
if (!pendingPromises[id + hash]) {
	pendingPromises[id + hash] = new Promise(async (resolve) => {
		const body = await source.getItem(id);
		if (body === null) {
			return resolve({ _id: contentId, body: null });
		}
		const parsed = await parseContent(contentId, body);
		await cache.setItem(id, { parsed, hash }).catch(() => {
			// ← 异常被吞
		});
		resolve(parsed);
		delete pendingPromises[id + hash];
	});
}
```

而 `getContent` 的生产分支（`storage.js:136-139`）：

```js
const cached = await cache.getItem(id);
if (isProduction && cached) {
	return cached.parsed; // 缓存位若是裸 markdown ⇒ undefined
}
```

⇒ **完整因果链**

1. content 的 `build:before`（`module.mjs:640-667`）把**裸 markdown** 拷进 `cache:content:parsed:*`；
2. 运行时 `getContent` 解析出 `{parsed, hash}` 后**回写**同一缓存位（这一步在 unstorage 1.17.5 下**成功**，从而把原文覆盖成 JSON）；
3. `_snapshot` 把缓存位快照进产物（`nitro:bundled:cache:content:*`）；
4. 生产运行时 `isProduction && cached` ⇒ `return cached.parsed` ⇒ **有内容**（control）。

在 unstorage 1.17.6 下：

1. 同上，第 1 步不变（裸 markdown）；
2. **第 2 步的 `setItem` 抛 `Invalid key` 并被 `.catch(() => {})` 吞掉** ⇒ JSON 永远写不回去；
3. `_snapshot` 抄走**裸 markdown**；
4. 生产运行时 `cached.parsed === undefined` ⇒ **内容库为空**（R45）；或该写入点未包裹 ⇒ **prerender 500**（R46）。

## 诊断脚手架记录（实验脚手架，不进任何提交）

R46 期间临时新增 `apps/docs/modules/r46-diag.ts`（Nuxt module），用于观测：

- `nitro.options.bundledStorage = ["/cache/content"]` ⇒ **门 A 通过**（bundledStorage 非空）
- `nitro.options.storage keys = ["data"]` ⇒ 生产 storage **只有 `data`**
- `nitro.options.devStorage keys = ["root","src","content:source:content","cache:content"]`
  ⇒ content 的两个 mount 只在 **devStorage**（构建期 `createStorage` 会把 `storage` + `devStorage` 合并，故构建期可读）
- `nitro.options.preset = "node-server"`

该文件在实验结束后已**删除**，**未进入任何提交**（工作区已复验 `git status` 无残留）。

## 收尾状态

- 实验分支 `experiment/r46-nitro-2135-bump` 保留代码现场（`b1e0bb8`），**未 push**；
- main 已恢复 control 安装态：`node_modules/.pnpm` **1209** 项、`nuxt.mjs` ✓、`tsc` ✓、
  `nuxt = 3.21.2` / `content = 2.13.9` / `nitropack = 2.13.4` / `unstorage = 1.17.5`；
- 隔离目录按 §0.5.5 保留在仓内（`node_modules.stale-*` 已被 `.gitignore` 覆盖），物理清理由用户/主代理执行。
