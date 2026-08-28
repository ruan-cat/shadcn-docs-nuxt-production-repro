# R07：移除 shared-core 消费拓扑实验结果

日期：2026-08-28

## 实验目标

通过减法对照移除应用侧对纯 TypeScript `packages/shared-core` 的 workspace 消费 edge，量化该拓扑对 pnpm resolution、Nuxt/Vite build graph、Nitro artifact closure 与 H3 运行时解析的影响。

R07 测的是“消费连接是否存在”，不是“仓库里是否存在 shared-core 包”。因此 `packages/shared-core` 本身仍保留，并继续由 root build/test 独立构建和测试。

## 基线与唯一语义变量

Control main：

```text
cf74f318fe0144983ede02ae31e0a32a8f26d3ff
```

移除三条消费 edge：

```text
apps/docs -> @repro/shared-core
packages/ui -> @repro/shared-core
apps/api -> @repro/shared-core
```

保持不变：

- `packages/shared-core` workspace 包本身与独立 build/test；
- `apps/docs -> @repro/ui`；
- Element Plus / VueUse；
- Nuxt `3.21.2`；
- shadcn-docs-nuxt `1.1.9`；
- Content `2.13.9` + root override；
- docs direct H3 `1.15.11`；
- OG Image control override `5.1.9`；
- 独立 Nitro 3 sibling；
- UI Vite `external` 配置保持不变，避免把 externalization 变量混入本实验。

UI/API 中原 shared-core 的纯对象与字符串逻辑改为等价本地实现，使页面/API 输出语义保持一致。

## Lockfile / measurement

实验 lockfile bot commit：

```text
f33933b6a201fe2babff0e0c81c3a36a955dfc1b
```

lockfile blob：

```text
aae9140529c44c127f2408eb2f5e3d1010a2c132
```

有效 runtime 测量锚点：

```text
19ec920168b8030ac739151f5bfa2dc96f83a773
```

有效 GitHub Actions run：

```text
33176990311
```

实验 lockfile SHA256：

```text
1fdd72eb90bb8640f64338fcdcd7187b2ff2eb0c7c75a0c6333f801b208f53f7
```

锁文件确认：

- `apps/docs` importer 不再含 `@repro/shared-core`；
- `apps/api` importer 不再含 `@repro/shared-core`；
- `packages/ui` importer 不再含 `@repro/shared-core`；
- `packages/shared-core` importer 仍保留。

因此测到的是消费 edge 成本，而不是 package existence 成本。

## dependency / H3 结果

静态依赖探针：

```text
docs dependency probe: 161 packages
api dependency probe: 2 packages
```

与 control 的显示计数相同。

H3 物理解析也完全保持 control：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

因此移除纯 TS shared-core 消费 edge 没有改变 H3 generation resolution，也没有复现 R02 的 Content -> H3 v2 串味。

## 可测的 build graph / artifact 差异

R07 不是完全“拓扑无感”。它产生了小而稳定、方向合理的图谱减法：

### UI package

```text
control gzip: ~0.88 kB
R07 gzip:      0.87 kB
```

未压缩产物仍约 `1.91 kB`。

### 独立 Nitro 3 API

```text
control: ~62.5 kB (16.3 kB gzip)
R07:      62.2 kB (16.2 kB gzip)
```

API 不再通过 workspace edge消费 shared-core 后，standalone server artifact 略微缩小。

### Docs module graph

```text
client modules: 5005 -> 5004
SSR modules:    3581 -> 3580
```

正好各减少 1 个模块。

### Docs Nitro output

最终显示总量仍为：

```text
18.6 MB (3.89 MB gzip)
```

`WorkspaceRuntimeProbe` server chunk 仍存在，大小约 `101 kB`，gzip 从 control 的约 `26.3 kB` 变为约 `26.2 kB`。

因此 topology 减法对模块图和个别产物大小是可测的，但没有改变 docs 总体产物数量级。

## Windows 结果

`Windows 解析、prepare 与独立 API` 全部成功：

- frozen install ✅
- experiment-aware workspace contracts ✅
- shared-core 独立 build ✅
- UI build ✅
- Nuxt prepare ✅
- dependency / H3 probes ✅
- Nitro 3 API build ✅
- Nitro 3 API artifact HTTP ✅

## Linux production 结果

`Linux 完整生产构建与 artifact smoke` 全部成功。

Content prerender：

```text
/api/_content/search ✅
/api/_content/cache.json ✅
```

Standalone artifact HTTP：

```text
Docs / -> HTTP 200, bytes=107087
Content cache -> HTTP 200, bytes=100273
Content search -> HTTP 200, bytes=100261
Nitro 3 API /v1/health -> HTTP 200, bytes=85
```

## 结论

R07 给出了一个清晰的 workspace topology 对照：

1. `shared-core` 三条消费 edge 会为 UI/API/Docs 图谱带来非常小但真实可测的模块与 artifact 成本；
2. 删除这些 edge 后，client/SSR 各减少 1 个模块，API artifact 约减少 0.3 kB，UI gzip 约减少 0.01 kB；
3. 但 docs/API 依赖探针显示的 package 数、H3 物理解析、Content prerender、Windows/Linux build 与 standalone HTTP 全部保持稳定；
4. 因此当前纯 TypeScript `shared-core` 消费拓扑不是 H3 串味或 Content runtime defect 的关键条件；
5. 它可以作为后续 R08-R14 的 topology/externalization 基准：后面如果移除 UI edge 或改变 source alias / externalization 导致更大的模块图、tracing 或 runtime 变化，可以与 R07 的“小幅纯 TS edge 成本”直接比较。

本 PR 作为实验资产关闭且不合并。
