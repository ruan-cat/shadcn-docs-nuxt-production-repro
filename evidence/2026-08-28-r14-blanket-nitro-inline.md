# R14：blanket Nitro `externals.inline` 压力实验

## 结论

R14 是正向失败结果：在冻结 control 上只增加 `nitro.externals.inline: [/.*/]` 后，Nuxt client 与 SSR 构建仍完成，但 Nitro prerender 初始化阶段出现大量 unresolved external 警告，并最终因为生成的 `.nuxt/prerender/index.mjs` 无法解析 `ufo` 而退出。

这不是 OOM，也不是 H3/Content 版本漂移；它是 blanket Nitro internalization 对 prerender bundling / package resolution 边界的直接破坏信号。

本实验不合并到 `main`。

## 基线与唯一变量

Base main：

```text
0f354b65e6cf3480b236bdda79d287ecc7b23322
```

实验 branch head（测量前）：

```text
d7944c34e7b59e619f1a35af227178a5ef3e351c
```

有效 PR merge-ref：

```text
723c5443fcdb40cd611b8117deae6af03bb43bf7
```

有效 CI run：

```text
https://github.com/ruan-cat/shadcn-docs-nuxt-production-repro/actions/runs/33183239547
```

冻结 lockfile SHA256 与 control 相同：

```text
1373193329c18cd55e6c6d81da08683ec39ce6c34bd8da1db96730b55be752a8
```

唯一运行时配置变量：

```ts
nitro: {
  externals: {
    inline: [/.*/],
  },
}
```

没有叠加：

- `vite.ssr.noExternal`；
- source alias；
- 依赖版本变化；
- H3 / Content 变化；
- trace 变化；
- prerender 清空；
- pnpm hoist / linker 变化。

`experiment.json` 只用于声明这项危险配置是有意的 R14 单变量。

## CI 结果

```text
静态契约 / dependency / H3 / UI probe     ✅
Windows frozen install / prepare / API      ✅
Linux shared-core / API / UI build          ✅
Linux Nuxt client build                     ✅
Linux Nuxt SSR build                        ✅
Nitro prerender 初始化                       ❌
standalone closure probe                    未执行
Docs / Content artifact HTTP                未执行
Nitro 3 API artifact HTTP（Linux job）       未执行
```

Windows 日常轨没有执行 docs full production，因此本实验不能写成“Windows full build 通过”。

## 构建图

失败前 client / SSR module count 与 control 完全相同：

```text
Client modules: 5005
SSR modules:    3581
```

对应阶段耗时：

```text
Client build: 28.30s
SSR build:    19.09s
```

这和 R12 不同：R12 blanket Vite `ssr.noExternal` 将 SSR modules 从 3581 提高到 3645，并成功走到最终 artifact；R14 在 Vite client/SSR 图仍为 control 的情况下，直接破坏后续 Nitro prerender resolution。

## Nitro prerender 警告族

进入 prerender 初始化后，构建连续出现 unresolved-as-external 警告，包括：

```text
@shikijs/langs/javascript
@shikijs/langs/jsx
@shikijs/langs/json
@shikijs/langs/typescript
@shikijs/langs/tsx
@shikijs/langs/vue
@shikijs/langs/css
@shikijs/langs/html
@shikijs/langs/shellscript
@shikijs/langs/markdown
@shikijs/langs/mdc
@shikijs/langs/yaml
@shikijs/langs/diff
@shikijs/langs/ini
@shikijs/langs/dotenv
@shikijs/themes/github-light
@shikijs/themes/github-dark
shiki/wasm
@intlify/h3
@shikijs/engine-oniguruma
@shikijs/engine-javascript
@shikijs/core
@shikijs/transformers
remark-emoji
```

这些 warning 本身不是最终 exit 原因，但说明 blanket inline 进入 Nitro prerender bundling 后，生成模块的包解析边界已经显著异常。

## 首个致命异常

最终 fatal：

```text
Cannot find package 'ufo' imported from
apps/docs/.nuxt/prerender/index.mjs

Did you mean to import "ufo/dist/index.cjs"?
```

Node ESM stack 起点：

```text
node:internal/modules/package_json_reader
node:internal/modules/esm/resolve
node:internal/modules/esm/loader
```

因此第一失败门是：

```text
G0 experiment/config contract   ✅
G1 frozen install               ✅
G2 dependency/H3/UI probes      ✅
G3 Nuxt prepare                 ✅
G4 client build                 ✅ 5005 modules
G5 SSR build                    ✅ 3581 modules
G6 Nitro prerender init         ❌ missing package: ufo
G7 final node-server artifact   未生成
G8 closure probe / HTTP smoke   未执行
```

## 不是 OOM

环境记录：

```text
NODE_OPTIONS=""
```

日志没有：

```text
JavaScript heap out of memory
Reached heap limit
Allocation failed
SIGKILL / exit 137
```

进程以普通 `exit code 1` 结束，且 fatal error 是确定性的 Node ESM package resolution failure。因此 R14 不应归类为 heap/OOM 证据。

## 与 R12 的关系

R12：

```text
vite.ssr.noExternal = true
SSR modules: 3581 -> 3645
server.mjs: 1.37 MB -> 2.82 MB
Docs Nitro total: 18.6 MB -> 21.6 MB
最终 Docs/Content/API HTTP 全 200
```

R14：

```text
nitro.externals.inline = [/.*/]
Client modules: 5005 -> 5005
SSR modules:    3581 -> 3581
Nitro prerender init: missing ufo -> build failure
```

因此 Vite SSR internalization 与 Nitro internalization 是两条不同的故障轴：前者在当前 topology 下主要表现为 bundle 膨胀，后者的 blanket 形式已经直接破坏 prerender package resolution。

## 判读边界

当前证据支持：

1. 在本仓固定 Nuxt 3.21.2 / Nitro 2.13.4 / pnpm strict workspace topology 下，blanket `nitro.externals.inline: [/.*/]` 是危险配置；
2. 它不是一个可接受的“把依赖都打进 bundle 就能修 standalone 缺包”的通用 workaround；
3. 它会在最终 artifact 生成之前破坏 prerender resolution，因此无法用于验证 Element Plus / Popper alias 的 standalone closure；
4. 后续 R15 应直接建立真正隔离的 artifact / tracing 测量，而不是继续扩大 blanket inline；
5. 如果 R15 找到具体缺失 package，再用 R13/R16/R17 一类精确依赖或 tracing 手段做单变量修复。

当前证据不支持扩大为“任何 Nitro inline 都会失败”；本实验只证明 blanket `/.*/` 在当前 topology 下失败。
