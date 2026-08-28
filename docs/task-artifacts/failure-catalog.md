# 完整故障目录

本文件列出仓库计划复现、观察或形成防回归门禁的故障。每一项都必须在后续 PR 中标注“已复现 / 未复现 / 仅历史证据 / 已排除”。

## F01：`shadcn-docs-nuxt` Layer 传递依赖面过大

**现象**：应用表面只写 `extends: ["shadcn-docs-nuxt"]`，实际继承 Content、MDC、i18n、OG Image、Icon、Tailwind、Mermaid、Nitro 服务端能力等大量运行时和构建期依赖。

**要表达的风险**：主题并非纯 UI 包，而是拥有应用级配置与运行时能力的 Nuxt Layer；上游 minor 变化可能改变整个应用依赖图。

## F02：theme minor 漂移跨 Nuxt 世代

**控制**：`shadcn-docs-nuxt@1.1.9`。

**实验**：把精确版本改成 `^1.1.9`，fresh install，记录实际解析版本及其开发/传递 Nuxt 世代。

**风险**：1.1.x 使用 Nuxt 3 预期，而 1.2.x 已进入 Nuxt 4 预期；应用只看到同一 major 的主题版本变化。

## F03：Nuxt Content minor 漂移跨 Nuxt 世代

**控制**：`@ztl-uwu/nuxt-content@2.13.9`。

**实验**：改成 `^2.13.9`，fresh lockfile。

**预期重点**：观察是否解析到 `2.14.x`，并记录其 Nuxt 4 开发依赖背景。

## F04：Content 未声明 H3 runtime dependency

**现象模型**：Content 运行时代码直接 `import` H3 API，但 package manifest 未完整约束 H3 dependency / peer。

**实验**：从 docs manifest 删除显式 `h3@1.15.11`，保持其他变量不变，记录 Content runtime 实际解析到的 H3。

**风险**：pnpm 严格依赖会让幽灵 import 的解析结果依赖 workspace topology，而不是 Content 自己的契约。

## F05：独立 Nitro 3 API 让 H3 v2 成为 sibling runtime

**实验**：在同一 workspace 添加完全独立 `apps/api`，只依赖 Nitro 3；docs 保持 Nuxt 3。

**要回答**：仅 sibling app 的存在是否影响 docs 的 H3 解析？如果不影响，再与 F04/F03 组合以找到真正首个失败边界。

## F06：Nuxt 3 docs 与 Nitro 3 API 发生跨 workspace 运行时“串味”

**错误信号**：

- `ERR_INVALID_URL`；
- H3 v2 `getQuery` 对相对 URL 的行为与 H3 v1 runtime 不兼容；
- `sendError` 等 H3 v1 导出在 H3 v2 入口不存在；
- Content cache/search API 500；
- Nitro prerender 失败。

**目标**：形成可被 `resolve-h3` 探针直接证明的解析路径，而不是只依赖最终堆栈猜测。

## F07：`nuxt-og-image` minor 漂移引入 Nuxt 4 `@nuxt/kit`

**控制**：根 override 固定 Nuxt 3 已验证版本。

**实验**：移除 override 或提升到后续 5.1.x，记录 `@nuxt/kit` / H3 实际依赖树。

**风险**：文档站主框架仍是 Nuxt 3，但传递模块已进入 Nuxt 4 Kit 世代。

## F08：同一个 lockfile 同时出现 `@nuxt/kit` 3.x 与 4.x

**验收**：依赖探针输出所有 `@nuxt/kit` 实例及父链。

**目标**：证明“应用 package.json 看起来是 Nuxt 3”并不能保证整个运行图属于同一世代。

## F09：fresh install / lockfile 重算改变运行时行为

**实验**：

- 使用已提交 lockfile 安装；
- 删除 lockfile 后 fresh resolve；
- `pnpm update`；
- 只放宽某一个依赖范围。

**目标**：区分源码回归和依赖解析回归。

## F10：root dependency / hoist 偶然掩盖幽灵依赖

**实验**：改变 root 中是否存在 H3、Nuxt 相关工具包，比较 Content 解析路径。

**原则**：不能把“根目录碰巧有同名包”当成正确修复。

