# R12：blanket `vite.ssr.noExternal: true` 压力实验

日期：2026-08-28

## 结论摘要

R12 只启用：

```ts
vite: {
  ssr: {
    noExternal: true,
  },
}
```

在当前固定的 Nuxt 3 + `shadcn-docs-nuxt` + Content + workspace UI topology 下，**不会直接制造 runtime defect**，但会显著膨胀服务端 bundle 与最终 Nitro 产物。

相对 R09 / main control：

```text
指标                         Control       R12 blanket noExternal     Delta
Client modules               5005          5005                       0
SSR modules                  3581          3645                       +64 (+1.8%)
server.mjs                   1.37 MB       2.82 MB                    +1.45 MB (~+106%)
server.mjs gzip              248 kB        547 kB                     +299 kB (~+121%)
WorkspaceRuntimeProbe        ~101 kB       104 kB                     约 +3 kB
Docs Nitro total             18.6 MB       21.6 MB                    +3.0 MB (+16.1%)
Docs/Content/API HTTP        全 200         全 200                      不变
```

因此，只看“SSR modules 只增加 64”会严重低估 blanket `noExternal` 的实际 bundle 成本。

---

## 基线

R09 / main control：

```text
Client modules               5005
SSR modules                  3581
server.mjs                   1.37 MB / 248 kB gzip
WorkspaceRuntimeProbe        ~101 kB / ~26.3 kB gzip
Docs Nitro total             18.6 MB
```

Control HTTP：

```text
Docs /                    -> HTTP 200, bytes=107087
Content cache             -> HTTP 200, bytes=100273
Content search            -> HTTP 200, bytes=100261
Nitro 3 API /v1/health    -> HTTP 200, bytes=85
```

---

## 唯一运行时变量

只在 `apps/docs/nuxt.config.ts` 增加：

```ts
vite: {
  ssr: {
    noExternal: true,
  },
}
```

没有改变：

```text
Nuxt 3.21.2
shadcn-docs-nuxt 1.1.9
@ztl-uwu/nuxt-content 2.13.9
H3 1.15.11
nuxt-og-image 5.1.9 override
workspace UI / shared-core
UI package exports/dist
Nitro externals.inline
trace
prerender
hoist
pnpm-lock.yaml
```

配置实验声明：

```json
{
  "id": "R12",
  "reason": "量化 blanket Vite SSR noExternal 对 Nuxt server graph、Nitro 产物、Windows/Linux 构建与 standalone runtime 的影响。",
  "allowedSafetyPatterns": {
    "nuxtConfig": ["noExternal"]
  }
}
```

这个 `experiment.json` 只用于让静态安全门知道 `noExternal` 是有意压力变量，不参与应用 runtime。

---

## 有效复测

有效 run：

```text
33182707074
```

Linux job：

```text
98887709858
```

Windows job：

```text
98887709577
```

静态契约 job：

```text
98887709768
```

三条轨全部成功。

依赖树仍使用 control lockfile：

```text
1373193329c18cd55e6c6d81da08683ec39ce6c34bd8da1db96730b55be752a8
```

---

## Linux production

### Client graph

```text
Control: 5005
R12:     5005
Delta:   0
```

说明 `vite.ssr.noExternal` 不影响 client transform graph。

### SSR graph

```text
Control: 3581
R12:     3645
Delta:   +64
约增加: 1.8%
```

模块数量只小幅增加。

### 核心 server bundle

```text
Control server.mjs: 1.37 MB / 248 kB gzip
R12 server.mjs:     2.82 MB / 547 kB gzip
```

即：

```text
raw size: 约 +106%
gzip:     约 +121%
```

这是本实验最明显的结构变化。

### WorkspaceRuntimeProbe

```text
Control: ~101 kB / ~26.3 kB gzip
R12:     104 kB / 26.2 kB gzip
```

