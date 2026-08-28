# R17：Nitro v2 `externals.traceAlias` 精确修复 F17

## 结论

R17 在 R15 已真实复现的 Element Plus standalone npm alias failure topology 上，只增加 Nitro v2 `externals.traceAlias`：

```ts
nitro: {
  externals: {
    traceAlias: {
      "@sxzz/popperjs-es": "@popperjs/core",
    },
  },
}
```

结果完整命中预期修复签名：

```text
R15 dependencyCount             222
R17 dependencyCount             223

R15 @sxzz/popperjs-es           ✅ physical
R15 @popperjs/core              ❌ missing
R15 isolated GET /              ❌ HTTP 500

R17 @sxzz/popperjs-es           ✅ physical
R17 @popperjs/core              ✅ symlink
R17 symlink target              ../@sxzz/popperjs-es
R17 isolated GET /              ✅ HTTP 200
```

并且 R17 的 client / SSR graph 与 R15 保持一致：

```text
Client modules: 5005
SSR modules:    2011
```

因此这个修复没有重新改变 Vite SSR internalization 边界；它只在 Nitro standalone package materialization 层补回 Node runtime 所需的 logical package identity。

R17 构成当前最强的“复现 → 精确修复”因果链。作为实验 PR 关闭，不直接合并到 `main`。

## 实验基线

R17 PR base：

```text
experiment/r15-element-plus-external
```

R15 base head（已同步治理槽位，但 runtime failure topology 不变）：

```text
f138b09f60b3508981c97c1fec75515e3d6cb14b
```

R17 measurement head：

```text
8c508273e8ce0e415dcf7f578b087ff5907f24bf
```

有效 PR merge-ref：

```text
f7496e80716fe710ea41746b6bb9a1fbe201781f
```

有效 CI run：

```text
https://github.com/ruan-cat/shadcn-docs-nuxt-production-repro/actions/runs/33196325520
```

Linux production job：

```text
98934276278
```

冻结 lockfile SHA256：

```text
1373193329c18cd55e6c6d81da08683ec39ce6c34bd8da1db96730b55be752a8
```

与 R15 完全相同。

## R17 对 R15 的唯一运行时变量

R15 已保留：

```ts
vite: {
  ssr: {
    external: ["element-plus"],
  },
}
```

R17 只增加：

```ts
nitro: {
  externals: {
    traceAlias: {
      "@sxzz/popperjs-es": "@popperjs/core",
    },
  },
}
```

没有叠加 R16 的 app-local direct alias dependency；`apps/docs/package.json` 与 R15 相同，没有直接声明 `@popperjs/core`。

没有改变：

- package dependencies；
- pnpm lockfile；
- UI 源码；
- Element Plus 版本；
- Nuxt / Nitro / H3 / Content；
- `vite.ssr.noExternal`；
- blanket/narrow Nitro `inline`；
- traceInclude；
- pnpm hoist / node-linker；
- prerender 策略。

`experiment.json` 只负责放行并审计 `traceAlias` 配置型实验。

## Nitro v2 源码依据

当前 Docs 实际使用：

```text
Nuxt 3.21.2
Nitro 2.13.4
```

Nitro v2 `NodeExternalsOptions` 明确包含：

```ts
traceAlias?: Record<string, string>
```

v2 externals 实现的语义是：

```text
key   = 已追踪/已复制的 physical package name
value = 需要额外建立的 logical alias package name
```

写包时会：

```text
linkPackage(physicalPackage, logicalAlias)
```

同时将 logical alias 加入最终 server `package.json` dependencies。

因此针对 Element Plus：

```text
physical = @sxzz/popperjs-es
logical  = @popperjs/core
```

正确方向为：

```ts
"@sxzz/popperjs-es": "@popperjs/core"
```

## CI 总结果

```text
静态 contract / dependency / H3 / UI probe       ✅
Windows frozen install / prepare / Nitro 3 API     ✅
Linux frozen install                               ✅
Linux fresh production build                       ✅
Docs client build                                  ✅
Docs SSR build                                     ✅
Nitro prerender                                    ✅
Nitro node-server build                            ✅
standalone closure probe                           ✅
isolated server listen                             ✅
isolated GET /                                     ✅ HTTP 200
ordinary GET /                                     ✅ HTTP 200
Content cache                                      ✅ HTTP 200
Content search                                     ✅ HTTP 200
Nitro 3 API health                                 ✅ HTTP 200
```

三条 CI 轨全部成功。

## 构建图：与 R15 一致

R17：

```text
Client modules: 5005
SSR modules:    2011
Client build:   27.88s
SSR build:      12.11s
WorkspaceRuntimeProbe: 3.96 kB
server.mjs:     1.37 MB
Docs Nitro total: 21.8 MB
```

R15：

```text
Client modules: 5005
SSR modules:    2011
WorkspaceRuntimeProbe: 3.96 kB
server.mjs:     1.37 MB
Docs Nitro total: 21.8 MB
```

这说明 `traceAlias` 没有把 Element Plus 重新 inline/bundle，也没有扩大 SSR graph。