## F11：共享 workspace package 改变依赖拓扑

添加 `packages/shared-core`，让 docs/API 同时依赖，但 shared-core 自身不依赖 H3/Nuxt/Nitro。

**目标**：确认单纯 workspace edge 是否足以改变解析或追踪。

## F12：workspace UI 包进入 Nuxt SSR 构建图

`packages/ui` 使用 Vue + Element Plus，并被 docs 直接 SSR 渲染。

**风险**：workspace source/exports 与 externalization 决策会扩大 server graph。

## F13：production source alias 放大 Nuxt/Nitro build graph

**实验**：比较：

- 从 workspace package `exports -> dist` 消费；
- 直接 alias 到 `../packages/ui/src`。

记录 server module count、峰值内存与最终 Nitro build。

## F14：blanket `vite.ssr.noExternal` 过度打包

**实验**：把整个 UI 依赖族加入 `noExternal`，与最小默认基线比较。

**风险**：错误被暂时隐藏，但 server transform 数量和内存显著上升。

## F15：blanket `nitro.externals.inline` 过度打包

**实验**：大量 inline Element Plus / VueUse 依赖。

**风险**：Nitro final Rollup working set 放大，可能导致默认 heap OOM。

## F16：Vite `noExternal` 与 Nitro `inline` 被错误地机械镜像

**目标**：证明两个配置作用阶段不同；一个阶段的修复不能简单复制到另一个阶段。

## F17：Element Plus 的 npm alias 在 Nitro standalone 产物中丢失逻辑包名

**典型链**：

```text
element-plus
-> @popperjs/core
-> npm:@sxzz/popperjs-es
-> pnpm symlink / npm alias
-> Nitro externals / NFT trace
-> standalone output
```

**错误信号**：`.output` 可以启动监听，但真实请求报 `ERR_MODULE_NOT_FOUND: @popperjs/core`。

## F18：`nuxt build` 绿色但 `.output` 不可运行

CI 必须实际启动 `.output/server/index.mjs` 并发送 HTTP 请求。

**目标**：把 build green 与 runtime green 明确拆开。

## F19：Nitro `traceAlias` 在特定版本组合下不能补齐 alias runtime closure

**实验**：在已复现 F17 的基础上单独开启 `traceOpts.traceAlias`。

**目标**：记录实际有效/无效，不把文档存在的配置项自动当成当前组合的正确修复。

## F20：`nodeLinker: hoisted` 作为全局 workaround 爆炸半径过大

**实验**：只改变 linker。

记录：install、build memory、standalone runtime。

**风险**：可能修复可见性，但同时显著扩大构建图或引入新的解析差异。

## F21：targeted `publicHoistPattern` 只作为 fallback

只 hoist `@popperjs/core` 等精确逻辑包，比较与 app-local direct dependency 的差异。

## F22：Nitro modern externals / NFT trace 在 pnpm workspace 中高内存

记录 final server build 阶段内存与耗时。

## F23：Windows + pnpm workspace 的 NFT trace 长尾 / 假卡死

**现象**：停留在 `Building Nuxt Nitro server`，CPU/内存持续占用，`.nuxt/dist/server` 已生成而 `.output/server` 未完成。

**目标**：用阶段产物、资源采样和最终 exit code 区分真实死锁与长尾。

## F24：默认约 4 GiB V8 heap 在 Nitro final/prerender 阶段 OOM

**实验**：默认 heap、4608、5120、6144 等档位作为诊断变量。

**原则**：提高 heap 只用于确认资源门槛，不能替代缩小构建图的结构修复。

## F25：Windows-only `trace:false` workaround

**目标**：验证本地 Windows 是否因此恢复，同时确认 Linux/Vercel 必须保留正常 tracing。

## F26：`trace:false` 泄漏到生产导致依赖缺失

**错误信号**：Vercel / standalone `Cannot find module`，如 `entities/decode` 等。

## F27：为绕过 Windows 构建而关闭 Content prerender

历史 workaround 包括：

- `crawlLinks: false`；
- `prerender:routes` 中 `routes.clear()`。

**风险**：document-driven Content 不再生成结构化索引，运行时数据库为空。

