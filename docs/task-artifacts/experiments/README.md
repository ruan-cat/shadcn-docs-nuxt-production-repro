# 实验执行管理体系（总入口）

本目录是"实验执行层"：负责逐实验的执行记录、复现自检与发现沉淀。设计态权威仍在 [pr-roadmap.md](../pr-roadmap.md)、[failure-catalog.md](../failure-catalog.md) 与 [status-matrix.md](../status-matrix.md)——上层文档不动，本层只做执行与回写。

## 文件导航

| 文件                           | 职责                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| [QUEUE.md](./QUEUE.md)         | 任务清单看板：已完成 / 待重测 / 未启动，执行队列排序与 DoD                                                                          |
| [SOP.md](./SOP.md)             | 标准复现 SOP + 复现自检流程（执行前/中/后清单、异常处理）                                                                           |
| [FINDINGS.md](./FINDINGS.md)   | 关键技术发现台账（带实证证据的横向发现）                                                                                            |
| [_TEMPLATE.md](./_TEMPLATE.md) | 单实验档案模板（R{xx}.md 以此为骨架）                                                                                               |
| R{xx}.md                       | 单实验档案。已完成：[R02](./R02.md)、[R03](./R03.md)、[R04](./R04.md)、[R05](./R05.md)、[R09](./R09.md)；其余待实验执行后按模板新建 |

## 使用流程（三步）

1. **执行前**：读 [QUEUE.md](./QUEUE.md) 确定本次要执行的实验及其队列位置、执行平台与风险。
2. **执行中**：按 [SOP.md](./SOP.md) 执行复现（隔离 node_modules → frozen install → build → 冒烟），逐项过自检清单。
3. **执行后**：结果写入 R{xx}.md 档案，并同步更新 [QUEUE.md](./QUEUE.md) 状态与 [FINDINGS.md](./FINDINGS.md)（有横向价值的新发现）。

## 与既有文档的关系

- **设计层（只读）**：[pr-roadmap.md](../pr-roadmap.md) 定义 R01-R45 的单变量与判读标准；[failure-catalog.md](../failure-catalog.md) 定义 F01-F47 故障本体；[status-matrix.md](../status-matrix.md) 记录每个 F 的当前状态。本层不修改这三份文档的结论，只在档案中引用其编号。
- **审计层（事实来源）**：[总检报告](../../reports/2026-10-17-branch-pr-fault-reproduction-audit.md)（2026-10-17）是本轮复现的 SOP 原始出处与队列排序依据（其 §3.3 / §4 / §5），本层文档从其扩展而成。
- **执行层（本目录，可写）**：R{xx}.md 档案承接实验证据；QUEUE.md 回写执行进度；FINDINGS.md 沉淀跨实验方法论发现（如隐藏提升层伪信号、bulk-delete 守卫约束）。
- **原则层**：实验执行仍受 [任务工件总入口](../README.md) 的四项重要原则约束（绿色 main 为 control、单变量、不归咎单一上游、build green 不是验收）。
