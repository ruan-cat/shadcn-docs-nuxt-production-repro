# R10：workspace UI 从 dist 切换为 Nuxt/Vite source alias

日期：2026-08-28

## 结论摘要

R10 已确认：Nuxt/Vite 的 `@repro/ui` build-time alias **真实进入了 workspace 源码**，但在当前固定 topology 下，它没有显著放大既有复杂 UI 构建图，也没有触发 SSR、Content、Nitro 或 standalone runtime 故障。

相对 R09 dist control：

```text
指标                         R09 dist      R10 source alias      Delta
Client modules               5005          5007                  +2
SSR modules                  3581          3583                  +2
WorkspaceRuntimeProbe        ~101 kB       107 kB                约 +6 kB
Docs Nitro total             18.6 MB       18.6 MB               基本不变
Docs/Content/API HTTP        全 200         全 200                 不变
```

因此 R08 中 `apps/docs -> @repro/ui` 带来的巨大图成本，主要来自 Element Plus + VueUse 等 UI runtime 依赖本身，而不是简单由“消费 dist”还是“消费 src”决定。

---

## 基线

R09 control main：

```text
1fae5f2c4366e1c546173933f27ddff8ba74b716
```

R09 package contract：

```text
main           -> ./dist/repro-ui.js
module         -> ./dist/repro-ui.js
exports.import -> ./dist/repro-ui.js
types          -> ./src/index.ts
exports.types  -> ./src/index.ts
```

Node 22 ESM package-resolution probe 从 docs context 得到：

```text
@repro/ui -> packages/ui/dist/repro-ui.js
class     -> workspace-dist
```

R09 production：

```text
Client modules               5005
SSR modules                  3581
WorkspaceRuntimeProbe        ~101 kB / ~26.3 kB gzip
Docs Nitro total             18.6 MB
```

---

## 唯一运行时变量

R10 只在 `apps/docs/nuxt.config.ts` 增加：

```ts
import { fileURLToPath } from "node:url";

const uiSourceEntry = fileURLToPath(
  new URL("../../packages/ui/src/index.ts", import.meta.url),
);

export default defineNuxtConfig({
  alias: {
    "@repro/ui": uiSourceEntry,
  },
});
```

没有修改：

```text
apps/docs package.json
@repro/ui workspace dependency
packages/ui package exports
packages/ui dist build
Element Plus / VueUse
Nuxt 3.21.2
shadcn-docs-nuxt 1.1.9
Content 2.13.9 + root override
H3 1.15.11
nuxt-og-image 5.1.9 override
Nitro 3 sibling
Vite ssr.noExternal
Nitro externals.inline
trace / prerender / hoist
pnpm-lock.yaml
```

---

## 为什么 Node package probe 仍然显示 dist

R10 故意区分两层解析：

```text
Node package contract       -> packages/ui/dist/repro-ui.js
Nuxt/Vite build-time alias  -> packages/ui/src/index.ts
```

`probe:ui` 使用 Node ESM package resolution，因此仍然报告：

```text
resolvedFromDocs.class -> workspace-dist
```

这不是 alias 失效，而是 package metadata 本身没有被改写。

是否真正进入 source graph，必须看 Nuxt/Vite 生成产物。

---

## source alias 生效的硬证据

有效 provenance + runtime run：

```text
33181771426
```

Linux job：

```text
98884483446
```

`probes/inspect-workspace-ui-output.ts` 扫描：

```text
apps/docs/.nuxt/dist/server
apps/docs/.output/server
```

共：

```text
1742 files
```

结果：

```text
uiSourcePathFileCount = 4
uiDistPathFileCount   = 0
```

命中 source 的文件：

```text
apps/docs/.nuxt/dist/server/_nuxt/WorkspaceRuntimeProbe-BFrG0u-9.js
apps/docs/.nuxt/dist/server/_nuxt/WorkspaceRuntimeProbe-BFrG0u-9.js.map
apps/docs/.nuxt/dist/server/_nuxt/WorkspaceRuntimeProbe-BFrG0u-9.js.map.json
apps/docs/.output/server/chunks/build/WorkspaceRuntimeProbe-BFrG0u-9.mjs
```

