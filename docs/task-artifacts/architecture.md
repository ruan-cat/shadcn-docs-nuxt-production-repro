# 架构与实验边界

## 1. 目标拓扑

```text
repository root
│
├─ apps/docs
│  ├─ Nuxt 3
│  ├─ Nitro 2
│  ├─ H3 v1
│  ├─ shadcn-docs-nuxt 1.1.9
│  ├─ @ztl-uwu/nuxt-content 2.13.9
│  └─ consume packages/ui + packages/shared-core
│
├─ apps/api
│  ├─ Nitro 3
│  ├─ H3 v2 generation
│  ├─ no Nuxt
│  ├─ no shadcn-docs-nuxt
│  └─ consume packages/shared-core
│
├─ packages/ui
│  ├─ Vue
│  ├─ Element Plus
│  ├─ VueUse / Popper transitive graph
│  └─ consumed only by docs
│
└─ packages/shared-core
   ├─ pure TypeScript
   ├─ no Nuxt
   ├─ no Nitro
   └─ consumed by docs + api
```

## 2. 为什么必须放在同一个 monorepo

本仓库要复现的关键问题之一就是“跨 workspace 运行时解析污染”。如果把 docs 和 API 拆到两个 GitHub 仓库，它们不再共享：

- `pnpm-lock.yaml`；
- workspace root；
- `.pnpm` virtual store；
- hoist / public hoist 策略；
- 根 overrides；
- Vercel repository root；
- 根安装与 filtered build；
- Turbo / CI 缓存边界。

因此一个 GitHub 仓库、多个 workspace application 才是正确实验形态。

## 3. 四个故障域

### A. 依赖与运行时世代

研究：

- Nuxt 3 / Nitro 2 / H3 v1；
- Nuxt 4 / Nitro 3 / H3 v2；
- Content minor 漂移；
- theme minor 漂移；
- `nuxt-og-image` / `@nuxt/kit` 跨世代传递依赖；
- 未声明 H3 runtime import。

### B. workspace 与打包边界

研究：

- pnpm symlink；
- source alias；
- workspace package exports；
- Vite SSR `noExternal`；
- Nitro `externals.inline`；
- npm alias；
- `@vercel/nft` tracing；
- standalone dependency closure。

### C. 平台与资源边界

研究：

- Windows path / junction / file lock；
- Windows NFT trace 长尾；
- 默认 V8 heap OOM；
- orphan node/cmd process；
- Linux CI 与 Windows 本地差异。

### D. 部署与项目配置边界

研究：

- 同一 repo 两个 Vercel projects；
- 根 `vercel.json` 覆盖不同项目配置；
- `.vercel/project.json` 单槽绑定；
- 子包 `.vercel/output` 搬运到根；
- symlink / dereference；
- build 成功但部署 artifact 不闭合。

## 4. 稳定基线策略

控制组采用精确版本思路：

```json
{
  "nuxt": "3.21.2",
  "shadcn-docs-nuxt": "1.1.9",
  "@ztl-uwu/nuxt-content": "2.13.9",
  "h3": "1.15.11"
}
```

并在根级 `pnpm.overrides` 中固定 Nuxt 3 已验证的 `nuxt-og-image` 版本。

这些版本不是宣称“生态唯一正确组合”，只是作为复现实验的 control。后续每个版本漂移实验必须相对于这个 control 做比较。

## 5. 依赖关系限制

### docs 可以依赖

- `packages/ui`
- `packages/shared-core`

### api 可以依赖

- `packages/shared-core`

### api 禁止依赖

- Nuxt
- shadcn-docs-nuxt
- Nuxt Content
- Vue UI package

### shared-core 禁止依赖

- Nuxt
- Nitro
- H3
- Vue

这样一旦 H3 v2 影响 docs，可以排除“shared-core 主动把 H3 带过去”的解释。

## 6. CI 运行层级

CI 必须至少分为：

```text
install
├─ dependency probes
├─ docs prepare/dev probes
├─ docs production build
├─ docs artifact runtime smoke
├─ api production build
├─ api artifact runtime smoke
└─ combined / order-sensitive experiments
```

平台至少覆盖：

```text
ubuntu-latest
windows-latest
```

## 7. 不允许的默认做法

基线禁止一开始就加入以下 workaround：

- blanket `vite.ssr.noExternal`；
- blanket `nitro.externals.inline`；
- 全平台 `trace:false`；
- `routes.clear()`；
- 关闭 Content prerender；
- `nodeLinker: hoisted`；
- 全局 public hoist；
- 8 GiB 作为默认永久 heap；
- 把所有依赖直接列在 root 以“碰巧可解析”。

这些只能在独立实验 PR 中作为单变量出现。
