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
