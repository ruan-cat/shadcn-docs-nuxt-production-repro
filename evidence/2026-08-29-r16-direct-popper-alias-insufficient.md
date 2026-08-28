# R16：app-local direct Popper npm alias 不是充分修复

## 结论

R16 在 R15 已复现的 standalone failure topology 上，只向 `apps/docs` 增加：

```json
"@popperjs/core": "npm:@sxzz/popperjs-es@^2.11.7"
```

实验专用 lockfile workflow 正确把它解析为：

```text
@popperjs/core
specifier: npm:@sxzz/popperjs-es@^2.11.7
version:   @sxzz/popperjs-es@2.11.8
```

但最终 Nitro node-server artifact 与 R15 的关键 alias closure 完全相同：

```text
element-plus                 ✅ exists
@sxzz/popperjs-es             ✅ exists
@popperjs/core                ❌ missing
```

`.output/server/package.json` 仍只有物理 package：

```json
"@sxzz/popperjs-es": "2.11.8"
```

仍没有 logical package identity：

```json
"@popperjs/core"
```

切断仓库根 `node_modules` fallback 后，server 能正常 listen，但第一个 GET `/` 仍返回 HTTP 500：

```text
Cannot find package '@popperjs/core' imported from
apps/docs/.output/server/node_modules/element-plus/es/hooks/use-popper/index.mjs
```

因此，**仅在 app package.json 中显式声明同一个 npm alias，不能强制 Nitro standalone materialization 保留 alias 的逻辑包名**。R16 关闭且不合并。

## 实验层级

R16 的 PR base 是 R15 failure branch，而不是 main：

```text
base: experiment/r15-element-plus-external
```

所以 R16 对 R15 的唯一运行时差异就是 direct npm alias dependency；R15 的精确 Element Plus SSR externalization 保持不变：

```ts
vite: {
  ssr: {
    external: ["element-plus"],
  },
}
```

### R15 base head

```text
82143c0463807deafa1755370b56e8eefc29bd30
```

### R16 有效验证 head

lockfile bot 刷新后，为绕开 GitHub `GITHUB_TOKEN` 递归触发保护，只修改了 `experiment.json` 的审计说明来重新触发真实 CI；运行时代码、package 与 lockfile 未再改变。

```text
0d391cf66f13020e84d1aba56a2a4500b2729e73
```

有效 PR merge-ref：

```text
d6ad193d5f77aa5a813751fbf321d5e301ac741f
```

有效 CI run：

```text
https://github.com/ruan-cat/shadcn-docs-nuxt-production-repro/actions/runs/33195089365
```

Linux production job：

```text
98930073654
```

## 唯一依赖变量

R16 新增：

```json
{
  "@popperjs/core": "npm:@sxzz/popperjs-es@^2.11.7"
}
```

`experiment.json` 只负责声明 control 中预注册的 nullable dependency slot：

```json
{
  "docsDependencies": {
    "@popperjs/core": "npm:@sxzz/popperjs-es@^2.11.7"
  }
}
```

不改变：

- Element Plus 版本；
- UI 源码和组件；
- `@repro/ui` dist exports；
- Nuxt / Nitro / H3 / Content；
- `vite.ssr.external: ["element-plus"]`；
- `vite.ssr.noExternal`；
- Nitro inline / trace；
- pnpm hoist / node-linker；
- parent-node_modules isolation probe。

## Lockfile 证据

实验专用 lockfile workflow 成功，并且只提交 `pnpm-lock.yaml`。

R16 importer diff：

```yaml
apps/docs:
  dependencies:
    '@popperjs/core':
      specifier: npm:@sxzz/popperjs-es@^2.11.7
      version: '@sxzz/popperjs-es@2.11.8'
```

有效 CI 的 lockfile SHA256：

```text
5e54f38e2a41284af664fe3fd06fe7a7fed3f3fd3ffd986753488dfd72169749
```

