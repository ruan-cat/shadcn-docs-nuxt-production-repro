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

**机理定案（2026-10-30 补建，FINDINGS #21）**：触发条件 = **精确 externalize Element Plus**（`vite.ssr.external = ["element-plus"]`）；真实表现**不是 build 失败**，而是 **build 全绿 + standalone 正常监听 + 真实请求 HTTP 500**（`Cannot find package '@popperjs/core' imported from element-plus/es/hooks/use-popper/index.mjs`）→ 与 **F18** 的分界即在于此（只看 build 退出码会 100% 漏检）。因果链由 **R15（阳性 500）/ R16（docs 直加 Popper npm alias → 200）/ R17（Nitro `traceAlias` → 200）** 三段对照锁定：三者唯一自变量为配置差异 → externalize 切断 alias 链，alias 闭包可修复。
详见 [FINDINGS #21](./experiments/FINDINGS.md) 与 [R15.md](./experiments/R15.md) / [R16.md](./experiments/R16.md) / [R17.md](./experiments/R17.md)。

## F18：`nuxt build` 绿色但 `.output` 不可运行

CI 必须实际启动 `.output/server/index.mjs` 并发送 HTTP 请求。

**目标**：把 build green 与 runtime green 明确拆开。

## F19：Nitro `traceAlias` 在特定版本组合下不能补齐 alias runtime closure

**实验**：在已复现 F17 的基础上单独开启 `traceOpts.traceAlias`。

**目标**：记录实际有效/无效，不把文档存在的配置项自动当成当前组合的正确修复。

## F20：`nodeLinker: hoisted` 作为全局 workaround 爆炸半径过大（2026-09-29 登记，2026-10-30 结论上修）

**实验**：只改变 linker。

记录：install、build memory、standalone runtime。

**风险**：可能修复可见性，但同时显著扩大构建图或引入新的解析差异。

### 2026-10-30 结论上修：由「性能/构建图放大」改为「**可用性灾难：hoisted 使项目不可构建**」

> 依据：[FINDINGS #20](./experiments/FINDINGS.md)「R19→F20 复现：hoisted 爆炸半径实锤（不可构建，非仅性能）」；档案 [R18.md](./experiments/R18.md) / [R19.md](./experiments/R19.md)，结论均标 `verified`（2026-10-29 重测，2026-10-30 并入 main）。

| 维度                              | 原假设 → 实测结论                                                                                                                                                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 破坏级                            | 「显著扩大构建图 / 引入解析差异」（性能与解析风险）→ **系统级不可构建**                                                                                                                                                                      |
| `pnpm install`                    | **exit 1 / 21s**，失败于 `apps/docs prepare`：`Cannot find module '.../apps/docs/node_modules/nuxt/bin/nuxt.mjs'`                                                                                                                            |
| `pnpm build:packages`             | **exit 1 / 2s**，`Cannot find module '.../packages/shared-core/node_modules/typescript/bin/tsc'`                                                                                                                                             |
| `pnpm --filter @repro/docs build` | **exit 1 / 2s**，失败于 `prebuild: nuxt prepare`（同报 `nuxt/bin/nuxt.mjs` 缺失）                                                                                                                                                            |
| 根因                              | hoisted 布局下 pnpm 把 bin 提到根 `node_modules/.bin`，但**未在 `.pnpm/<pkg>/node_modules/<pkg>/bin/` 内落地 `bin/<cmd>.mjs`**；而 `node_modules/.bin/<cmd>` shim 经 `../<pkg>/bin/<cmd>` **相对路径**解析 → 该文件缺失 → `MODULE_NOT_FOUND` |
| 波及面                            | **系统性**（nuxt、typescript 均中招），非单包特例                                                                                                                                                                                            |
| 「构建图放大」假设                | **不成立**——hoisted 在 prepare 生命周期即阻断 build，构建从未进入真实构建阶段；构建期峰值仅 **2011 MB**（baseline node 水位，非构建水位；R18 真实构建峰值 3559 MB 对照）                                                                     |
| 「重装需 12m+」                   | **冷 store 假象**——warm store 实测重装仅 **21s**（1200 包全 reused、0 下载）。首轮 exit 124（480s timeout）是**误诊**，掩盖了真实的 bin 解析断裂                                                                                             |

**对照：targeted `publicHoistPattern`（R18）不触发本爆炸，但暴露另一类治理盲区**

- R18 写入 camelCase 字面量 `publicHoistPattern:`（pnpm 10.33.0 **零 unknown-field 警告、静默容忍**）→ 治理键检测**完全依赖** `tests/baseline-safety.test.mjs` 的字面子串匹配。
- ✝️ **事实订正（2026-10-30 受控实测，pnpm 10.33.0）**：原文「若改用合法 kebab `public-hoist-pattern`，契约子串不匹配 → **漏检**」**方向相反、事实错误**。实测：`pnpm-workspace.yaml` 的设置键**只认 camelCase**——camelCase 被接受且零警告；kebab 被**显式 WARN 并忽略**（`The following settings in pnpm-workspace.yaml were ignored because they are not written in camelCase`）→ **kebab 拼写不产生 hoist 风险**，契约原本匹配的 camelCase 恰是**唯一生效拼写**。
- **仍然成立的治理盲区**：pnpm 对**非法 camelCase 键零警告**（`publicHoistPattern:` 会被静默接受）→ pnpm 侧对危险 workspace 配置**不提供任何校验信号**，检测全压在契约测试的字面子串上。
- **建议（已于 2026-10-30 实施，A2 项）**：契约层对已知危险配置**同时枚举 kebab 与 camelCase 两种字面** → `forbidden` 已扩为 4 项（`nodeLinker: hoisted` / `node-linker: hoisted` / `publicHoistPattern` / `public-hoist-pattern`）。**性质：纵深防御**（防未来 pnpm 改行为、防作者意图被静默忽略），**不是**堵已实证漏洞。

**影响**：①PR #27 评估 hoisted 风险的严重级需重判——由「性能风险」升为「不可构建」；②首轮 R19 的 exit 124（timeout）是误诊，掩盖了真实失败模式；③F20 的实验方向**已终止**——hoisted 不再是待评估选项，结论是「**禁止作为 workaround 使用**」；④「12 分钟重装」这一流传说法被证伪（warm store 下 21s），**真正危险的是工具链断裂，不是重装时长**。

## F21：targeted `publicHoistPattern` 只作为 fallback

只 hoist `@popperjs/core` 等精确逻辑包，比较与 app-local direct dependency 的差异。

## F22：Nitro modern externals / NFT trace 在 pnpm workspace 中高内存

记录 final server build 阶段内存与耗时。

## F23：Windows + pnpm workspace 的 NFT trace 长尾 / 假卡死

**现象**：停留在 `Building Nuxt Nitro server`，CPU/内存持续占用，`.nuxt/dist/server` 已生成而 `.output/server` 未完成。

**目标**：用阶段产物、资源采样和最终 exit code 区分真实死锁与长尾。

## F24：默认约 4 GiB V8 heap 在 Nitro final/prerender 阶段 OOM

**实验**：默认 heap、4608、5120、6144 等档位作为诊断变量。

**历史量化锚点（2026-08-05 调研，来源与处理边界见 [real-world-incidents](./real-world-incidents.md) §8）**：SmallAliceWeb 标准构建在 `Initializing prerenderer` 阶段自然 OOM（exit 134，墙钟 145.479s，主 Node 工作集约 4.05 GiB）；8192 堆下观测约 5.76 GiB 工作集后被人工中止（非自然退出）。同期对照：eams 完整构建自然成功（约 100.4s，3751 client transform modules）。Lucide/Iconify 已排除为主因。

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

必须分别请求**生产构建实际注册**的 Content API 路由（带构建指纹）：

- `/api/_content/cache.<buildIntegrity>.json`；
- `/api/_content/search-<buildIntegrity>`。

> **2026-10-30 订正**：原文写的 `/api/_content/cache.json` 与 `/api/_content/search` 是 **dev 模式专用路径**，
> 生产构建里不是注册的路由 —— 请求它们只会落到 catch-all 页面渲染器，得到「HTTP 200 + HTML 404 shell」，
> 与「Content API 故障」不可区分（成因与证据见 F47 的 2026-10-30 根因订正）。
> 指纹来源 `buildIntegrity = Date.now()`，**每次构建都变**，不得硬编码，须从构建产物发现。

首页 200 不能替代这两个接口的 200；且**只断言状态码 200 不足以判通过** —— 必须做响应体内容断言
（`JSON.parse` 成功 + 含具体文档的 `_path`/`title`），并对未注册的 canonical 路径断言**真实非 200**。

## F30：ESM/CJS 入口冲突导致 hydration 整体中断

重点依赖：

- `dayjs`；
- `mermaid`；
- `debug`；
- `@braintree/sanitize-url`。

**表象**：暗黑模式、侧栏按钮等交互失效，看似 CSS 问题，实际是模块导入报错打断 hydration。

### 2026-10-30 订正：重点依赖清单的事实校正 + 复现结论

- ✝️ **`debug` 不是 `mermaid@11.17.2` 的传递依赖**（原清单把四者并列为 mermaid 入口图成员有误）。复核：`pnpm-lock.yaml` 的 mermaid 依赖块（line 12908–12931）共 22 项依赖、**无 `debug`**；安装态 mermaid `package.json` 亦无；`shadcn-docs-nuxt@1.1.9` 未直接声明；`debug@4.4.3` 实来自 `@babel/core` / `@nuxt/cli` 等**构建工具链**。→ **`dayjs` / `@braintree/sanitize-url` 才是 mermaid 传递依赖**（二者被 mermaid 触发块覆盖）；`debug` 属**独立轴**，对应实验 **R32 已回未启动池**（原「R30/R32/R33 由单一 mermaid 触发块覆盖」的收敛前提被证伪）。
- ✝️ **主题 `vite.optimizeDeps.include: ['debug']` 是悬空声明**——它引用了客户端依赖图中**不存在**的包 → dev server 打出 `Failed to resolve dependency: debug, present in client 'optimizeDeps.include'`。该告警是「debug 不在图里」的证据，**不是**「debug 参与入口冲突」的证据。
- **复现结论（已定案）**：在当前 `shadcn-docs-nuxt@1.1.9` + `mermaid@11.17.2` + 生产 `node-server` 构建下，插入 mermaid 触发块**不复现** F30 的 ESM/CJS 入口冲突（mermaid 正常渲染 SVG、hydration 完成、**mermaid 入口图零入口错误**）→ **clean negative（未复现）**，非「已证实存在」。dev 模式仅呈现 Vite 426 依赖重优化循环（页面 `Upgrade Required`，mermaid 因 426 从未执行）——与 F30 原文签名**不同**。
- **后续实验方向（已更新）**：应为「**Vite dev `optimizeDeps` 缺口**」或「**外部化 mermaid 的构建**」；R32（debug 悬空声明轴）须先重新界定单变量。详见 [FINDINGS #22](./experiments/FINDINGS.md)、[R31.md](./experiments/R31.md)、[R32.md](./experiments/R32.md)。

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

> ✝️ **2026-10-31 追记（R48/R49/R50，[FINDINGS #33](experiments/FINDINGS.md)）**：本条的「兼容矩阵」已细化到传递依赖轴——nitro 2.13.5 经 `unstorage@1.17.6` 的 key 校验与 content v2 的 `"/"` key 约定冲突（R46 阳性复现）。三规避方向已实证：**钉 `unstorage` 1.17.5（✅ 全保真）/ content 升级 2.14.1（❌ 无效，失败写入在 Nuxt 生成 renderer，与 content 版本无关）/ `experimental.payloadExtraction: false` 消除调用点（✅，牺牲 payload 静态化）**；R45「构建全绿」归因收窄到 **Nuxt 4 renderer 模板**。三规避分支均不合并（见 BRANCH-MERGE-EVALUATION §2）。**该冲突已于 2026-10-31 独立编号为 F48（见文末）——F45 保留「升级纪律」语义，按签名（`Invalid key: "/"`）检索请用 F48。**

## F46：复杂业务场景与官方最小 starter 的可靠性落差

最终仓库要能形成一张逐层加压表：官方风格最小 docs 能工作；每增加一个真实生产因素（workspace、UI、API、Vercel、Windows、fresh resolution）都记录首次出现的不稳定边界。

## F47：Nuxt Content v2 运行时 API 在 vercel / cloudflare_module preset 下失效并以 200 假阳性呈现（2026-09-29 登记，2026-09-30 Vercel 对照升级）

> ⚠️ **2026-10-30 根因订正（第二层）**：本条标题与下述矩阵沿用**原始登记措辞**，保留不改写；但第二层根因**与 preset 无关**，preset 维度结论**已作废**。真实成因是**验收契约写错了 URL**——请求了 content v2 的 dev-only canonical 路径（`/api/_content/cache.json`、`/api/_content/search`），生产构建里它们根本不是路由，落到上游 layer 的 catch-all 被渲染成「200 + HTML 404 shell」。矩阵的真实含义是「canonical URL 在任何 preset 都不是路由」。**订正全文见本节末「2026-10-30 根因订正（第二层）」小节**，横向发现见 [FINDINGS #19](./experiments/FINDINGS.md)。

**现象**：非 node-server preset 的生产构建中，预渲染页面（`/`、`/guide/baseline`）正常返回真实内容，但 `/api/_content/cache.json` 与 `/api/_content/search` 返回 **HTTP 200 且响应体为 404 错误页 HTML**——catch-all 兜底渲染，构建/运行日志零错误。

**三 preset 四平台对比矩阵**（同构建链路）：

| preset            | 平台                                             | Content API        | 证据                                                        |
| ----------------- | ------------------------------------------------ | ------------------ | ----------------------------------------------------------- |
| node-server       | 本地 Windows + CI Linux artifact smoke           | ✅ 200 且非空      | control                                                     |
| vercel            | Vercel 生产                                      | ❌ 200 + 404 shell | `evidence/2026-09-30-vercel-deploy-e2e.md` §4-5             |
| cloudflare_module | workerd 本地（wrangler dev）                     | ❌ 200 + 404 shell | `evidence/2026-09-29-scss-ui-cloudflare-worker-baseline.md` |
| cloudflare_module | workerd 远端（CF Workers 生产，run 36998783811） | ❌ 200 + 404 shell | 同上文件「远端部署证据」节                                  |

**要表达的风险**：仅凭状态码 200 与空错误日志会把 Content API 故障误判为通过；且该失效跨双 serverless 平台复现，**不是** workerd 原生模块边界特有。

**修正后的根因假设（2026-10-03 实证）**：CF 构建日志栈实锤——content handler chunk（`.nuxt/prerender/chunks/_/query.mjs`）解析到 **h3@2.0.1-rc.22 的 `getQuery`**，对 nitro 内部 fetch 的 URL 抛 `Invalid URL`（同栈外层为 h3@1.15.11）；而 **content 包 manifest 无 h3 依赖声明（F04 本体）**，bundle 型 preset（vercel/cloudflare_module）按 content 包自身依赖上下文解析 h3 → v2 混入；node-server preset external 化走提升层 v1（control 正常）。页面 SSR 直连 storage 不经 HTTP 层，故 API 路由 500/404shell 而页面依赖构建期 content DB。

**修复实证与分层定案（2026-10-04）**：`pnpm-workspace.yaml` 的 `packageExtensions`（key 须带显式 range）注入 `h3: 1.15.11` 到 content/mdc/icon/og-image 四包 → 产物 h3 v2 清零（.output chunks 实测 0 引用）→ **构建期 Invalid URL 清零、页面 prerender 恢复真实内容（CF+Vercel 生产实测）**。但**运行时 content API 在 workerd 与 Vercel node 上仍 200+404shell**——证实 F47 存在**两层独立失败**：

- 第一层（构建期，已修）：h3 v2 串味 → packageExtensions 修复 verified；
- 第二层（运行时，未修）：content 运行时 DB/存储初始化在 serverless 运行时（workerd + Vercel node）一致失败 → handler 崩溃 → catch-all 404shell。与 h3 无关（h3 v2 已清零仍复现）。node-server control 的运行时正常。
  第二层根因实验方向：content 运行时 DB 初始化路径（node:sqlite/better-sqlite3/serverAsset）在两个运行时中的失败点对比（套用 R19 模板，独立 PR）。

**2026-10-18 本机 node-server 响应体级实测（R01 受控对照附带发现，FINDINGS #9）**：本机 Windows node-server 构建产物冒烟中 `/api/_content/cache.json` 呈现 200+404shell（实验组与对照组一致，排除拓扑变量因果）；且复核 `probes/artifact-smoke.ts` 确认 CI 的 Content artifact smoke 仅断言 `response.ok`、从未做响应体检查——矩阵中"node-server ✅"的原始证据强度应修正为"HTTP 200 已验证、响应体内容未验证"。第二层是否覆盖 node-server（全 preset）待 Linux 响应体级复验定案；定案前本节矩阵结论保持不变。

### 2026-10-30 根因订正（第二层）：「serverless 运行时 DB/存储初始化失败」假设**被证伪**

本机 node-server control、Vercel 生产、Cloudflare 远端**三处逐字一致**的 200+404shell，真实成因**不是运行时故障**，而是**验收契约写错了 URL**：

1. **模块源码**：`@ztl-uwu/nuxt-content@2.13.9` 的 `dist/module.mjs:207/238/243`——
   `buildIntegrity = nuxt.options.dev ? void 0 : Date.now()`；生产构建下路由名为
   `cache.${buildIntegrity}.json` / `search-${buildIntegrity}`，**无后缀路径只在 dev 模式存在**。
2. **产物路由表实锤**（`.output/server/chunks/_/nitro.mjs:9932-9949`）：注册的是
   `/api/_content/cache.1793336652904.json`、`/api/_content/search-1793336652904`、
   `/api/_content/query/:qid/**:params`、`/api/_content/navigation`，
   **没有** `/api/_content/cache.json`、`/api/_content/search`。
3. **假阳性的产生机制**：未匹配路径落到 `handlers` 末位的 catch-all `/**`（同文件 `:9948`）→ Nuxt renderer
   → 上游 layer `pages/[...slug].vue` 在内容未命中时**内联渲染「404」文案但不抛 `createError`**
   → 页面渲染成功即 **HTTP 200**。**handler 从未被调用，不存在「崩溃」**，也不存在 Nitro 错误处理改写状态码。
4. **产物自洽、应用客户端无恙**：`runtimeConfig.public.content.integrity` 暴露指纹，客户端据此拼接带指纹路径
   （`chunks/build/server.mjs` 的 `searchRoute`、`chunks/build/client-db-*.mjs` 的 `cache.${integrity}.json`）；
   **只有外部探针在用 dev 路径**。
5. **带指纹路径实测完全正常**：本机 node-server 与 Vercel 生产**均返回 200 + 真实 JSON**
   （cache：`contents` 3 篇，含「绿色控制组」；search：`documentCount:8`、`documentIds` 8 条命中「绿色控制组」）
   → **content 运行时 DB/存储在 serverless 正常**，旧假设作废；
   **本节原第 326 行的实验方向（node:sqlite / better-sqlite3 / serverAsset 初始化路径对比）打偏**，不再作为后续方向。

**因此第二层的性质是「验收契约 / 探针的假阳性」，而非平台运行时故障。** 修复方向随之改为：
让未注册的 Content API 路径返回**真实 404** + 探针改为**从产物发现真实指纹路由并做响应体内容断言**，
而不是继续追查 serverless 运行时。

**矩阵订正**：`node-server` 行原记的「✅ 200 且非空」是**弱断言假象**（探针只断言 `response.ok`）；
其真实行为与 `vercel` / `cloudflare_module` 两行**完全一致**（同样 200+404shell），
故第二层**与 preset 无关**，矩阵的 preset 维度结论作废；矩阵的真实含义是「canonical URL 在任何 preset 都不是路由」。

**附带暴露的第二个潜在假阳性门**：`/api/_content/query/index.md` 在**无 `_params` 查询参数**时回退为空 query，
`.find()` 返回**全部文档**（实测 3 篇），**它根本不校验 `index.md` 本身**——只断言「响应体含『绿色控制组』」同样是弱门。

### 2026-10-30 根因订正（第三层）：两个真实缺陷已修——页面 catch-all 真 404 + query 空查询弱门

第二层把「200 假阳性」定位到**验收契约写错 URL**（只打 dev-only 路径）。但把契约改对之后，**两处真实的生产行为缺陷暴露出来并已修复**：

1. **页面 catch-all 的 200 掩码（真实缺陷，已修）**
   - 根因在上游 layer `shadcn-docs-nuxt@1.1.9` 的 `pages/[...slug].vue`：`!page?.body` 时**内联渲染一段 404 UI 但不抛 `createError`** → 渲染成功即 HTTP 200 + HTML 404 shell。**任何不存在的页面路径都返回 200**（如 `/no-such-page-xyz`）。
   - 修复：`apps/docs/middleware/content-page-not-found.ts`（**命名中间件**，经 `nuxt.config.ts` 的 `hooks["pages:extend"]` 挂到 layer 的 catch-all 路由 `/:slug(.*)*`），判定条件与 layer **逐字一致**（`!page?.body`），只把「渲染友好 404 页」升级为**真实 HTTP 404**。
   - 顺序前提（已从 Nuxt 源码确认）：content 模块 documentDriven 插件用 `addRouteMiddleware(async fn)` 注册**全局**中间件（`addRouteMiddleware` 中 `typeof name !== "string"` 即 global），Nuxt 执行顺序「全局 → 命名」（`nuxt/dist/pages/runtime/plugins/router.js` 同一 Set 先塞 global 再塞 route meta）→ 命名中间件跑到时文档已解析完毕。写成全局中间件会把**全站**误判 404。
   - **观测性坑**：守卫刻意**不设** `fatal: true`。Nitro 判定 `isSensitive = error.unhandled || error.fatal`（`nitropack@2.13.4` `dist/core/index.mjs`），`fatal` 为真会把**每个 404** 记成 `[request error] [fatal]` → 污染运行时错误监控、打破「运行时错误零命中」验收门。404 是正常业务结果，不该进错误通道。
   - **附带暴露的死链**：上游 layer 侧边栏链接栏目根路径 `/guide`，此前被 200 掩码掩盖；掩码移除后 crawler 立刻发现 → **预渲染构建失败**。处置是**补落地页** `apps/docs/content/1.guide/0.index.md`（而非放宽 `nitro.prerender.failOnError`）。

2. **Content query 空查询弱门（真实缺陷，已修）**
   - 根因在 content 模块侧：`dist/runtime/utils/query.js` 里 `qid` **只是 `_params` 的缓存键**，从不进入 where 条件；无 `_params` 时 `query.first === false` → `.find()` → 返回**全部文档**。`/api/_content/query/index.md` 声称按 id 取单文档，实际返回全集。
   - 修复：`apps/docs/server/middleware/content-query-guard.ts`——只拦**恰好一段**的 `/api/_content/query/<qid>`，缺 `_params` → **HTTP 400 + JSON 指引**；带 `_params` 放行；两段形态与裸 `/api/_content/query` 放行。语义选 400 而非伪造单文档语义——服务端无法把不透明缓存键 `qid` 可靠解析成单文档，**让端点不再说谎**比伪造更诚实。
   - **两种 `_params` 编码形态不同（易踩坑）**：query-string 形态要 **URL 编码的原始 JSON**（`decodeURIComponent` 后直接 `JSON.parse`），路径两段形态要 **base64url**。用 base64url 塞进 query-string 会被 content 模块自己打成 400「Invalid _params query」——**模块侧**报错、不是守卫报错。

**本机验证**（standalone，端口 3413，产物指纹 `1793342768316`）：冷构建 EXIT=0（3/3 tasks，0 cached）；`/no-such-page-xyz` → **404**（curl 默认 Accept → `application/json`；`Accept: text/html` → Nuxt 错误页 HTML，title `404 - Page Not Found | Nuxt`），且服务端日志**无 `request error`**；`/guide` `/guide/baseline` `/` → 200 无回归；`/api/_content/query/index.md` 无 `_params` → **400 + 报文含 `_params`**，带 `_params` → **200 + 恰好 1 篇**（`_path=/guide/baseline`、title=绿色控制组）；两段形态 → 200 + 1 篇；裸 `/api/_content/query` → 200 + 全部文档；指纹路由 `cache.<integrity>.json` / `search-<integrity>` → 200 + 真实内容（`documentCount:10`）；canonical 两条 + 裸前缀两条 → 404 + application/json（第二层守卫未回归）。`pnpm probe:content` **13/13 PASS**，`pnpm test:contracts` **13/13**（⚠️ 计数时点说明：该次验证时契约为 13 项；**2026-10-30 A2 双拼写加固后契约为 15/15**，以 `pnpm test:contracts` 当前输出为准）。

## F48：unstorage 1.17.6 的 key 校验与 content v2 的 `"/"` key 约定冲突（2026-10-31 登记；**本仓已复现**，R46 阳性）

nitropack 2.13.5 相对 2.13.4 的**唯一依赖增量**把 `unstorage` 从 `^1.17.5` 抬到 `^1.17.6`，后者给 `prefixStorage` 新增 `itemKey` 校验：`normalizeKey("/")` 归一为空串 ⇒ falsy ⇒ 抛 `[unstorage] Invalid key: "/"`。content v2 以 `"/"` 表示根文档/根路由——同一冲突按调用点是否被 `.catch` 包裹呈现**两种表象**：

- **R46（Nuxt 3 世代）**：nitro renderer 的 payloadCache `setItem` 未被包裹 ⇒ **prerender 500（构建级失败）**；
- **R45（Nuxt 4 世代）**：content runtime 的 `cache.setItem(id, {parsed, hash}).catch(() => {})` 吞掉异常 ⇒ 生产**内容库为空**（构建全绿、数据全空，数据级故障）。

**三规避方向已实证**（[FINDINGS #33](experiments/FINDINGS.md)）：钉 `unstorage` 1.17.5 ✅ 全保真（R48）/ content 升级 2.14.1 ❌ 无效（R49，失败写入在 Nuxt 生成 renderer，与 content 版本无关）/ `experimental.payloadExtraction: false` 调用点消除 ✅（R50，代价 = payload 静态化消失）。上游修复路径与 issue 材料见 [HANDOFF §4](HANDOFF.md) 第 7 条（待用户授权）。本编号自 [F45](#f45升级被错误理解为单包升级而不是兼容矩阵迁移) 的 ✝️ 追记独立拆出——F45 是「升级纪律」类目，本条是可按签名（`Invalid key: "/"`）检索的故障本体；相关档案：[R46.md](experiments/R46.md) / [R48.md](experiments/R48.md) / [R49.md](experiments/R49.md) / [R50.md](experiments/R50.md)。

## F50：Nuxt 4 把 nitro 主 bundle 的 buildDir 改写到 `node_modules/.cache/nuxt/.nuxt`，content v2 的预热目录随之错位 ⇒ `_snapshot` 读空 ⇒ 生产内容库为空（2026-10-31 登记；**本仓已复现**，R52 verified）

`@nuxt/content` 的 `build:before` 预热钩子把 source 原文写入 `resolve(nuxt.options.buildDir, "content-cache")`（`cache:content:parsed:*`），nitro 主 bundle 的 `_snapshot`（`buildProduction` 内、rollup 之前）按 `bundledStorage.push("/cache/content")` 把该挂载快照进产物 serverAssets。**Nuxt 3 恒 `buildDir = .nuxt`，预热/回写/快照三步同目录**；**Nuxt 4 把主 bundle 实例的 buildDir 改写为 `node_modules/.cache/nuxt/.nuxt`** ⇒ base 随实例错位 ⇒ `_snapshot` 读空目录 ⇒ bundled 零条 ⇒ 生产运行时 `cache:content:parsed` 无数据 ⇒ **Content API 全空集合（构建全绿的假象）**。

- **表象**（R45 / R51 臂 2 / R52 B 轮三度复现）：build exit 0、Prerendered 11 routes（页面渲染成功——prerender 期 `sourceBase` 指向 `content/` 源目录不受错位影响）、产物 `nitro:bundled:cache:content:*` **零条**、`.nuxt/content-cache/parsed/*` 停留预热裸 markdown、缺 `content-index.json`。
- **机理铁证**（R52 插桩）：双实例 `cacheContentBase` 对比——第 1 实例 `…/apps/docs/.nuxt/content-cache`（读到预热 4 条）vs 第 2 实例（主 bundle）`…/apps/docs/node_modules/.cache/nuxt/.nuxt/content-cache`（读空）；`node_modules/.cache/nuxt/` 整体不存在 ⇒ prerender 期 `setItem` 回写丢失并被 content `storage.js:163` 的 `.catch(() => {})` 吞（workerd 内确切去向待深挖）。
- 与 [F48](#f48unstorage-1176-的-key-校验与-content-v2-的-key-约定冲突)（Nuxt 3 世代 unstorage 校验，构建级 500）互补：**F50 = Nuxt 4 世代的数据级空集合**——Nuxt 4 迁移的两大世代适配缺口。相关档案：[R52.md](experiments/R52.md)（verified）/ [R45.md](experiments/R45.md)（阳性）；上游双靶点：nuxt（buildDir 改写语义）+ @nuxt/content（预热未对齐 nitro 实际 buildDir）。
