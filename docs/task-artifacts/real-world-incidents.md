# 真实项目事故映射

本文件只用于说明为什么选择这些实验，不把历史项目结论自动当成本仓库结论。

## 1. SmallAliceWeb：Nuxt Content / H3 运行时世代失配

历史场景：

```text
shadcn-docs-nuxt 1.1.9
-> 允许 @ztl-uwu/nuxt-content ^2.13.9
-> fresh resolve 曾进入 Content 2.14.1
-> Content runtime 直接 import h3，但 manifest 未完整声明该运行时边界
-> pnpm monorepo 中解析到 H3 v2 RC
-> Nuxt 3 / Nitro 2 仍属于 H3 v1 runtime
-> Content cache/search 500
-> ERR_INVALID_URL / sendError export mismatch
```

本仓对应：F02-F10，R02-R06。

## 2. SmallAliceWeb：Nuxt/Nitro production graph OOM

历史调查确认 source alias、blanket `vite.ssr.noExternal`、blanket `nitro.externals.inline` 会显著扩大 production graph；移除后 server modules 曾从约 4028 降到约 2449，但默认 heap 在最终 Nitro server build 仍可能不足。

本仓对应：F13-F16、F22-F24，R09-R14、R23-R26。

## 3. SmallAliceWeb：build green / standalone runtime red

历史产物曾出现：

```text
nuxt build ✅
.output server listen ✅
GET / ❌ 500
ERR_MODULE_NOT_FOUND: @popperjs/core
```

涉及 Element Plus 的 npm alias `@popperjs/core -> npm:@sxzz/popperjs-es` 与 Nitro externals/NFT standalone closure。

本仓对应：F17-F21，R15-R19。

## 4. eams-component-lib：workspace SSR / Nitro externalization 复杂度

历史文档站为 workspace 组件库展示场景，出现过：

- Element Plus / VueUse runtime closure；
- `entities/decode`；
- `@vueuse/core`；
- Vite SSR 与 Nitro externalization 阶段混淆；
- Windows NFT workaround 与 Vercel artifact 边界；
- Content prerender 被 workaround 清空后的运行时数据问题。

本仓对应：F12-F16、F26-F33。

## 5. SmallAliceWeb：独立 Nitro v3 API 与 docs 同仓部署

真实仓库同时存在：

- 文档/前端构建；
- 独立 Nitro 3 API package；
- workspace shared core；
- 两个不同 Vercel 部署目标。

这提供了本仓 `apps/docs + apps/api + packages/shared-core` 的拓扑来源。

本仓对应：F05-F06、F38-F42。

## 6. SmallAliceWeb：根 Vercel 配置污染

历史上 docs 与独立 Nitro API 需要不同：

- Build Command；
- Output Directory；
- 项目运行形态。

共享根 `vercel.json` 会把一个项目的参数覆盖到另一个项目，因此后来采用“同 repo，多 Vercel project，云端分别配置”的方案。

本仓对应：F38-F41，R34-R38。

## 7. Windows：NFT 长尾、子进程残留和原生文件锁

历史经验中三类问题必须分开：

1. Nitro/NFT tracing 高 CPU/高内存长尾；
2. 中断后 orphan `node.exe/cmd.exe` 让后续实验失真；
3. IDE 持有 native addon 导致 pnpm install `EPERM`。

这些都是实验环境风险，不应与 H3 dependency contract 写成同一个根因。

本仓对应：F23、F36、F37。

## 8. 本仓库的职责

以上只是历史问题来源。本仓必须重新用 control / single variable / failure gate 证明：

- 哪些问题仍能在简化但真实的生产拓扑中复现；
- 哪些只属于原业务仓库的特例；
- 哪些属于上游 dependency contract；
- 哪些属于构建器/部署器；
- 哪些属于用户 workaround 的副作用。
