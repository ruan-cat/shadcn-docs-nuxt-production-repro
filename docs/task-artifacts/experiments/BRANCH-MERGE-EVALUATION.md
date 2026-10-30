# 分支合并评价台账（Experiment Branch Merge Evaluation）

> **定位**：`experiment/*` 分支 = 单变量实验现场。每个分支代表一次针对特定故障（F01–F47）的复现、排除或机理验证，是**不可再生的实践经验**。本台账登记每个分支的「试验情况」与「合并到 main 的评价」，并给出**评估状态**。
>
> **纪律**：**评价 ≠ 合并**。本台账只产出结论与前置条件；任何实际合并 / 推送 / 关闭 PR 均需另行授权。
>
> **最近更新**：2026-10-30（首次建账，覆盖全部 26 个本地 `experiment/*` 分支）

---

## 1. 判定口径

### 1.1 评估状态

| 状态        | 含义                                                                      |
| ----------- | ------------------------------------------------------------------------- |
| 🟢 可合并   | 合并即带来正确行为；无契约违约、无基线污染                                |
| 🟡 条件合并 | 有价值，但有前置条件（剥离危险键 / 仅合档案 / 需人工确认 / 需跨平台复核） |
| 🔴 不可合并 | 合并会引入故障、污染基线，或使工具链整体不可用                            |
| ⚪ 已终结   | PR 已 MERGED / CLOSED，无需再评估                                         |
| ⏸️ 证据不足 | 尚未执行或结论待补                                                        |

### 1.2 三条防自欺纪律

1. **一律用 merge-base 口径看分支**：
   `git diff $(git merge-base main <branch>) <branch>`
   `git diff main <branch>` 会把 main 后续新增的数百个文件算成「分支删了 3000 行」——本仓 18 个老分支里 14 个会出现这种假象，据此判断必然误判。
2. **档案与代码分开评**：本仓实验分支的变更普遍是「docs 档案（零运行时风险）」与「配置 / 锁文件（高风险）」混合，合并评价必须拆开看，不能整体一票否决。
3. **build success ≠ 通过**：验收必须做 runtime 响应体**内容断言**（F18 / F47 的 200 假阳性）。

### 1.3 历史先例（合并决策的基线事实）

本仓自 2026-08-28 起 **没有任何一个实验分支被 merge 进 main**：

| PR 类别                 | 编号                                                                                             | 处置            |
| ----------------------- | ------------------------------------------------------------------------------------------------ | --------------- |
| 实验类 PR               | #4 #6 #7 #8 #9 #11 #12 #15 #16 #19 #21 #23 #25 #26 #27                                           | 一律 **CLOSED** |
| 机制 / 契约 / 探针类 PR | #1 init、#2 lockfile 通道、#3 #5 #10 #17 契约、#13 #14 UI 控制组、#18 #20 探针、#22 #24 审计槽位 | **MERGED**      |

→ **「实验分支不合入 main」是本仓既定实践，不是遗漏。** 实验的价值通过「档案 + evidence + FINDINGS」沉淀，不通过代码合并沉淀。本台账的作用是把「这份实践经验值不值得合」这件事说清楚，供未来统一决策，而不是推动合并。

---

## 2. 分支合并评价总表

> 「引入变更」列为 merge-base 口径；`docs` 指 `docs/**` 与 `evidence/**`。

