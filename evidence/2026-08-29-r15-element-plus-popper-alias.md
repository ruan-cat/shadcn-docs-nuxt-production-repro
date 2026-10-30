# R15：复现 Element Plus Popper npm alias standalone 缺包

## 结论

R15 已精确复现 F17：在 control 已证明“隐藏仓库根 `node_modules` 后，standalone 首页仍可 HTTP 200”的前提下，只把 `element-plus` 从 Vite SSR 精确 externalize，Nuxt production build 完整成功，生成的 node-server 也能正常 listen；但切断仓库根依赖 fallback 后，GET `/` 稳定返回 HTTP 500：

```text
Cannot find package '@popperjs/core' imported from
apps/docs/.output/server/node_modules/element-plus/es/hooks/use-popper/index.mjs
```

产物闭包同时证明：

```text
element-plus                   存在
@sxzz/popperjs-es               存在
@popperjs/core                  不存在
```

而 Element Plus 2.13.6 源 manifest 明确声明：

```text
@popperjs/core = npm:@sxzz/popperjs-es@^2.11.7
```

因此问题不是物理实现包没有被 trace，而是 standalone materialization 没有保留运行时 import 所需的**逻辑 package identity `@popperjs/core`**。

本实验作为正向故障证据关闭，不合并到 `main`。

## 基线与唯一变量

Base main：

```text
f2cdd27488ef979bb2f9bb47c1401350d88b9e8a
```

R15 branch measurement commit：

```text
35efb2f34eb91f7f4e3b70979cb8727bfbef5bb9
```

有效 PR merge-ref：

```text
f5bf7a00b00fd811c4f4d84f7cb2259efdf6a5fe
```

有效 CI run：

```text
https://github.com/ruan-cat/shadcn-docs-nuxt-production-repro/actions/runs/33194315667
```

Linux production job：

```text
98927441101
```

冻结 lockfile SHA256：

```text
1373193329c18cd55e6c6d81da08683ec39ce6c34bd8da1db96730b55be752a8
```

唯一运行时变量：

```ts
vite: {
  ssr: {
    external: ["element-plus"],
  },
}
```

没有改变：

- UI 源码或组件种类；
- `@repro/ui` exports/dist 入口；
- package dependencies；
- lockfile；
- Nuxt / Nitro / Content / H3 版本；
- `vite.ssr.noExternal`；
- `nitro.externals.inline`；
- Nitro trace / traceAlias；
- pnpm hoist / linker；
- prerender 策略。

## Control 隔离反事实

R15 之前已通过独立 probe-only PR 把父级依赖隔离 smoke 合并到 main。

Control 在同一 Linux production 流程中会：

1. build `.output`；
2. 临时隐藏仓库根 `node_modules`；
3. 从 `apps/docs/.output/server` 作为 cwd 启动纯 Node child；
4. GET `/`；
5. HTTP 200；
6. 恢复根 `node_modules`。

因此 R15 的 500 不能解释为“隐藏根 node_modules 本来就会让 node-server 坏掉”。

## CI 结果

```text
静态 contract / dependency / H3 / UI probes       ✅
Windows frozen install / prepare / Nitro 3 API     ✅
Linux frozen install                               ✅
Linux fresh workspace build                        ✅
Docs client build                                  ✅
Docs SSR build                                     ✅
Nitro prerender                                    ✅
Nitro node-server build                            ✅
standalone closure probe                           ✅
server listen（隔离模式）                           ✅
GET /（隔离模式）                                  ❌ HTTP 500
后续普通 Docs / Content / API smokes               因前门失败跳过
```

这正是目标故障形态：

```text
build ✅ / listen ✅ / GET / ❌
```

## 构建图变化

Control：

```text
Client modules: 5005
SSR modules:    3581
```

R15：

```text
Client modules: 5005
SSR modules:    2011
```

差值：

```text
Client: 0
SSR:   -1570
```

R15 构建耗时：

```text
Client build: 27.13s
SSR build:    11.54s
```

`WorkspaceRuntimeProbe` server chunk 也从 control 约 101 kB 降到：

```text
3.96 kB
```

这证明 `vite.ssr.external: ["element-plus"]` 确实大规模改变了 SSR internalization 边界，而不是一个未生效配置。

## 最终产物尺寸

R15：

```text
server.mjs: 1.37 MB
Docs Nitro total: 21.8 MB
.output/server/package.json: 7.46 kB
```

Control 的 Docs Nitro total 约为：

```text
18.6 MB
```

即使 SSR graph 显著缩小，最终 standalone 反而变大，因为 Nitro 开始复制 external package closure，而不是把它们全卷进 SSR bundle。

