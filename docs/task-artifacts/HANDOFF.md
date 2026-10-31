# 交接待办：AI Agent 会话接力入口

> **定位**：**短期临时交接/待办文档**——只放「最短入 + 当前快照 + 开放项」。**已完成事项不写在这里**（长期记忆 = `progress.md` / `experiments/QUEUE.md` / `experiments/FINDINGS.md` / `failure-catalog.md` / `evidence/` / `experiments/R{xx}.md`）。维护方式 = **整体重写为当前态**，禁止追加历史条目（纪律见 `.agents/skills/experiment-ledger-sop/SKILL.md` §4 第 9 项）。

## 0. 30 秒上手

```powershell
cd D:\code\ruan-cat\shadcn-docs-nuxt-production-repro
memorix resume "<任务关键词>" --refresh never
```

- `--refresh never` 必带（默认 auto 触发 codegraph → Node OOM exit 134）
- 检索用 ASCII/技术词（`MEMORIX_EMBEDDING=off`，中文 BM25 零命中）；工件与查询串不嵌套英文双引号

## 1. 当前快照（2026-10-31 会话收口）

- main @ `88f9c4b`（origin 同步；契约 26/26；Actions/CF/Vercel 全绿；生产断言健康）
- 本日成果：R51-R54 全 verified（F48 键形态实锤 / **F50** buildDir 错位 / F41 symlink 定案 / prerender 内存态）；F48+F50 上游已提交 **nuxt/nuxt#36792**；init-shadcn-docs-nuxt **1.8.0** 已发布（事故 D 早判）
- memorix 坐标：交接读 `obs:6159`（本文件重写）← `obs:6158`（R54）← `obs:6155`（第七轮）← `obs:6141`（前日交接）；台账 `bc1b3527-3223-4f6e-bd46-b493fa6191c1`（open）

## 2. 开放项（= 工作池，唯一核心）

| #   | 待办                                                                                     | 前置条件 / 备注                                                                               |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | issue #36792 增补评论：R54 结论（prerender storage 内存态 = 「setItem 没落盘」答辩答案） | **待用户授权**（外发动作）                                                                    |
| 2   | F50 上游修复跟进（nuxt/nuxt#36792）                                                      | 监控回复；修复落地后回填技能 incident-repair 事故 D 修复版本（monorepo 标准流程）             |
| 3   | 隔离区物理删除                                                                           | **用户动作**：`D:\code\ruan-cat\_repro-nm-quarantine`（50+ 目录）                             |
| 4   | 两个小额定夺                                                                             | `.workbuddy/hooks/hooks.json` 是否登记；`docs/prompts/01.prompts.md` 用户自有笔记勿提交       |
| 5   | R11 常驻阻塞                                                                             | 被动等待首个 SSR externalization 错误（不主动推进）                                           |
| 6   | 可选深挖（均登记于档案，非必做）                                                         | prerender 内存 storage 的注入机制（nitro 源码级）；「Windows 产物换机启动」专项（当前无场景） |

## 3. 事实源索引（查什么去哪）

| 要查什么         | 去哪                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------- |
| 实验状态总表     | `docs/task-artifacts/experiments/QUEUE.md`（表 1 全量 / 表 3 仅 R11 / DoD 六条）      |
| 横向发现         | `docs/task-artifacts/experiments/FINDINGS.md`（至 **#37**）                           |
| 故障目录         | `docs/task-artifacts/failure-catalog.md`（至 **F50**）+ `status-matrix.md`（F01-F50） |
| 时间线（追加式） | `docs/task-artifacts/progress.md`（**已完成事项全部在这里**）                         |
| 单实验档案       | `docs/task-artifacts/experiments/R{xx}.md`（R01-R54）                                 |
| 分支合并评价     | `docs/task-artifacts/experiments/BRANCH-MERGE-EVALUATION.md`                          |
| 原始证据         | `evidence/`（README.md 索引）                                                         |
| 仓库纪律         | `AGENTS.md`（§0.5 node_modules、§4 四处同步、CF/Vercel 部署事实）                     |
| 实验全流程门禁   | `.agents/skills/experiment-ledger-sop/SKILL.md`（**强制**）                           |

## 4. 环境速查

- 本机：Windows / Git Bash / Node v22.23.1 / pnpm 10.33.0；团队 `ruancat-projects`
- 生产域名（绕 SSO）：`…docs.vc.ruan-cat.com` / `…api.vc.ruan-cat.com`；CF：`…docs.cf.ruan-cat.com`
- CF script-tag（≠worker 名）：docs `088d894e00824f3d9577fd18926d6eb7`、api `bcb29b488fb641f1947ce87aa9f512c3`；trigger `branch_includes: ["main"]`
- CF 流水线 fail 分诊：构建命令失败（查本仓）vs deploy 命令失败（`10500` = 平台瞬时，后继 push 自愈——`evidence/2026-10-31-cf-deploy-10500-transient.md`）
- 工作流触发：`ci.yaml` = pull_request + push:main + workflow_dispatch（分支 push 零触发；**新 workflow 须先在默认分支注册才能 dispatch**）
- 提交 trailer：`Assisted-by: ZCode / GLM-5.3-Flash`，无 Co-authored-by
