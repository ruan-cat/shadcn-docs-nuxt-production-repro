# 任务工件总入口

本目录是 `shadcn-docs-nuxt-production-repro` 的权威实验任务区。

本仓库不是为了制作一个“看起来很复杂”的演示项目，而是为了把真实生产项目中已经出现过的故障拆成可以重复、可以审查、可以比较、可以被上游维护者复现的单变量实验。

## 总目标

建立一个生产级 pnpm monorepo，至少同时包含：

- 一个基于 Nuxt 3 + `shadcn-docs-nuxt` + Nuxt Content 的文档应用；
- 一个完全独立的 Nitro 3 API 应用；
- 一个共享的纯 TypeScript workspace 包；
- 一个 Vue + Element Plus workspace UI 包；
- Windows / Linux 双平台 CI；
- Vercel 风格构建与 standalone 产物验证；
- 依赖树、H3 实际解析位置、Nitro 产物闭包、Content API、运行时 HTTP 的自动探针。

## 要回答的核心问题

1. `shadcn-docs-nuxt` 作为 Nuxt Layer 时，是否对传递依赖版本和运行时世代过度敏感？
2. Nuxt 3 文档站与 Nitro 3 API 明明是两个独立 workspace application，为什么仍可能通过未声明依赖、hoist、pnpm 符号链接或 lockfile 重算发生运行时“串味”？
3. `@ztl-uwu/nuxt-content` 直接导入 H3 却不声明 dependency/peer 时，是否会在复杂 monorepo 中解析到错误的 H3 实例？
4. `shadcn-docs-nuxt@1.1.x` 的 semver 范围是否可能允许 Content 或其他模块跨过 Nuxt 3 / Nuxt 4 的真实兼容边界？
5. `nuxt-og-image`、`@nuxt/kit`、H3 等传递依赖的 minor 漂移是否会把 Nuxt 4 世代依赖带入 Nuxt 3 文档站？
6. Vite SSR externalization、Nitro externals、`@vercel/nft`、pnpm npm alias 与 workspace symlink 在生产产物边界是否稳定？
7. 为什么 `nuxt build` 成功仍可能得到不可运行的 `.output`？
8. Windows 本地构建、GitHub Actions Linux、Vercel Linux 是否会走不同的依赖追踪路径，从而出现“一边绿、一边炸”？
9. 为 Windows 提供的 workaround（例如 `trace:false`、跳过 prerender）是否会在进入生产后破坏真实运行时闭包或 Content 索引？
10. 多个 Vercel 项目共享一个 GitHub monorepo 时，根 `vercel.json`、`.vercel/project.json` 和产物搬运是否会造成跨应用配置污染？

## 任务工件

- [架构与边界](./architecture.md)
- [完整故障目录](./failure-catalog.md)
- [F01-F46 当前状态矩阵](./status-matrix.md)
- [实验矩阵](./experiment-matrix.md)
- [PR 路线图](./pr-roadmap.md)
- [验收门禁](./acceptance-gates.md)
- [证据与结论规范](./evidence-policy.md)
- [真实项目事故映射](./real-world-incidents.md)
- [CI 策略](./ci-strategy.md)
- [初始化与实验进度](./progress.md)
- [首份冻结控制组证据](../../evidence/2026-08-28-init-control-baseline.md)

## 重要原则

### 1. 绿色 `main` 永远作为 control

`main` 必须保持已验证的稳定组合。故障复现通过独立分支 / PR 完成，失败 PR 可以关闭但不合并。

### 2. 一次只改变一个关键变量

例如只删除 docs 应用显式 H3 依赖、只把 Content 从精确版本改为 caret、只改变 Nitro 3 sibling topology、只打开一个 `noExternal` 条目。

### 3. 不把所有事故都归咎于一个上游包

本仓库要区分：

- 上游依赖契约缺口；
- Nuxt/Nitro/H3 生态代际兼容；
- pnpm workspace 暴露出的幽灵依赖；
- Vite / Nitro / NFT 构建与产物边界；
- Windows 平台差异；
- Vercel 多项目配置污染；
- 用户侧过宽 workaround 对故障的放大。

目标是证明“哪些边界脆弱、在什么条件下脆弱”，不是预设所有失败都属于 `shadcn-docs-nuxt` 单一责任。

### 4. `build green` 不是验收

完整绿色至少要求：

- frozen install（fresh-resolution 实验除外）；
- 依赖解析树符合预期；
- Content cache/search API 正常；
- docs production build 正常；
- Nitro API build 正常；
- `.output` / `.vercel/output` 能启动；
- 实际 HTTP 请求成功；
- Windows 与 Linux 结果被分别记录。