| 分支                             | 实验        | 单变量                                          | 结论                                              | 代表故障   | 引入变更                                                        | 合并评价                                               | 状态 |
| -------------------------------- | ----------- | ----------------------------------------------- | ------------------------------------------------- | ---------- | --------------------------------------------------------------- | ------------------------------------------------------ | ---- |
| `r01-remove-nitro3-sibling`      | R01         | 移除 apps/api sibling（docs-only 反向 control） | ✅ clean 可信完成（对照成立）                     | 拓扑对照   | `pnpm-lock.yaml`、`pnpm-workspace.yaml`                         | 不合并：反向 control，合并即让 api job 预期红          | 🔴   |
| `r02-remove-docs-direct-h3`      | R02         | 删 docs 显式 h3@1.15.11                         | ✅ 故障复现（Invalid URL → 500）                  | H3 串味    | `apps/docs/package.json`、`experiment.json`、lockfile           | 不合并：合并即引入故障                                 | 🔴   |
| `r03-content-caret-drift`        | R03         | Content `^2.13.9`（解除 root override）         | ✅ 故障复现                                       | caret 漂移 | `package.json`、`apps/docs/package.json`、lockfile              | 不合并：合并即引入故障                                 | 🔴   |
| `r04-theme-caret-drift`          | R04         | theme `^1.1.9`                                  | ✅ 故障复现                                       | theme 漂移 | `apps/docs/package.json`、lockfile                              | 不合并：合并即引入故障                                 | 🔴   |
| `r05-remove-og-image-override`   | R05         | 移除 og-image override                          | ✅ 绿对照                                         | —          | `package.json`、lockfile                                        | 不合并：对照实验，合并收益为零                         | 🔴   |
| `r06-pin-og-image-5-1-13`        | R06         | 显式升级 nuxt-og-image 到 5.1.13                | ✅ 干净阴性（2026-10-29 重测 verified）           | 证明非根因 | `package.json`、lockfile                                        | 不合并：结论为「非根因」                               | 🔴   |
| `r07-remove-shared-core-edges`   | R07         | 移除 shared-core 双向消费                       | ✅ 干净阴性（重测 verified）                      | 证明非根因 | `apps/api/package.json`、api routes ×2、`packages/ui`、lockfile | 不合并                                                 | 🔴   |
| `r08-remove-workspace-ui-edge`   | R08         | 移除 docs 对 workspace UI 的消费边              | ✅ 干净阴性（重测 verified）                      | 证明非根因 | `WorkspaceRuntimeProbe.vue`、`apps/docs/package.json`、lockfile | 不合并                                                 | 🔴   |
| `r10-ui-source-alias`            | R10         | UI 改 source alias                              | ✅ 干净阴性（重测 verified）                      | 证明非根因 | `ci.yaml`、`nuxt.config.ts`、`probes/`                          | 不合并                                                 | 🔴   |
| `r12-blanket-ssr-noexternal`     | R12         | blanket `ssr.noExternal`                        | ✅ 干净阴性（重测 verified）                      | 证明非根因 | `nuxt.config.ts`、`tests/` ×2                                   | 不合并 + blanket 违反基线纪律                          | 🔴   |
| `r13-precise-nitro-inline`       | R13         | 精确 `nitro.externals.inline`                   | ✅ clean 可信完成（排除性证据）                   | —          | `nuxt.config.ts`、`experiment.json`                             | 不合并：结论是「排除」                                 | 🔴   |
| `r14-blanket-nitro-inline`       | R14         | blanket Nitro inline                            | ✅ verified（默认 heap `exit 134` OOM，8 GiB 绿） | F15        | `nuxt.config.ts`、`experiment.json`                             | 不合并 + blanket 违规 + 放大内存越过 4 GiB             | 🔴   |
| `r15-element-plus-external`      | R15         | 精确 externalize Element Plus                   | ✅ **真阳性：真实复现 F17**                       | **F17**    | `nuxt.config.ts`、`experiments/control.json`、`tests/`          | 不合并：F17 的引入源，合并即引入故障                   | 🔴   |
| `r16-direct-popper-alias`        | R16         | docs 直加 Popper npm alias                      | ✅ 干净阴性 + F17 机理对照                        | F17 机理   | `nuxt.config.ts`、`apps/docs/package.json`、lockfile            | **条件合并**：见 §3.5                                  | 🟡   |
| `r17-nitro-trace-alias`          | R17         | Nitro `traceAlias`                              | ✅ 干净阴性 + F17 机理对照                        | F17 机理   | `nuxt.config.ts`、`tests/`、`control.json`                      | **条件合并**：见 §3.5                                  | 🟡   |
| `r18-targeted-public-hoist`      | R18（旧）   | targeted public hoist                           | ❌ insufficient（前提被证伪）                     | F18 / F20  | `nuxt.config.ts`、`pnpm-workspace.yaml`、lockfile               | 不合并：前提证伪 + 带契约危险键                        | 🔴   |
| `r19-node-linker-hoisted`        | R19（旧）   | `nodeLinker: hoisted`                           | ❌ 前提被推翻（致不可构建）                       | F20        | `nuxt.config.ts`、`pnpm-workspace.yaml`、lockfile               | 不合并：使 workspace 整体不可构建                      | 🔴   |
| `r18-retry-public-hoist`         | R18（重测） | `publicHoistPattern:` camelCase 字面量          | ✅ verified（契约预期判违 + 治理盲区）            | F18 / F47  | `pnpm-workspace.yaml`                                           | 代码 🔴 / 档案 🟢，见 §4                               | 🟡   |
| `r19-retry-node-linker-hoisted`  | R19（重测） | `nodeLinker: hoisted`                           | ✅ verified（不可构建，F20 实锤）                 | F20        | `pnpm-workspace.yaml`                                           | 代码 🔴 / 档案 🟢，见 §4                               | 🟡   |
| `r21-windows-only-trace-false`   | R21         | Windows-only `trace:false`                      | ✅ 机制测量（build 快 ~133s，F26 未触发）         | F26        | `nuxt.config.ts`、`experiment.json`                             | 条件合并：仅 Windows 有效，跨平台风险高，须 Linux 复核 | 🟡   |
| `r27-prerender-crawllinks-false` | R27         | `crawlLinks:false`                              | ✅ 部分破坏（Prerendered 9）                      | F27        | `nuxt.config.ts`、`experiment.json`                             | 不合并：破坏 prerender                                 | 🔴   |
| `r28-prerender-routes-clear`     | R28         | `routes.clear()`                                | ✅ 部分命中（Prerendered 5）                      | F27        | `nuxt.config.ts`、`experiment.json`                             | 不合并                                                 | 🔴   |
| `r29-prerender-both`             | R29         | `crawlLinks:false` + `routes.clear()`           | ✅ 完整触发（Prerendered 0）                      | F27        | `nuxt.config.ts`、`experiment.json`                             | 不合并                                                 | 🔴   |
| `r31-mermaid-esm-cjs`            | R31-family  | mermaid 触发（覆盖 R30/R32/R33）                | ✅ verified（clean negative，F30 未复现）         | F30        | `1.baseline.md` + 4 份档案                                      | **档案 🟢 可合并**（占位 → 终版），见 §3.1             | 🟢   |
| `integrate-r18-r19`              | 预备集成    | R18/R19 档案 + FINDINGS #19 + QUEUE             | ✅ 已验证（契约 12/12、零污染）                   | —          | 4 个 docs 文件                                                  | **🟢 可合并**（待授权），见 §3.6                       | 🟢   |

