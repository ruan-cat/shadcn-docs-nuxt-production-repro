# 交接文档：AI Agent 会话接力入口

> **用途**：下一个 AI agent 启动独立会话时**先读本文件**——它只负责「现在什么状态、去哪读、还剩什么」；事实源是 `docs/task-artifacts/` 台账 + `evidence/` + memorix。
> **2026-10-31 深度重写**：原「起步纪律摘录」「memorix 命令大清单」等重复内容已收敛——纪律以 `AGENTS.md`（强制）+ `.agents/skills/experiment-ledger-sop/SKILL.md`（实验全流程门禁）为准，本文件不再摘录。

---

## 0. 30 秒上手（复制即用）

```powershell
cd D:\code\ruan-cat\shadcn-docs-nuxt-production-repro
memorix context "continue legacy items R51 two-axis" --task-id bc1b3527-3223-4f6e-bd46-b493fa6191c1 --refresh never
memorix resume "continue R51 two-axis unstorage F48" --refresh never
```

- ⚠️ **`--refresh never` 必须带**：默认 `--refresh auto` 触发 codegraph 扫描 → Node 堆 OOM exit 134（`NODE_OPTIONS` 无效）。
- ⚠️ **检索用 ASCII / 技术词**：本机 `MEMORIX_EMBEDDING=off` ⇒ BM25 对纯中文查询 0 命中；文档内检索用 rg/grep。
- ⚠️ **交接工件与查询串不要嵌套英文双引号**（PowerShell 会吃掉内层引号——obs 6133 因此作废）。

---

## 1. memorix 坐标

| 用途             | 类型                | ID / 句柄                                      | 说明                                      |
| ---------------- | ------------------- | ---------------------------------------------- | ----------------------------------------- |
| **交接广播**     | `what-changed`      | `obs:6141`                                     | **下一个 agent 的第一读**（阶段交接摘要） |
| 阶段纪要         | `what-changed`      | `obs:6140`                                     | 2026-10-31 全会话弧线 + git 状态 + 开放项 |
| 四指令批次       | `what-changed`      | `obs:6139`                                     | 分支推送 / 三平台观察 / F48 / SOP 技能    |
| 项目总盘点       | `what-changed`      | `obs:6138`                                     | 未验证清单 + 未落档补录                   |
| 分支审计         | `what-changed`      | `obs:6137`                                     | 30 分支现场 vs 档案全量核对               |
| 遗留批次广播     | `what-changed`      | `obs:6136`                                     | R21 复核 + R48/R49/R50 批次               |
| 批次全结论       | `what-changed`      | `obs:6135`                                     | R48/R49/R50 + R21 复核完整数据            |
| 阶段收口（前日） | `what-changed`      | `obs:6130`                                     | C 类池清口（2026-10-30）                  |
| 遗留项台账       | `continuity ledger` | `bc1b3527-3223-4f6e-bd46-b493fa6191c1`（open） | 「还剩什么、已定了什么」的权威滚动记录    |
| 本次会话         | `session`           | `sess-mvvu7zai-451n75`                         | 2026-10-31 全天                           |
| 旧交接工件       | `what-changed`      | `obs:6133`（archived）                         | 引号转义破坏，作废                        |

---

## 2. 当前状态（截至 2026-10-31 会话收口）

### 2.1 会话弧线（2026-10-31，sess-mvvu7zai-451n75）

