# 2026-10-30 R32（debug 真实入场轴）dev 观测证据

> 触发：C 类未启动实验池的 **R32**（原「复现 debug 包 ESM/CJS 入口问题」）——2026-10-30 重新界定为**轴 B：debug 真实入场轴**。
> 关联档案：[R32](../docs/task-artifacts/experiments/R32.md)｜台账：[FINDINGS](../docs/task-artifacts/experiments/FINDINGS.md)、[QUEUE](../docs/task-artifacts/experiments/QUEUE.md)
> 前置依据：[FINDINGS #22](../docs/task-artifacts/experiments/FINDINGS.md)（`debug` **非** `mermaid@11.17.2` 的传递依赖 → R31-family 不覆盖 R32）

## 1. control 与环境

| 项                                     | 值                                                                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| control SHA（main）                    | `8bd3f5b`（`main`，实验臂期间 HEAD 未动）                                                                                                                                                             |
| experiment SHA                         | `6fc2398`（`experiment/r32-debug-esm-cjs`，已推送远端）                                                                                                                                               |
| 唯一变量                               | `apps/docs/package.json` 增加 **1 行** `"debug": "4.4.3"`；`pnpm-lock.yaml` diff **恰好 3 行**（`apps/docs` importer 增 `debug: specifier 4.4.3 / version 4.4.3`，复用同一 store 条目，无第二份副本） |
| 未改动                                 | theme / `nuxt.config.ts` / 契约文件 / `experiment.json`（**未建** —— `debug` 不在 `control.docsDependencies` 管控面）                                                                                 |
| OS                                     | Microsoft Windows 10 专业版 10.0.19045.0（x64）                                                                                                                                                       |
| CPU                                    | i3-12100F，4 核 / 8 逻辑处理器                                                                                                                                                                        |
| Node / pnpm                            | v22.23.1 / 10.33.0                                                                                                                                                                                    |
| node_modules 健康度                    | `.pnpm` = **1209**（期望 1209 ✅）、`apps/docs/node_modules/nuxt/bin/nuxt.mjs` ✅、`packages/shared-core/node_modules/typescript/bin/tsc` ✅                                                          |
| `git diff main -- pnpm-workspace.yaml` | 空（无任何 linker 拼写变体）                                                                                                                                                                          |
| install（实验臂）                      | `pnpm install --frozen-lockfile` → **exit 0 / 7s** / `.pnpm` = 1209 / `apps/docs/node_modules/debug/package.json` 存在且 `version=4.4.3`                                                              |
| install（回基线）                      | `git checkout main` + `pnpm install --frozen-lockfile` → **exit 0 / 6.2s** / `.pnpm` = 1209 / `apps/docs/node_modules/debug` **已消失**                                                               |
| control 臂 install                     | **未重装**（§0.5.1 体检全绿 → 健康态不碰 `node_modules`）                                                                                                                                             |
| 观测方式                               | **仅 `nuxt dev`**（端口：control = 3311，实验 = 3312）；生产链路上 `vite.optimizeDeps` 已失效（Vite 5.1+ 移除 build 期 deps optimization）                                                            |
| 探针脚本                               | `%TEMP%\r32probe\r32-dev-probe.ps1`（两臂**同一份脚本**）                                                                                                                                             |

## 2. 环境噪声处置：为什么实验臂不用 worktree

首轮 dev 观测在 `.worktrees/r32` 内进行，实测该 worktree **自身带 6 条**：

```plain
ERROR Pre-transform error: Failed to resolve import "#app-manifest" from ".../nuxt/dist/app/composables/manifest.js?v=0954047c"
```

（`nuxt/dist/app/composables/manifest.js:12` 的 `if (false) { manifest = import("#app-manifest") }` 死分支仍被 Vite 静态解析 → 需 `.nuxt` 侧的 app-manifest 别名）

⇒ worktree 与主工作区**不同环境类**，跨环境对照会引入不可比噪声。
**处置**：`git -C .worktrees/r32 checkout --detach`（**不删目录**，释放分支占用）→ 主工作区 `git checkout experiment/r32-debug-esm-cjs` → **双臂均在主工作区、同一探针、同一端口族**。

## 3. ⚠️ 探针路径订正（首轮踩坑，已改正）

「预期结果」表原先写的观测落点是 `apps/docs/node_modules/.vite/deps/*`——**该路径在本仓不存在**。
本仓 Vite 7 + Nuxt 3.21 的 **client 依赖预打包缓存实际落点**：

```text
apps/docs/node_modules/.cache/vite/client/deps/
├── _metadata.json
├── debug.js        (仅实验臂)
├── debug.js.map    (仅实验臂)
├── errx.js
├── errx.js.map
├── chunk-Q4AC2O6Z.js  (仅实验臂)
└── package.json
```

首轮探针沿用错误路径 → **误报「metadata 不存在」**。这是**探针路径错**，不是现象缺失。
**处置**：修正路径后**重跑 control 臂**（Arm A2），确认两臂口径一致，才采纳实验臂结果。

> 另：首轮探针的 dev 就绪判定用正则 `Local:\s+http` —— Nuxt 输出带 ANSI 码（`Local:` 与 `http` 之间夹了 `[39m [36m[4m`）→ 正则不匹配 → 白等满 180s 超时。修正为只认 `Local:`。

## 4. 双臂对照结果（逐项）

| 观测点                                                                                                                                       | Arm A2（control，main `8bd3f5b`）                                                                                                                                                              | Arm B（R32，`debug@4.4.3`）                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| stderr：`Failed to resolve dependency: debug, present in client 'optimizeDeps.include'`                                                      | **命中 1 条**                                                                                                                                                                                  | **0 条（消失）**                                                                                                            |
| 其余 `optimizeDeps.include` 悬空告警                                                                                                         | **9 条**：`@nuxt/content > @nuxtjs/mdc > remark-gfm` / `remark-emoji` / `remark-mdc` / `remark-rehype` / `rehype-raw` / `parse5` / `unist-util-visit` / `unified` ＋ `@nuxt/content > slugify` | **同样 9 条，逐条一致**                                                                                                     |
| stderr 命中行数 / 总行数                                                                                                                     | 10 / 30                                                                                                                                                                                        | 9 / 27                                                                                                                      |
| `deps/_metadata.json` 的 `optimized` 键                                                                                                      | `errx`                                                                                                                                                                                         | **`debug, errx`**                                                                                                           |
| `deps/` 文件清单                                                                                                                             | `errx.js`(1489 B)+map、`package.json`、`_metadata.json`(352 B)                                                                                                                                 | `chunk-Q4AC2O6Z.js`(288 B)+map、**`debug.js`(13951 B)**+map、`errx.js`(1520 B)+map、`package.json`、`_metadata.json`(626 B) |
| dev 首页 HTTP                                                                                                                                | `200` / 26699 B                                                                                                                                                                                | `200` / 27717 B                                                                                                             |
| dev 首页**主体**（剥离 `data-nuxt-logs` 块）                                                                                                 | 25680 B                                                                                                                                                                                        | 25680 B，**逐字节相同**                                                                                                     |
| 首页 `<title>`                                                                                                                               | `生产级复现实验室 - shadcn-docs-nuxt 生产复现实验室`                                                                                                                                           | 同                                                                                                                          |
| ESM/CJS 入口错误（`exports is not defined` / `does not provide an export named 'default'` / `Cannot use import statement outside a module`） | 0                                                                                                                                                                                              | **0**                                                                                                                       |
| dev 就绪                                                                                                                                     | `ready=True`（约 6s）                                                                                                                                                                          | `ready=True`（约 6s）                                                                                                       |
| 收尾本仓 node 进程残留                                                                                                                       | 0                                                                                                                                                                                              | 0                                                                                                                           |

### 4.1 关键原文

control 臂 stderr（**信号 1 命中**）：

```plain
 WARN  Failed to resolve dependency: debug, present in client 'optimizeDeps.include'
```

实验臂 stderr —— **该行消失**，其余 9 条逐条不变：

```plain
 WARN  Failed to resolve dependency: @nuxt/content > @nuxtjs/mdc > remark-gfm, present in client 'optimizeDeps.include'
 WARN  Failed to resolve dependency: @nuxt/content > @nuxtjs/mdc > remark-emoji, present in client 'optimizeDeps.include'
 WARN  Failed to resolve dependency: @nuxt/content > @nuxtjs/mdc > remark-mdc, present in client 'optimizeDeps.include'
 WARN  Failed to resolve dependency: @nuxt/content > @nuxtjs/mdc > remark-rehype, present in client 'optimizeDeps.include'
 WARN  Failed to resolve dependency: @nuxt/content > @nuxtjs/mdc > rehype-raw, present in client 'optimizeDeps.include'
 WARN  Failed to resolve dependency: @nuxt/content > @nuxtjs/mdc > parse5, present in client 'optimizeDeps.include'
 WARN  Failed to resolve dependency: @nuxt/content > @nuxtjs/mdc > unist-util-visit, present in client 'optimizeDeps.include'
 WARN  Failed to resolve dependency: @nuxt/content > @nuxtjs/mdc > unified, present in client 'optimizeDeps.include'
 WARN  Failed to resolve dependency: @nuxt/content > slugify, present in client 'optimizeDeps.include'
```

实验臂 `deps/_metadata.json`（**信号 3 命中**）：

```plain
optimized_keys=debug,errx
deps_file=chunk-Q4AC2O6Z.js len=288
deps_file=debug.js len=13951
deps_file=errx.js len=1520
deps_file=_metadata.json len=626
```

### 4.2 首页字节差的归因（+1018 B）

逐字定位首个差异位置 = 18131，落在：

```plain
<script type="application/json" data-nuxt-logs="nuxt-app">[[]]</script>          ← control
<script type="application/json" data-nuxt-logs="nuxt-app">[[1],{…},"Vite server hmr 38 files",…]</script>   ← 实验臂
```

**剥离该块后两臂主体逐字节相同（各 25680 B，`equal=true`）** ⇒ 该字节差**不是页面内容变化**，与 `debug` 无关。

## 5. `debug@4.4.3` 安装态包结构（解释「为何结构上不可能有 ESM/CJS 入口歧义」）

```json
{
	"name": "debug",
	"version": "4.4.3",
	"main": "./src/index.js",
	"module": null,
	"exports": null,
	"dependencies": { "ms": "^2.1.3" }
}
```

⇒ **无 `exports` map** → Node/Vite 解析只能回落 `main`（浏览器侧再回落 `browser`）→ **不存在双包导出名不一致的入口歧义**。
（另：`store` 内 `errx` 仅 `errx@0.1.2` 一个版本；`debug@4.4.3` 的唯一依赖是 `ms`，故 `errx` **不来自 `debug`**。）

## 6. 证据文件路径（`%TEMP%\r32probe\`，本机可写位置；未入仓）

| 路径                                          | 内容                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `r32-dev-probe.ps1`                           | 两臂共用的 dev 观测探针（隔离 vite 缓存 → 启 dev → 等就绪 → curl 首页 → 等预打包 → 采集 metadata/deps/日志 → 定向收尾） |
| `A2-control-main\dev.out.log` / `dev.err.log` | control 臂 dev 原始 stdout / stderr                                                                                     |
| `A2-control-main\summary.txt`                 | control 臂逐项采集摘要                                                                                                  |
| `A2-control-main\home.html`                   | control 臂首页原始字节（26699 B）                                                                                       |
| `A2-control-main\_metadata.json`              | control 臂 vite deps 元数据快照（352 B）                                                                                |
| `B-r32-debug\dev.out.log` / `dev.err.log`     | 实验臂 dev 原始 stdout / stderr                                                                                         |
| `B-r32-debug\summary.txt`                     | 实验臂逐项采集摘要                                                                                                      |
| `B-r32-debug\home.html`                       | 实验臂首页原始字节（27717 B）                                                                                           |
| `B-r32-debug\_metadata.json`                  | 实验臂 vite deps 元数据快照（626 B）                                                                                    |

## 7. 遗留与未覆盖

1. **未跑生产构建对照**：按 [R32.md](../docs/task-artifacts/experiments/R32.md)「关键约束」节，`vite.optimizeDeps` 在 build 期已失效 ⇒ 生产链路上该变量**结构上不可观测** ⇒ 本轮**不补跑 build**（跑了也只能得到「零差异」这一必然结论，不构成新证据）。
2. **浏览器 console / hydration 状态未直接采证**：信号 5 的判据以 **dev stderr 零 ESM/CJS 入口错误** + **页面主体逐字节相同** 承接；本轮**未开浏览器**做 hydration 交互断言。⇒ 若后续要把「F30 未复现」升级为「hydration 逐项验证通过」，需补浏览器侧断言（暗黑模式 / 侧栏交互）。
3. **`errx` 的来源未定位**：实测 `debug@4.4.3` 不依赖 `errx`，store 内仅 `errx@0.1.2` 一个版本；`errx` 在 **control 臂即已**进入 client 预打包 ⇒ 来自另一条客户端依赖链。本轮**未追查其具体父包**（不影响 R32 结论）。
4. **上游主题未治理**：10 条悬空 `optimizeDeps.include` 告警仍全部存在（本轮只消掉 `debug` 1 条，且代价是 `debug` 进入客户端依赖图）。
