# 源目录文档吸收度审计报告（2026-10-17）

> 审计对象：`D:/store/WorkBuddy/2026-6-30-common/docs/shadcn-docs-nuxt/`（工作区源目录，git 仓库 `2026-6-30-common`）
> 被审计方：本仓 `docs/task-artifacts/`（13 份）+ `evidence/`（6 份）+ `README.md` + `AGENTS.md` + `experiments/`
> 审计方法：三层取证——① 文件级映射（源 → 承接物）② 内容级 grep 关键词命中 ③ 指针级可发现性；源目录以磁盘 + 源仓 git 历史（`11e5ec3` / `f01582f` / `15ae80e`）双重确认。

## 1. 结论速览

| 审计问题                   | 结论                                                                                                                                                                   | 置信依据                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 源目录文档是否完全吸收？   | **否，约 3.2/4 份**。三份部署线文档（reuse plan / spec / plan）高度吸收；47KB 的 Lucide 排除性调研仅吸收其"事故背景"部分，**独有结论 0 迁移**                          | 全仓 grep `lucide\|iconify\|@nuxt/icon`、`exit 134\|prerenderer\|7 GiB` 均 0 命中        |
| 跨项目上下文接替是否完成？ | **主体完成（约 90%）**。事故知识、设计动机、部署上下文、会话备份、任务清单五条接替通道全部在档且有交叉引用；唯一未过河的是 Lucide 排除性结论（负知识）+ OOM 量化证据链 | `real-world-incidents.md` 7 节映射 + `session-relay.md` + memorix obs:6042（11/11 核验） |

## 2. 源清单（ground truth）

| #   | 文件                                                                                 | 大小     | 源仓提交                     | 内容主题                                                                       |
| --- | ------------------------------------------------------------------------------------ | -------- | ---------------------------- | ------------------------------------------------------------------------------ |
| 1   | `2026-8-5-shadcn-docs-nuxt-bug/2026-08-05-shadcn-docs-nuxt-lucide-build-analysis.md` | 47,685 B | `11e5ec3`（2026-09-29 迁入） | Lucide/Iconify 排除性调研：SmallAliceWeb + eams 双项目对比、构建实测、判断矩阵 |
| 2   | `2026-9-29-new-repo/2026-09-29-reuse-repro-repo-and-deploy-infra-plan.md`            | 11,602 B | `f01582f`                    | 复用本仓决策、事故 A/B/C 上下文、SCSS + CF 部署实施清单、状态收口              |
| 3   | `2026-9-29-new-repo/2026-09-30-vercel-deploy-plan.md`                                | 13,853 B | `15ae80e`                    | Vercel 双 Project 七阶段执行清单（已完成）+ CF 机制修正 + 四域名               |
| 4   | `2026-9-29-new-repo/2026-09-30-vercel-deploy-spec.md`                                | 9,847 B  | `15ae80e`                    | Vercel 部署 spec：模式 B 拓扑、Node 22.x、F38-F41 规避、用户决策点             |

源仓 git 历史证明：`2026-9-29-new-repo/` 子目录**从未有过第 4 个文件**；"第 4 件"是 lucide 报告，且位于 `2026-8-5-shadcn-docs-nuxt-bug/` 子目录。

## 3. 文件级吸收映射矩阵