因此 R16 不是“package.json 改了但 lockfile 没跟上”的伪实验。

## CI 结果

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
后续普通 Docs / Content / API smoke                因前门失败跳过
```

## 构建图与 R15 一致

R16：

```text
Client modules: 5005
SSR modules:    2011
Client build:   27.92s
SSR build:      11.82s
WorkspaceRuntimeProbe: 3.96 kB
server.mjs:     1.37 MB
Docs Nitro total: 21.8 MB
```

这与 R15 的 externalized Element Plus topology 基本一致，说明 direct alias dependency 没有偷偷改变 Vite SSR internalization 边界。

## Standalone manifest：完全没有新增 logical identity

R16 `.output/server/package.json`：

```text
dependencyCount = 222
```

R15：

```text
dependencyCount = 222
```

也就是说 app-level direct alias 没有让 standalone dependency count 增加。

R16 manifest 关键条目仍为：

```json
{
  "@sxzz/popperjs-es": "2.11.8",
  "element-plus": "2.13.6"
}
```

仍无：

```json
"@popperjs/core"
```

## 最终文件闭包

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

因此 R16 没有在 artifact 中形成 Node ESM 所需的 logical package directory。

## 为什么 checkout 内仍可能假绿

closure probe 在仓库根 `node_modules` 仍存在时，从 output 上下文解析：

```text
@popperjs/core
```

仍可向上回退到：

```text
node_modules/.pnpm/@sxzz+popperjs-es@2.11.8/node_modules/@sxzz/popperjs-es/dist/index.js
```

因此 source app 增加 direct alias 后，本地 monorepo 解析更容易看起来“正常”，但 standalone artifact 本身并没有因此获得 logical alias identity。

## 隔离 runtime 失败

隔离 probe 临时隐藏仓库根 `node_modules` 后：

```text
Listening on http://127.0.0.1:3099
```

随后首个请求：

```text
HTTP 500 Server Error
```

错误仍是：

```text
Cannot find package '@popperjs/core' imported from
.../.output/server/node_modules/element-plus/es/hooks/use-popper/index.mjs
```

R16 与 R15 的 runtime error 完全相同。

## 不是 OOM

```text
NODE_OPTIONS=""
```

完整 production build 成功、server 成功 listen，失败点是隔离 HTTP 请求时的 Node ESM package resolution。无 heap limit、exit 137、SIGKILL。

## 第一失败门

```text
G0 experiment / dependency contract      ✅
G1 frozen install                        ✅
G2 dependency / H3 / UI probes           ✅
G3 Nuxt prepare                          ✅
G4 client build                          ✅ 5005
G5 SSR build                             ✅ 2011
G6 prerender                             ✅
G7 node-server artifact                  ✅
G8 closure probe                         ✅
G9 isolated server listen                ✅
G10 isolated GET /                       ❌ missing @popperjs/core
```

## 与 R15 的因果对照

R15：

```text
source docs 没有 direct @popperjs/core
output physical @sxzz/popperjs-es ✅
output logical @popperjs/core ❌
isolated GET / ❌
```

R16：

```text
source docs direct @popperjs/core alias ✅
lockfile alias mapping ✅
output physical @sxzz/popperjs-es ✅
output logical @popperjs/core ❌
isolated GET / ❌
```

因此可以排除“只要把 alias 重复声明在 app dependencies 就会让 Nitro standalone 保留 logical package name”这一假设。

## 下一步

R17 应转向 **Nitro tracing / alias materialization 层**，而不是继续重复 dependency 声明。

需要先按仓库既定 roadmap 确认 R17 的单变量定义，再决定是否测试：

- traceAlias；
- 精确 traceInclude；
- 精确 Nitro external / inline；
- 或另一种只影响 standalone materialization 的配置。

不应退回 blanket `nitro.externals.inline: [/.*/]`，因为 R14 已证明它会更早破坏 prerender package resolution。
