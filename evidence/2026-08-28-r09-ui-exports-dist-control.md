# R09：workspace UI 使用 package exports / dist 的控制组

日期：2026-08-28

## 实验定位

R09 不改变运行时配置。它把当前 `main` 已验证的 `@repro/ui` **package exports -> dist** 消费方式固化成后续 R10 source alias 的正式对照。

有效 control merge：

```text
d7b55eba47de19df7a68e8aaca7328bbbc7f3a3f
```

有效 CI run：

```text
33180426443
```

该 run 的三条证据轨全部成功。

---

## UI package contract

`packages/ui/package.json`：

```text
main           -> ./dist/repro-ui.js
module         -> ./dist/repro-ui.js
exports.import -> ./dist/repro-ui.js
types          -> ./src/index.ts
exports.types  -> ./src/index.ts
```

Node 22 ESM package-resolution probe 从 `apps/docs` context 实际得到：

```text
uiPhysicalRoot                   -> packages/ui
resolvedFromDocs.relativePath    -> packages/ui/dist/repro-ui.js
resolvedFromDocs.class           -> workspace-dist
```

UI package 自身依赖继续解析为：

```text
Element Plus -> pnpm store / element-plus/es/index.mjs
VueUse       -> pnpm store / @vueuse/core/dist/index.js
shared-core  -> packages/shared-core/dist/index.js
```

因此 R09 明确证明：当前生产 control 并不是直接消费 `packages/ui/src/index.ts`，而是先消费 UI 包的构建产物 `dist/repro-ui.js`。

---

## H3 / Content control

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

R09 不改变 R02 已验证的 H3 边界：Content 仍稳定解析到 H3 v1。

---

## Linux production control

```text
Nuxt          3.21.2
Nitro         2.13.4
Vite          7.3.6
Vue           3.5.30
Client        5005 modules transformed
SSR           3581 modules transformed
Docs output   18.6 MB
```

关键 workspace UI server chunk：

```text
WorkspaceRuntimeProbe: ~101 kB
                       ~26.3 kB gzip
```

UI package 自身独立构建产物：

```text
dist/repro-ui.js: 1.91 kB
                  0.88 kB gzip
```

这说明虽然 docs package entry 只指向一个很小的 dist 文件，但该入口继续导入 Element Plus、VueUse 等运行时后，最终 Nuxt SSR 图仍然很大。

### 本轮时间记录

```text
UI package build       ~124 ms
Nuxt client build      ~27.95 s
Nuxt server build      ~19.08 s
Content prerender      ~15.17 s
Turbo full build       ~1m39.3s
```

这些绝对时间受 GitHub runner 波动影响，后续 R10 只能作为辅助指标；模块数量、chunk 和 HTTP 结果优先级更高。

---

## Standalone HTTP control

```text
Docs /                    -> HTTP 200, bytes=107087
Content cache             -> HTTP 200, bytes=100273
Content search            -> HTTP 200, bytes=100261
Nitro 3 API /v1/health    -> HTTP 200, bytes=85
```

因此 control 不仅 `nuxt build` 成功，而且 Docs / Content / 独立 Nitro API 的最终 standalone artifact 均可真实运行。

---

## Windows control

Windows 证据轨完成：

```text
frozen install ✅
workspace package build ✅
Nuxt prepare ✅
dependency tree ✅
H3 probe ✅
UI ESM package entry probe ✅
Nitro 3 API build ✅
Nitro 3 API artifact HTTP ✅
```

Windows 上同样确认 `@repro/ui` package contract 指向 workspace dist。

日常 Windows job 不执行 docs full production，因此不把 Linux 模块数量和 build time 外推成 Windows 结果。

---

## 与 R08 的关系

R08 删除 `apps/docs -> @repro/ui` 消费边后：

```text
Client: 5005 -> 4082  (-923 / -18.4%)
SSR:    3581 -> 2009  (-1572 / -43.9%)
WorkspaceRuntimeProbe: ~101 kB -> 1.7 kB
```

所以 R09 的 dist control 已经证明：

1. `@repro/ui` 通过 package exports/dist 进入 docs；
2. 即使入口产物本身仅约 1.91 kB，其 Element Plus/VueUse 依赖仍能显著放大 Nuxt client/SSR graph；
3. R10 若把相同 package 改成 source alias，应只比较“dist entry vs source entry”，不能同时加入 `ssr.noExternal`、Nitro inline、trace workaround 等第二变量；
4. 如果 R10 结果几乎相同，也属于有效结论——这将说明图放大主要来自 UI 运行时依赖本身，而非 dist/source 入口形式。

R09 是控制组证据，不是 defect。