| 源文档                                                                                                | 承接物                                                                                          | 吸收度        | 关键证据                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| ② reuse-plan §2 复用决策 + PR 状态                                                                    | `progress.md`「2026-09-29 接力核对」                                                            | ✅ 完整       | PR #1 MERGED 修正、#2-#26 CLOSED、#27 OPEN 逐项对齐                                                            |
| ② reuse-plan §2.2 事故 A（h3 v2 世代污染 + packageExtensions 修复）                                   | `real-world-incidents.md` §1/§5/§6 + F02-F10 + F47 修复实证                                     | ✅ 完整       | F47 的 packageExtensions 修复正是事故 A 修复模式的复用；memorix obs:5881/5711 引用未迁移（可接受，源文档在档） |
| ② reuse-plan §2.2 事故 B（Windows NFT / SSR externalization / prerender 清空）                        | §4/§7 + F23/F26/F27/F28/F32                                                                     | ✅ 完整       | —                                                                                                              |
| ② reuse-plan §2.2 事故 C（build 绿 .output 坏 / OOM / READY ≠ runtime）                               | §2/§3 + F17-F21/F24 + acceptance-gates 顶层教训链                                               | ✅ 完整       | G 门设计直接源自"六层不等式"                                                                                   |
| ② reuse-plan §3 实施清单                                                                              | `progress.md`「本轮新增」+ `evidence/2026-09-29-scss-ui-cloudflare-worker-baseline.md`          | ✅ 完整       | sass/tokens.scss/wrangler.jsonc/优雅跳过逐项在档                                                               |
| ③④ spec §2 拓扑决策（模式 B / Node 22.x / 三命令）                                                    | `README.md` Vercel 节 + `AGENTS.md` Vercel 事实 + `evidence/2026-09-30-vercel-deploy-e2e.md` §1 | ✅ 完整       | 字段级一致（root/framework/install/build/output）                                                              |
| ③④ spec §3.7 F38-F41 规避表                                                                           | failure-catalog F38-F41 在册 + evidence §2 分目录 link 实证 F39 规避                            | ✅ 完整       | 双 projectId/orgId gate PASS                                                                                   |
| ③ plan 七阶段 + 执行状态                                                                              | `progress.md`「2026-09-30 Vercel 双 Project 部署」阶段 1-7 逐项勾选                             | ✅ 完整       | 阶段编号一一对应                                                                                               |
| ③ plan「附：CF 机制修正与四域名」                                                                     | `progress.md`「CF 机制修正」+ README「Workers Builds」+ `AGENTS.md` CF 事实                     | ✅ 完整且更新 | cf CLI 自动化（script-tag 寻址坑位）比源文档更进一步                                                           |
| ① lucide 报告 §1-§7 排除性结论、判断矩阵、issue #2806 适用性                                          | **无承接物**                                                                                    | ❌ 0 迁移     | grep `lucide\|iconify\|@nuxt/icon` 全仓 0 命中                                                                 |
| ① lucide 报告 §13-§14 构建实测（145.479s / exit 134 / 7 GiB / 5.76 GiB / eams 100.4s / 3751 modules） | **无承接物**                                                                                    | ⚠️ 仅现象层   | F24 只写"默认约 4 GiB heap 在 Nitro final/prerender 阶段 OOM"；量化证据 0 命中                                 |
| ① lucide 报告 §11-§12 依赖/配置精细对比（shamefully-hoist、双 Vite、entities override）               | **无承接物**                                                                                    | ⚠️ 抽象化     | F10/F31 为抽象条目，eams 实锤配置 0 命中                                                                       |
| ① lucide 报告 §15.3 禁止项                                                                            | architecture §7 + config-experiment-contract                                                    | ✅ 已吸收     | "禁止无条件 trace=false / blanket inline / 清空 prerender"三条全部在册                                         |
| ① lucide 报告 §17 Iconify 单变量 A/B 验证矩阵                                                         | experiment-matrix（M/E/W/C/D 八族）                                                             | ❌ 无对应条目 | 图标维度实验不存在                                                                                             |

## 4. 缺口清单（按风险排序）

1. **Lucide/Iconify 排除性结论未落档（P1）**。源报告 586 行的核心交付是负知识："Lucide 是次要候选非主因；不建议删除 `@iconify-json/lucide`；issue #2806（barrel import 慢）不适用于 `@nuxt/icon` + Iconify JSON 链路"。本仓若再遇构建慢/OOM，后续会话无档可查，可能重新怀疑图标链路或误删依赖——正是源报告要防止的跑偏。
2. **OOM 量化证据链未落档（P2）**。`exit 134`、`Initializing prerenderer` 阶段名、7 GiB 峰值（8192 堆下 5.76 GiB 工作集）、SmallAlice 145.479s vs eams 100.4s、3751 modules——F24/R23-R26 的实验设计缺少这些"历史已发生"的量化锚点。
3. **eams 配置实锤未落档（P3）**。`shamefully-hoist=true`、`link-workspace-packages=deep`、双 Vite（7.3.1/8.0.1）、根 `entities` override——F10/F31 的真实项目证据。
4. **指针失真（P2，低成本高误导）**。`session-relay.md` L66 写"2026-9-29-new-repo/ 下 spec/plan/工具清单四件套"，实测该子目录仅 3 件（git 历史同样只有 3 件）；第 4 件 lucide 报告在另一子目录且无"工具清单"文件。后续会话按此指针找"四件套"会困惑。

## 5. 跨项目上下文接替通道核查（问题 2）

| 通道                                                   | 状态 | 证据                                                                                                                         |
| ------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 事故知识（SmallAlice 3 类 + eams 1 类 + Windows 3 类） | ✅   | real-world-incidents.md §1-§7 全部映射到 F 编号；evidence-policy §9 强制"历史已发生/本仓已复现"分栏                          |
| 设计动机（同仓拓扑为何成立）                           | ✅   | architecture.md §2 + F05 实验；对应用户核心假设"仅加入独立 Nitro 3 即可改变 docs 行为"                                       |
| 部署上下文（Vercel/CF 双平台 + 四域名）                | ✅   | README + AGENTS.md + progress.md + evidence 三处交叉引用                                                                     |
| 会话级备份接力                                         | ✅   | memorix obs:6042（11/11 分片逐字节核验，1,203,874 字节，sha256 匹配）+ session-relay.md 唤起文档 + progress.md 2026-10-16 段 |
| 未完成任务清单传承                                     | ✅   | F47 第二层实验 / PR #27 OPEN / R01+R20-R45 未启动，在 session-relay、progress、AGENTS 三处口径一致                           |
| Lucide 排除性调查教训                                  | ❌   | 唯一未过河的上下文（见 §4.1）                                                                                                |

