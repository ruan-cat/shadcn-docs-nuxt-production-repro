# 2026-10-30 R22 遗留验证项闭合：trace:false 产物的运行时与可移植性实测

> 触发：[R22.md](../docs/task-artifacts/experiments/R22.md) 的「遗留验证项（未完成，不得当作已验证）」第 1 条 ——「运行时是否真 500 尚未实测」。
> 本文件是该遗留项的**闭合证据**（追加式；原档案原文保留不改写）。
> 关联台账：[FINDINGS #25](../docs/task-artifacts/experiments/FINDINGS.md) 发现 7（订正/深化）。

## 1. 补测环境与口径

| 项             | 值                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 执行位置       | **`.worktrees/r22`**（自带 R22 变量 `nitro.externals.trace = false` + 根 `experiment.json` + 独立 `node_modules`）       |
| 主工作区       | 全程留在 `main`（`8bd3f5b`），**未与本轮构建并发**（F43）                                                                |
| 分支 / 提交    | `experiment/r22-linux-trace-false` @ `8be7e3c`（已推送）                                                                 |
| 唯一变量       | `apps/docs/nuxt.config.ts` 的 `nitro.externals.trace = false` + 根 `experiment.json`（**未改 manifest、未改 lockfile**） |
| install        | `pnpm install --frozen-lockfile` → **exit 0 / 32s** / `.pnpm` = **1209** / `apps/docs/node_modules/nuxt/bin/nuxt.mjs` ✓  |
| build:packages | exit 0 / 4s                                                                                                              |
| build:docs     | **exit 0 / 98s**（`Server built in 22266ms` / `Prerendered 11 routes in 18.509 seconds` / `✨ Build complete!`）         |
| control 参照   | 主工作区 `apps/docs/.output`（R44c 控制组产物，同一 lockfile）                                                           |
| 运行时探针     | `%TEMP%\r22-runtime\r22-runtime-probe.ps1`（启产物 → 等 `Listening` → curl → 定向收尾）                                  |
| 可移植性探针   | `%TEMP%\r22-runtime\r22-portability-test.ps1`（改名隔离 `.pnpm` → 启产物 → 撤销隔离 → 复验）                             |

## 2. 产物形态对照（control vs R22）

| 项                                                         | control（R44c 产物）                                                                                                 | R22（trace:false）                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `.output` 总文件数                                         | **1790**                                                                                                             | **455**                               |
| `.output/server/package.json`                              | **存在**                                                                                                             | **不存在**                            |
| `.output/server/node_modules/`                             | **存在**                                                                                                             | **不存在**                            |
| `.output/server/` 顶层                                     | `chunks/` `index.mjs` `index.mjs.map` `package.json` `node_modules/`                                                 | `chunks/` `index.mjs` `index.mjs.map` |
| 裸包名导入（`from "x"` / `import("x")`，排除 `.`/`node:`） | **5 种**：`vue` x2、`ufo`、`@vue/devtools-api`、`node-mock-http/_polyfill/buffer`、`node-mock-http/_polyfill/events` | **0 种**                              |
| `file://` 绝对路径导入                                     | 0                                                                                                                    | **大量**（见 §3）                     |

⇒ `probe:closure`（`probes/inspect-artifact-closure.ts:77-79`）在 R22 上必然于**第一步**抛「缺少 docs standalone manifest」→ 与 Linux CI run `41039962323` 的实测一致。

## 3. ✝️ 机理订正：R22 产物用的是 `file://` 绝对路径，不是裸包名

`search.mjs` 头部逐行对照：

**control**（裸包名 → 由 `.output/server/node_modules` 拷贝层提供 → **可移植**）：

```js
import { s as serverQueryContent$1 } from "./storage.mjs";
import "./nitro.mjs";
import "unified";
import "remark-parse";
import "remark-rehype";
import "remark-mdc";
import "remark-gfm";
import "rehype-external-links";
import "remark-sort-attribute-values";
import "remark-sort-attributes";
import "remark-raw";
import "detab";
```

**R22**（`file://` 指向**构建机**的 pnpm store → **不可移植**）：

```js
import { s as serverQueryContent$1 } from './storage.mjs';
import './nitro.mjs';
import 'file://D:/code/ruan-cat/shadcn-docs-nuxt-production-repro/.worktrees/r22/node_modules/.pnpm/unified@11.0.5/node_modules/unified/index.js';
import 'file://D:/code/ruan-cat/shadcn-docs-nuxt-production-repro/.worktrees/r22/node_modules/.pnpm/remark-parse@11.0.0/node_modules/remark-parse/index.js';
import 'file://D:/code/ruan-cat/shadcn-docs-nuxt-production-repro/.worktrees/r22/node_modules/.pnpm/remark-rehype@11.1.2/node_modules/remark-rehype/index.js';
import 'file://D:/code/ruan-cat/shadcn-docs-nuxt-production-repro/.worktrees/r22/node_modules/.pnpm/remark-mdc@3.11.1/node_modules/remark-mdc/dist/index.mjs';
import 'file://D:/code/ruan-cat/shadcn-docs-nuxt-production-repro/.worktrees/r22/node_modules/.pnpm/remark-gfm@4.0.1/node_modules/remark-gfm/index.js';
...
```

**源码依据**（`nitropack@2.13.4/dist/rollup/index.mjs`）：

- `:392-398` —— `if (opts.trace === false) { return { ...resolved, id: isAbsolute(resolved.id) ? normalizeid(resolved.id) : resolved.id, external: true }; }`
  ⇒ external 的 **`id` 被写成绝对路径**（不是包名），这正是 `file://` 绝对路径的来源。
- `:434-437` —— `async buildEnd() { if (opts.trace === false) { return; } … }`
  ⇒ 直接 return ⇒ **跳过** NFT trace、**跳过** `.output/server/node_modules` 拷贝层、**跳过** standalone `package.json` 写出。

## 4. 运行时实测：本机不是 500

```plain
[server] Listening on http://127.0.0.1:3413
HTTP /                    -> code=200 bytes=107359
HTTP /api/_content/query  -> code=200 bytes=11927
HTTP /no-such-page-xyz    -> code=404 bytes=159
   body: { "error": true, "statusCode": 404, "statusMessage": "Page Not Found", "message": "Page Not Found" }
```

`bytes=107359` 与 Linux control CI 的 `HTTP 200 OK bytes=107359` **完全同量** ⇒ 本机运行时**与 control 无差异**。

## 5. 决定性实验：换机模拟（改名隔离 `.pnpm`）

`node_modules/.pnpm` 被**改名隔离**（= 目标机器上不存在这些绝对路径）后启动产物：

```plain
--- portable-isolated : alive=False ready=False
    stderr (last 12):
          at finalizeResolution (node:internal/modules/esm/resolve:275:11)
          at moduleResolve (node:internal/modules/esm/resolve:861:10)
          at defaultResolve (node:internal/modules/esm/resolve:985:11)
          at ModuleLoader.resolve (node:internal/modules/esm/loader:724:38)
          at ModuleJob._link (node:internal/modules/esm/module_job:182:49) {
        code: 'ERR_MODULE_NOT_FOUND',
        url: 'file:///D:/code/ruan-cat/shadcn-docs-nuxt-production-repro/.worktrees/r22/node_modules/.pnpm/unified@11.0.5/node_modules/unified/index.js'
      }
```

⇒ **进程直接启动失败**，连 `Listening` 都打不出来 —— **不是 500，是起不来**。

**撤销隔离与复验**（脚本 `finally` 块）：

```plain
=== RESTORE .pnpm
  restored .pnpm ; count=1209
```

独立复验：`pnpm_count=1209` / `stale_exists=False` / `nuxt_mjs=True` / `tsc=True`。

## 6. 跨平台一致性（chunk 字节数）

| chunk                     | control | R22（本机 Windows） | 变化        | Linux CI 变化 | 方向一致 |
| ------------------------- | ------- | ------------------- | ----------- | ------------- | -------- |
| `chunks/_/search.mjs`     | 3180    | 6588                | **+107.2%** | +124%         | ✅       |
| `chunks/_/query.mjs`      | 3437    | 5859                | **+70.5%**  | +83%          | ✅       |
| `chunks/_/navigation.mjs` | 3768    | 6320                | **+67.7%**  | +79%          | ✅       |
| `index.mjs`               | 2090    | 4512                | **+115.9%** | 0             | ✅       |
| `chunks/_/storage.mjs`    | 44948   | 46349               | +3.1%       | +3.6%         | ✅       |
| `chunks/_/nitro.mjs`      | 333876  | 336465              | +0.8%       | —             | —        |

⇒ **机理两平台一致**；chunk 变大的根因就是**每条 import 从 `"unified"` 变成一条长的绝对路径**。

## 7. 结论（对遗留项的正式回答）

1. **「trace:false → 运行时 500」应订正为「trace:false → 产物不可移植，换机启动即崩」**。本机 200 是**构建机视角**的假绿。
2. **产物闭包检查必须三查**：①裸包名导入；②`file://` 绝对路径导入；③standalone `package.json` + `.output/server/node_modules` 拷贝层存在性。只查①会把不可移植产物判成自包含。
3. **R21 的「零裸导入」与 R22 的「零裸导入」同源**（`file://` 路径不被裸导入口径捕获）⇒ 「Windows 与 Linux 行为不同」的怀疑可撤销；但 R21 提交内容未经字节级复核，**该解释只覆盖「零裸导入」这一条观测**。
4. **`probe:closure` 的价值再次被实证**：它在产物形态被破坏时**第一步就失败**并给出精确路径 —— 比等运行时崩溃更早、更可诊断。

## 8. 证据文件路径

| 路径                                                                       | 内容                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `%TEMP%\r22-runtime\install.log` / `build-packages.log` / `build-docs.log` | 本轮 install 与两次构建的完整 stdout/stderr                         |
| `%TEMP%\r22-runtime\r22-runtime-probe.ps1`                                 | 运行时探针（启产物 → curl → 定向收尾）                              |
| `%TEMP%\r22-runtime\r22-runtime-probe.ps1` 的产物                          | `r22-trace-false.out.log` / `.err.log` / `r22-trace-false_.body` 等 |
| `%TEMP%\r22-runtime\r22-portability-test.ps1`                              | 可移植性探针（改名隔离 `.pnpm` → 启产物 → 撤销 → 复验）             |
| `%TEMP%\r22-runtime\portable-baseline.*` / `portable-isolated.*`           | 两轮的启动日志与 stderr 原文（含 `ERR_MODULE_NOT_FOUND` 全文）      |
| `%TEMP%\r22-runtime\portable-isolated.home.html`                           | 隔离轮未产出响应体（进程未起来）                                    |

> 仓内保留物：`.worktrees/r22/apps/docs/.output`（R22 产物本体）、`.worktrees/r22/apps/docs/.nuxt`（均 gitignored，保留作证据）。
