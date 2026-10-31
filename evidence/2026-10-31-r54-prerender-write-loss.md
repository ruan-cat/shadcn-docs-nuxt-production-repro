# R54 证据：F50 最后一环——prerender 环境的 storage 内存态定性（2026-10-31）

> **实验**：R54（[R54.md](../docs/task-artifacts/experiments/R54.md)）——nitro 插件探针（`apps/docs/server/plugins/r54-probe.mjs`，prerender-only）实测 prerender 环境的 fs 写行为，同分支 A/B（`experiment/r54-prerender-write-probe`）。
> **证据等级**：全部**实测**（探针 console 原文 + fs 落盘检查 + 目录存在性）；内存驱动定性 = 三点实测反推（写读回成功 + 双 fs 位零文件 + 目录不存在），driver 名未直读。
> **日志留存**：`%TEMP%\r54-probe-control.log` / `r54-probe-nuxt4.log`（当日抄录如下，原文逐字）。

## ① A 轮（N3.21.2 + content 2.13.9，插桩 `0e77…`/修复 `4c1d…`）

构建 exit 0（首跑 exit 1 = `defineNitroPlugin is not defined` @ `.nuxt/prerender/chunks/_/nitro.mjs:3913`——**prerender bundle 的自动导入不含 defineNitroPlugin**，显式 `import … from "#imports"` 修复；该报错栈同时实锤 **N3 的 prerender 调用链**：`nuxt build → nitro-server@3.21.2/dist/index.mjs:712 → nitropack prerender:2019`，执行体 = `.nuxt/prerender/chunks/_/nitro.mjs` 独立 bundle）：

```text
[R54] pid=19792 cwd=D:\code\ruan-cat\shadcn-docs-nuxt-production-repro\apps\docs node=v22.23.1
[R54] fsProbe write→readBack="hello-r54" error=null
[R54] memProbe readBack="mem-r54"
[R54] cacheContentKeys=["cache:content:r54-probe-1793455447460","cache:content:parsed:content:index.md","cache:content:parsed:content:1.guide:0.index.md","cache:content:parsed:content:1.guide:1.baseline.md","cache:content:parsed:content:1.guide:2.failure-domains.md"]
```

fs 落盘：**`.nuxt/content-cache/r54-probe-1793455447460` 文件存在** ✓ ⇒ **N3 的 prerender storage 是 fs 驱动直连**（同主进程 in-process：pid 与构建一致）。

## ② B 轮（N4.6.3 + content 2.14.1，版本集合与 R52 一致）

构建 exit 0、bundled `grep -c` = **0 条**（红绿差分 ✓）；探针原文：

```text
[R54] pid=26832 cwd=D:\code\ruan-cat\shadcn-docs-nuxt-production-repro\apps\docs node=v22.23.1
[R54] fsProbe write→readBack="hello-r54" error=null
[R54] memProbe readBack="mem-r54"
[R54] cacheContentKeys=["cache:content:r54-probe-1793455643400","cache:content:parsed:content:index.md","cache:content:parsed:content:1.guide:0.index.md","cache:content:parsed:content:1.guide:1.baseline.md","cache:content:parsed:content:1.guide:2.failure-domains.md"]
```

fs 落盘检查：**旧 buildDir（`.nuxt/content-cache/`）无 probe 文件**；**新 buildDir（`node_modules/.cache/nuxt/.nuxt/content-cache/`）无 probe 文件**；`node_modules/.cache/nuxt` **仍不存在**；bundled 0 条。

## ③ 定性

| 观测                       | N3（control）                                  | N4（B 轮）                                                       |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| prerender 进程             | 主进程 in-process（pid 同构建）                | 主进程 in-process（pid 同构建）                                  |
| fs 写（write→readBack）    | 成功                                           | **成功（读回正常）**                                             |
| fs 文件落盘                | **probe 文件存在**                             | **双 buildDir 均零文件**                                         |
| `node_modules/.cache/nuxt` | —（不存在该路径）                              | **始终不存在**                                                   |
| 预热数据可读               | 是（fs）                                       | **是（内存注入）**                                               |
| 回写去向                   | **fs 落盘**（`_snapshot` 可读 → bundled 5 条） | **内存态**（构建结束即弃 → `_snapshot` 读 fs 空 → bundled 0 条） |

**F50 最后一环闭合**：N4 的 prerender 执行使用**独立的内存态 storage 实例**——预热数据（裸 markdown）经序列化注入（可读），fs 驱动未生效（写读回成功但双 fs 位零文件、目标目录从未创建），content 的回写（`storage.js:163`）只进该内存实例、随构建结束消亡；主 bundle 的 `_snapshot` 读的是 fs 挂载（指向从未创建的新 buildDir 目录）→ 空 → bundled 零条。**「回写 → 快照」双向断裂**：N3 的 prerender storage fs 直连故全链通。

## ④ 附带实锤

- `defineNitroPlugin` 在 prerender bundle 中**不可自动导入**（`is not defined`）——nitro 插件若需在 prerender 生效必须显式 `import … from "#imports"`。
- nitro 的 `#initWorker`（`:2340`，`NITRO_DEV_WORKER_ID`）是 **dev 模式** worker，与 prerender 无关——prerender 为**主进程 in-process**（双平台世代一致，pid 实测）。
- 探针 commit：`（分支 experiment/r54-prerender-write-probe，插件 + 修复 + N4 版本集合三笔）`。
