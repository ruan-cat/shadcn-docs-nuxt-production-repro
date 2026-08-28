# R05：移除 nuxt-og-image override 后的自然漂移

日期：2026-08-28

## 实验目标

验证仅移除 control 中 `nuxt-og-image@5.1.9` 的 root override 后，`shadcn-docs-nuxt@1.1.9` 的传递依赖会自然解析到哪个 OG Image 版本，并观察其 `@nuxt/kit` / H3 世代、Windows/Linux production 与 standalone artifact 是否发生变化。

## 基线与唯一变量

Control main：

```text
b6a8b4f74e1e83aa67c3c17553e6bdb744ab7df0
```

唯一运行时变量：

```text
root pnpm.overrides["nuxt-og-image"]: 5.1.9 -> 移除
```

保持不变：

- Nuxt `3.21.2`
- shadcn-docs-nuxt `1.1.9`
- `@ztl-uwu/nuxt-content@2.13.9`
- root Content override `2.13.9`
- docs direct H3 `1.15.11`
- 独立 Nitro 3 sibling
- workspace UI / Element Plus / VueUse / shared-core

## Lockfile / resolution 证据

实验 lockfile bot commit：

```text
09c7581473177794486fcfbec9cfdb21adb9c581
```

lockfile blob：

```text
b53ec2432195608f30d3d9f80f93b1d85327cc4e
```

有效 runtime 测量锚点：

```text
79f8f5661a624a07fe04cd9975ed5c94b1cf92d8
```

有效 GitHub Actions run：

```text
33175513879
```

冻结安装记录的实验 lockfile SHA256：

```text
2dc56b24f00e426f74f1ac2b33378b2cc0aa9d5c1f5d00b0127a3d1a6682787e
```

## 真实自然漂移

解除 override 后发生了真实依赖版本变化：

```text
nuxt-og-image: 5.1.9 -> 5.1.13
@nuxt/devtools-kit (OG Image 内部): 2.7.0 -> 3.4.2
@nuxt/kit (OG Image 内部): 3.21.11 -> 4.5.2
satori: 0.15.2 -> 0.18.4
css-gradient-parser: 0.0.16 -> 0.0.17
```

同时：

- `unwasm@0.3.11` 从这条闭包移除；
- 新增 `yoga-layout@3.2.1`；
- docs 依赖探针统计从 control 的 161 packages 增至 162 packages。

因此 R05 与 R03/R04 不同：这次不是“specifier 政策变化但实际版本未变”，而是**真正的传递依赖 generation drift**。

## H3 边界

尽管 OG Image 自身已经进入 `@nuxt/kit@4.5.2`，H3 物理解析仍保持 control：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

因此：

- H3 v1/v2 仍共存；
- Content 没有像 R02 那样漂到 H3 v2；
- OG Image / Kit 的跨代漂移没有直接改变 Content H3 resolution。

## Windows 结果

`Windows 解析、prepare 与独立 API` 全部成功：

- frozen install ✅
- experiment-aware contracts ✅
- workspace packages ✅
- Nuxt prepare ✅
- dependency / H3 probes ✅
- Nitro 3 API build ✅
- Nitro 3 API artifact HTTP ✅

## Linux production 结果

`Linux 完整生产构建与 artifact smoke` 全部成功。

构建规模仍为：

```text
5005 client modules
3581 SSR modules
18.6 MB Nitro output
```

Content prerender：

```text
/api/_content/search ✅
/api/_content/cache.json ✅
```

Standalone artifact HTTP：

```text
Docs / -> HTTP 200
Content cache -> HTTP 200
Content search -> HTTP 200
Nitro 3 API /v1/health -> HTTP 200
```

## 结论

R05 是一个强依赖结构证据，但不是当前 runtime defect：

1. 移除 OG Image override 会在当前 registry / pnpm 条件下真实把 `nuxt-og-image` 从 `5.1.9` 自然升级到 `5.1.13`；
2. 该变化真实把 OG Image 自身的 `@nuxt/devtools-kit` 与 `@nuxt/kit` 推入 3.4.2 / 4.5.2 世代；
3. 因此 control 中的 `nuxt-og-image@5.1.9` override 确实在抑制一条实际存在的跨代传递漂移，而不是无效配置；
4. 但当前 Nuxt 3 docs 的 H3 边界、Content prerender、Windows/Linux build 与 standalone artifact 全部保持稳定；
5. 所以不能把 `nuxt-og-image@5.1.13` 或 `@nuxt/kit@4.5.2` 的存在本身直接等同于 defect；
6. 这与 R02 形成重要对照：R02 真正失败时，关键变化是 Content 的裸 H3 解析跨到 v2；R05 虽有 Kit 跨代，但 Content H3 仍为 v1，因此 runtime 全绿。

R06 将显式把 root override 从 `5.1.9` 改为 `5.1.13`，使用与 R05 相同的已实测目标版本，区分“版本本身的影响”与“移除 override / 自然解析策略”的影响。

本 PR 作为实验资产关闭且不合并。
