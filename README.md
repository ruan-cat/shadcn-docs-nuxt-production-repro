# shadcn-docs-nuxt 生产级复杂场景复现实验室

这是一个**生产级 pnpm monorepo 复现仓库**，目标不是制作普通文档站，而是系统复现并量化 `shadcn-docs-nuxt` 在复杂业务环境中的依赖、运行时、构建、平台和部署边界。

仓库所有说明、任务工件和实验记录默认使用中文。

## 为什么建立这个仓库

真实业务项目中已经出现过多类互相叠加的问题：

- `shadcn-docs-nuxt` 作为 Nuxt Layer 带入大量传递依赖；
- Nuxt 3 / Nuxt 4 世代边界没有被所有上游 package metadata 完整表达；
- Nuxt Content 运行时代码对 H3 的依赖可能在 pnpm monorepo 中解析到错误实例；
- 同一 workspace 中存在独立 Nitro 3 API 时，H3 v1 / v2 可能成为需要重点审查的 sibling runtime；
- `nuxt-og-image` / `@nuxt/kit` 等传递依赖可能把 Nuxt 4 世代依赖带进 Nuxt 3 文档站；
- Vite SSR externalization、Nitro externals、`@vercel/nft`、pnpm npm alias 和 workspace symlink 可能产生 build/runtime 不一致；
- Windows 本地、Linux CI、Vercel Linux 的 file tracing 与资源表现不同；
- `nuxt build` 成功并不能证明 standalone `.output` 真实可运行；
- 根 `vercel.json` 和 `.vercel/project.json` 在同 repo 多项目部署时可能产生跨项目配置污染；
- 过宽 `noExternal` / `inline`、`trace:false`、清空 prerender 等 workaround 可能只把故障从一个阶段移动到另一个阶段。

本仓库不预设“所有失败都由 shadcn-docs-nuxt 单独负责”。实验会区分：上游依赖契约、Nuxt/Nitro/H3 代际、pnpm workspace、构建器、Windows 平台、Vercel 配置以及用户 workaround 的责任边界。

## 当前架构

```text
repository root
│
├─ apps/docs
│  ├─ Nuxt 3.21.2
│  ├─ shadcn-docs-nuxt 1.1.9
│  ├─ @ztl-uwu/nuxt-content 2.13.9
│  ├─ H3 1.15.11（控制组显式声明）
│  ├─ SSR 渲染 workspace UI
│  └─ Content cache/search
│
├─ apps/api
│  ├─ 独立 Nitro 3 beta
│  ├─ 不依赖 Nuxt
│  ├─ 不依赖 shadcn-docs-nuxt
│  └─ 与 docs 共享纯 TS core
│
├─ packages/ui
│  ├─ Vue
│  ├─ Element Plus
│  ├─ VueUse
│  └─ workspace production package
│
├─ packages/shared-core
│  └─ 不依赖 Nuxt/Nitro/H3/Vue 的纯 TypeScript 包
│
├─ probes
│  ├─ 实际依赖树
│  ├─ H3 解析路径
│  ├─ Content HTTP
│  └─ standalone artifact HTTP smoke
│
└─ docs/task-artifacts
   └─ 完整故障目录、实验矩阵、PR 路线、门禁、证据规范
```

## 控制组核心版本

```json
{
  "nuxt": "3.21.2",
  "shadcn-docs-nuxt": "1.1.9",
  "@ztl-uwu/nuxt-content": "2.13.9",
  "h3": "1.15.11"
}
```

根 workspace 还将：

- `@ztl-uwu/nuxt-content` 固定在 `2.13.9`；
- `nuxt-og-image` 固定在 Nuxt 3 已验证线 `5.1.9`。

这些版本只是实验 control，不代表生态唯一正确组合。

## 故障目录

当前任务工件已经登记 **F01-F46**，覆盖：