> 无分支的实验（main 原地测量 / 未启动）：R09（PR #14 已 MERGED）、R11（前置阻塞）、R20 / R23 / R24 / R25 / R26（main 原地测量，结论已在 FINDINGS #14–#16）、R22 与 R34–R45（未启动，详见 QUEUE 表 4）。

---

## 3. 分类评价

### 3.1 🟢 可合并（高价值、零运行时风险）：档案终版升级

**关键事实**：main 现存的 `R18.md` / `R19.md` / `R30.md`–`R33.md` 均为**占位版**（状态分别写「⏳待重测」「🆕未启动」），**verified 终版在分支上**。

| 分支                            | 合并内容                                                | 前置条件                                                                        |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `r18-retry-public-hoist`        | `R18.md` → verified 终版（含 FINDINGS #19 交叉引用）    | 只取档案，**不得**带入 `pnpm-workspace.yaml`                                    |
| `r19-retry-node-linker-hoisted` | `R19.md` → verified 终版 + `FINDINGS.md` #19            | 同上                                                                            |
| `r31-mermaid-esm-cjs`           | `R30.md`–`R33.md` → R31-family 收敛终版 + `FINDINGS.md` | `1.baseline.md` 的 mermaid 触发块属**复现用**，合并前需确认是否要留在正式内容里 |
| `integrate-r18-r19`             | R18/R19 档案 + FINDINGS #19 + QUEUE 迁移，**已验证**    | 契约 12/12 + 基线零污染已复验                                                   |

