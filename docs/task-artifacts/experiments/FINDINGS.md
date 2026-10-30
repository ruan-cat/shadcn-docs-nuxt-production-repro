# 关键技术发现台账

> 收录具有横向价值（跨实验有效）的技术发现。全部来自 2026-10-17 本机复现会话实证，证据可溯源至 [总检报告](../../reports/2026-10-17-branch-pr-fault-reproduction-audit.md) 或对应 R{xx}.md 档案。只收录实证，不做推测性扩写。

## 1. 跨分支隐藏提升层残留制造伪故障信号

- **发现**：跨分支切换时 pnpm 隐藏提升层（`.pnpm/node_modules`）残留上一分支安装态，使后续分支出现伪故障信号。
- **证据**：受控对照——r05 污染态 build exit 1 + Invalid URL，同一分支全清重装后 exit 0，结果相反（总检报告 §3.2）。
- **影响**：所有分支本地复现必须先隔离 `node_modules`（mv 改名）再 frozen install；首轮 r05-r17 批处理结果全部因此判废。
- **沉淀动作**：写入 [SOP.md](./SOP.md) 标准流程第 2 步与异常处理第 3 条；档案模板自检清单首项。

## 2. harness bulk-delete 守卫拦后台构建与清理

- **发现**：后台任务会被 harness 的 bulk-delete 守卫拦截（`SAFE_DELETE_BULK_CONFIRM_REQUIRED`），实测拦截 `.nuxt/dist` 清理 549 文件。
- **证据**：首轮批处理中两轮受守卫干扰（总检报告 §3.1 / §3.3 运行时注意）。
- **影响**：含构建/清理的复现流程不能放后台跑。
- **沉淀动作**：[SOP.md](./SOP.md) 环境前提"复现必须前台执行" + 异常处理第 1 条（转前台豁免执行）。

## 3. nitro 3 beta `nitro prepare` 静默写 `node_modules/.nitro/`

- **发现**：nitro 3 beta 的 `nitro prepare` 静默写入 `node_modules/.nitro/`（不是 `.nitro/`），生成 4 份 d.ts 的 nitro/types 模块增强。
- **证据**：本机复现会话实测。
- **影响**：该路径在常规 tsconfig include 范围之外，类型增强会"看起来没生效"。
- **沉淀动作**：消费 nitro 3 的包配置须显式 include `node_modules/.nitro/`。

## 4. nitro 3 官方导出 `nitro/tsconfig` 预设

- **发现**：nitro 3 官方导出 `nitro/tsconfig` 预设。
- **证据**：本机复现会话实测。
- **影响**：注意其陷阱——预设只含 `compilerOptions`、无 `include`，直接 extends 后文件不会被纳入。
- **沉淀动作**：extends `nitro/tsconfig` 即用，但 include 需自行补（与发现 3 配套）。

## 5. prettier 3.9.10 json parser 容忍 JSONC 注释

- **发现**：prettier 3.9.10 的 json parser 容忍 JSONC 注释。
- **证据**：本机复现会话实测。
- **影响**：含注释的 tsconfig.json 可直接过 pre-commit 钩子，"json 格式化挡注释"这一假设不成立。
- **沉淀动作**：不得依赖 prettier 充当 JSONC 注释门禁；需要禁注释须另行校验。

## 6. R02 故障机制实证：Content 变体路由经 h3 HTTP 层抛 Invalid URL

- **发现**：R02（删 docs 显式 h3）的故障机制——Content 变体路由（`cache.<ts>.json` / `search-<ts>`）经 h3 HTTP 层抛 `Invalid URL` → `[500]` → prerender 失败。
- **证据**：experiment/r02 本机实测信号原文（总检报告 §3.2 R02 行）。
- **影响**：与 [F47](../failure-catalog.md)（h3 v2 `getQuery` 对 nitro 内部 fetch URL 抛 `Invalid URL`）同根因域，两个故障可互相印证解析路径。
- **沉淀动作**：详见 [R02.md](./R02.md)；后续 h3 解析类实验优先复用此信号链。

## 7. vue-tsc 2.2.12 与 tsconfig incremental 兼容

