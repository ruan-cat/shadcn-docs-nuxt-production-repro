# Skill: experiment-ledger-sop

# 实验全流程台账 SOP——验证、复现、CLI 跟踪、数据 markdown 化的强制闭环

> **定位**：本仓任何实验（配置型 / 测量型 / 归因型 / 规避型）从开工到收口的**强制检查清单**。AGENTS.md 的 §0.5（node_modules 隔离）与 `docs/task-artifacts/experiments/SOP.md`（7 步复现）是本技能的**上游**；本技能管的是它们之后的「落档不丢三落四」——把 2026-10-31 会话三轮审计（落地回查 / 分支现场核对 / 项目总盘点）暴露的全部缺口固化为门禁。
> **历史事故来源**（memorix obs 6121 / 6135 / 6137 / 6138 + progress.md 2026-10-31 各条）：evidence 索引漏登记 ×2、分支漏登记合并评价 ×1 个会话、假设级 claim 当事实写 ×4、status-matrix 七行滞后、自证句失实 ×1。

## 0. 触发时机（缺一即违规）

- 任何实验**开工前**：过一遍 §1 开工门。
- 任何实验**构建结束后**：过一遍 §3 验收门。
- 任何实验**写档案前**：过一遍 §4 落档门（九项）。
- 任何**台账/档案编辑**之后又发生 `git commit`：重新 Read 再 Edit（prettier 钩子会改写 staged 文件，旧上下文必失效）。
- 任何**批次收口**：过一遍 §6 收口门。

## 1. 开工门（写代码前）

1. node_modules 健康体检（AGENTS.md §0.5.1 判定门：`.pnpm` ≈1209 + nuxt.mjs + tsc 三绿才开工；健康就别动）。
2. **编号分配**：查 `QUEUE.md` + `FINDINGS.md` + progress 最大实验号与 F 号，新实验从下一号顺延（R47 曾被占用、F48 曾空缺——编号冲突会让交叉引用指向错条目）。
3. 记录基线 SHA（merge-base 口径）与依赖态（精确到 override 与 lockfile 解析结果，**以版本集合为准、不以 diff 行数为准**——856 行重解析可能只是两个 override）。
4. 单变量定义写死：相对哪个失败态/基线的唯一差异；**变量触及哪条路由，哪条路由就要有专属断言**（F47/F49 家族纪律）。

## 2. 执行纪律（AGENTS.md 已有，此处只列 CLI 坑）

- 构建**串行前台**、timeout 与退出码如实记录（exit 124 ≠ 故障证据）。
- **构建日志含 ANSI 色码，grep 必须 `-a`**（否则静默零输出，会被误读成「信号不存在」）。
- 多语句 PowerShell 一律先写 `.ps1`（`%TEMP%`）再 `-File` 执行——**从 Git Bash 内联传 `$var` 会被 bash 吃掉**。
- 日志留存 `%TEMP%\r{xx}-*.log`，且关键原文**当日抄录**进 evidence 文件（%TEMP% 会丢）。

## 3. 验收门（build 绿 ≠ 通过）

1. `probe:content <server-entry>` **13/13**（含指纹路由 200 + must-404 反向断言）——探针自带端口占用拒绝与应答者身份校验（F49 两道门），不得绕过。
2. `probe:closure` exit 0（产物自包含三查：裸包名导入 / `file://` 绝对路径导入 / manifest+拷贝层）。
3. 变量触及的渲染/路由行为做**专属断言**（如 payload 抽取实验必须断言 `_payload.json` 数量与首页 SSR）。
4. **证据等级显式标注**：结论里每条机理表述，写清「实测」还是「推断」——推断必须注明推断路径（排除法 / 代码路径+终态反推 / 上游语义），并登记配套验证的缺失（例：R50「运行时兜底」未做浏览器级验证、R49 renderer 归因未做字节级对比）。**禁止把推断写成事实口吻**（R45 吞异常环节的教训）。

## 4. 落档门（九项，全部落完才算实验结束）

