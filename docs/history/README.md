# 历史源文档迁移存档

> 迁移日期：2026-10-17。
> 来源：`D:/store/WorkBuddy/2026-6-30-common/docs/shadcn-docs-nuxt/`（外部工作区仓库 `2026-6-30-common`，相关提交 `11e5ec3` / `f01582f` / `15ae80e`）。
> 目的：跨项目上下文接替收口——本仓自包含，后续会话无需依赖外部路径即可溯源全部历史上下文。

## 权威性说明（必读）

1. 本目录是 **byte-identical 历史存档**：四份文件 sha256 与源文件逐一核对一致（见下表），不做任何内容改写。
2. 历史存档**不随本仓实验状态更新**。文中的"待办 / 计划 / 状态"可能已过时，**现行状态与结论一律以 [`docs/task-artifacts/`](../task-artifacts/README.md) 与 [`evidence/`](../../evidence/README.md) 为准**，不得引用历史副本中的过时数据作为验收依据。
3. 外部源目录仅作 provenance 保留，本仓不对其做任何写操作。

## 迁移清单与完整性（sha256 双侧核验一致）

| # | 本仓路径（`docs/history/shadcn-docs-nuxt/` 下） | 大小 | sha256 | 源仓提交 |
| --- | --- | --- | --- | --- |
| 1 | `2026-8-5-shadcn-docs-nuxt-bug/2026-08-05-shadcn-docs-nuxt-lucide-build-analysis.md` | 47,685 B | `a8a047f47e86efb25ad6cb363687acf8a94d867387b2c5c208ebc0c33fe08f04` | `11e5ec3` |
| 2 | `2026-9-29-new-repo/2026-09-29-reuse-repro-repo-and-deploy-infra-plan.md` | 11,602 B | `a98c3eab5c6aa6c8d075b01aee9eb6c76bc128b3f36c4422e1b227c4220640e3` | `f01582f` |
| 3 | `2026-9-29-new-repo/2026-09-30-vercel-deploy-plan.md` | 13,853 B | `a465eee1a14891ef72db1665932c445b564f07e3a837c481d58fc0cc9604d48e` | `15ae80e` |
| 4 | `2026-9-29-new-repo/2026-09-30-vercel-deploy-spec.md` | 9,847 B | `2a3510cc4d7fa92a8df8ae2a28b1df8709c612bf33679522fcc4ebc20d4e7511` | `15ae80e` |

合计 82,987 字节，4/4 逐字节一致（源侧与仓侧 sha256 完全相同）。

## 吸收状态映射（迁移副本 ≠ 需要重新消化）

| 文档 | 现行承接位置（权威） | 状态 |
| --- | --- | --- |
| ① Lucide 构建调研 | [real-world-incidents §8](../task-artifacts/real-world-incidents.md)（排除性结论与处理边界）+ [failure-catalog F24](../task-artifacts/failure-catalog.md)（历史量化锚点） | ✅ 已承接（2026-10-17 审计补齐） |
| ② 复用计划（2026-09-29） | [progress.md「2026-09-29 接力核对与基础设施新增」](../task-artifacts/progress.md) + [evidence/2026-09-29](../../evidence/2026-09-29-scss-ui-cloudflare-worker-baseline.md) | ✅ 已承接 |
| ③ Vercel 部署 plan（2026-09-30） | [progress.md「2026-09-30」两节](../task-artifacts/progress.md) + [AGENTS.md 部署事实](../../../AGENTS.md) | ✅ 已承接 |
| ④ Vercel 部署 spec（2026-09-30） | [README Vercel 节](../../../README.md) + [evidence/2026-09-30 §1](../../evidence/2026-09-30-vercel-deploy-e2e.md) | ✅ 已承接 |

## 交叉引用

- 审计依据：[`docs/reports/2026-10-17-source-docs-absorption-audit.md`](../reports/2026-10-17-source-docs-absorption-audit.md)（三层取证：文件映射 / grep / 指针级）
- 会话接力：[`docs/task-artifacts/session-relay.md`](../task-artifacts/session-relay.md)