合并性质 = 文档替换，**零运行时风险**，且直接消除 main 的过期占位结论。**这是未来统一合并时优先级最高的一档。**

### 3.2 🔴 不可合并：故障复现型（R02 / R03 / R04 / R15）

这些分支的唯一价值是「让故障在 CI 里稳定复现」。合并进 main = 把故障写进基线。**任何情况下不得合并**，其证据已由 `evidence/**` 与 `Rxx.md` 承载。

### 3.3 🔴 不可合并：阴性对照型（R05 / R06 / R07 / R08 / R10 / R12 / R13 / R31-family）

结论是「**该变量不是根因**」。合并它们对基线行为零增益，却会引入 lockfile 漂移、拓扑变更或 blanket 配置（后者还违反基线纪律）。**价值在档案，不在代码。**

### 3.4 🔴 不可合并：危险配置型（R14 / R18 / R19）

| 分支                       | 危险点                                           | 后果                                                                    |
| -------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `r14-blanket-nitro-inline` | blanket Nitro inline                             | 默认 heap 下 `exit 134` OOM（F15），且属基线纪律明令禁止的 blanket 手法 |
| `r18-*`                    | `pnpm-workspace.yaml` 写入 `publicHoistPattern`  | 契约测试 `baseline-safety` 直接判违（子串匹配）                         |
| `r19-*`                    | `pnpm-workspace.yaml` 写入 `nodeLinker: hoisted` | 同上判违；且实测使 workspace **整体不可构建**                           |

> R18 的治理盲区（已沉淀于 FINDINGS #19 发现 4）：pnpm 10.33.0 对 camelCase `publicHoistPattern` **零警告静默容忍**，检测完全依赖契约测试字面子串；若未来有人改用合法 kebab `public-hoist-pattern`，契约将**漏检**。这属于**契约测试自身**的待改进项，与分支是否合并无关。

### 3.5 🟡 条件合并：F17 的机理与「修复」路径（R15 / R16 / R17）——关键辨析

**这一组最容易被误读，必须写清楚。**

**关键事实**：main 基线的 `apps/docs/nuxt.config.ts` 中 `element-plus` / `popper` / `external` / `traceAlias` **零命中**。F17（Element Plus 的 npm alias 在 Nitro standalone 产物中丢失逻辑包名）由 R15 引入的 `vite.ssr.external = ["element-plus"]` 触发——**基线本身不复现 F17**。

因此：

- **R15**：F17 的引入源 → 🔴 不可合并。
- **R16 / R17**：在 R15 基础上不再复现 F17，**修的是一个基线并不存在的病**。合并它们 = 给基线加无证据驱动的 workaround（违反基线纪律）。→ 默认 **不合并**。
- 但 R16 / R17 是**机理证据**：它们锁定了「externalize Element Plus → 破坏 alias runtime closure」这条因果链，是 F17 的权威解释。这份价值已经沉淀在 `R16.md` / `R17.md` + `evidence/**` + `FINDINGS #19`，**不需要靠代码合并来承载**。

**未来若确需合并，触发条件与前置条件**（三者同时满足才动）：

1. 基线将来**主动引入** `element-plus` externalize（即 F17 真实成为基线故障）；
2. 在该基线上重跑 R16 或 R17 二选一，并做 runtime 响应体断言 + `pnpm test:contracts` 全绿；
3. 只取 `nuxt.config.ts` 的最小配置变更，**不带** lockfile 漂移。

### 3.6 ⚪ 已终结 / 🟢 预备就绪