## F28：Content prerender 被清空后出现 `page._id` / null 错误

**目标**：明确“构建变绿”不代表 Content 功能仍正确。

## F29：Content cache/search API 是必须的功能探针

必须分别请求：

- `/api/_content/cache.json`；
- `/api/_content/search`。

首页 200 不能替代这两个接口的 200。

## F30：ESM/CJS 入口冲突导致 hydration 整体中断

重点依赖：

- `dayjs`；
- `mermaid`；
- `debug`；
- `@braintree/sanitize-url`。

**表象**：暗黑模式、侧栏按钮等交互失效，看似 CSS 问题，实际是模块导入报错打断 hydration。

## F31：多版本 `entities` 导致 SSR / trace 产物异常

可能错误：`entities/decode` 缺失或 compiler/runtime 解析不一致。

## F32：`@vueuse/core` 等 workspace transitive dependency 在部署产物中缺失

**场景**：UI workspace package 被 externalize，实际运行时依赖未被 artifact closure 正确保留。

## F33：i18n / `@intlify/*` 多版本造成 runtime API 不一致

示例错误信号：`registerMessageResolver is not a function`。

## F34：`.nuxt` 生成文件缺失或旧状态污染构建

**探针**：检查 `nuxt prepare`、`#app-manifest`、generated type/import 状态。

## F35：Turbo/cache hit 掩盖 fresh install / fresh build 失败

**原则**：关键复现必须可强制 fresh，不允许只用 cache hit 作为验收证据。

## F36：Windows 子进程残留造成后续构建越来越慢

`PowerShell -> pnpm -> cmd.exe -> node/nuxi workers` 中断后可能留下孤儿进程。

本仓库只记录/诊断 PID 与命令行，不提供无差别杀所有 node 的危险脚本。

## F37：Windows 原生 addon 文件锁导致 `pnpm install` EPERM

关注：OXC、esbuild、SWC、Rollup native binding。

**目标**：记录这是平台/IDE 文件锁，不与 Nuxt Content runtime 失配混为同一根因。

## F38：同一 GitHub monorepo 的两个 Vercel 项目被根 `vercel.json` 交叉污染

Docs 与 Nitro API 需要不同 Build Command / Output Directory；根配置可能覆盖两个云项目。

## F39：`.vercel/project.json` 是单槽绑定

同一本地目录反复 `vercel link` 到两个项目时，最后一次绑定覆盖前一次。

## F40：子包 `.vercel/output` 搬运到 repo root 的边界

研究：

- 旧产物是否清理；
- symlink 是否保留；
- dereference 是否必要；
- 输出路径是否被另一个 app 污染。

## F41：Vercel preset + Windows 本地与 Vercel Linux 的行为不同

同一 `nuxi/nitro build --preset vercel`，底层路径、file tracing、symlink 行为仍可能因操作系统不同而差异。

## F42：构建顺序可能改变可见状态

矩阵：

- docs only；
- api only；
- docs -> api；
- api -> docs；
- fresh install 后 docs；
- fresh install 后 api -> docs。

## F43：并发构建导致资源竞争与缓存写入干扰

与真实依赖故障区分：先串行建立基线，再专门测试并行。

## F44：错误 workaround 让故障从一个阶段移动到另一个阶段

例如：

- `noExternal` 让 dev 不再报错，却使 Nitro OOM；
- `trace:false` 让 Windows build 完成，却使部署缺包；
- 清空 prerender 让 build 绿色，却使 Content runtime 空数据。

本仓库要记录“第一失败门”和“副作用门”，不能只记录最终是否绿色。

## F45：升级被错误理解为单包升级，而不是兼容矩阵迁移

Nuxt、Nitro、H3、Content、shadcn-docs-nuxt、OG Image 应按世代组合审查。Nuxt 3 -> Nuxt 4 必须作为独立迁移 PR，而不是普通依赖刷新。

## F46：复杂业务场景与官方最小 starter 的可靠性落差

最终仓库要能形成一张逐层加压表：官方风格最小 docs 能工作；每增加一个真实生产因素（workspace、UI、API、Vercel、Windows、fresh resolution）都记录首次出现的不稳定边界。
