# R06：显式 pin nuxt-og-image@5.1.13 实验结果

日期：2026-08-28

## 实验目标

验证将 control 中 `nuxt-og-image` 的 root override 从 `5.1.9` 显式改为 `5.1.13` 后，依赖闭包、`@nuxt/kit` / H3 世代以及 Windows/Linux production runtime，是否与 R05 中“移除 override 后自然解析到 5.1.13”的结果一致。

## 基线与唯一变量

Control main：

```text
b6a8b4f74e1e83aa67c3c17553e6bdb744ab7df0
```

唯一运行时变量：

```text
root pnpm.overrides["nuxt-og-image"]: 5.1.9 -> 5.1.13
```

保持不变：

- Nuxt `3.21.2`
- shadcn-docs-nuxt `1.1.9`
- `@ztl-uwu/nuxt-content@2.13.9`
- root Content override `2.13.9`
- docs direct H3 `1.15.11`
- 独立 Nitro 3 sibling
- workspace UI / Element Plus / VueUse / shared-core

## Lockfile / measurement

实验 lockfile bot commit：

```text
a1cc62deb8a5bf50e1e76cff4d924d2617fb687f
```

lockfile blob：

```text
a833a31cf80020746e806eabb8978348ab9feada
```

有效 runtime 测量锚点：

```text
bd3224d8b74975c78a64d8f07edaf360a6f24700
```

有效 GitHub Actions run：

```text
33175966995
```

实验 lockfile SHA256：

```text
71d37315c2e128110a22d0da9e28a0d3fba603af180c7d5e22656aa00d4e44d6
```

## 实际依赖闭包

显式 pin 5.1.13 后：

```text
nuxt-og-image@5.1.13
@nuxt/devtools-kit@3.4.2
@nuxt/kit@4.5.2
satori@0.18.4
yoga-layout@3.2.1
css-gradient-parser@0.0.17
```

Docs 依赖探针：

```text
162 packages
```

这与 R05 的自然解析结果在关键 runtime 依赖层完全一致。

## 与 R05 的 A/B 对比

R05：移除 OG Image override，自然解析到 `5.1.13`。

```text
lockfile SHA256: 2dc56b24f00e426f74f1ac2b33378b2cc0aa9d5c1f5d00b0127a3d1a6682787e
```

R06：显式 override 到 `5.1.13`。

```text
lockfile SHA256: 71d37315c2e128110a22d0da9e28a0d3fba603af180c7d5e22656aa00d4e44d6
```

两者 lockfile 身份不同，因为 override policy 元数据不同；但实际安装的关键运行时世代一致：

```text
nuxt-og-image 5.1.13
OG Image @nuxt/devtools-kit 3.4.2
OG Image @nuxt/kit 4.5.2
satori 0.18.4
yoga-layout 3.2.1
docs probe 162 packages
```

因此，R05 的跨代闭包主要由**实际解析到 5.1.13 这个版本**决定，而不是“override 缺席”本身额外制造了一套不同 runtime topology。

## H3 边界

R06 与 R05/control 一致：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

因此 OG Image 5.1.13 / Kit 4.5.2 的跨代存在没有改变 Content 的 H3 resolution。

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

构建规模：

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

R06 与 R05 形成了清晰的 A/B 对照：

1. R05 的“移除 override”与 R06 的“显式 pin 5.1.13”都得到相同的关键依赖世代；
2. override policy 会改变 lockfile 身份，但在本实验中没有改变关键 runtime topology；
3. `nuxt-og-image@5.1.13` 确实把自身依赖推进到 `@nuxt/kit@4.5.2` 等更高世代；
4. 但 Nuxt 3 docs、Content prerender、Windows/Linux build 和 standalone artifact 全部稳定；
5. 因此 `nuxt-og-image@5.1.13` / `@nuxt/kit@4.5.2` 的存在本身仍不是充分故障条件；
6. 截至 R06，最强的正向故障证据仍是 R02：Content 的裸 H3 实际跨到 v2 后，Nuxt 3/H3 v1 与 Content/H3 v2 混用并在 prerender 失败。

本 PR 作为实验资产关闭且不合并。