- **⚪ 已终结**：所有 CLOSED 的实验 PR（见 §1.3）——其分支保留作证据，不再评估合并。
- **🟢 预备就绪**：`experiment/integrate-r18-r19`（`155063d`，2026-10-30）——已把 R18/R19 档案 + FINDINGS #19 + QUEUE 迁移整理成**只含 docs、不含任何实验变量**的可合并提交，并复验：契约 12/12、`pnpm-workspace.yaml` 零污染、diff 纯 docs、node_modules 健康（`.pnpm` 1209 / `nuxt.mjs` ✓ / `tsc` ✓）。

---

## 4. R18 / R19 专章（本次决策的事实依据）

| 项             | R18（`r18-retry-public-hoist`）                                             | R19（`r19-retry-node-linker-hoisted`）                                              |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 单变量         | `pnpm-workspace.yaml` 末尾追加 `publicHoistPattern:` + `- "@popperjs/core"` | `pnpm-workspace.yaml` 末尾追加 `nodeLinker: hoisted`                                |
| 基线 SHA       | `4b5ff91e`（2026-10-29）                                                    | `4b5ff91e`（2026-10-29）                                                            |
| install        | exit 0 / 8s（lockfile 未变，pnpm 零警告）                                   | **exit 1 / 21s**（warm store 1200 包全 reused）                                     |
| build:packages | exit 0 / 5s                                                                 | **exit 1 / 2s**（`typescript/bin/tsc` 缺失）                                        |
| docs build     | exit 0 / 181s / 峰值 3559 MB                                                | **exit 1 / 2s**（`prebuild: nuxt prepare` 失败）                                    |
| 契约           | 预期判违（`publicHoistPattern` 未声明）                                     | 预期判违（`nodeLinker: hoisted` 未声明）                                            |
| 运行时         | content 端点 200 + 404shell（F47 基线签名，印证 F18）                       | 无产物，冒烟不可执行                                                                |
| 结论           | ✅ verified：治理键检测全靠契约字面子串；pnpm 侧零校验信号                  | ✅ verified：hoisted 破坏 `.bin` shim 相对解析 → workspace **不可构建**（F20 实锤） |

### 4.1 为什么不合并到 main（三条独立理由，任一成立即足够）

1. **代码侧不可合并**：两者唯一配置变更都落在 `pnpm-workspace.yaml` 的契约禁止键上，合并即判违。
2. **锁文件侧无物可合**：merge-base 口径下两个分支 **`pnpm-lock.yaml` 零变更**（`git diff 4b5ff91e <branch> -- pnpm-lock.yaml` 为空）——**不存在可合并的依赖锁文件**，该风险点自动消解。
3. **档案侧已由 §3.1 单列**：终版档案的合并是独立的、零风险的文档升级，与配置变更解耦后另行评估。

### 4.2 若未来确要合并 R18/R19 的正确做法

```text
1. git checkout main
2. git checkout <branch> -- docs/task-artifacts/experiments/R18.md   # 只取档案
   git checkout <branch> -- docs/task-artifacts/experiments/R19.md
   git checkout <branch> -- docs/task-artifacts/experiments/FINDINGS.md
3. # 严禁带入 pnpm-workspace.yaml / pnpm-lock.yaml / nuxt.config.ts
4. 手工合并 QUEUE.md（表 1 插入 R18/R19 行、表 2 移除对应行、排期 note 同步）
5. pnpm test:contracts                     # 期望 12/12
6. git grep -n -E 'nodeLinker: hoisted|publicHoistPattern' -- pnpm-workspace.yaml apps packages
                                               # 期望零命中
7. 核对 FINDINGS 编号 1–N 连续、无重号
```

（`experiment/integrate-r18-r19` 已完整跑完上述步骤并复验通过，可直接作为参考实现。）

---

## 5. 遗留 PR 处置记录

