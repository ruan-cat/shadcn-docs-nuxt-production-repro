# 2026-08-28 初始化冻结控制组证据

## 1. 证据对象

- 仓库：`ruan-cat/shadcn-docs-nuxt-production-repro`
- 初始化 PR：#1
- 控制组 head：`48ff42138ff9d7fd1f559d041658f074c5eec670`
- GitHub Actions run：`33171057923`
- Run URL：`https://github.com/ruan-cat/shadcn-docs-nuxt-production-repro/actions/runs/33171057923`
- 安装策略：`pnpm install --frozen-lockfile`
- lockfile SHA256：`1373193329c18cd55e6c6d81da08683ec39ce6c34bd8da1db96730b55be752a8`

这是初始化阶段第一份正式**冻结控制组**证据。此前动态解析 run `33170381900` 已经三轨全绿；本 run 在提交真实 `pnpm-lock.yaml` 并把普通 CI 收紧到 frozen install 后再次三轨全绿。

## 2. 平台门禁

| 证据轨 | 结果 |
| --- | --- |
| Ubuntu 静态契约 / 依赖树 / H3 实际解析 | ✅ |
| Ubuntu fresh production build | ✅ |
| Ubuntu docs standalone 首页 HTTP | ✅ |
| Ubuntu Content cache standalone HTTP | ✅ |
| Ubuntu Content search standalone HTTP | ✅ |
| Ubuntu Nitro 3 API standalone HTTP | ✅ |
| Windows frozen install | ✅ |
| Windows workspace packages build | ✅ |
| Windows Nuxt prepare | ✅ |
| Windows 依赖树 / H3 实际解析 | ✅ |
| Windows Nitro 3 build | ✅ |
| Windows Nitro 3 artifact HTTP | ✅ |

因此控制组已经具备 Windows/Linux 两条独立执行证据，而不是只在本地或单一 CI 平台成立。

## 3. 环境

Linux production job：

```text
OS: Ubuntu 24.04.4 LTS
Node: v22.23.2
pnpm: 10.33.0
lockfile SHA256: 1373193329c18cd55e6c6d81da08683ec39ce6c34bd8da1db96730b55be752a8
NODE_OPTIONS: <empty>
```

安装日志明确显示：

```text
Scope: all 5 workspace projects
Lockfile is up to date, resolution step is skipped
Packages: +1169
```

这证明本次不是 fresh semver 漂移，而是消费已提交依赖树。

## 4. Docs 实际框架版本

Nuxt production build 输出：

```text
Nuxt 3.21.2
Nitro 2.13.4
Vite 7.3.6
Vue 3.5.30
Nitro preset: node-server
```

Docs manifest 的控制版本：

```json
{
  "nuxt": "3.21.2",
  "shadcn-docs-nuxt": "1.1.9",
  "@ztl-uwu/nuxt-content": "2.13.9",
  "h3": "1.15.11"
}
```

根 overrides：

```json
{
  "@ztl-uwu/nuxt-content": "2.13.9",
  "nuxt-og-image": "5.1.9"
}
```

## 5. H3 双世代解析事实

物理包解析探针在 frozen control 中得到：

```text
docs package context -> h3
  h3@1.15.11

Content physical package context -> h3
  h3@1.15.11

Nuxt package context -> h3
  h3@1.15.11

Nitro 3 package context -> h3
  h3@2.0.1-rc.22

API package context -> bare h3
  h3@1.15.11
```

### 解释边界

1. 独立 Nitro 3 sibling **确实拥有自己的 H3 v2**。
2. 当前 docs / Content / Nuxt 物理包上下文仍稳定落在 H3 v1，所以控制组没有发生 Content 串味。
3. API package 如果自己裸解析一个未声明的 `h3`，当前反而会看到 H3 v1；因此 API 源码显式从 `nitro/h3` 使用 Nitro 3 事件 API，而不是依赖 workspace 偶然可见的裸 H3。
4. 这说明“同一个 workspace 里存在 H3 v1/v2”是事实，但**双版本存在本身不是故障充分条件**。
5. 后续 R02/R03 的价值就在于只改变 H3 显式声明或 Content semver，观察 Content 物理 package context 是否从 v1 漂移。