## 6. 修复建议（未执行，待确认）

1. `real-world-incidents.md` 增补 §9「Lucide/Iconify 已排除（2026-08-05 调研）」：落排除性结论 + 指回源文件绝对路径；或在 failure-catalog 登记 F48（性质为"已排除的错误假设"）。
   - ✅ **已按方案 A 落地（2026-10-17，见 §7）**：`real-world-incidents.md` 增补 §8「Lucide / Iconify 已排除」。**F48 未在 failure-catalog 登记是有意选择**（排除性负知识已落在 real-world-incidents，不重复进故障目录）——**本项已结，不是待办**。
2. F24 增补一行"历史量化锚点"（exit 134 / 7 GiB / 阶段名 / 145s），标注来源。
3. `session-relay.md` L66 指针修正为：`…/shadcn-docs-nuxt/` 下 lucide 调研 1 份（2026-8-5 目录）+ spec/plan/reuse 计划 3 份（2026-9-29-new-repo 目录）。

三项均为 docs-only 变更，不触碰 control、依赖与任何实验变量。

## 7. 修复执行记录（2026-10-17，用户确认后执行）

- [x] `real-world-incidents.md` 增补 §8「Lucide / Iconify 已排除」并指回源文件路径（原 §8「本仓库的职责」顺延为 §9）
- [x] `failure-catalog.md` F24 增补历史量化锚点（exit 134 / `Initializing prerenderer` / 145.479s / 4.05 GiB / 5.76 GiB / eams 对照 100.4s / 3751 modules）
- [x] `session-relay.md` 工作区指针修正（4 份文件按子目录如实拆分，链接到 real-world-incidents §8 与本报告）
- 提交：按仓库 git-commit 规范分笔提交；**未 push**（push 需用户显式授权）

## 8. 迁移执行记录（2026-10-17 第二批，用户指令"迁移全部原目录文档"后）

- [x] 4 份源文档 byte-identical 复制入仓 `docs/history/shadcn-docs-nuxt/`（合计 82,987 字节，sha256 双侧核验 4/4 一致，哈希基准见 `docs/history/README.md`）
- [x] 新建迁移索引 `docs/history/README.md`：源路径、sha256、吸收状态映射、权威性说明（历史存档不随实验状态更新，现行状态以 task-artifacts 为准）
- [x] 指针接线五处：real-world-incidents §8（入仓副本为主 + 外部路径降级为 provenance）、session-relay、根 README 任务工件、task-artifacts README 工件清单、AGENTS.md 新增「历史源文档存档」节
- [x] 外部源目录保持只读未动（迁移 = 复制入仓，不从源仓删除；如需清理源仓另行明确授权）
- **跨项目上下文接替就此收口**：本仓自包含，后续会话不依赖 `D:/store` 外部路径即可获得全部历史上下文（4 份原文 + 排除性结论 + 量化锚点 + 部署事实 + 会话备份）

## 9. 追记（2026-10-30）：本报告 §3 / §4 / §5 中若干状态已失效

> 本节为**追加式追记**，§3 吸收矩阵、§4 缺口清单、§5 通道核查的**原文与历史表格保留不改写**——它们记录的是 2026-10-17 当时的真实状态。

- **§5「未完成任务清单传承」行**所列「F47 第二层实验 / PR #27 OPEN / R01+R20-R45 未启动」**已全部失效**：
  - F47 **第二层已定案**（根因 = 验收契约写错 URL，非平台运行时故障）且**第三层已修**（页面 catch-all 真 404 + Content query 空查询弱门 + 探针内容级断言）；见 [FINDINGS #19](../task-artifacts/experiments/FINDINGS.md) 与 [FINDINGS #22](../task-artifacts/experiments/FINDINGS.md)。
  - **PR #27 与 #26 均已 CLOSED**（2026-10-30T07:33:07Z，#27 因 head 分支被删而由 GitHub 自动关闭）；**当前仓库零 OPEN PR**。
  - **R01 之外**，R02–R21、R27–R29、R31-family 均已执行并落档 `verified`；**未启动池收敛为 14 个**（R22 / R32 / R34–R45），阻塞池仅剩 R11。权威状态见 [QUEUE.md](../task-artifacts/experiments/QUEUE.md)。
- **§4 缺口清单 4 项均已闭环**（见 §7 / §8）：Lucide 排除性结论已落 `real-world-incidents.md` §8；OOM 量化锚点已进 F24；eams 配置实锤属**历史外部项目事实**、本仓不适用；`session-relay.md` 指针已修正。
- **现行状态一律以 `docs/task-artifacts/`（QUEUE / FINDINGS）与 `evidence/` 为准**，本报告仅作 2026-10-17 吸收审计的历史存档。
