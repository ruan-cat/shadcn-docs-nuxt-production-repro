# R18：targeted `publicHoistPattern` 不能修复 standalone alias closure

## 结论

R18 在 R15 已稳定复现的 Element Plus standalone npm alias failure topology 上，只改变 pnpm 安装布局：

```yaml
publicHoistPattern:
  - "@popperjs/core"
```

结果：

```text
生产构建                 ✅
server listen             ✅
workspace 根可见逻辑 alias ✅
standalone logical alias   ❌
isolated GET /             ❌ HTTP 500
```

最终 Nitro artifact 与 R15 的关键闭包完全相同：

```text
dependencyCount = 222
@sxzz/popperjs-es       ✅ physical
@popperjs/core          ❌ missing
element-plus            ✅ physical
```

切断仓库根 `node_modules` fallback 后，仍得到与 R15 完全相同的运行时错误：

```text
Cannot find package '@popperjs/core' imported from
apps/docs/.output/server/node_modules/element-plus/es/hooks/use-popper/index.mjs
```

因此 targeted `publicHoistPattern` 只改变 checkout/workspace 根的 package 可见性，并没有让 Nitro standalone materialization 保留逻辑 package identity。它不是 F17 的 artifact-level 修复。

本实验关闭且不合并。

## 实验基线

PR：

```text
#26
```

PR base：

```text
experiment/r15-element-plus-external
```

R15 base head：

```text
f138b09f60b3508981c97c1fec75515e3d6cb14b
```

R18 measurement head：

```text
bed0881491a10a04053975e42bccb789ab9d35b1
```

有效 PR merge-ref：

```text
b2b737620e8c2a1e2f65addb2bf52e3507b4cf49
```

有效 CI run：

```text
https://github.com/ruan-cat/shadcn-docs-nuxt-production-repro/actions/runs/33196733988
```

Linux production job：

```text
98935670916
```

实验 lockfile workflow：

```text
33196734022
```

该 workflow 成功，但没有推进 branch head，说明 `publicHoistPattern` 没有改变 lockfile 内容。

有效 lockfile SHA256 与 R15/R17 相同：

```text
1373193329c18cd55e6c6d81da08683ec39ce6c34bd8da1db96730b55be752a8
```

## R18 对 R15 的唯一变量

`pnpm-workspace.yaml`：

```yaml
packages:
  - "apps/*"
  - "packages/*"

publicHoistPattern:
  - "@popperjs/core"
```

`experiment.json` 只负责配置审计：

```json
{
  "allowedSafetyPatterns": {
    "pnpmWorkspace": ["publicHoistPattern"]
  }
}
```

没有叠加：

- R16 的 app-local direct `@popperjs/core` dependency；
- R17 的 Nitro `externals.traceAlias`；
- Nitro blanket/narrow inline；
- Vite `noExternal`；
- `nodeLinker: hoisted`；
- UI 源码变化；
- dependency version / lockfile 变化。

仍保留 R15 的真实 failure topology：

```ts
vite: {
  ssr: {
    external: ["element-plus"],
  },
}
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
isolated GET /                                     ❌ HTTP 500
ordinary Docs / Content / API smokes               因前门失败跳过
```

## 构建图：与 R15/R17 一致

R18：

```text
Client modules: 5005
SSR modules:    2011
Client build:   19.26s
SSR build:      8.59s
WorkspaceRuntimeProbe: 3.96 kB
server.mjs:     1.37 MB
.output/server/package.json: 7.46 kB
Docs Nitro total: 21.8 MB
```

R15 / R17 的关键 graph：

```text
Client modules: 5005
SSR modules:    2011
WorkspaceRuntimeProbe: 3.96 kB
server.mjs:     1.37 MB
Docs Nitro total: 21.8 MB
```

因此 `publicHoistPattern` 没有改变 Vite SSR internalization，也没有改变最终 bundle 尺寸级别。

## Standalone manifest：完全等同 R15

R18 `.output/server/package.json`：

```text
dependencyCount = 222
```

关键条目：

```json
{
  "@sxzz/popperjs-es": "2.11.8",
  "element-plus": "2.13.6"
}
```

没有：

```json
"@popperjs/core"
```

R15 同样：