## Standalone manifest

R15 `.output/server/package.json`：

```text
dependencyCount = 222
```

Control 基线：

```text
dependencyCount = 207
```

增加：

```text
+15 dependencies
```

关键条目：

```json
{
  "@sxzz/popperjs-es": "2.11.8",
  "element-plus": "2.13.6"
}
```

但 manifest 中没有：

```json
"@popperjs/core"
```

## 文件闭包证据

`apps/docs/.output/server/node_modules`：

```text
element-plus
  exists: true
  isSymlink: false

@popperjs/core
  exists: false

@sxzz/popperjs-es
  exists: true
  isSymlink: false
```

这说明最终 artifact 已经物化了 Element Plus 和 alias 的物理实现包，但没有物化 alias 的逻辑入口名。

## 上游 alias 契约

Element Plus 2.13.6 源 package manifest：

```text
version = 2.13.6
@popperjs/core = npm:@sxzz/popperjs-es@^2.11.7
```

最终运行时代码从：

```text
.output/server/node_modules/element-plus/es/hooks/use-popper/index.mjs
```

按逻辑 specifier import：

```text
@popperjs/core
```

Node ESM package resolution 不会因为目录中另有 `@sxzz/popperjs-es` 就自动把这两个 package identity 当作同一个名字。

## 仓库根 fallback 如何掩盖问题

在未隐藏仓库根 `node_modules` 时，closure probe 从 output 上下文解析逻辑名：

```text
@popperjs/core
```

能够向上回退到根 pnpm store：

```text
node_modules/.pnpm/@sxzz+popperjs-es@2.11.8/node_modules/@sxzz/popperjs-es/dist/index.js
```

因此仅在 monorepo checkout 内执行 node-server，可能得到假绿色；它实际上借用了 artifact 之外的父级依赖拓扑。

一旦隔离 probe 临时隐藏仓库根 `node_modules`，这个兜底消失，真实 standalone 缺口立即暴露。

## 首个 runtime 失败

隔离模式启动：

```text
Listening on http://127.0.0.1:3099
```

随后第一个 GET `/` 即返回：

```text
HTTP 500 Server Error
```

响应：

```json
{
  "error": true,
  "url": "http://127.0.0.1:3099/",
  "statusCode": 500,
  "statusMessage": "Server Error",
  "message": "Cannot find package '@popperjs/core' imported from .../apps/docs/.output/server/node_modules/element-plus/es/hooks/use-popper/index.mjs"
}
```

probe 后续重复 500 是当前 smoke 的 retry 行为，不代表多个不同故障；首个 500 已足以确定失败门。

## 不是 OOM

环境：

```text
NODE_OPTIONS=""
```

生产 build 完整成功，日志没有：

```text
JavaScript heap out of memory
Reached heap limit
Allocation failed
exit 137
SIGKILL
```

失败发生于成功 listen 后的真实 HTTP runtime package resolution，因此与 heap/OOM 无关。

## 第一失败门

```text
G0 static / config contract            ✅
G1 frozen install                      ✅
G2 package / H3 / UI probes            ✅
G3 Nuxt prepare                        ✅
G4 client build                        ✅ 5005 modules
G5 SSR build                           ✅ 2011 modules
G6 prerender                           ✅
G7 Nitro node-server artifact          ✅
G8 closure probe                       ✅
G9 isolated server listen              ✅
G10 isolated GET /                     ❌ missing @popperjs/core
```

## 判读

当前证据支持：

1. F17 已在这个最小生产型仓库中被真实复现；
2. `element-plus -> @popperjs/core -> npm:@sxzz/popperjs-es` 的 npm alias 会在当前 Nitro standalone materialization 中出现 logical-name 丢失；
3. tracing 识别并复制了物理实现 `@sxzz/popperjs-es`，但没有生成 Node runtime 所需的 `node_modules/@popperjs/core` package identity；
4. monorepo 根 `node_modules` 可以掩盖这个问题，因此“build 成功”和“在 checkout 内直接运行成功”都不足以证明部署 artifact 完整；
5. 后续 R16 的 app-local direct alias dependency 已有充分实验依据：应只加入

```json
"@popperjs/core": "npm:@sxzz/popperjs-es@^2.11.7"
```

并在完全相同的 R15 externalization topology 下重新跑 closure + isolated GET `/`；
6. 如果 R16 让 output 同时出现 logical `@popperjs/core` 并恢复 isolated HTTP 200，就能建立“复现 → 精确修复”的强因果链。

当前证据不支持使用 blanket Nitro inline、全局 hoist 或 node-linker hoisted 作为默认修复；这些属于后续独立对照实验。
