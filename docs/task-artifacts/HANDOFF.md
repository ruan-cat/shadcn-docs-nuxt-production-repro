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
7. **R51 批次收口 + G12 达成 + issue 草稿**：#32 订正补进 R45.md ✝️；全局技能 init-shadcn-docs-nuxt 1.6.1→**1.7.0**（第 23 条事故记忆 + incident-repair 事故 C——此前 22 条中 unstorage **零提及**）；cwd 持久化险情沉淀 record-bug-fix-memory 案例（家族第三例，memorix gotcha #6145）；pr-roadmap R32 状态行订正；**G12 Linux closure 达成**（`workflow_dispatch` 三连：r48 ✅ 1m54s / r49 ❌ Linux 同签名逐字一致 @ `renderer.mjs:390:22` / r50 ✅ 1m38s，run `41192048834`/`41192051449`/`41192054732`）；上游 issue 草稿组装完毕（[upstream-issue-f48-draft.md](./upstream-issue-f48-draft.md)，**提交动作等授权**）。
8. **main push 里程碑 + monorepo 技能发布闭环**：`dfa1bb2..067c2c3` push（用户授权），三平台全绿——CI run `41194130270` success、Vercel 双 Project Ready（docs 19s / api 15s）、CF 双 worker success；生产断言 4/4 与基线同量（首页 ×7/107519B、query 200/11927B——注意 query 在 **docs** 域名，api 域名打它是 404 假信号）；monorepo `init-shadcn-docs-nuxt` 1.7.0 按标准流程发布（源 → `release-ai-plugins.ps1` v11.2.0 → commit `15e5eec2`/`a74c9a2f` push dev → CI 双 workflow success → 重装，源↔实体 byte-identical）。**流程纠偏**：主代理曾直改实体文件（安装产物）——被用户纠正为「monorepo 源 + release + 安装」标准流程，纪律已入 auto-memory + memorix #6148。
9. **R52（轴 B）定案：R45 真因闭合 + F50 立号**：同分支 A/B 诊断插桩对照（`experiment/r52-content-cache-axis`，插桩 `b981900` → N4 版本集合 `a6fab32`）——**N4 主 bundle nitro 实例的 buildDir 被改写为 `node_modules/.cache/nuxt/.nuxt` ⇒ content 的 devStorage base 随实例错位 ⇒ `_snapshot` 读空 ⇒ bundled 零条 ⇒ 运行时 Content API 全空**；假绿面 = prerender 期 `sourceBase` 不受错位影响（页面渲染成功）；R45 未归因闭合、[FINDINGS #35](experiments/FINDINGS.md)、**F50 立号**（failure-catalog）；次级环节（prerender setItem 在 workerd 内去向）登记待深挖。Nuxt 4 迁移两大世代缺口定案：F48（N3 世代 500）/ F50（N4 世代空集合）。
10. **上游 issue 提交 + R53（F41 专项）+ R50 浏览器验证**（用户四指令授权）：**[nuxt/nuxt#36792](https://github.com/nuxt/nuxt/issues/36792)** 已提交（F48 英文全文）+ **F50 增补评论** `issuecomment-6543587139`（R52 定案）；**R53 verified**（F41 专项）——双平台产物内零 `@repro` workspace symlink（bundle 内联）+ symlink 形态平台差异实锤（Linux 相对 21B 可移植 / Windows 绝对 110B 换机即断，R22 同族）——F41 状态行「差异定性完成」；**R50 浏览器级验证完成**（chrome-devtools SPA 导航）——零 `_payload.json` 请求、数据走 query API 实时查询（24 条全 200）、内容完整、console 干净——遗留标注闭合。**技能 1.8.0 同日发布**（独立子代理标准流程）：F50 早期判别（`grep -c "nitro:bundled:cache:content"` 一条命令）+ 插桩定位法 + R53 产物 symlink 形态写入 init-shadcn-docs-nuxt（incident-repair **事故 D** + windows.md R53 节）；monorepo `7741013e`/`a40db80b`（release 11.4.0）push dev → CI 双绿 → 重装验证 1.8.0 ✓。
11. **R54：F50 最后一环定案**（nitro 插件探针 A/B）——**N4 的 prerender storage = 内存态实例**（预热注入可读、fs 驱动未生效、回写随构建消亡、全盘无痕）vs N3 fs 直连（probe 落盘）⇒ F50「回写→快照」双向断裂全实测；workerd 前提订正（双世代 prerender 均主进程 in-process）；[FINDINGS #37](experiments/FINDINGS.md)；issue #36792 增补**待授权**。

### 2.2 git 与验证基线

- `origin/main` = **`067c2c3`**（2026-10-31 push，三平台全绿：CI run `41194130270` success / Vercel 双 Project Ready / CF 双 worker success；生产断言 4/4 与基线同量）。本地领先项为 push 后的台账小批（若有），随下一里程碑 push。
- 本会话 main 提交的 trailer 约定：**`Assisted-by: ZCode / GLM-5.3-Flash`，无 Co-authored-by**（ZCode/GLM 不在 git-commit 技能 allowlist，禁止冒名）。
- 生产内容断言（两轮同量）：docs 首页「生产级复现实验室」×7 / 107519 B、api `/v1/health` `ok:true`、`/v1/runtime` `node v22.23.4 / nitro3-h3v2 / linux`、`/api/_content/query` 200 / 11927 B；CI run `41177909466` 绿。
- 契约直跑 **26/26 PASS**；main 工作区 node_modules = control 态（nitropack 2.13.4 / nuxt 3.21.2，`.pnpm` = 1295 健康）。

---

## 3. 开放项（= 下一个 agent 的工作池）

| #   | 开放项                                         | 解除条件 / 备注                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **F41 ✅ 专项完成（R53）**                     | Windows/Linux 产物内 symlink 形态差异定性（Linux 相对可移植 / Windows 绝对换机即断；workspace 包零产物 symlink）——[FINDINGS #36](experiments/FINDINGS.md) / [R53.md](experiments/R53.md)；遗留仅「Windows 产物换机启动」专项（当前部署链无此场景，按需立项）                                                                                                                                                                                                                                                                                                                    |
| 2   | **R11 常驻阻塞**                               | 解除条件 = 捕获首个 SSR externalization 错误（R48/R49/R50 三轮均未产生该签名）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 3   | **Nuxt 4 剩余轴（R51 轴 A ✅ / R52 轴 B ✅）** | 轴 A（renderer 字节级对比）✅ verified（[FINDINGS #34](experiments/FINDINGS.md)）；**轴 B ✅ verified（R52，[FINDINGS #35](experiments/FINDINGS.md)）——R45 真因闭合 = F50（buildDir 错位）**；次级环节（prerender setItem 在 workerd 内去向）待深挖；R50「运行时 SSR 兜底」需浏览器级验证；**G12 Linux closure ✅ 已达成**（2026-10-31 `workflow_dispatch` 三连：r48 ✅ / r49 ❌ 同签名 / r50 ✅）                                                                                                                                                                              |
| 4   | **上游 issue 提交（待用户授权）**              | 材料就绪且**证据链零推断环节**（R51 轴 A 键形态分歧点代码级实锤）：R46 字节级取证 + R48/R49/R50 + R51 轴 A + [evidence/2026-10-31-……](../../../evidence/2026-10-31-r48-r50-r46-mitigation-directions.md) / [r51-axis-a](../../../evidence/2026-10-31-r51-axis-a-renderer-byte-diff.md)；**✅ 已提交**：[nuxt/nuxt#36792](https://github.com/nuxt/nuxt/issues/36792)（F48 主 issue）+ [F50 增补评论](https://github.com/nuxt/nuxt/issues/36792#issuecomment-6543587139)（R52 定案）——[upstream-issue-f48-draft.md](./upstream-issue-f48-draft.md) 转存档底稿，**F48 为引用句柄** |
| 5   | **隔离目录物理删除（用户动作）**               | 48 个 `*.stale-*` 在 `D:\code\ruan-cat\_repro-nm-quarantine`，agent 不可删除                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6   | **本地 3+1 笔未推送**                          | `e683a2d` / `acfca83` / `f75d787` + 本文件重写提交——随下一里程碑 push                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7   | **两个小额待定夺**                             | `.workbuddy/hooks/hooks.json` 被 git 跟踪但零文档（是否登记）；工作区的 `docs/prompts/01.prompts.md` 是用户自有笔记（勿提交）                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

---

## 4. 事实源索引

| 要查什么              | 去哪                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| 实验状态总表          | `docs/task-artifacts/experiments/QUEUE.md`（表 1 全量 / 表 3 仅 R11 / DoD 六条）      |
| 横向发现              | `docs/task-artifacts/experiments/FINDINGS.md`（至 **#35**）                           |
| 故障目录              | `docs/task-artifacts/failure-catalog.md`（至 **F50**）+ `status-matrix.md`（F01-F50） |
| 阶段计划与 checkpoint | `docs/task-artifacts/experiments/C-PHASE-EXECUTION.md`（CP-0……CP-8 全 ✅）            |
| 时间线快照（追加式）  | `docs/task-artifacts/progress.md`                                                     |
| 单实验档案            | `docs/task-artifacts/experiments/R{xx}.md`（R01-R52，R30/R33 并入 R31-family）        |
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
- **2026-10-31（R51 批次收口）**：#32 订正入 R45.md ✝️；全局技能 1.7.0（事故 C）；cwd 案例 + memorix gotcha 6145；pr-roadmap R32 订正；**G12 Linux closure 达成**（三 run 实证）；issue 草稿 upstream-issue-f48-draft.md 就绪（提交等授权）。
- **2026-10-31（R52 批次）**：轴 B 定案（FINDINGS #35 / QUEUE R52 行 / status-matrix F45/F48 ✝️ / evidence 索引）——R45 真因闭合、**F50 立号**（failure-catalog 至 F50）、开放项 #3 更新（双轴 ✅）。
- **2026-10-31（第七轮）**：**上游 issue 已提交**（[nuxt/nuxt#36792](https://github.com/nuxt/nuxt/issues/36792) + F50 增补评论，用户授权）；R53（F41 专项）verified——symlink 形态平台差异定案（F41 状态行更新）；R50 浏览器级兜底验证完成（遗留标注闭合，query API 实时查询形态实锤）。
- **2026-10-31（R54 批次）**：F50 最后一环定案（FINDINGS #37 / QUEUE R54 行 / R52 ✝️ / evidence）——prerender storage 内存态定性、workerd 前提订正；issue 增补待授权。