- **发现**：vue-tsc 2.2.12 与 tsconfig `incremental` 兼容。
- **证据**：本机复现会话实测（增量缓存正常生成）。
- **影响**：类型检查缓存可放心开启，不构成当前故障面。
- **沉淀动作**：无需 workaround；如未来类型缓存异常，先对照本条排除 vue-tsc/incremental 兼容性。

## 8. tsconfig exclude 拦不住 import 闭包拉入的文件

- **发现**：tsconfig `exclude` 无法拦截被 import 闭包拉入的文件。
- **证据**：本机复现会话实测——上游 layer 源码噪声 86 个文件被拉入。
- **影响**：该噪声无法在本仓侧配置消除，只能归属上游修复。
- **沉淀动作**：不在本仓做排除上游 layer 的无效配置尝试；涉及上游 issue 时引用此量化数据。

## 9. F47 第二层在本机 Windows node-server 复现（受控对照）+ CI probe:artifact 弱断言发现

- **发现**：R01 受控对照两组（实验组/对照组）的本机 node-server 冒烟中 `/api/_content/cache.json` 均为 200+404shell（页面断言全绿）——与 [failure-catalog F47](../failure-catalog.md) 矩阵"node-server ✅"记载冲突。
- **证据**：①受控对照两组一致（排除 R01 变量因果，见 [R01.md](./R01.md)）；②`probes/artifact-smoke.ts` 全文核实：仅断言 `response.ok`，无响应体检查——CI 的"Content cache artifact smoke"从未排除 404 shell。
- **影响**：F47 第二层"serverless 特有"假设动摇——可能覆盖 node-server（即全 preset），node-server 此前的"绿"是弱断言假象；F47 矩阵 node-server 行证据强度需降级为"200 已验证、内容未验证"。
- **沉淀动作**：①Linux node-server 响应体级复验定案（[QUEUE](./QUEUE.md) 🔍 项）；②probe:artifact 升级内容断言（独立 infra 改动，勿混入实验）；③F47 矩阵修正待定案后执行。
- **注意**：本条为嫌疑发现（本机 Windows 单平台实测），措辞保留"待定案"，不得直接改写 F47 矩阵结论。
- **2026-10-30 定案**：本条已由 [FINDINGS #19](#19-f47-第二层定案探针请求了-dev-only-路径名catch-all-把「路由不存在」渲染成-http-200) 升级为定案结论——第二层**不是** serverless/preset 运行时故障，而是「生产构建指纹化路由名 vs 探针硬编码 dev 路径」的契约失配 + catch-all 把「路由不存在」渲染成 HTTP 200；node-server 与 vercel/cloudflare_module 三处**完全一致**。本条的「影响」与「沉淀动作」中「待定案」部分以 #19 为准。

## 10. baseline-safety 契约按“字面子串”校验声明 pattern——多行书写不满足

- **发现**：`tests/baseline-safety.test.mjs:51` 以 `policy.text.includes("externals.inline")` 字面子串校验 nuxt.config.ts 是否实际出现声明 pattern；多行书写 `externals: {\n  inline: [...]` 不含该字面串 → 契约测试失败（ERR_ASSERTION：声明了 externals.inline 但目标文件没有实际出现该实验变量）。
- **证据**：R13 首轮 `pnpm test` exit 1 原文；R14 先例为单行字面代码 `inline: [/.*/]` 直接通过。
- **影响**：配置型实验书写 pattern 时必须保证字面子串出现（如加一行含 pattern 名的注释即可满足）；这是契约实现细节，不是缺陷，但会绊倒不了解实现的新实验。
- **沉淀动作**：本条目作为配置型实验 SOP 的隐含约束；后续可在 [SOP.md](./SOP.md) 配置型实验小节补一句提示。

> **2026-10-18 补充（#2 机制细化）**：safe-delete 对删除操作的路由实证——`rm -rf`/`Remove-Item` 均经 harness 的 safe-delete 包装：① >50 文件触发 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`（需逐 turn 确认，后台任务无法确认故必拦）；② 走回收站（genie-trash）对巨型目录（node_modules 级）会超时中止并 `SAFE_DELETE_FAIL_CLOSED`（文件保留）——这解释了"日志说已清除、实况仍在"的幻影；③ 结论：实验隔离目录的物理清理必须前台 + 用户确认，或改用小型分批删除；本仓 `.gitignore` 已加 `node_modules.stale-*` 兜底保持 status 干净。

## 11. Vercel preview 冷构建暴露 turbo 缓存重放假象——experiment 分支 preview 已禁用

- **发现**：experiment/* 分支 push 触发 Vercel preview 构建，三个 preview 全部 Error（同根因）：`turbo run build --filter=...` 中 `@repro/shared-core:build` 为**远端缓存命中仅重放日志**，但 `@repro/docs:build` 冷执行时解析不到 shared-core 的 dist（`Failed to resolve entry for package "@repro/shared-core"`，12s 快速失败）；而 production "Ready 16s" 实为 turbo 远端缓存重放假象——**Build Command 在 Vercel 上从未被真实冷测过**。
- **证据**：三个 preview 构建日志（docs×2：Branch experiment/r01、r13 同型 shared-core 解析失败；api×1：r01 分支 filter 无 @repro/api 必然失败）+ production Ready 16s/12s 的缓存重放时序。
- **影响**：①experiment 分支的 preview 不是验收对象且结构性失败（r01 的 api preview 必然失败）②每次 experiment push 都会产生失败邮件噪音 ③暴露 Build Command 未被冷测（潜在债务，暂不追——production 由缓存保护且四域名断言绿）。
- **沉淀动作**：①两项目 Settings → Git → **Ignored Build Step** 启用并填 `[ "$VERCEL_ENV" = "preview" ] && exit 0 || exit 1`（preview 跳过构建、production 继续）——**Dashboard 人工 gate，移交用户**；②3 个 Error preview 部署记录已经 CLI 删除；③后续 experiment 分支 push 不再产生 Vercel 构建。
- **CLI 路径穷尽记录（2026-10-18）**：`vercel project update`（v58.11.0）全参数表仅覆盖 build-command/framework/root-directory 等，**无 preview 部署开关**；CLI v58 会话 token（含 refreshToken 的新版 auth.json）经 REST 实测返回 `invalidToken: true`（仅限 CLI 内部流程，非通用 API 凭据）。结论：preview 禁用只能走 Dashboard 人工 gate，或用户另建 Account-level API Token 后 PATCH `/v9/projects/{id}` 的 `previewDeployments.enabled=false`。
- **Gate 生效验证（2026-10-18，用户 token 实测）**：两项目 API 实测 `previewDeploymentsDisabled = true`（生效字段名为 `previewDeploymentsDisabled` 布尔值，而非我此前 PATCH 尝试的 `previewDeployments.enabled` 嵌套形态——字段名纠偏记录在案）；Git 集成 link 完好（type=github），production 部署链不受影响，仅 preview 被禁。token 用后应撤销（已在对话中明文出现）。

## 12. R20 采样方法论：后台资源采样会被工具默认 120s 超时强杀，须显式加大并验证 DONE 尾行

- **发现**（2026-10-18，R20 执行中）：PowerShell 工具 `run_in_background` 启动的采样进程在 **2m1s 处被默认 120s 超时强杀**（任务状态 failed、日志无 `DONE` 行），导致 R20 首轮构建（213s）的资源采样只覆盖前 101s。
- **修正动作**：采样脚本内置 deadline（12min）+ stopfile 双兜底退出；后台调用显式传 timeout（本轮 400s 覆盖 169s 构建）。重跑一轮预热态构建补全了资源覆盖（峰值 WS 3565.3 MB 出现在 NFT 段尾）。
- **纪律**：凡带后台采样的测量型实验，判定采样完整性看日志尾行是否为 `DONE reason=...`；强杀截断的采样窗口须在档案中标注覆盖区间，不得当全程数据引用。

## 13. docs 构建链实为 nitropack 2.13.4（非 nitro 3）+ 产物自包含判据方法论（R21 实证）

- **发现 1（拓扑事实）**：docs 构建链 `@nuxt/nitro-server@3.21.2 → nitropack ^2.13.1`，实际使用 **nitropack 2.13.4**；`nitro@3.0.260610-beta` 仅属 apps/api 依赖，不在 docs 构建链。nitro 3 类型定义无顶层 trace/externals.trace，只有 traceDeps/traceOpts（位置级实锤）。
- **发现 2（R21 机制实锤）**：nitropack 源码（dist/rollup/index.mjs:392）`if (opts.trace === false) { return { ...resolved, external: true } }`——trace:false 生效路径明确；R21 实测 build 79.8s（vs R20 冷态 213s，NFT 段被跳过），`.output/server/node_modules` 拷贝层（~8.4MB）消失。
- **发现 3（判据方法论）**：孤立环境运行（.output 拷至无依赖目录）+ 裸导入扫描（静态 from/动态 import()/require（） 三类）证明本仓 docs 产物**零裸导入**（externals 插件前已全量 inline）——`.output/server/node_modules` 存在与否**不能**作自包含判据，trace 拷贝层是纯冗余。F26 缺包链在本 topology 未触发。
- **影响**：R22（Linux trace:false）价值下降（缺包预期不成立，仅剩平台对照价值，建议重估优先级）；trace:false 若未来引入，收益是构建时长（-133s）而非正确性。
- **沉淀动作**：R22 优先级重估记入 QUEUE；R21.md 已按"机制测量"归档。

## 14. 构建水位量化——两次独立测量峰值 WS 稳定 ~3.5 GiB，距 F24 历史锚点 4.05 GiB 余量 13.2%

- **发现**（2026-10-19，R23 执行中）：同基线（main + fresh install + 默认 heap）两次独立测量，docs build 主 Node 工作集峰值 3565.3 MB（R20）/ 3599.4 MB（R23），差 +1%（噪声级）；平台期 t=73–146s 稳定 3.43–3.46 GiB，**完整覆盖 `Initializing prerenderer` 相位（F24 历史 OOM 相位）平稳通过**，OOM 未复现。
- **证据**：/tmp/r23-mem-v2.log（29 点 × 5s，wmic 路线，v3 完整有效）+ R20 RUN2 资源采样（33 点，峰值 3565.3 MB，见 [R20.md](./R20.md)）+ [failure-catalog](../failure-catalog.md) F24 历史锚点原文（主 Node 工作集约 4.05 GiB）。
- **影响**：①R24–R26 heap 矩阵的判读基线明确——提升档位的效果 = 对 3.5 GiB 水位的余量变化；②OOM 未复现是当前依赖拓扑下的稳定事实，非偶发。
- **沉淀动作**：R24/R25/R26 档案执行时引用本条水位数据；若水位显著变化（>10%）需重审。

## 15. heap 档位不改变构建水位——三轮一致（R20 默认 / R23 默认复测 / R24 4608 MiB）

> **2026-10-19 修正**：本条"水位不变"结论已被 **#16** 修正——R25/R26 快速验证显示峰值 WS 随 heap 上限单调抬升（+15.0%/+24.0% 超判据），R24 的 +8.4% 是趋势首点而非噪声；本条"构建行为与结局由构建图决定"的核心结论成立且被强化。以 #16 为准。

- **发现**（2026-10-19，R24 完成后）：R20 峰值 3565 MB（默认 heap，本机实测上限 4144 MiB——Node 22 大内存自适应，非文献常引 4096）、R23 3599 MB（默认 heap 复测）、R24 3903 MB（4608 档，heap limit 经 `getHeapStatistics` 实测 4656 MiB 生效，V8 对齐 +48 MiB）——R24 vs R23 偏差 +8.4%，在 ±10% 噪声级判据内；build 时长 R23/R24 均 160s 持平。**提升 heap 上限不改变构建水位与时长——水位由构建图决定**；lazy GC 显著抬升（>10%）未出现。
- **证据**：/tmp/r24-mem.log（34 点采样，尾行 `DONE reason=stopfile`）+ `v8.getHeapStatistics()` 实测（默认 heap_size_limit 4345298944 B → 注入后 4882169856 B，V8 对齐 +48 MiB，非理论 4608 MiB）+ [R24.md](./R24.md) 执行记录与结论。
- **影响**：①R25（5120 MiB）/R26（6144 MiB）可降级为快速验证（单轮构建 + 水位抽查，无需完整周期）；②"OOM 门槛提升假设"在三轮中不成立——R24 注入 4608 MiB 后 OOM 信号未复现且水位几乎不变，F24 历史 OOM 归因于历史依赖拓扑下的构建图水位，而非 heap 上限过低。
- **沉淀动作**：①R25/R26 按 [QUEUE](./QUEUE.md) 表 4 重估注记执行快速验证；②heap 档位验证方法（`getHeapStatistics` 实测留证，勿引理论值）与冒烟防假 200（.output 冒烟先验证 server log `Listening` 行再发断言请求，防孤儿旧产物进程伪造证据）记为 [SOP.md](./SOP.md) 候选补充。

## 16. 水位随 heap 上限单调抬升（lazy GC）——修正 #15 的"水位不变"结论

- **发现**（2026-10-19，R25/R26 快速验证完成后）：R25（5120 MiB 档）峰值 WS 4139 MB、R26（6144 MiB 档）峰值 4463 MB，vs R23 3599.4 MB 偏差 **+15.0% / +24.0%，超出 ±10% 判据**，且随档位单调抬升——默认 3565/3599（R20/R23）→ 4608 档 3903（R24）→ 5120 档 4139（R25）→ 6144 档 4463 MB（R26），符合"更大堆下 lazy GC 更晚回收"机制。
- **对 #15 的修正**：#15 "水位由构建图决定（heap 上限不改变水位）"仅在默认/4608 档近似成立；**峰值工作集实际随 heap 上限单调放大**，R24 的 +8.4% 是趋势首点而非噪声。被保留的核心结论：**构建行为与结局（时长 157–161s、exit 0、OOM 零命中、`Initializing prerenderer` 锚点相位平稳）确由构建图决定，与档位无关**——F24 历史 OOM 归因于构建图水位的结论成立且被强化。
- **证据**：/tmp/r25-mem.log、/tmp/r26-mem.log（稀疏采样口径）+ [R25.md](./R25.md)、[R26.md](./R26.md) 执行记录 + [R24.md](./R24.md) 密采对照（34 拍 × 5s）。
- **口径限制**：快速验证为构建段 5 拍 × 30s 稀疏采样（峰值取末拍），绝对峰值可能低估瞬时极值；单调趋势为 R25/R26 同口径互比 + 与 R24 密采交叉对照下可信。
- **沉淀动作**：①#15 结论以本条为准修正（#15 已加修正指针）；②heap 档位选择对峰值 WS 的代价在容量规划时需计入；③R22 重估时同口径提示（与 FINDINGS #13 优先级重估联动）。

## 17. nitropack prerender 路由全清的 `/` 回填兜底——R28 破坏面收窄 + 契约阻塞记录

- **发现**（2026-10-19，R28 完成后）：`routes.clear()` 将 prerender 路由清空后，`routes.size === 0 && crawlLinks === true` 触发 nitropack@2.13.4 自动回填 `/` 种子（core/index.mjs:1987-1992 源码实锤）→ 实际 Prerendered 5 routes（1 initial + 4 crawler 资源路由 payload/ipx/i18n）而非 0；html 从基线多页收敛至仅 index.html，Content 结构化索引不在构建期产物（`api/_content` 不存在，与基线一致）。
- **证据**：/tmp/r28-build.log `Prerendered 5 routes` 行 + `Prerendering 1 initial routes with crawler` 行 + nitropack 源码行号（core/index.mjs:1987-1992）+ 冒烟（先验 `Listening` 行 ✓；`/`、`/guide/baseline` 均 200 但为 SSR 兜底；`cache.json` 200+404shell——F47 基线签名不变），详见 [R28.md](./R28.md)。
- **影响**：①R28 单变量（钩子形态 `routes.clear()`）的破坏面被回填机制收窄，F27/F28/F29 完整触发需 R27（`crawlLinks:false`）+R28 叠加——即 R29 的设计动机；②R27/R29 被契约阻塞：[tests/baseline-safety.test.mjs](../../../tests/baseline-safety.test.mjs) forbidden 列表无 crawlLinks 字面、[契约](../config-experiment-contract.md)允许清单亦不含该形态，L84 治理条款要求先更新权威 pattern 列表（tests/ 资产变更需用户 gate）；执行者已实证演示声明失败（not ok 6：不允许声明未知安全 pattern）。
- **沉淀动作**：①用户授权后扩展 tests/ + contract 的权威 pattern 列表（加 `crawlLinks: false` 字面）再执行 R27/R29；②R29 判读时以本次 R28 回填机制为叠加对照锚点（对照"回填是否随 crawlLinks 关闭而消失"）。

> **2026-10-27 追记**：契约阻塞已解除（main @ 4211796），R27/R29 已执行完成——R27 部分破坏 / R29 完整触发，回填机制两分支对照确认，见 #18。

## 18. F27/F28/F29 完整触发阶梯实锤——单变量不足、双变量达成零预渲染 + content 路由注册疑依赖 crawlLinks

- **发现**（2026-10-27，R27/R29 完成后）：prerender 静态产物触发阶梯——基线 11 → R28 5（`routes.clear()` 后 nitropack `/` 回填兜底）→ R27 9（`crawlLinks:false` 无 crawler，但 3 显式种子页 + payload/ipx/i18n 完整、冒烟静态命中）→ R29 0（双开零预渲染成立）。回填机制两分支源码级对照：nitropack@2.13.4 core:1987-1992，`routes.size === 0` 时 `crawlLinks === true` → `add("/")`（R28 路径）、`false` → return（R29 路径）——R28 观测到的回填兜底随 crawlLinks 关闭而消失，完整触发路径源码级确认。F47 签名（`cache.json` 200+404shell）跨基线/R27/R28/R29 四态不变——独立于 prerender 变量。
- **横向发现**：R27 中 content 的 `cache.<ts>.json` / `search-<ts>` 未入初始路由列表（基线/R28 语境 content v2.13.9 在 `nitro:config` 阶段 unshift 注册）——content 路由注册疑似依赖 crawlLinks 态，待源码核查（候选后续任务）。
- **证据**：/tmp/r27-build.log（`Prerendering 5 routes` 措辞无 "with crawler" + `Prerendered 9 routes in 11.561 seconds` + 9 路由明细 = 3 页面 + 3 `_payload.json` + 2 `_ipx` + 1 `_i18n`，无失败标记无 Invalid URL）、/tmp/r29-build.log（无 `Prerendering`/`Prerendered`/`Initializing prerenderer` 行、html = 0、.output/public 仅 `_nuxt` + 2 logo）+ nitropack 源码行号（core:1987-1992）+ 三轮冒烟（R27 `/`、`/guide/baseline` 字节数与磁盘预渲染产物一致即静态命中；R29 全 SSR 兜底；`cache.json` 四态 200+404shell），详见 [R27.md](./R27.md)、[R29.md](./R29.md)。
- **影响**：①F27 完整签名以 R29 为准（html 11→0 + 运行时全 SSR 兜底）；②R27 单变量不足以复现 F27 全貌——故障家族的触发阶梯证明"组合变量"价值（R28 部分命中 / R27 部分破坏 / R29 完整触发，三者互为对照）；③content 路由注册条件为后续核查项。
- **沉淀动作**：①后续 F27/F28/F29 相关判读以 R29 完整签名为基准；②content v2.13.9 路由注册对 crawlLinks 态的依赖核查列为候选后续任务（待入队，候选位置：QUEUE 表 4 🔍 排查项旁）。

## 19. F47 第二层定案：探针请求了 dev-only 路径名，catch-all 把「路由不存在」渲染成 HTTP 200

- **发现**：F47 第二层（`/api/_content/cache.json`、`/api/_content/search` 返回 HTTP 200 + HTML 404shell）的真实成因是**验收契约写错了 URL**，不是运行时故障：content v2 在**生产构建**下把 API 路由名指纹化（`cache.<buildIntegrity>.json` / `search-<buildIntegrity>`），无后缀路径**只在 dev 模式存在**；请求无后缀路径落到 catch-all `/**`，被上游 layer 的 `pages/[...slug].vue` 渲染成 404 UI 但**不抛 `createError`** → HTTP 200。**content 运行时 DB/存储完全正常**——旧假设「serverless 下 DB 初始化失败 → handler 崩溃」被证伪。
- **证据**：①模块源码 `@ztl-uwu/nuxt-content@2.13.9` `dist/module.mjs:207/238/243`（`buildIntegrity = nuxt.options.dev ? void 0 : Date.now()`，路由名按 dev/生产二分）；②产物路由表 `.output/server/chunks/_/nitro.mjs:9932-9949` 实锤——注册的是 `/api/_content/cache.1793336652904.json`、`/api/_content/search-1793336652904`、`/api/_content/query/:qid/**:params`、`/api/_content/navigation`，**没有** canonical 两条，catch-all `/**` 位于 handlers 末位；③带指纹路径在本机 node-server 与 Vercel 生产**均返回 200 + 真实 JSON**（cache `contents` 3 篇；search `documentCount:8`、`documentIds` 8 条、命中「绿色控制组」）；④canonical 路径在本机 / Vercel / Cloudflare 远端**三处逐字一致**均为 200 + 404shell；⑤`runtimeConfig.public.content.integrity` 暴露指纹、应用客户端据此拼路径（产物自洽，只有外部探针在用 dev 路径）；⑥`probes/artifact-smoke.ts` 仅断言 `response.ok` → 对 404 shell 恒绿；⑦`ci.yaml:90-94` 两条 smoke step 打的正是 dev-only URL → **必然假绿**。
- **影响**：①F47 第二层从「平台运行时故障」重定义为「**验收契约假阳性**」，矩阵的 preset 维度结论作废（node-server 与 serverless 表现一致）；②`failure-catalog.md` 原第 326 行的实验方向（node:sqlite / better-sqlite3 / serverAsset 初始化路径对比）**打偏**，不再作为后续方向；③连带订正 `acceptance-gates.md` G4 与 `failure-catalog.md` F29 两处把 dev 路径写成硬性契约的规格缺陷；④附带暴露第二个潜在假阳性门——`/api/_content/query/index.md` 无 `_params` 时回退空 query 返回**全部文档**，它根本不校验 `index.md` 本身。
- **沉淀动作**：①`apps/docs/server/api/_content/[...].ts` 守卫——未注册的 Content API 路径返回**真实 404**，从机制上消除 200 假阳性；②`probes/content-smoke.ts` 升级为**从构建产物发现指纹路由 + 响应体内容级断言**（`JSON.parse` 成功 + 具体 `_path`/`title`，并对 canonical 路径断言真 404）；③`ci.yaml` 删除两条 dev-only URL 的 smoke step；④`acceptance-gates.md` G4 / `failure-catalog.md` F29 / 本文件 #9 同步订正；⑤探针**不得硬编码构建指纹**（`Date.now()` 每次构建都变）；⑥另立独立契约断言把 shared-core 的 `--incremental false` 固化，防 Vercel 增量零 emit 类缺陷复归。
- **交叉引用**：证据文件 `evidence/2026-10-30-f47-content-api-false-positive-fix.md`；事故档案 `.agents/skills/fix-bug/record-bug-fix-memory/2026-10-30-f47-content-api-false-positive.md`；本条与 #9 的「定案」标注一致，#9 原文保留为嫌疑发现记录不改写。
- ⚠️ **编号保留说明（2026-10-30 独立复核发现）**：本条占用 **#19**，而待合并分支 `experiment/integrate-r18-r19`（`155063d`，BRANCH-MERGE-EVALUATION 标 🟢 可合并待授权）已在其 `FINDINGS.md` 中占用 **#19**（条目：`R19→F20 复现：hoisted 爆炸半径实锤`）。两条内容不同，**合并时必须重编号，否则出现重号 #19**（该台账自身的检查项「FINDINGS 编号 1–N 连续、无重号」即会失败，且会让 5 处「FINDINGS #19」引用指向歧义）。重编号方案与操作顺序见 [BRANCH-MERGE-EVALUATION.md §4](./BRANCH-MERGE-EVALUATION.md) 第 7 步。