1. `R{xx}.md` 档案：执行记录表 + 复现自检清单（逐项勾）+ 结论（`candidate`/`verified`）+ 关键发现 + 证据等级标注。
2. `QUEUE.md`：表 1 落行（含结论标注与 FINDINGS 引用）；「未 push」等状态字段随事实更新。
3. `FINDINGS.md`：横向发现入条目（编号从 1 连续），条目号与档案交叉引用**一字不差**（守卫：`tests/findings-crossref.test.mjs`）。
4. `evidence/`：原始日志关键原文**当日抄录**进 evidence 文件（含 lockfile 结构化 diff 这类易失证据），并在 `evidence/README.md` **索引登记**（漏登记已发生两轮）。
5. `BRANCH-MERGE-EVALUATION.md` §2：实验分支登记行（含合并评价）——**追记提及≠登记**（r46 漏登记一整个会话、r22/r32/r45 从未入表的教训）。
6. `status-matrix.md`：对应 F 行状态随实验结论更新（七行僵尸态的教训）。
7. `failure-catalog.md`：新故障模式立 F 编号（按签名可检索；挂靠已有条目须写明拆分/挂靠关系，F48 先例）。
8. `progress.md`：追加实验条目（含失败/误判/判废，不得只留聊天）。
9. `HANDOFF.md` §4：新增/闭合遗留项。

## 5. 平台覆盖矩阵（每实验收尾必填）

| 结论 | Windows | Linux(CI) | Vercel | Cloudflare |

——实验在哪台机器跑的，矩阵就只填哪格；**空格 = 明示未验证**。Windows-only 结论采纳进基线前必须过 G12（Linux artifact closure）。分支现场 vs 档案的全量核对（merge-base diff、tip SHA、experiment.json 在位性、提交 message）在批次收口时做一轮。

## 6. 收口门（批次结束）

1. 三平台工作流观察（需要时）：CI 触发器看 `.github/workflows/ci.yaml`（`pull_request` + `push: main` + `workflow_dispatch`——**分支零 run 的前提是未开 PR**；开了 PR 会触发 `pull_request` 与 `cloud-pr-prettier`）；Vercel `vercel ls <project>`（分支 push 零新增、preview 未启用）；CF `cf builds list --external-script-id <tag>`（trigger `branch_includes: ["main"]`）。**script-tag ≠ worker 名**：docs `088d894e00824f3d9577fd18926d6eb7` / api `bcb29b488fb641f1947ce87aa9f512c3`（记载于 `evidence/2026-10-16-push-788630b-production-verify.md`）。
2. 生产内容断言（自定义域名，响应体级）：docs 首页标记 ×7 / api health / runtime / content query 字节数。
3. 契约直跑 `node --test tests/*.test.mjs` 全绿。
4. 孤儿审计：`git stash list` 空、`git status` 干净、无未登记的隔离目录。
5. memorix 收口：`memory store`（批次纪要）+ `continuity record`（verification/decision）+ `handoff send`；**memorix 不是落档替代品**——memorix 里有的、markdown 里没有的，就是未落档（obs 6121 教训）。
6. 提交：分门别类（git-commit 技能）、trailer 按当前会话身份（`Assisted-by: ZCode / GLM-5.3-Flash`；ZCode/GLM 不在 Co-authored-by allowlist，禁止冒名）、push 前核对未推送提交的 trailer。
7. 进程清理：`cleanup-agent-team-node-processes` 技能 dry-run，CandidateCount 应为 0。

## 7. 编辑纪律（防止越改越乱）

- **档案/历史登记只追加不改写**：订正用「✝️ 节」或 inline「✝️」标注，原文保留。
- **追记提及 ≠ 登记**：说「已登记」必须真的有表格行/索引行/条目号。
- **结论表述不得先于事实发生**（先做事，再让文字成真）。
- **登记动作的完成判据是机器可查的**：表格行存在（grep 行首 `|`）、索引行存在、FINDINGS 条目号连续——不是「我记得写了」。

## 8. 案例索引

- prettier 钩子 stale read / 表格插行断裂 / ANSI grep / bash→PowerShell `$var`：`.agents/skills/fix-bug/record-bug-fix-memory/2026-10-31-ledger-editing-false-signal-traps.md`
- F47 探针假阳性家族（判据恒 0 / 路径写错 / 端口被占）：`.agents/skills/fix-bug/record-bug-fix-memory/2026-10-30-f47-content-api-false-positive.md`