1. Layer 传递依赖复杂度；
2. theme / Content minor 漂移；
3. Nuxt 3 / Nuxt 4 世代；
4. H3 幽灵 runtime import；
5. 独立 Nitro 3 sibling runtime；
6. `nuxt-og-image` / `@nuxt/kit` 跨代；
7. pnpm fresh resolve / hoist / workspace topology；
8. Element Plus / VueUse SSR；
9. source alias 与 server graph 放大；
10. Vite `noExternal` / Nitro `inline`；
11. Popper npm alias / standalone 缺包；
12. Nitro `traceAlias`、hoisted linker、targeted public hoist；
13. NFT tracing 与 Windows 长尾；
14. V8 heap OOM；
15. Windows-only `trace:false` 的生产副作用；
16. Content prerender workaround 破坏索引；
17. ESM/CJS hydration 故障；
18. `entities` / `@vueuse/core` / `@intlify` 多版本；
19. `.nuxt` generated state；
20. Turbo/cache 对 fresh evidence 的遮蔽；
21. Windows orphan process / native addon EPERM；
22. Vercel 多项目配置污染；
23. `.vercel/output` 搬运与 symlink；
24. 构建顺序和并发；
25. workaround 把错误从一个 gate 移到另一个 gate；
26. Nuxt 4 整体迁移必须按兼容矩阵处理。

完整说明：[`docs/task-artifacts/failure-catalog.md`](./docs/task-artifacts/failure-catalog.md)。

## 任务工件

- [任务总入口](./docs/task-artifacts/README.md)
- [架构与边界](./docs/task-artifacts/architecture.md)
- [完整故障目录](./docs/task-artifacts/failure-catalog.md)
- [实验矩阵](./docs/task-artifacts/experiment-matrix.md)
- [PR 路线图](./docs/task-artifacts/pr-roadmap.md)
- [验收门禁](./docs/task-artifacts/acceptance-gates.md)
- [证据与结论规范](./docs/task-artifacts/evidence-policy.md)
- [真实项目事故映射](./docs/task-artifacts/real-world-incidents.md)
- [CI 策略](./docs/task-artifacts/ci-strategy.md)
- [初始化进度](./docs/task-artifacts/progress.md)

## 本地运行

要求：

```text
Node 22
pnpm 10.33.0
```

安装：

```bash
pnpm install
```

构建 workspace 包：

```bash
pnpm build:packages
```

启动 docs：

```bash
pnpm dev:docs
```

启动独立 Nitro 3 API：

```bash
pnpm dev:api
```

输出依赖证据：

```bash
pnpm probe:deps
pnpm probe:h3
```

强制串行 fresh production build：

```bash
pnpm build:fresh
```

## 验收不是“build 成功”

本仓要求分层判断：

```text
fresh install
-> dependency resolution
-> nuxt prepare
-> Content cache/search
-> docs production build
-> docs artifact startup
-> docs real HTTP
-> Nitro API build
-> Nitro API artifact HTTP
-> Windows/Linux cross-check
```

因此，单独看到 `nuxt build` exit 0 不足以宣布修复成立。

## GitHub Actions

### 基线 CI

普通 PR 自动运行：

- Ubuntu 静态契约与依赖/H3 探针；
- Ubuntu 完整生产构建 + docs/API artifact HTTP smoke；
- Windows install、workspace build、Nuxt prepare、H3 解析和独立 Nitro API runtime。

### Windows 全量压力实验

手动 workflow 支持设置 old-space MiB，专门测 Windows Nuxt/NFT/内存边界。

### Fresh dependency resolution

手动 workflow 删除 lockfile 后重新解析，保存新的 lockfile、依赖树和 H3 路径作为 artifact。

## PR 实验政策

`main` 负责稳定 control。故障复现通过独立实验 PR 完成：

```text
control SHA
-> 一个关键变量
-> CI / artifact evidence
-> 结论
-> 关闭且不合并，或进入候选修复
```

失败 PR 是实验资产，不需要为了“看起来绿色”而偷偷加入多个 workaround。

## 当前初始化状态

初始化阶段由 GitHub 连接器直接搭建代码，因此首个真实 `pnpm-lock.yaml` 必须由实际 pnpm install 生成，不能人工伪造。首轮 CI 成功生成并验证依赖树后，控制组应提交 lockfile，并把普通 CI 收紧为 `--frozen-lockfile`。

详见 [`progress.md`](./docs/task-artifacts/progress.md)。