## 6. `@nuxt/kit` 混合世代观察

依赖树在精确控制组中已经能看到 `@nuxt/kit` 3.x 与 4.5.2 同时存在，例如 Nuxt/Content 的部分路径属于 3.x，而 MDC、i18n、scripts 等嵌套模块可进入 4.5.2。

因此 F08 在 control 中已经是**结构性观察**：

```text
Nuxt 3 application
!=
entire dependency tree only contains Nuxt 3 Kit
```

但本 run 的所有 runtime gate 全绿，所以不能据此声称“Kit 4 的存在已经造成运行时故障”。后续实验必须继续区分依赖树异质性与真实 API/产物失败。

## 7. Production graph 基线

Linux frozen production build：

```text
Client modules transformed: 5005
Client build: 21.31s
SSR modules transformed: 3581
SSR build: 14.16s
Prerender initial routes: 2
Prerender: 10.476s
Turbo fresh build: 4 successful / 4 total
Turbo total: 1m13.958s
Docs Nitro output total: 18.6 MB (3.89 MB gzip)
```

其中 workspace UI 确实进入 server output：

```text
WorkspaceRuntimeProbe-*.mjs
101 kB
120 kB sourcemap
```

所以这个 control 不是只写 Markdown 的最小 starter，而是实际包含 workspace Vue UI / Element Plus / VueUse 的 SSR 生产图。

独立 Nitro 3 API：

```text
builder: rolldown
preset: node-server
server build: 50ms
.output/server/index.mjs: 62.5 kB
```

## 8. Standalone HTTP 证据

Docs 首页：

```text
GET /
HTTP 200 OK
107087 bytes
```

Content cache：

```text
GET /api/_content/cache.json
HTTP 200 OK
100273 bytes
```

Content search：

```text
GET /api/_content/search
HTTP 200 OK
100261 bytes
```

独立 Nitro 3 API：

```text
GET /v1/health
HTTP 200 OK
85 bytes
```

这四个请求都来自**实际启动生成 artifact 后的 HTTP**，不是源码 dev server，也不是只看 build exit code。

## 9. 当前警告，不升级为失败

Frozen install / production build 仍出现若干需要长期记录的 warning：

- pnpm ignored build scripts（多个 esbuild、sharp、vue-demi）；
- `@nuxt/image` 提示当前产物找不到 `sharp` linux-x64 binaries；
- client chunk > 500 kB；
- 依赖树存在多代 `@nuxt/kit`。

本次 docs/API runtime smoke 都成功，因此这些只能记为**基线警告/后续实验信号**，不能在没有功能失败证据时提升为 defect。

## 10. 本次 control 可以推出什么

可以推出：

1. 在这份冻结依赖树下，生产型 monorepo 可以让 Nuxt 3 docs、shadcn-docs-nuxt、Content、workspace Element Plus UI 与独立 Nitro 3 API 同时工作。
2. H3 v1/v2 和 Kit 3/4 可以在同一 lockfile 中共存，而当前 control 仍运行正常。
3. 后续任何故障 PR 都有可比较的 frozen baseline。
4. `build green` 后继续做 artifact HTTP smoke 是必要门禁——初始化早期 Nitro API 曾经就是 build/listen 成功但 HTTP 500，修复显式 handler import 后才得到真正绿色 control。

不能推出：

1. `shadcn-docs-nuxt` 在所有复杂 monorepo 中都稳定；
2. H3 双世代永远安全；
3. mixed `@nuxt/kit` 永远安全；
4. Windows 全量 Nuxt production/NFT stress 已经验证——该项属于独立手动 stress workflow；
5. Vercel multi-project 部署边界已经验证；
6. 历史 SmallAliceWeb / eams-component-lib 的全部错误已经在本仓复现。

这些结论必须由后续 R01-R45 独立实验逐项产生。

## 11. 证据等级

作为**控制组**，当前已经具备：

- committed frozen lockfile；
- 跨平台执行；
- fresh forced production build；
- dependency resolution；
- Content physical package H3 resolution；
- standalone artifact HTTP；
- Content 功能探针。

因此可以作为后续 L4/L5 故障实验的正式 control。
