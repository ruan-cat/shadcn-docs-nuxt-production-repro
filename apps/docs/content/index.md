---
title: 生产级复现实验室
description: 用单变量 PR 复现 shadcn-docs-nuxt 在复杂 monorepo 中的依赖与部署边界。
---

# shadcn-docs-nuxt 生产级复现实验室

这个站点不是普通文档示例，而是仓库运行时的一部分。

当前控制组刻意同时包含：

- Nuxt 3 文档应用；
- shadcn-docs-nuxt；
- Nuxt Content；
- H3 v1 显式控制；
- workspace UI；
- Element Plus；
- VueUse；
- 共享 TypeScript 包；
- 同仓独立 Nitro 3 API。

## Workspace SSR 探针

下面的组件来自 `packages/ui`，用于确认生产 SSR 图确实经过 workspace 组件库，而不是只构建 Markdown。

::workspace-runtime-probe
::

## 为什么保留复杂度

后续实验会逐项修改依赖边界，并比较 Content API、Nuxt build、Nitro artifact、Windows/Linux 和 Vercel 风格输出。