这条单独业务 UI chunk 基本不变，说明膨胀主要发生在更广泛的 server dependency bundling，而不是只集中在 `@repro/ui` 探针 chunk。

### Nitro 总产物

```text
Control: 18.6 MB
R12:     21.6 MB
Delta:   +3.0 MB / +16.1%
```

因此：

> 最终 artifact size 的变化明显大于 SSR module count 的变化。

### 参考时间

本轮：

```text
Client build       ~18.54 s
SSR build          ~13.85 s
Content prerender  ~13.73 s
Turbo full build   ~1m15.96s
```

这些绝对时间受 GitHub runner 波动影响，不能据此声称 blanket `noExternal` 在本轮“更快”或“更慢”；模块数和产物体积是更稳定的比较指标。

---

## Content 与 standalone runtime

Content prerender：

```text
cache ✅
search ✅
```

Standalone HTTP：

```text
Docs /                    -> HTTP 200, bytes=107087
Content cache             -> HTTP 200, bytes=100273
Content search            -> HTTP 200, bytes=100261
Nitro 3 API /v1/health    -> HTTP 200, bytes=85
```

与 control 完全一致。

因此 R12 不能被描述成“blanket noExternal 在本仓必然导致运行时错误”。

---

## Windows

正式复测的 Windows 轨全部成功：

```text
frozen install ✅
config experiment contract ✅
workspace package build ✅
Nuxt prepare ✅
dependency/H3/UI probes ✅
Nitro 3 API build ✅
Nitro 3 API artifact HTTP ✅
```

日常 Windows job 不执行 docs full production，因此本实验不声称 Windows 上也产生精确的 `3645` SSR modules 或 `21.6 MB` 产物。

Windows full Nuxt production 应继续留给后续 R20-R26 / windows stress 路线。

---

## H3 / dependency generation

R12 没有改依赖树，H3 仍保持 control：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

没有复现 R02 的 Content -> H3 v2 漂移。

因此 R12 与 R02 是两条完全独立的实验轴：

- R02：runtime dependency resolution leakage；
- R12：SSR internalization / server bundle amplification。

---

## 与 R08 / R10 的关系

### R08：删除整个 workspace UI consumer

```text
Client -923
SSR    -1572
```

证明业务 UI runtime chain 是巨大图成本来源。

### R10：dist -> source alias

```text
Client +2
SSR    +2
Nitro total 基本不变
```

说明 source alias 单独不是主要放大器。

### R12：blanket noExternal

```text
Client 0
SSR +64
server.mjs 1.37 -> 2.82 MB
Nitro 18.6 -> 21.6 MB
```

说明 blanket SSR internalization 的主要副作用更像是：

> 把原本可 externalize 的 server dependency 更广泛地卷入 bundle，从而显著增加核心 server bundle 与最终 artifact 体积。

---

## R11 状态

R10 没有产生真实 SSR externalization 错误，因此当前没有证据驱动的具体 package 可用于 R11“精确 `ssr.noExternal` 修复”。

所以 R11 应记录为：

```text
未执行 / 无真实触发条件
```

而不是人为挑一个包加入 `noExternal` 来制造伪修复。

---

## 最终判读

R12 支持以下结论：

1. blanket `vite.ssr.noExternal: true` 在当前 topology 下不会立即破坏 Docs/Content/API runtime；
2. 它会显著膨胀核心 server bundle 与最终 Nitro artifact；
3. SSR module count 只增加约 1.8%，但 `server.mjs` raw size 约翻倍，说明 transform count 不能单独代表 bundle 成本；
4. 该配置属于高成本压力变量，不应因为“本轮 HTTP 仍然 200”就进入 control；
5. 后续 R14 应独立测 blanket Nitro inline，禁止和 R12 叠加；
6. 如果真实业务项目同时使用 source alias + blanket `noExternal` + Nitro inline，最终大图/OOM 应理解为多个变量叠加，而不是简单归因于其中某一个配置。

本 PR 作为实验资产关闭，不合并。