```text
dependencyCount = 222
@popperjs/core missing
```

R17 则为：

```text
dependencyCount = 223
@popperjs/core present in manifest
```

## 文件闭包：logical identity 仍未物化

R18 artifact：

```text
apps/docs/.output/server/node_modules/element-plus
  exists: true
  isSymlink: false

apps/docs/.output/server/node_modules/@sxzz/popperjs-es
  exists: true
  isSymlink: false

apps/docs/.output/server/node_modules/@popperjs/core
  exists: false
```

因此 targeted public hoist 没有让 output 生成逻辑 alias 目录或 symlink。

## 为什么普通 workspace 解析会假绿

closure probe 在仓库根 `node_modules` 仍存在时，从 output 上下文解析：

```text
@popperjs/core
```

可以成功回退到根 pnpm store：

```text
node_modules/.pnpm/@sxzz+popperjs-es@2.11.8/node_modules/@sxzz/popperjs-es/dist/index.js
```

这正是 public hoist / workspace 根可见性类 workaround 的风险：

> 它可以让 checkout 内的 resolver 更容易找到 phantom dependency，但这不等价于部署 artifact 自己拥有该 logical package identity。

## 隔离 runtime 仍失败

isolated probe 临时隐藏仓库根 `node_modules`：

```text
# 隔离模式: 已临时隐藏仓库根 node_modules，禁止 .output 向父级回退解析
```

server 正常启动：

```text
Listening on http://127.0.0.1:3099
```

首个 GET `/`：

```text
HTTP 500 Server Error bytes=344
```

错误：

```text
Cannot find package '@popperjs/core' imported from
.../.output/server/node_modules/element-plus/es/hooks/use-popper/index.mjs
```

后续重试均为同一个 500；最终 smoke exit code 1。

因此第一失败门与 R15 完全相同。

## 不是 OOM

```text
NODE_OPTIONS=""
```

完整 build 成功、server 成功 listen；失败是隔离 HTTP runtime 的 Node ESM package resolution。无 heap limit / allocation failed / exit 137 / SIGKILL。

## 与 R15 / R17 的直接对照

### R15 — 原始复现

```text
dependencyCount             222
physical @sxzz              ✅
logical @popperjs/core      ❌
isolated GET /              ❌ 500
```

### R18 — targeted public hoist

```text
dependencyCount             222
physical @sxzz              ✅
logical @popperjs/core      ❌
isolated GET /              ❌ 500
```

### R17 — Nitro traceAlias

```text
dependencyCount             223
physical @sxzz              ✅
logical @popperjs/core      ✅ symlink -> ../@sxzz/popperjs-es
isolated GET /              ✅ 200
```

因此可以清楚地区分：

- `publicHoistPattern` 改的是**源 workspace 安装可见性**；
- `externals.traceAlias` 改的是**Nitro standalone artifact materialization**。

F17 的失败发生在后者，所以 R17 是精确修复，而 R18 不是。

## 第一失败门

```text
G0 experiment/config contract            ✅
G1 frozen install                        ✅
G2 dependency/H3/UI probes               ✅
G3 Nuxt prepare                          ✅
G4 client build                          ✅ 5005
G5 SSR build                             ✅ 2011
G6 prerender                             ✅
G7 node-server artifact                  ✅
G8 closure manifest                      ✅ 222 deps
G9 logical alias materialization         ❌ missing
G10 isolated server listen               ✅
G11 isolated GET /                       ❌ 500
```

## 判读与后续

当前证据支持：

1. targeted `publicHoistPattern` 不能修复本仓的 standalone npm alias logical identity 丢失；
2. 它可能改善/扩大 monorepo checkout 内的 package 可见性，但隔离 artifact 仍坏；
3. 不应把“本地/CI checkout 能启动”误写成部署产物自足；
4. R17 `externals.traceAlias` 仍是目前最精确、最小作用面的成功方案；
5. R19 应从同一个 R15 failure topology 单独派生，只启用全局 `nodeLinker: hoisted`，验证更激进的 pnpm 拓扑变化是否会反过来改变 Nitro tracing/materialization；
6. 即使 R19 能恢复 200，也必须将其视为全局拓扑 workaround，与 R17 的精确 artifact 修复分开评价。