| PR  | 标题                                               | base                                   | 状态                            | 处置                                                       |
| --- | -------------------------------------------------- | -------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| #27 | 🧪 test: R19 全局 hoisted node linker 对照         | `experiment/r15-element-plus-external` | OPEN → **CLOSED（2026-10-30）** | 更新 PR 稿说明实验已完成 + 前提被证伪 + 不予合并，随后关闭 |
| #26 | 🧪 test: R18 targeted public hoist Popper 逻辑包名 | `experiment/r15-element-plus-external` | 已 CLOSED（2026-08-28）         | 本次补维护说明（实验已重测终版、结论与合并评价）           |

### 5.1 PR #27 是否过期：**是**

三条独立依据：

1. **时效**：创建于 2026-08-28，至今 2 个月，`updatedAt == createdAt`，0 条评论、0 次维护。
2. **目标**：base 指向 `experiment/r15-element-plus-external`（链式 PR），从设计起就**不以合并进 main 为目标**；其 body 原文亦写明「本 PR 只作为全局拓扑 workaround 对照，不作为默认建议修复」。
3. **前提被证伪**：PR body 提出的 A / B 两种假设（hoisted 只改可见性 / 改 Nitro tracing）已被 2026-10-29 的 SOP 干净重测**同时否定**——实际发生的是第三种：**hoisted 使整个 workspace 不可构建**（install / build:packages / docs build 全 exit 1）。PR body 里「hoisted 全量重装 12m+」的前提也被证明是**冷 store 假象**（warm store 实测 21s）。故 PR 已无评估价值，只剩历史意义。

### 5.2 两个原始实验是否解决了特定问题：**都没有**

| 实验                         | 是否解决问题 | 依据                                                                                                                           |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| R18（targeted public hoist） | ❌ 未解决    | 实验结论本身即「insufficient」——targeted hoist 不足以修复 F17；重测进一步发现该 camelCase 键 pnpm 零警告、治理全靠契约字面子串 |
| R19（`nodeLinker: hoisted`） | ❌ 未解决    | 结论从「重装慢」翻转为「工具链整体断裂」，比原假设更严重，仍非任何问题的解决方案                                               |

→ 两者均为**排除性 / 反证性**实验，不产出修复。据此：**不予合并 pnpm 依赖锁文件**（实测本无锁文件变更）、**不做代码 merge 到 main**；其实践价值通过 `R18.md` / `R19.md` / `FINDINGS #19` 沉淀。

---

## 6. 未来统一合并时的操作清单

- [ ] 用 **merge-base 口径**复核分支真实引入内容（禁止用 `git diff main <branch>`）
- [ ] **档案与代码分离**：档案类可批量合并；配置 / 锁文件类逐条评估
- [ ] 剥离 `pnpm-workspace.yaml` 的 `nodeLinker: hoisted` / `publicHoistPattern`
- [ ] 剥离 blanket 类配置（`ssr.noExternal` / Nitro inline）与 `routes.clear()` / `crawlLinks:false`
- [ ] 锁文件默认**不合并**；仅当分支属真实修复型且已复验 runtime 时才单独评估
- [ ] `pnpm test:contracts` 全绿（期望 12/12）
- [ ] **runtime 响应体内容断言**（Content cache / search 命中），不得只看 HTTP 200（F18 / F47 假阳性）
- [ ] `git grep` 复扫基线污染键
- [ ] FINDINGS 编号连续、无重号；QUEUE 与 FINDINGS 交叉引用一字不差
- [ ] 合并后 `git checkout main` 并重跑 `pnpm install --frozen-lockfile`，复验 `.pnpm` 数量 ≈ 1210、`nuxt.mjs` / `tsc` 存在

---

## 7. 维护规则

- 每次实验落档后**同一批提交内**同步本台账（分支行 + 评估状态 + §2 总表）。
- 分支 tip 提交变化时更新「最近更新」与总表结论。
- **QUEUE.md 表 4 的「未启动」计数必须与本台账 §2 对账**——2026-10-30 建账时即发现 R30–R33 已在 `r31-mermaid-esm-cjs` 分支收敛落档（verified），而 main 的 QUEUE 仍列为「未启动」，已同步修正。
