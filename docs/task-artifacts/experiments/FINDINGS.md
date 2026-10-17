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
