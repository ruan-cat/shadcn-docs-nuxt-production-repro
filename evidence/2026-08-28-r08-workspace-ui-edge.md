# R08：移除 docs 对 workspace UI 的消费边

日期：2026-08-28

## 结论摘要

R08 是一个非常强的**构建图复杂度对照实验**。

只移除：

```text
apps/docs -> @repro/ui
```

并用 docs 内部原生 Vue 等价组件维持 SSR 与交互探针后：

- Docs client modules：`5005 -> 4082`，减少 `923`，约 `18.4%`；
- Docs SSR modules：`3581 -> 2009`，减少 `1572`，约 `43.9%`；
- `WorkspaceRuntimeProbe` server chunk：约 `101 kB -> 1.7 kB`；
- Docs dependency probe：`161 -> 157 packages`；
- Docs Nitro total：`18.6 MB -> 18.4 MB`；
- H3 物理解析路径保持不变；
- Windows 基础轨全绿；
- Linux full production、Content prerender、Docs/Content/API standalone HTTP 全绿。

因此，包含 Element Plus + VueUse 的 workspace UI 消费边会显著放大 Nuxt/Vite SSR 构建图，但它**不是当前 R02 H3 串味故障的必要条件**。

---

## 基线

Control main：

```text
cf74f318fe0144983ede02ae31e0a32a8f26d3ff
```

Control 已验证：

```text
Docs client modules: 5005
Docs SSR modules:    3581
Docs Nitro total:    18.6 MB
WorkspaceRuntimeProbe server chunk: ~101 kB (~26.3 kB gzip)
Docs dependency probe: 161 packages
```

Control H3：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

Control HTTP：

```text
Docs / -> 200, bytes=107087
Content cache -> 200, bytes=100273
Content search -> 200, bytes=100261
Nitro 3 API /v1/health -> 200, bytes=85
```

---

## 唯一语义变量

删除 docs manifest 中：

```json
"@repro/ui": "workspace:*"
```

保持：

```text
packages/ui 包本身
packages/ui 独立 build/test
packages/ui -> @repro/shared-core
packages/ui -> Element Plus 2.13.6
packages/ui -> VueUse 14.2.1
apps/docs -> @repro/shared-core
apps/api -> @repro/shared-core
Nuxt 3.21.2
shadcn-docs-nuxt 1.1.9
Content 2.13.9 + root override
H3 1.15.11 direct dependency
nuxt-og-image 5.1.9 override
独立 Nitro 3 sibling
```

页面探针没有被删除，而是把：

```text
WorkspaceRuntimeProbe.vue -> @repro/ui/ProductionRuntimeCard
```

替换为 docs 内部的原生 Vue 等价交互组件，继续保留 descriptor、SSR 与展开/收起交互语义。

---

## 实验依赖树

实验 lockfile bot commit：

```text
c4cbccf3fd1626bbc366447b3f5e5d055b29df1f
```

实验 lockfile blob：

```text
6ddb72308fc68c7f503e1394076769f67c72e5e8
```

有效 CI merge-ref 环境记录的 lockfile SHA256：

```text
1a54451b9967b5c0e554ec76ca66e0ec0fba86c3ec4c5abb1c2cb33afa165861
```

Docs dependency probe：

```text
157 packages
```

Control 为：

```text
161 packages
```

依赖树中不再存在 `apps/docs -> @repro/ui` 子树。VueUse 仍然通过 `shadcn-docs-nuxt`、Nuxt Content、Nuxt modules 等其他链条存在，因此不能把“VueUse 仍存在”误判为 workspace UI edge 没有被移除。

`packages/ui` 本身仍保留并独立构建，其 Element Plus / VueUse 依赖没有被删除。

---

## H3 解析

R08：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

与 control 完全一致。

因此：

1. 移除复杂 workspace UI edge 不会触发 R02 的 `Content -> H3 v2` 漂移；
2. workspace UI 图放大与 H3 generation/runtime 串味是两条可分离的故障轴；
3. 后续 R09-R14 可以集中研究 package exports/source alias/externalization，而不需要把 H3 串味混入同一个结论。

