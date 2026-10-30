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
- **2026-10-30 定案**：本条已由 [FINDINGS #19](./FINDINGS.md#19-f47-第二层定案探针请求了-dev-only-路径名catch-all-把路由不存在渲染成-http-200) 升级为定案结论——第二层**不是** serverless/preset 运行时故障，而是「生产构建指纹化路由名 vs 探针硬编码 dev 路径」的契约失配 + catch-all 把「路由不存在」渲染成 HTTP 200；node-server 与 vercel/cloudflare_module 三处**完全一致**。本条的「影响」与「沉淀动作」中「待定案」部分以 #19 为准。

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
- ⚠️ **编号保留说明（2026-10-30 独立复核发现）**：本条占用 **#19**，而待合并分支 `experiment/integrate-r18-r19`（`155063d`，BRANCH-MERGE-EVALUATION 标 🟢 可合并待授权）已在其 `FINDINGS.md` 中占用 **#19**（条目：`R19→F20 复现：hoisted 爆炸半径实锤`）。两条内容不同，**合并时必须重编号，否则出现重号 #19**（该台账自身的检查项「FINDINGS 编号 1–N 连续、无重号」即会失败，且会让 5 处「FINDINGS #19」引用指向歧义）。重编号方案与操作顺序见 [BRANCH-MERGE-EVALUATION.md §4](./BRANCH-MERGE-EVALUATION.md) 第 7 步。**推荐取方案②**（本分支那条改为 `#20` 并同步其 5 处「FINDINGS #19」引用）：main 侧 `#19` 已被 15 处**已发布**引用指向（含 `evidence/` 与 `progress.md` 归档件），改 main 的编号等于改写历史指称、且要把 15 处引用一起翻面，成本与风险都远高于在分支侧一次性重编号；且本仓编号约定是「先到先得」，main 的 `#19` 先于该分支占用，方案②与该约定一致。→ **已执行（2026-10-30，用户授权）**：分支侧该条已重编号为 **#20**（`experiment/integrate-r18-r19` @ `6bab1ba`），其 `R18.md`（3 处）与 `R19.md`（2 处）的「FINDINGS #19」引用同步改号；该分支的 `R18.md` / `R19.md` 终版档案亦已并入 main（对应本文件紧邻的 **#20** 条目）。**撞号已消解**——main 条目号 1–22 连续、无重号（#21 = F17 机理、#22 = R31-family，均于 2026-10-30 补建）。

## 20. R19→F20 复现：hoisted 爆炸半径实锤（不可构建，非仅性能）+ R18 `publicHoistPattern` 契约检测事实

- **发现 1（R19→F20 爆炸半径，2026-10-29）**：`nodeLinker: hoisted` 下整个 workspace **不可构建**——`pnpm install`（exit 1 / 21s）失败于 `apps/docs prepare`：`Cannot find module '.../apps/docs/node_modules/nuxt/bin/nuxt.mjs'`；`pnpm build:packages`（exit 1 / 2s）失败于 `Cannot find module '.../packages/shared-core/node_modules/typescript/bin/tsc'`；`pnpm --filter @repro/docs build`（exit 1 / 2s）失败于 `prebuild: nuxt prepare` 同报 `nuxt/bin/nuxt.mjs` 缺失。**根因一致**：hoisted 布局下 pnpm 将 bin 提至根 `node_modules/.bin`，但**未在 `.pnpm/<pkg>/node_modules/<pkg>/bin/` 内落地 `bin/<cmd>.mjs`**；而 `node_modules/.bin/<cmd>` shim 经 `../<pkg>/bin/<cmd>` 相对路径解析，该文件缺失 → `MODULE_NOT_FOUND`。此破坏**系统性**（nuxt、typescript 均中招），非单包特例。
- **发现 2（「12m+ 重装」是冷 store 假象）**：spec 预设 hoisted 全量重装 12m+；实测 **warm store 下重装仅 21s**（1200 包全 reused、0 下载），与默认 linker 量级相当。首轮 exit 124（480s）是冷 store + timeout 不足之长尾，非 hoisted 固有慢。**真正危险是工具链断裂，不是重装时长**——首轮用 timeout 掩盖了真实失败模式。
- **发现 3（构建图放大假设不成立）**：因 hoisted 在 prepare 生命周期即阻断 build，docs 构建从未进入真实构建阶段，构建期峰值内存仅 2011 MB（baseline node 水位，非构建水位；R18 真实构建峰值 3559 MB 对照）。「hoisted 放大构建图→内存上升」的预设在 R19 无法验证，因构建被提前杀死。
- **发现 4（R18 `publicHoistPattern` 契约检测事实，2026-10-29）**：R18 写入 camelCase 字面量 `publicHoistPattern:`（非 pnpm 合法 kebab 键 `public-hoist-pattern`），pnpm 10.33.0 **零 unknown-field 警告、静默容忍**；治理键检测**完全依赖** `tests/baseline-safety.test.mjs` 的 `text.includes("publicHoistPattern")` 字面子串匹配。✝️ 治理盲区：若改用合法 kebab `public-hoist-pattern`，契约子串不匹配 → **漏检**。该事实与发现 1 共同说明：pnpm 侧对危险 workspace 配置不提供任何校验信号，检测全压在契约测试的字面子串上。
- ⚠️ **发现 4 事实订正（2026-10-30 受控实测，pnpm 10.33.0）**：本条原文括注称「`publicHoistPattern:`（**非** pnpm 合法 kebab 键 `public-hoist-pattern`）」——**该括注方向相反，事实错误**。受控实验（临时工作区；以传递依赖 `is-odd@3.0.1` → `is-number` 是否被提升到根 `node_modules/` 为判据）实测：

  | 拼写                               | pnpm 行为                                                                                                                                                | public hoist 是否生效                             |
  | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
  | `publicHoistPattern:`（camelCase） | 接受，**零警告**                                                                                                                                         | ✅ 生效（`is-number` 被提升到根 `node_modules/`） |
  | `public-hoist-pattern:`（kebab）   | **显式 WARN**：`The following settings in pnpm-workspace.yaml were ignored because they are not written in camelCase: "publicHoistPattern"` → **被忽略** | ❌ 不生效                                         |

  即：**pnpm-workspace.yaml 只认 camelCase，kebab 拼写被忽略**（不产生 hoist 风险）；契约原本匹配的 camelCase 恰是**唯一生效拼写** → `publicHoistPattern` **不存在「改用 kebab 即漏检」的实际漏洞**。本条建议动作**仍然成立但性质已变**：契约层枚举 kebab 属**纵深防御**（防未来 pnpm 改行为、防作者意图被静默忽略），不再是「堵已实证漏洞」。

- **沉淀动作补记（2026-10-30 A2 实施）**：契约 `tests/baseline-safety.test.mjs` 的 `pnpmWorkspace.forbidden` 扩为 `["nodeLinker: hoisted", "node-linker: hoisted", "publicHoistPattern", "public-hoist-pattern"]`（camelCase + kebab 双拼写），并新增两道**独立于 forbidden 列表**的守卫：①**独立硬编码期望值**的元守卫（与 forbidden 不同源，避免退化成恒真式）；②**合成样本**自证（camelCase / kebab 共 4 种危险配置都必须被判违）。契约总数 **13 → 15**。**红绿差分自证**：从 forbidden 移除 kebab 项 → 两道守卫**同时变红**（`not ok 8` + `not ok 9`，exit 1）→ 装回 → 15/15 绿。
- **证据**：`/tmp/r19-install.log`（`Cannot find module '.../nuxt/bin/nuxt.mjs'`）、`/tmp/r19-buildpkgs.log`（`typescript/bin/tsc` 缺失）、`/tmp/r19-docsbuild.log`（`prebuild: nuxt prepare` 失败）、`/tmp/r19-contract.log`（判违 `nodeLinker: hoisted`）、`/tmp/r18-contract.log`（判违 `publicHoistPattern`）+ `C:\tmp\r18-mem.log`/`C:\tmp\r19-mem.log`（峰值 3559 / 2011 MB）；详见 [R18.md](./R18.md)、[R19.md](./R19.md)。
- **影响**：①F20 结论由「性能/构建图放大」上修为「**可用性灾难：hoisted 使项目不可构建**」——PR #27 评估 hoisted 风险的严重级需重判；②首轮 R19 的 exit 124（timeout）是误诊，掩盖了真实的 bin 解析断裂；③契约治理对 kebab/camelCase 键名敏感，存在漏检盲区（发现 4），建议在契约层对已知危险配置同时枚举 kebab 与 camelCase 两种字面。
- **沉淀动作**：①F20 故障条目结论按本发现上修；②R18/R19 档案结论均标 `verified`；③QUEUE 表 2 的 R18/R19 待重测行已移入表 1。
- ⚠️ **编号说明（2026-10-30 重编号，用户授权）**：本条原为本分支自带的 **#19**，与 main 侧已发布的 **#19**（「F47 第二层定案」）**重号**。按 [BRANCH-MERGE-EVALUATION.md §4](./BRANCH-MERGE-EVALUATION.md) 第 7 步的**方案②**（main 侧 #19 保持不动——它已被 15 处已发布引用指向，含 `evidence/` 与 `progress.md` 归档件，改号等于改写历史指称），本条改为 **#20**，并同步本分支 `R18.md`（3 处）与 `R19.md`（2 处）的「FINDINGS #19」引用一并改为 #20。**不要两边都叫 #19。**

## 21. F17 机理定案：externalize Element Plus 切断 `@popperjs/core` 的 npm alias 链（build 全绿 + 运行时 500）

- **发现 1（触发条件）**：F17（Element Plus 的 npm alias 链 `element-plus → @popperjs/core → npm:@sxzz/popperjs-es` 在 Nitro standalone 产物中丢失逻辑包名）由**精确 externalize Element Plus** 触发，即 `vite.ssr.external = ["element-plus"]`。**main 基线本身不复现 F17**——基线 `apps/docs/nuxt.config.ts` 中 `element-plus` / `popper` / `external` / `traceAlias` **零命中**。
- **发现 2（症状特征与 F18 的分界）**：F17 的真实表现**不是** build 失败，而是 **build 全绿 + standalone 正常监听 + 真实请求 500**：R15 实测 install / build:packages / docs build 全部 exit 0（docs build ~174s），`.output` 启动输出 `Listening on http://[::]:3000`，但首页真实请求返回 **HTTP 500**，响应体 `Cannot find package '@popperjs/core' imported from element-plus/es/hooks/use-popper/index.mjs`（322 bytes）。这是 `failure-catalog.md` **F18「build 绿但 `.output` 不可运行」的典型样本**——验收只看 build 退出码，F17 会 100% 漏检。
- **发现 3（因果链由三段对照实验锁定）**：R15（阳性：runtime 500）/ R16（docs 直加 Popper npm alias → 200 + 内容命中 + content API 200）/ R17（Nitro `traceAlias` → 200 + 内容命中，无 `@popperjs`/alias 错误），三者同为「同一首页 SSR 路径 + 同一 SOP 干净重测协议」，**唯一自变量**为配置差异 → 可断言：externalize Element Plus 破坏 `@popperjs/core` alias 链；docs 直加 alias 与 Nitro `traceAlias` **二者均可**完成 alias runtime closure、修复该破坏。
- **发现 4（污染态首轮掩盖了真实信号）**：R15 / R16 / R17 首轮**全部**是 `exit 1 + Invalid URL`（污染态伪信号，若按首轮判读会得到「三个同结论」的假象）；SOP 干净重测后才分离出 R15 阳性 / R16·R17 阴性。**「首轮不可信」不等于「变量无关」**——干净重测可能翻转为真阳性（本例即 R15）。
- **影响**：①F17 在 FINDINGS 台账中长期**无独立条目**（机理只沉淀在 R15/R16/R17 三份档案与 `evidence/`），本条补齐该缺口；`BRANCH-MERGE-EVALUATION.md` §3.5 原写「机理沉淀于 FINDINGS #19」为**错误指针**（main #19 是 F47、原分支 #19 是 R19→F20，两条都与 F17 无关），已订正为本条。②**R16 / R17 不得并入基线**——它们修的是一个**基线并不存在的病**，合并即等于给基线加无证据驱动的 workaround（违反基线纪律）；二者的价值是**机理证据**，不需要靠代码合并承载。③若基线将来主动 externalize `element-plus`（F17 成为基线故障），**必须同时落地 alias 闭包**（`traceAlias` 或 docs 直加 alias），否则首次真实请求即 500。
- **证据**：[R15.md](./R15.md)（阳性 runtime 500）、[R16.md](./R16.md)、[R17.md](./R17.md)、`evidence/2026-08-29-r15-element-plus-popper-alias.md`（自上游旧分支移植入 main）；`failure-catalog.md` 的 F17 条目与 F18 / F19 的分界。
- **交叉引用**：`BRANCH-MERGE-EVALUATION.md` §3.5（R15 🔴 不可合并 / R16·R17 🟡「条件合并」实为默认不合并）、`QUEUE.md` 表 1 的 R15 / R16 / R17 行。

## 22. R31-family 收敛定案：mermaid 单触发块覆盖 R30/R33（✝️ R32 因前提证伪回未启动池），F30 在当前链路判为 clean negative

- **发现 1（收敛事实 verified）**：`dayjs` / `debug` / `@braintree/sanitize-url` **均为** `mermaid@11.17.2` 的传递依赖（lock 证据：line 14596 `shadcn-docs-nuxt@1.1.9 → mermaid@11.17.2`、line 12910 `mermaid → @braintree/sanitize-url@7.1.2`、line 12921 `mermaid → dayjs@1.11.23`），四者的 client 触发路径**汇聚到 mermaid 一个导入图**（`plugins/mermaid.client.ts` 全局 `.client` 插件 → `ProseCode.isMermaid` → `MermaidRenderer.onMounted` → `$mermaidInstance.render()`）。→ R30(dayjs) / R32(debug) / R33（sanitize-url） 由**单一 mermaid 触发块**覆盖，**无需三个独立实验**（与 `failure-catalog.md` F30 条目列出的四个重点依赖完全对应）。
- ✝️ **发现 1 事实订正（2026-10-30 独立复核坐实）**：原文断言「`dayjs` / `debug` / `@braintree/sanitize-url` **均为** `mermaid@11.17.2` 的传递依赖」**部分不成立**——`debug` **不是** mermaid 的依赖。复核证据：①`pnpm-lock.yaml` 的 `mermaid@11.17.2` 依赖块（line 12908–12931）共 22 项依赖，**无 `debug`**（`@braintree/sanitize-url` 在 line 12910、`dayjs` 在 line 12921，二者属实）；②安装态 `node_modules/.pnpm/mermaid@11.17.2/node_modules/mermaid/package.json` 的 `dependencies` **同样无 `debug`**；③`shadcn-docs-nuxt@1.1.9` 依赖块（line 14580–14603）**亦未直接声明 `debug`**；④`debug@4.4.3` 的真实来源是**构建工具链**（lock 中 20+ 处声明方为 `@babel/core` / `@babel/traverse` / `@nuxt/cli` / `engine.io-client` / `send` / `socket.io-parser` 等），与 mermaid 无关。
  - → **修正后的收敛事实**：`dayjs` / `@braintree/sanitize-url` 是 mermaid 传递依赖（成立）→ 由 mermaid 触发块覆盖，**R30 / R33 仍被 R31-family 覆盖**；`debug` **不在客户端依赖图内**（既非 mermaid 依赖、也非主题直接依赖）→ **R32 未被 R31-family 覆盖，须回到未启动池**，且其原始前提「debug 是 mermaid 传递依赖」已被证伪，启动前须重新界定单变量。
  - → 主题 `vite.optimizeDeps.include: ['debug']` 因此是一条**悬空声明**（引用了客户端依赖图中不存在的包）——这正是 dev server 打出 `Failed to resolve dependency: debug, present in client 'optimizeDeps.include'` 的直接原因：**该告警不是「debug 参与入口冲突」的证据，而是「debug 根本不在图里」的证据**（与发现 2 的订正互为印证）。
- **发现 2（F30 复现结论 = clean negative）**：在当前 `shadcn-docs-nuxt@1.1.9` + `mermaid@11.17.2` + 生产 `node-server` 构建下，插入 ` ```mermaid ` 触发块**不复现** F30 的 ESM/CJS 入口冲突——mermaid 正常渲染为 SVG（`svg.flowchart`，`svg.id = mermaid-1793186942009`）、hydration 完成（`nuxtApp: true`）、四包**零**入口错误（无 `Cannot use import statement outside a module` / `does not provide an export named` / `exports is not defined` / hydration mismatch）。dev 模式（PORT=3001）仅呈现 **Vite 426 依赖重优化循环**（页面 `Upgrade Required`，mermaid 因 426 从未执行）——是同一「optimizeDeps 缺口」的**不同表现**，非 F30 原文签名。
- ✝️ **发现 2 订正（同上复核）**：原文「四包**零**入口错误」中的 `debug` 项**不能作为证据**——生产构建下 `debug` 根本没有被加载（不在客户端依赖图内，见发现 1 订正），「零错误」是**空洞成立**（未加载 ≠ 未报错）。有效结论应收窄为：**生产构建下 mermaid 入口图（`dayjs` / `@braintree/sanitize-url` 等）零 ESM/CJS 入口错误**；**`debug` 轴未被本实验触达**。
- **发现 3（归因，非猜测）**：生产构建由 Rollup 统一打包并对 CJS 依赖做正确 interop，故 mermaid 入口图（含 CJS 的 dayjs / sanitize-url）无入口冲突。F30 在当前生产链路判为 **clean negative（未复现）**，而非「已证实存在」。若要在本仓稳定复现 F30，相关轴应为「**Vite dev `optimizeDeps` 缺口**」或「**外部化 mermaid 的构建**」，而非单纯生产内容触发 → 属后续独立实验方向。
- **发现 4（主题层 optimizeDeps 缺口，源码实锤）**：主题 `nuxt.config.ts` 的 `vite.optimizeDeps.include` 仅 `['debug']`，mermaid / dayjs / @braintree/sanitize-url **未预优化**；dev server 另打出 `Failed to resolve dependency: debug, present in client 'optimizeDeps.include'`。（✝️ 订正见发现 1：该告警的成因是 `debug` 声明**悬空**——不在客户端依赖图内——而非 debug 参与了入口冲突。）
- **影响**：①实验数收敛：R30 / R33 两个未启动实验被 R31-family 覆盖（未启动池 4 → 2，**R32 保留**——见下方订正）；②`failure-catalog.md` **F30 的后续实验方向**应改为「dev optimizeDeps 缺口 / 外部化 mermaid 构建」，而非继续做已收敛的独立实验（R32 除外，其前提已被证伪需重新界定）；③mermaid 触发机制已源码级厘清，可作为后续 docs mermaid 相关回归的基线；④排除噪音源：`/api/_content/query?_path=/guide` 的 404 属 Content 索引缺页，与 ESM/CJS 无关，已排除。
- ✝️ **影响订正（2026-10-30 复核）**：原文写「R30 / R32 / R33 三个未启动实验被 R31-family 一并覆盖（未启动池 4 → 1）」**作废**。修正为：在 R30–R33 这组里，**R30(dayjs) / R33（sanitize-url） 被 R31-family 覆盖，R32（debug） 未被覆盖 → 回到未启动池**（组内收敛比 4 → **2**，而非 4 → 1）。R32 启动前须重新界定单变量（原表述「debug 是 mermaid 传递依赖」已证伪；当前可证事实是主题 `optimizeDeps.include: ['debug']` 为**悬空声明**）。
- **证据**：分支 `experiment/r31-mermaid-esm-cjs` 的 verified 落档（已并入 main 的 [R31.md](./R31.md)）；日志指针 `/tmp/r31-install.log`、`/tmp/r31-buildpkgs.log`、`/tmp/r31-docsbuild.log`、`/tmp/r31-server.log`、`/tmp/r31-dev.log`；浏览器侧 chrome-devtools MCP 实测（`evaluate_script` 断言 `svg.flowchart` / `nuxtApp` / console / network）。
  - ⚠️ **证据载体缺口（2026-10-30 复核）**：上述浏览器断言**未沉淀为仓库内可回溯载体**（无截图文件、无 console/network 导出、无 evidence 归档件），只以「chrome-devtools MCP 实测」一句话留痕 → 无法由第三方独立复核「四包零入口错误」这一关键判读。**「证据日志留存指针」自检项在本实验实为半勾**（构建/服务日志有指针，浏览器侧无）。R31 后续如需再取证，须把 console / network 快照落盘到 `docs/task-artifacts/evidence/`。
- **⚠️ 编号说明（2026-10-30 重编号，用户授权）**：本条原为分支侧自带的 **#19**，与 main 侧已发布的 **#19**（F47 第二层定案）撞号 → 按与 #20 相同的**方案②**（main 侧 #19 不动）改为 **#22**；分支 `R31.md` 内 1 处「FINDINGS #19」引用同步改号。

## 23. turbo 缓存还原的三条机制事实 + 本仓构建「内容幂等、字节非幂等」——产物字节比对在本仓不是可达验收门（R39/R40）

- **发现 1（cache hit 是严格字节级还原）**：同一 node_modules 下连续两次 `pnpm build`（185s → 1s `FULL TURBO`），产物清单 **1792 个文件逐行完全相同**（`path|sha256|len` 三元组 diff = **0 行**）。⇒ turbo 的缓存还原**不是「重新构建出的等价物」，而是同一份字节**；被缓存的构建指纹（Content `buildIntegrity` 时间戳、Nuxt buildId UUID）也一并被还原，故两次的指纹相同。
- **发现 2（本仓构建「内容幂等、字节非幂等」）**：`--force` 全量重跑（165.9s）与 cache-hit 路径差 **356 行**（178 对 `_nuxt/*` 路径增删 + 15 个同路径文件内容变化）；**两次真实重跑之间也差 356 行**。差异经逐文件、逐字符归因，分两类且**内容全部等价**：
  - **构建指纹类（每次必变）**：Content `buildIntegrity = Date.now()` → 路由名 `cache.<ts>.json` / `search-<ts>` 与 `runtimeConfig`；Nuxt `buildId` UUID（`public/_nuxt/builds/latest.json`）；`nitro.json` 的 `date`；`nitro.mjs` 内资源 `mtime`。
  - **枚举顺序不确定性类（实质差异、反复出现）**：`server/chunks/build/server.mjs` 内嵌 lucide 图标集合的 **JSON key 顺序**在三次真实重跑间持续变化（`languages` → `check` → `sun`），`styles.mjs` 内 `error-404` / `error-500` 条目顺序互换。均为**同长度替换**（6335/6335、198815/198815 字节）→ 集合内容相同、仅顺序不同 → 传导为 `public/_nuxt/*.js` 的内容哈希文件名变化 → 178 对路径增删。
- **发现 3（turbo 缓存还原的三条机制事实，补既有 SOP 盲区）**：
  - **缓存落点在仓库根 `.turbo/cache`（207 个子项），不在 `node_modules` 内** ⇒ 按 `AGENTS.md` §0.5 隔离 node_modules **并不能**清空 turbo 缓存。「干净依赖环境」与「冷 turbo 缓存」是两件事。
  - **`.nuxt` 目录参与 task hash**：把 `apps/docs/.nuxt` 改名移走后，docs 的 hash 由 `5f736996212e114e` **变为** `032bab828abe7d0e` → 必然 miss。
  - **`.output` 目录不参与 hash，但缺失时阻断还原**：把 `apps/docs/.output` 改名移走后 hash **未变**，但 turbo **无法完成缓存还原** → 降级为 miss 并重新执行；而无 `.nuxt` 的三个 task（`shared-core` / `ui` / `api`）在 `dist` / `.output` 被移走后**仍能 hit 并还原产物**。
  - ⇒ **docs task 的缓存还原同时要求 `.output` 与 `.nuxt` 两个目录原位存在且内容匹配**；只缺一个即不成立。
- **发现 4（`--force` ≠ 冷构建，已实证）**：`--force` 只强制重跑 task，**不清 turbo cache、不清 tsbuildinfo**。全量重跑后紧接的 `pnpm build` 仍为 `4 cached / 138ms FULL TURBO`。⇒ 「fresh」在本仓有**两种语义**（「强制重跑」vs「冷缓存」），PR body 与验收门必须写明是哪一种。
- **发现 5（`turbo.json` 的 `outputs` 是通配，会夹带陈旧产物）**：`outputs: ["dist/**", ".nuxt/**", ".output/**", ".vercel/output/**"]` 中 `.vercel/output/**` **不是 `build` task 自身的产物**（来自 `build:vercel` = `nitro build --preset vercel`）；实测缓存条目内混有 mtime 相差约 26 天的 `.vercel/output/functions/**`（1532 个文件），而磁盘上该目录已被删除 ⇒ cache hit 会把本次构建根本不产出的陈旧 bundle 还原回工作区。
- **影响**：①**「两次构建产物必须逐字节相同」在本仓必然假红**——正确判据是「**构建指纹 + 枚举顺序归一化后内容等价**」（R42–R44 的等价判据据此设计为四合取）；②用 cache-hit 产物当验收证据会掩盖「真实重跑产物每次字节不同」这一非幂等事实（**F35「不允许只用 cache hit 作为验收证据」在本仓的具体落点**）；③任何「隔离 node_modules 即可得到干净构建环境」的表述都应补一句「**turbo 缓存需另行隔离**」；④首次建立 **Linux 计时基线**：`pnpm build:fresh` = **1m18.339s**（此前仓内所有基线均为 Windows 的 157–222s，量级差约 3 倍）——跨平台耗时对照此前一直缺基线。
- **证据**：[R39.md](./R39.md)、[R40.md](./R40.md)；本地 `%TEMP%\repro-r3940\`（build1–4.log、manifest1–4.txt）；GitHub run `41036747720`（main 的 Linux control，job `123999345078`，完整日志 `%TEMP%\r22-main-linux.log`）；隔离 tag `node_modules.stale-r3940-20261030-174020`。
- **交叉引用**：`failure-catalog.md` F35 / F42 / F43；`AGENTS.md` §0.5（node_modules 隔离 SOP，本条补其 turbo 缓存盲区）；`evidence-policy.md` §1（结论必须小于或等于证据）。

## 24. fresh resolve 的漂移面分层：直接依赖 = 0、传递依赖 = 562 项，且不改变 H3 世代结构——F09 在本拓扑下不成立（R41）

- **发现 1（漂移面必须分层看，笼统说「会漂」会误导）**：删除 lockfile 后 `pnpm install --no-frozen-lockfile`（Linux x64 / Node v22.23.4 / pnpm 10.33.0），committed → fresh 的 lockfile 差异分三层：
  - **`settings` / `overrides` / `packageExtensionsChecksum` 三段：逐字相同，差异 = 0。**
  - **`importers` 段的 specifier：逐字相同，差异 = 0** —— `nuxt@3.21.2`、`shadcn-docs-nuxt@1.1.9`、`@ztl-uwu/nuxt-content@2.13.9`、`h3@1.15.11`、`vue@3.5.30`、`vue-router@4.6.4`、`nitro@3.0.260610-beta`（**含 prerelease**）、`nuxt-og-image@5.1.9` —— **全部未漂**。
  - **`packages:` 段：562 项差异**（= 286 项同名不同版本 + 276 项包名集合增删）。
- **发现 2（直接依赖漂移面 = 0 的根因）**：本仓仅 **4 个 caret**，且**全部在根 `devDependencies`**（`@prettier/plugin-oxc ^0.2.3` / `lint-staged ^17.6.0` / `prettier ^3.9.10` / `simple-git-hooks ^2.14.0`）——**均不进入 docs / api 运行时**；运行时直接依赖全部精确 pin，且 Content 与 og-image 被 root `pnpm.overrides` 双重钉死。⇒ **F02（theme caret）/ F03（Content caret）的漂移面无法由「只删 lockfile」复现**——那需要先把 manifest 改成 caret（R03 / R04 已分别做过并 verified）。
- **发现 3（传递依赖漂移含主版本跳跃，但未改变运行时解析）**：代表性漂移 —— `@floating-ui/vue` 1.1.11 → **2.0.1（主版本跳跃）**、`@nuxt/kit` 4.5.2 → 4.6.3、`nitropack` 2.13.4 → 2.13.5、`rollup` 4.63.1 → 4.66.0、`vite` 7.3.6 → 7.3.7、`@types/node` 26.4.0 → 26.6.6、`@vue/compiler-sfc` 3.5.42 → 3.5.44、`shadcn-nuxt` 2.8.2 → 2.9.0、`reka-ui` 2.10.4 → 2.11.0。
- **发现 4（H3 世代结构与 `@nuxt/kit` 代际数量均不变 → F09 在本拓扑下不成立）**：fresh resolve 后 `probe:h3` 五个上下文 **全部与 control 一致** —— docs → `h3@1.15.11`、**Content → `h3@1.15.11`**、Nuxt → `h3@1.15.11`、Nitro 3 → `h3@2.0.1-rc.22`（仅属 apps/api，非污染）、API 裸 h3 → `h3@1.15.11`；`probe:deps` 结尾原文仍为 **`Found 2 versions of h3`**；`@nuxt/kit` 仍是 **3.21.2 / 3.21.11 / 4.6.3 三代共存**（F08 仍成立，未新增第四代）。⇒ **R41 是有效的否证实验（clean negative）**，而非「有漂移但无害」的含混结论。
- **发现 5（root overrides 与 packageExtensions 精确 key 之间存在脆弱耦合）**：`pnpm-workspace.yaml` 的两条**精确 key**（`@ztl-uwu/nuxt-content@2.13.9` / `nuxt-og-image@5.1.9`）之所以生效，靠的**正是** root `pnpm.overrides` 把这两个包钉死。**一旦 override 被解除（R05 / R03 的变量），精确 key 失配 → h3@1.15.11 不再注入 → F47 第一层复发。** 本次实测证明该耦合当前成立（fresh resolve 后 Content 仍解析到 h3 v1）。
- **发现 6（既有 workflow 只给原料、不给结论）**：`.github/workflows/fresh-resolution.yaml`（`workflow_dispatch` → 删 lockfile → `pnpm install --no-frozen-lockfile` → 采集环境/依赖树/H3 解析 → 上传 artifact，含新 `pnpm-lock.yaml`）**不做与 committed lockfile 的 diff、不 build、不冒烟**，且 `retention-days: 7`。⇒ 它是 R41 的**执行载体**，但**不能替代实验**；本条的 diff 与归因全部由 R41 自身产出。
- **发现 7（契约不校验 lockfile 内容）**：`tests/` 下 5 个测试文件**均不读 `pnpm-lock.yaml` 内容**（`ci-contract.test.mjs` 只读 workflow 文件字面）⇒ fresh resolve 出的 lockfile **不会撞红任何契约**，漂移检测**必须由实验自身产证据**。另：基线 CI 三个 job 全部 `--frozen-lockfile`，故 fresh lockfile 若被提交会与 manifest specifier 不符 → 直接 exit 1。
- **影响**：①「删 lockfile fresh resolve」在本仓是**近乎零风险**的实验（直接依赖漂移面 0），这解释了为何该 workflow 一直绿；②**风险不在漂移本身，而在漂移面的结构**：一旦把某个 caret 引入运行时依赖链、或解除 root overrides，漂移面会立刻从 0 变为非 0 —— 这两条是后续实验的**风险闸门**；③任何声称「fresh resolve 无影响」的表述都应限定为「**直接依赖层无影响**」，不得推广到传递依赖层（562 项差异）；④`nitro@3.0.260610-beta`（精确但 prerelease）实测**未漂**，本仓唯一「可能是运行时直接依赖漂移点」的候选被排除。
- **证据**：[R41.md](./R41.md)；GitHub run `41035616455`（artifact `fresh-resolution`：fresh `pnpm-lock.yaml` + `fresh-environment.json` + `fresh-dependency-tree.txt` + `fresh-h3-resolution.txt`）；对照 run `41036747720`（main Linux control）。
- **交叉引用**：`failure-catalog.md` F02 / F03 / F07 / F08 / F09；`FINDINGS.md` #19（F47 第一层）、#22（`debug` 非 mermaid 依赖 → `optimizeDeps.include: ['debug']` 为悬空声明）。

## 25. `nitro.externals.trace = false` 在 Linux 生产链上破坏产物自包含性——✝️ 订正 R21 的假阴性结论与 FINDINGS #13 的「R22 价值下降」判断（R22）

- **发现 1（阳性复现：build 全绿但产物不可用）**：在 Linux 生产构建链（GitHub Actions `ubuntu-latest`，Node v22.23.4 / pnpm 10.33.0）加入唯一变量 `nitro.externals.trace = false` 后：
  - **构建全绿**：`Tasks: 4 successful, 4 total` / `Cached: 0 cached, 4 total` / `Time: 1m14.848s` / `✨ Build complete!` / `Nuxt Nitro server built` / `Server built in 15751ms`。
  - **首个失败门 = G5 产物自包含门**：`probes/inspect-artifact-closure.ts:78` 抛 `Error: 缺少 docs standalone manifest: apps/docs/.output/server/package.json` → **exit 1**。
  - ⇒ **只看 build 退出码会 100% 漏检**——这是 F18「build 绿但 `.output` 不可运行」的又一阳性样本，且**破坏点比 R21 观察到的更早、更硬**（不只是拷贝层变小，而是 standalone manifest 直接不存在）。
- **发现 2（机制自洽：依赖被 external 化而非 inline，chunk 普遍变大）**：control vs R22 的同名 chunk 字节数对比——`search.mjs` 3.19 → **7.14 kB**（+124%）、`query.mjs` 3.44 → **6.28 kB**（+83%）、`navigation.mjs` 3.77 → **6.76 kB**（+79%）、`_...slug_--kmX6WvI.mjs` 51.9 → **56.2 kB**（+8.3%）、`storage.mjs` 45 → 46.6 kB（+3.6%）、`server/index.mjs` 62.5 kB（**0**）。⇒ 与 `nitropack/dist/rollup/index.mjs:392-397`（`if (opts.trace === false) { return { ...resolved, external: true }; }`）及 `:435-437`（`buildEnd()` 在 trace 关闭时 `return` → 跳过 NFT trace 与拷贝层）完全吻合：**依赖既没被 inline 进 bundle，也没被拷贝到 `.output/server/node_modules`** → 运行时缺包是必然的。
- ✝️ **发现 3（订正 R21 的「F26 缺包链未触发」——该结论是假阴性）**：R21 的判读只检查了「产物零裸导入」（静态 `from` / 动态 `import()` / `require` 三类扫描全空），**并未执行 `probe:closure` / `probe:artifact`**——而这两个探针需要 `.output/server/package.json`，在 `trace:false` 下**根本不存在**。⇒ R21 的「缺包链未触发」不是「`trace:false` 安全」，而是**探针根本没跑到产物清单这一步**。**通用教训：当探针依赖某个「由被测配置本身决定是否产出」的文件时，「探针提前 exit 1」与「故障未触发」是两件事，必须分开记账。**
- ✝️ **发现 4（订正 FINDINGS #13 的「R22 价值下降，建议重估优先级」）**：该判断**已被本实验推翻**。R22 有明确价值，且产出的是**阳性**信号而非 null：「`trace:false` 的收益（构建时长）在 Linux 上可忽略，代价（产物自包含性破坏）是确定的」——**收益/代价比在 Windows 与 Linux 上完全相反**。
- **发现 5（收益具有强平台依赖——这是「Windows workaround 不可复制到生产」的硬证据）**：构建耗时对照 —— control `1m18.339s` vs R22 `1m14.848s` = **仅 -3.5 秒（≈5%）**；而 R21 在 **Windows** 上报告「快 ~133s」（213s → 79.8s）。⇒ **以「Windows 上快 133s」为依据把该 workaround 推广到 CI/生产，结论完全站不住。** 这正是 R22 单变量的原始意图（「证明生产环境不能复制 Windows workaround」）首次被实证兑现。
- **发现 6（`probe:closure` 的「首个失败门」价值得到实证）**：它在产物自包含性被破坏时**立即失败并给出精确路径**，比等到运行时 500 更早、更可诊断。⇒ 本仓的 `probe:closure` 不只是「验收断言」，而是**产物形态的第一道哨兵**。
- **影响**：①**本仓 `trace:false` 的净收益为负**（Linux -3.5s 换产物自包含性确定被破坏）⇒ **不应引入基线**（与 F38 同类治理逻辑：不得用单平台证据引入跨平台风险）；②F26 的真实触发面比 R21 描述的更宽（manifest + 拷贝层**双缺**，而非「拷贝层变小」）；③R21 与 R22 的行为差异（Windows「零裸导入」vs Linux chunk 变大 124%）**在 R21 提交字节级复核前应视为「待解释」，不得写成「Windows 与 Linux 行为不同」**——`experiment/r21-windows-only-trace-false`（`d7a0113`）仅本地未推送，其实际改动的配置键路径无法字节验证（若它写的是 `nitro.trace` 顶层键而非 `nitro.externals.trace`，差异可由此完全解释，无需引入平台假设）。
- **证据**：[R22.md](./R22.md)；GitHub run `41039962323`（实验，job `124010065894`）vs run `41036747720`（main control，job `123999345078`）；本地完整 job 日志 `%TEMP%\r22-linux.log`、`%TEMP%\r22-main-linux.log`；实验分支 `experiment/r22-linux-trace-false`（`8be7e3c`，仅改 `apps/docs/nuxt.config.ts` + 新增根 `experiment.json`）；**契约红绿差分自证**：移走 `experiment.json` → `tests/baseline-safety.test.mjs` 变红（exit 1），装回 → 全量契约 15/15。
- **交叉引用**：`failure-catalog.md` F18 / F25 / F26；[FINDINGS #13](./FINDINGS.md)（R21 机制与「R22 价值下降」判断，本条已订正后者）；[R21.md](./R21.md)（本条订正其「F26 缺包链未触发」判读）；`R22.md` 的「遗留验证项」（运行时 500 尚未实测——CI 在 manifest 门已 exit 1，未走到运行时门；本机实测需等 R42–R44 完成，避免并发构建污染其内存水位测量，F43）。

## 26. 构建顺序与并发度在本仓**不产生可观测差异**（null 但属「已测出无差异」）+ 探针口径恒 0 的方法论陷阱（R42 / R43 / R44）

> 三个实验同批执行、同一 control SHA（`9b2e4ca`）、同一隔离口径、同一采样器、同一等价判据、同一冒烟探针；唯一变量 = docs / api 构建的**先后**与**是否并发**。**无代码改动 → 不开分支、不开 PR，全程 `main` 原地测量。**

- **发现 1（顺序不改变可见状态）**：R42（docs → api，峰值 3619.2 MB / 159.2s）与 R43（api → docs，3580.9 MB / 154.7s）峰值差 **-1.06%**（≤10% 判据内）；api 侧产物（`apps/api/.output`，2 文件）**三轮逐字节相同**；docs 侧产物差异**全部**可归因于已知的构建内生非确定性，**无一条可归因于顺序**。⇒ **「null 结果」须区分「未测」与「已测出无差异」**：本条是后者，且是 **L4 级**（已定位首个失败门——无失败门——与实际产物证据）。
- **发现 2（api 侧对顺序完全免疫，根因在构建图）**：`apps/api` 的构建输入只有 `@repro/shared-core`，**docs 的产物不进入其输入图**；且 `docs#build` 与 `api#build` 之间**无任何依赖边**（turbo 依赖图实证）⇒ 顺序在拓扑上就不构成变量。⇒ **这是可复用的判据：先看构建图有没有依赖边，再决定「顺序」是否值得作为实验变量。**
- **发现 3（并行无收益、也无资源竞争——根因是拓扑而非调度）**：R44 `r44c` 并行确实发生（`OVERLAP 18:29:57.851 nitro=2 nuxt=2 total=4`，最大并发本仓 node 进程数 4）；但**并行总墙钟 159.5s vs 串行 161.1s / 156.6s（未变快）**、**峰值 WS 3619.7 MB 未叠加**、**重叠期最大同时 WS 仅 418.6 MB**。根因：api 构建 `Server built in 51ms`、产物 62116 B、耗时 ~2s，与 docs 的 ~155s **几乎无重叠窗口**。⇒ **F43 担心的「资源竞争与缓存写入干扰」在本拓扑下未发生**（null 结果）。⚠️ **结论不可外推**：一旦 api 侧体量显著上升，内存叠加与墙钟收益必须**重测**。
- **发现 4（方法论：计数恒 0 时先怀疑判据、再下结论）**：题面采样器的 `repoCount` 判据为 `Get-Process node | Where-Object { $_.Path -like '*shadcn-docs-nuxt-production-repro*' }`——`.Path` 是**可执行文件路径**（`node.exe`），**不含命令行**；本机 node 装在**仓库之外**（`D:\store\nvm-desktop\22.23.1\node.exe`、`C:\Users\pc\.nvmd\bin\node.exe`）⇒ **该计数恒为 0（三轮全 0）**。**这正是 R44 首轮「并行确实发生」证据缺失的直接原因**——沿用该判据会把「没采到证据」误读成「没发生」。补救：改用 `Get-CimInstance Win32_Process` + `.CommandLine` 口径（CIM 版立刻给出 `cim_repoNodeCount=2`）+ 200ms 粒度进程追踪（给出 `nitro` 与 `nuxt` 同刻并存的 `OVERLAP` 行）。⇒ **通用纪律：探针输出恒 0 / 恒同值时，先证伪判据，再下现象结论**（与「断言前先怀疑解码」同源）。
- **发现 5（字面「产物字节相同」在 docs 侧**结构上不可达**，是 FINDINGS #23 的机理级深化）**：161 个 `public/_nuxt/<contentHash>.js` 的**文件名本身由构建指纹派生**，且 chunk 内部**互相引用兄弟 chunk 名** → 指纹一变，文件名与内容**同时**变（级联）。故判据 1（原始路径集合）与判据 2（排除 volatile 后严格字节哈希）在 docs 侧**必然 FAIL**，不是「volatile 列表不全」。⇒ 本轮改用**分层判据**（原始 / 文件名 hash 归一 / 指纹归一 / 指纹+chunk 名归一多重集 / 字符多重集置换检验），并**如实同时标注「字面合取 FAIL」与「内容等价 PASS」**。残差收敛到**恒定 6 个文件**、三轮签名完全一致：`styles.mjs`(+map)、`client.precomputed.mjs`(+map)、`server.mjs`（lucide 图标集合 JSON key 序）、1 个携带指纹的 client chunk（图标 key 序 + 压缩器局部标识符命名）——5 个同名文件**长度相等 + 字符多重集相等**（`styles.mjs` 逐行排序后亦相等）→ **纯置换**。
- **发现 6（枚举顺序不确定性是跨构建的稳定残差源，已可作为「预期差异」基线）**：与 #23 的两次重跑一致，本轮把该类差异从「fresh vs cache-hit」扩展到「顺序 vs 顺序」「串行 vs 并行」——**三个配对（R42↔R43 / R42↔R44 / R43↔R44）的残差签名完全一致** ⇒ 该差异**与顺序/并发无关**，是构建内生行为。**可作为后续任何「产物比对」实验的噪声底噪清单。**
- **发现 7（正面证据：内容等价有可断言的支撑）**：prerendered HTML 归一化后 `equal=true`（长度同为 106441，7 个 `<style>` 块与 4 个 `<script>` 块长度逐块相同，CSS 声明集合 393 = 393 且零差集）；HTML **类名使用计数逐类相同**（`rotate-` 48 / `pan-` 8 / `backdrop-blur` 28 / `ring-` 384 / `transform` 48 / `scale-` 136 / `blur-` 16）；docs 归一化路由表 **18 条三轮完全一致**，api **3 条一致**。
- **发现 8（隔离目录未被 Tailwind v4 自动源扫描——一次误判的证伪）**：中途曾怀疑「`.output.stale-*` 未被 gitignore → Tailwind 会把上一轮产物扫进 CSS」。**实测证伪**：`.git/info/exclude` 已登记 `apps/docs/.output.stale-*`，Tailwind 遵守之——证据是 R42/R43 两轮 HTML 类名使用计数**完全相同**、内联 CSS 归一化后**逐字相同**，且旧产物（O0）多出的 `skew-*` / `pinch-*` **未**出现在两轮新产物中。⇒ **三轮数据无需重测**。
- **发现 9（`r44b` 是 F36 孤儿进程的真实样本）**：并发采集脚本只 `WaitForExit()` 了 api 进程就记录 `parallel_wall_s=1.8`（docs 当时**尚未完成** → 1.8s 是被 api 提前结束打断的**假墙钟**），并把 docs 构建留成**后台孤儿进程**。处置：整轮判废，由 `r44c` 取代；以**轮询等待该孤儿进程自然结束**（18:26:30→18:29:13）后才启动下一轮，**未无差别杀 node**。⇒ **通用纪律：并发采集脚本必须等待全部子进程，墙钟必须在所有子进程结束后再落笔。**
- **发现 10（一次产物快照配对错误，已定位改正）**：分析阶段曾把 R42 的产物目录误配为 `.output.stale-r42`（实为**开工前的旧产物 O0**）→ 与 R43 比对出现 12 个残差并误导出「CSS 实质差异」结论。改正后残差降为 6，且与另两个配对**签名一致**。⇒ **纪律：产物快照必须带轮次指纹（`buildIntegrity` / `buildId` / `nitro.json date`）做配对校验，不能靠目录名顺序推断。**
- **影响**：①**本仓的「构建顺序 / 并发度」维度已实测收敛**，后续不必再以该维度开实验（除非 api 侧体量变化）；②**产物等价判据应固定为分层口径**，「字节相同」在本仓 docs 侧是**伪门**；③**F43 的资源竞争担忧在本拓扑下不成立**，但结论绑定「api 极小」这一前提；④**探针口径自证必须进 SOP**——本次差点把「判据失效」写成「现象不存在」。
- **证据**：[R42.md](./R42.md)、[R43.md](./R43.md)、[R44.md](./R44.md)、[evidence/2026-10-30-r42-r44-build-order-parallel.md](../../evidence/2026-10-30-r42-r44-build-order-parallel.md)；本地 `%TEMP%\r4244\`（`r42/r43/r44*-mem.log`、`r42/r43/r44*-cim.log`、`r44c-race.log`（并发原文）、`snap-r42/43/44.json`、构建与冒烟日志全套）。
- **交叉引用**：`failure-catalog.md` F35 / F42 / F43 / F36；[FINDINGS #23](./FINDINGS.md)（本条是其机理级深化：残差签名、字面合取不可达、噪声底噪清单）；[FINDINGS #24](./FINDINGS.md)（R41，H3 世代结构不变）；`AGENTS.md` §0.5.7（隔离命名与 `.gitignore` 覆盖坑，本条的隔离物命名直接受其约束）；`probes/`（`collect-environment.ts` **无任何内存采样**——原记忆有误，采样靠临时脚本）。