## Standalone manifest：logical identity 被补回

R15：

```text
dependencyCount = 222
```

R17：

```text
dependencyCount = 223
```

新增的关键 manifest identity：

```json
"@popperjs/core": "2.11.8"
```

同时仍保留：

```json
"@sxzz/popperjs-es": "2.11.8",
"element-plus": "2.13.6"
```

这与 Nitro v2 `usedAliases` 写入最终 package manifest 的源码行为完全一致。

## 文件闭包：symlink 精确形成

R17 artifact：

```text
apps/docs/.output/server/node_modules/element-plus
  exists: true
  isSymlink: false

apps/docs/.output/server/node_modules/@sxzz/popperjs-es
  exists: true
  isSymlink: false

apps/docs/.output/server/node_modules/@popperjs/core
  exists: true
  isSymlink: true
  linkTarget: ../@sxzz/popperjs-es
  realPath: apps/docs/.output/server/node_modules/@sxzz/popperjs-es
```

因此 runtime import：

```text
@popperjs/core
```

现在在 standalone artifact 内部拥有正确的 logical package identity，并最终落到已 trace 的物理实现 package。

## 隔离 runtime：从 R15 的 500 恢复为 200

隔离 probe 临时隐藏仓库根 `node_modules`：

```text
# 隔离模式: 已临时隐藏仓库根 node_modules
```

server：

```text
Listening on http://127.0.0.1:3099
```

首个请求：

```text
HTTP 200 OK bytes=107087
```

随后恢复根 `node_modules`。

因此 R17 的成功不依赖 monorepo root fallback。

普通仓库上下文也全部通过：

```text
GET /                         200 bytes=107087
GET /api/_content/cache.json 200 bytes=100273
GET /api/_content/search     200 bytes=100261
Nitro 3 /v1/health           200 bytes=85
```

## 一个 probe 层面的非故障说明

closure probe 中 `outputResolution` 的 CJS-style resolution 检查仍会针对 Element Plus / Popper 报 `lib/index.js` / `dist/index.js` 路径不存在。

这不是 R17 runtime failure，因为：

1. 文件闭包已经明确证明 logical symlink 存在且 realPath 正确；
2. 真正的 Node ESM server 成功 listen；
3. 隔离 GET `/`、普通 GET `/`、Content endpoints 全部 200。

因此该字段只能作为 probe 的 CJS-resolution 辅助信号，不能覆盖真实 ESM HTTP runtime 证据。

## 与 R15 / R16 的完整因果链

### R15 — 复现

```text
source direct alias        ❌
traceAlias                 ❌
physical @sxzz             ✅
logical @popperjs/core     ❌
isolated GET /             ❌ 500
```

### R16 — direct dependency 失败

```text
source direct alias        ✅
lockfile alias mapping     ✅
traceAlias                 ❌
physical @sxzz             ✅
logical @popperjs/core     ❌
isolated GET /             ❌ 500
```

### R17 — traceAlias 成功

```text
source direct alias        ❌
traceAlias                 ✅
physical @sxzz             ✅
logical @popperjs/core     ✅ symlink
manifest logical identity  ✅
isolated GET /             ✅ 200
```

因此可以非常强地判定：

> 当前故障的关键不是“源码 app 有没有重复声明 npm alias”，而是 Nitro v2 standalone materialization 是否保留 Node runtime 需要的 logical package identity。`externals.traceAlias` 正是针对这一层的有效修复。

## 不是 OOM

```text
NODE_OPTIONS=""
```

build 与所有 runtime smokes 均成功，没有 heap limit / allocation failed / exit 137 / SIGKILL。

## 第一失败门变化

R15：

```text
G0-G9 ✅
G10 isolated GET / ❌ missing @popperjs/core
```

R17：

```text
G0 static/config contract            ✅
G1 frozen install                    ✅
G2 dependency/H3/UI probes           ✅
G3 Nuxt prepare                      ✅
G4 client build                      ✅ 5005
G5 SSR build                         ✅ 2011
G6 prerender                         ✅
G7 node-server artifact              ✅
G8 closure manifest                  ✅ 223 deps
G9 logical alias materialization     ✅ symlink
G10 isolated GET /                   ✅ 200
G11 ordinary Docs/Content/API smoke  ✅
```

## 判读与后续

当前证据支持：

1. F17 已由 R15 稳定复现；
2. R16 排除了 app-local direct alias dependency 作为充分修复；
3. R17 证明 Nitro v2 `externals.traceAlias` 可以精确恢复丢失的 logical package identity；
4. 该修复不增加 SSR module count，也不需要 blanket inline / hoist；
5. 对这类 npm alias standalone 缺包，优先级应高于 blanket `nitro.externals.inline: [/.*/]`，后者 R14 已证明会破坏 prerender resolution；
6. R18 若继续，应作为“精确 narrow inline 的替代方案对照”，从 R15 failure topology 单独派生，不能叠加 R17；
7. R19 hoist 同样应作为拓扑 workaround 对照，而不是默认推荐修复。