---

## Linux production build

有效 CI run：

```text
33177633711
```

### Client graph

```text
Control: 5005 modules
R08:     4082 modules
Delta:   -923 modules
约减少: 18.4%
```

### SSR graph

```text
Control: 3581 modules
R08:     2009 modules
Delta:   -1572 modules
约减少: 43.9%
```

这比 R07 移除纯 TypeScript shared-core edge 时的：

```text
5005 -> 5004 client
3581 -> 3580 SSR
```

大两个数量级。

### WorkspaceRuntimeProbe server chunk

Control：

```text
~101 kB
~26.3 kB gzip
```

R08：

```text
1.7 kB
869 B gzip
```

说明 control 中这个探针进入 server graph 时，真正携带了大量 workspace UI / Element Plus / VueUse 相关运行时代码，而不是一个名义上的 workspace link。

### Nitro output

```text
Control: 18.6 MB
R08:     18.4 MB
```

总产物只减少约 `0.2 MB`，但 server transform graph 与单个探针 chunk 的变化非常明显。这说明只看最终 `.output` 总大小会低估构建图复杂度。

### Build 状态

```text
Nuxt prepare ✅
Client build ✅
SSR build ✅
Content cache prerender ✅
Content search prerender ✅
Nitro server build ✅
```

---

## Standalone HTTP

R08：

```text
Docs / -> 200, bytes=106383
Content cache -> 200, bytes=100201
Content search -> 200, bytes=100189
Nitro 3 API /v1/health -> 200, bytes=85
```

相对 control：

```text
Docs /:          107087 -> 106383 (-704 bytes)
Content cache:   100273 -> 100201 (-72 bytes)
Content search:  100261 -> 100189 (-72 bytes)
API health:      85 -> 85
```

运行时语义仍稳定。

---

## Windows

对应 Windows job 完成并成功：

```text
frozen install ✅
experiment-aware contracts ✅
workspace package build ✅
Nuxt prepare ✅
dependency/H3 probes ✅
Nitro 3 API build ✅
Nitro 3 API artifact HTTP ✅
```

日常 Windows job 不执行 docs full production，因此本实验不声称 Windows full Nuxt build 的模块数量或耗时与 Linux相同。

---

## 与 R02 / R07 的关系

### R02

R02 只删除 docs direct H3：

```text
Content physical package context -> H3 v2
Nuxt outer runtime -> H3 v1
Content prerender -> 500 Invalid URL
```

这是 runtime dependency resolution defect。

### R07

R07 移除纯 TypeScript shared-core consumption edge：

```text
client -1 module
SSR -1 module
H3/runtime 不变
```

说明普通纯 TS workspace edge 的成本很小。

### R08

R08 移除 Vue + Element Plus + VueUse workspace UI edge：

```text
client -923 modules
SSR -1572 modules
WorkspaceRuntimeProbe ~101 kB -> 1.7 kB
H3/runtime 不变
```

因此复杂 UI workspace consumption 是构建图放大的重要来源，但不是 H3 串味的直接原因。

---

## 最终判读

R08 支持以下结论：

1. `shadcn-docs-nuxt` 文档站在消费真实业务 UI workspace 包时，Nuxt/Vite SSR graph 可以出现非常显著的额外复杂度；
2. 这种复杂度并不需要 build/runtime 立即失败才具有工程意义，它会直接影响 transform 数量、构建时间、内存与后续 externalization/tracing 风险面；
3. Element Plus/VueUse 类型的复杂 UI edge 与纯 TypeScript edge 的成本差异非常大；
4. H3 解析在 R08 中完全稳定，因此不能把所有复杂 monorepo 问题笼统归因于同一 H3 bug；
5. R02 和 R08 已经分别建立了两条独立证据轴：
   - **runtime dependency resolution leakage**；
   - **workspace UI build graph amplification**；
6. 后续 R09-R14 应继续围绕 UI package exports/source alias、Vite SSR externalization 与 Nitro externalization 做单变量实验。

本 PR 作为实验资产关闭，不合并。