1. **R21 `d7a0113` 字节级复核通过**（遗留项 #1 闭合）——唯一语义变更 = `trace:false`，其余 74 行缩进规范化。
2. **R46 三规避方向全部实证**（遗留项 #2 闭合，[FINDINGS #33](experiments/FINDINGS.md)）：**R48** 钉 `unstorage` 1.17.5 ✅ 全保真 / **R49** content 2.14.1 ❌ 同签名 500（R45「构建全绿」归因收窄到 Nuxt 4 renderer 模板）/ **R50** `payloadExtraction:false` ✅ 调用点消除。分支 `experiment/r48-*`（`5e458e1`）/ `r49-*`（`89c1534`）/ `r50-*`（`dac335d`）/ `r46-*`（`b1e0bb8`）**均已推送备份**。
3. **三轮审计落地**：台账落地回查（BRANCH-MERGE 七分支登记 + evidence 索引 + QUEUE DoD 第 5/6 条）；分支现场 vs 档案全量核对（30 分支、6 处 provenance 缺口补齐、零结论被推翻）；项目总盘点（obs 6121 补录、status-matrix 七行订正、四处假设级 claim 显式标注）。
4. **F48 立号**：[failure-catalog](../failure-catalog.md) F48 = unstorage 1.17.6 key 校验 × content v2 `"/"` key 冲突（本仓已复现，R46 阳性）；11 处引用回改；F45 保留「升级纪律」语义。
5. **SOP 技能落地**：`.agents/skills/experiment-ledger-sop/SKILL.md`（实验全流程门禁：开工 / 验收 / 落档九项 / 平台矩阵 / 收口 / 编辑纪律），AGENTS.md 技能表强制第一项。
6. **R51 轴 A（renderer 模板轴）取证完成**（[FINDINGS #34](experiments/FINDINGS.md)）：双臂对比（main fresh build + `experiment/nuxt4-generation-migration` 现场复建）——**键形态子机理实锤**（N3 生成 renderer `:390` 三元键 `"/"` 抛 1.17.6 校验 vs N4 `getPayloadCacheKey` → `"/.json"` 通过）+ **包裹子机理否定**（两侧裸 await）+ payloadCache 实例链闭合（nitropack@2.13.5 → unstorage 1.17.6）；#33 发现 2 升级为代码级正向实锤、#32 发现 5 订正（R45 内容库空与 1.17.6 无关）；**上游 issue 证据链零推断环节**。

### 2.2 git 与验证基线

- `origin/main` = **`dfa1bb2`**；本地未推送批次 = `e683a2d`（总盘点）→ `acfca83`（F48+SOP）→ `f75d787`（复核收口）→ `ee0f51a`（本文件深度重写）→ R51 轴 A 落档提交（本文件同批更新），**随下一里程碑 push**（push 触发双 Project 生产部署 + CI）。
- 本会话 main 提交的 trailer 约定：**`Assisted-by: ZCode / GLM-5.3-Flash`，无 Co-authored-by**（ZCode/GLM 不在 git-commit 技能 allowlist，禁止冒名）。
- 生产内容断言（两轮同量）：docs 首页「生产级复现实验室」×7 / 107519 B、api `/v1/health` `ok:true`、`/v1/runtime` `node v22.23.4 / nitro3-h3v2 / linux`、`/api/_content/query` 200 / 11927 B；CI run `41177909466` 绿。
- 契约直跑 **26/26 PASS**；main 工作区 node_modules = control 态（nitropack 2.13.4 / nuxt 3.21.2，`.pnpm` = 1295 健康）。

---

## 3. 开放项（= 下一个 agent 的工作池）

| #   | 开放项                            | 解除条件 / 备注                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **F41 专项实验未做**              | 目前仅 CI Linux job 被动观察（连续绿）；Windows vs Linux symlink 专项对照未入队                                                                                                                                                                                                                            |
| 2   | **R11 常驻阻塞**                  | 解除条件 = 捕获首个 SSR externalization 错误（R48/R49/R50 三轮均未产生该签名）                                                                                                                                                                                                                             |
| 3   | **Nuxt 4 剩余轴（R51 轴 A ✅）**  | 轴 A（renderer 字节级对比）✅ verified 2026-10-31（[FINDINGS #34](experiments/FINDINGS.md)）；**轴 B（content 吞异常——R45「内容库为空」真因，搜索空间已收窄）未做**；R50「运行时 SSR 兜底」需浏览器级验证；R48-R50 采纳进基线前必须过 G12 Linux closure                                                    |
| 4   | **上游 issue 提交（待用户授权）** | 材料就绪且**证据链零推断环节**（R51 轴 A 键形态分歧点代码级实锤）：R46 字节级取证 + R48/R49/R50 + R51 轴 A + [evidence/2026-10-31-……](../../../evidence/2026-10-31-r48-r50-r46-mitigation-directions.md) / [r51-axis-a](../../../evidence/2026-10-31-r51-axis-a-renderer-byte-diff.md)；**F48 为引用句柄** |
| 5   | **隔离目录物理删除（用户动作）**  | 48 个 `*.stale-*` 在 `D:\code\ruan-cat\_repro-nm-quarantine`，agent 不可删除                                                                                                                                                                                                                               |
| 6   | **本地 3+1 笔未推送**             | `e683a2d` / `acfca83` / `f75d787` + 本文件重写提交——随下一里程碑 push                                                                                                                                                                                                                                      |
| 7   | **两个小额待定夺**                | `.workbuddy/hooks/hooks.json` 被 git 跟踪但零文档（是否登记）；工作区的 `docs/prompts/01.prompts.md` 是用户自有笔记（勿提交）                                                                                                                                                                              |

---

## 4. 事实源索引

| 要查什么              | 去哪                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| 实验状态总表          | `docs/task-artifacts/experiments/QUEUE.md`（表 1 全量 / 表 3 仅 R11 / DoD 六条）      |
| 横向发现              | `docs/task-artifacts/experiments/FINDINGS.md`（至 **#34**）                           |
| 故障目录              | `docs/task-artifacts/failure-catalog.md`（至 **F48**）+ `status-matrix.md`（F01-F48） |
| 阶段计划与 checkpoint | `docs/task-artifacts/experiments/C-PHASE-EXECUTION.md`（CP-0……CP-8 全 ✅）            |
| 时间线快照（追加式）  | `docs/task-artifacts/progress.md`                                                     |
| 单实验档案            | `docs/task-artifacts/experiments/R{xx}.md`（R01-R51，R30/R33 并入 R31-family）        |
| 分支合并评价          | `docs/task-artifacts/experiments/BRANCH-MERGE-EVALUATION.md`（30 分支全量登记）       |
| 原始证据              | `evidence/`（README.md 有索引）                                                       |
| 仓库纪律              | `AGENTS.md`（§0.5 node_modules、§4 四处同步、Vercel/CF 部署事实）                     |
| **实验全流程门禁**    | `.agents/skills/experiment-ledger-sop/SKILL.md`（**强制**，AGENTS.md 技能表第一项）   |
| 事故案例              | `.agents/skills/fix-bug/record-bug-fix-memory/`（SKILL.md 索引 + 独立案例文件）       |

---

## 5. 环境速查

- 本机：Windows / PowerShell 5.1 / Git Bash / Node v22.23.1 / pnpm 10.33.0 / Vercel CLI 58.11.0 / cf CLI v1.0.0-beta.3 / memorix v1.9.10 / tsx 4.21.0
- 团队 `ruancat-projects`（`team_cUeGw4TtOCLp0bbuH8kA7BYH`）：docs project `prj_nRhiR3d9kkcWp8U9prKNUh5cHdt1`（root `apps/docs`）、api project `prj_AAGUVMU0BfCce4ydRp8MmTdAYc5b`（root `apps/api`）
- 公网冒烟域名（绕 SSO）：`https://shadcn-docs-nuxt-production-repro-docs.vc.ruan-cat.com/`、`https://shadcn-docs-nuxt-production-repro-api.vc.ruan-cat.com/`；CF 侧 `…docs.cf.ruan-cat.com`
- CF Workers Builds script-tag（≠worker 名）：docs `088d894e00824f3d9577fd18926d6eb7`、api `bcb29b488fb641f1947ce87aa9f512c3`；trigger `branch_includes: ["main"]`
- 工作流触发实证：`.github/workflows/ci.yaml` = `pull_request` + `push: main` + `workflow_dispatch` ⇒ _*experiment/* 分支 push 零触发_*（三平台同此结论）
- 提交 trailer：`Assisted-by: ZCode / GLM-5.3-Flash`，无 Co-authored-by（allowlist 外禁止冒名）

---

### 维护记录

- **2026-10-30**：本文件建立（C 类阶段收口，obs 6130/6133 + ledger）。
- **2026-10-31（第一次更新）**：遗留项处置批次收口（R21 复核 + R48/R49/R50），交接工件 obs 6135。
- **2026-10-31（深度重写）**：压缩上下文前的阶段交接——砍掉与 AGENTS.md / experiment-ledger-sop 技能重复的摘录，只留状态、坐标、开放项；memorix 交接广播 obs 6141 / 阶段纪要 obs 6140。
- **2026-10-31（R51 批次更新）**：轴 A 取证完成（FINDINGS #34 / QUEUE R51 行 / status-matrix F45/F48 ✝️ / evidence 索引）——开放项 #3 更新（轴 B 留存）、#4 上游 issue 材料升级为零推断。