生成代码直接出现：

```text
../../packages/ui/src/ProductionRuntimeCard.vue
```

Nuxt SSR sourcemap `sources` 也直接包含：

```text
../../../../../../packages/ui/src/ProductionRuntimeCard.vue
```

同时整个扫描范围没有出现：

```text
packages/ui/dist/
```

因此 R10 已经排除“alias 配置存在但 Vite 实际仍消费 dist”的解释。

---

## Linux production

有效 run：

```text
33181771426
```

### Client graph

```text
R09: 5005
R10: 5007
Delta: +2
```

### SSR graph

```text
R09: 3581
R10: 3583
Delta: +2
```

### WorkspaceRuntimeProbe

```text
R09: ~101 kB / ~26.3 kB gzip
R10: 107 kB / 26.6 kB gzip
```

### Docs Nitro total

```text
R09: 18.6 MB
R10: 18.6 MB
```

### 参考时间

本轮：

```text
UI package build       ~137 ms
Nuxt client build      ~29.38 s
Nuxt server build      ~19.28 s
Content prerender      ~15.05 s
Turbo full build       ~1m41.3s
```

GitHub runner 时间波动较大，因此这些数字只作为辅助证据，不据此声称 source alias 显著变慢或变快。

---

## H3 / Content

R10 H3 路径保持 control：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

没有复现 R02 的 Content -> H3 v2 漂移。

Content prerender：

```text
cache ✅
search ✅
```

---

## Standalone HTTP

```text
Docs /                    -> HTTP 200, bytes=107087
Content cache             -> HTTP 200, bytes=100273
Content search            -> HTTP 200, bytes=100261
Nitro 3 API /v1/health    -> HTTP 200, bytes=85
```

与 R09 control 完全一致。

---

## Windows

同一有效 run 的 Windows 轨全绿：

```text
frozen install ✅
control contracts ✅
workspace package build ✅
Nuxt prepare ✅
dependency/H3/UI package probe ✅
Nitro 3 API build ✅
Nitro 3 API artifact HTTP ✅
```

日常 Windows job 没有执行 docs full production，因此不把 Linux 的 module delta 外推为 Windows full build 结论。

---

## 与 R08 的关系

R08 删除整个 docs -> UI consumption edge：

```text
Client: 5005 -> 4082  (-923)
SSR:    3581 -> 2009  (-1572)
WorkspaceRuntimeProbe: ~101 kB -> 1.7 kB
```

R10 只把同一 UI consumer 从 dist 改为 source：

```text
Client: 5005 -> 5007  (+2)
SSR:    3581 -> 3583  (+2)
WorkspaceRuntimeProbe: ~101 kB -> 107 kB
```

因此目前证据支持：

1. 复杂 UI runtime dependency chain 是主要构建图成本；
2. 在当前 UI 包很薄、源码入口与 dist 入口语义接近的情况下，source alias 本身只增加极少图节点；
3. 不能把真实项目里 source alias + blanket noExternal + Nitro inline 叠加后的巨大图，简单归因于 source alias 单一变量；
4. 后续必须用 R12/R14 分别独立测 `noExternal` / Nitro inline 的成本；
5. 如果未来 UI source package 包含更多未预编译源码、条件 exports、宏或深层源依赖，R10 结论不能直接外推。

---

## 最终判读

R10 是一个有效的**负/弱变化结果**：

- source alias 已被生成图硬证据证明生效；
- client/SSR 仅各增加 2 modules；
- server chunk 小幅增加；
- Nitro 总大小基本不变；
- H3、Content、Windows 基础轨、standalone HTTP 全部稳定；
- 当前 topology 下没有理由因为 R10 而添加精确 `ssr.noExternal` workaround。

因此 R11 暂时没有真实 externalization 错误可作为候选修复目标，不应人为选择一个 package 去制造“修复”。

本 PR 作为实验资产关闭，不合并。
