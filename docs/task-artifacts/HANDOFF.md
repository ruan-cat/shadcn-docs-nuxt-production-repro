# 交接文档：AI Agent 会话接力入口

> **用途**：下一个 AI agent 启动独立会话时，**先读本文件**，再用下面的 memorix 命令取回全量推进状态与遗留问题。
>
> **定位**：本文件是**入口与索引**，不是事实源。事实源仍是 `docs/task-artifacts/` 台账 + `evidence/` 证据；本文件只负责「从哪读、怎么读、还剩什么」。
>
> **维护**：每个阶段收口时更新「§3 当前推进状态 / §4 遗留问题 / §5 纪律提醒」，并同步在 memorix 侧登记 `continuity` 台账与 `handoff` 工件。

---

## 0. 30 秒上手（复制即用）

```powershell
cd D:\code\ruan-cat\shadcn-docs-nuxt-production-repro

# ① 有界简报：自动带上 continuity 台账（遗留项 + 决策 + 验证）
memorix context "继续 C 类阶段收口后的遗留项处置" --task-id bc1b3527-3223-4f6e-bd46-b493fa6191c1 --refresh never

# ② 接力简报：列出最近的 handoff / gotcha / decision
memorix resume "继续 C 类阶段收口后的遗留项处置" --refresh never
```

> ⚠️ **两条命令都必须带 `--refresh never`**。默认 `--refresh auto` 会触发 codegraph 刷新扫描，本仓实测 Node 堆顶到 ~4.1 GB 后 OOM（exit 134），且 `NODE_OPTIONS=--max-old-space-size=8192` **无效**（堆上限未变）。
> 详见 [§2.4 两个坑](#24-两个坑实测)。

---

## 1. memorix 坐标（本轮登记的工件）

| 用途         | 类型                | ID / 句柄                                      | 何时用                                             |
| ------------ | ------------------- | ---------------------------------------------- | -------------------------------------------------- |
| **交接工件** | `what-changed`      | `obs:6135`                                     | **下一个 agent 的第一读**（2026-10-31 批次全结论） |
| 交接广播     | `what-changed`      | `obs:6136`                                     | 面向下一 agent 的摘要（遗留项处置批次闭合）        |
| 分支审计纪要 | `what-changed`      | `obs:6137`                                     | 30 分支现场 vs 档案全量核对（6 缺口补齐）          |
| 遗留项台账   | `continuity ledger` | `bc1b3527-3223-4f6e-bd46-b493fa6191c1`（open） | 查「还剩什么、已定了什么」                         |
| 阶段收口纪要 | `what-changed`      | `obs:6130`                                     | C 类阶段收口（2026-10-30）的完整结论               |
| 本次会话     | `session`           | `sess-mvvu7zai-451n75`                         | 追溯 2026-10-31 批次                               |
| 旧交接工件   | `what-changed`      | `obs:6133`（**已 archived**）                  | 引号转义被破坏导致命令被截断，作废                 |

> 检索用 `memorix memory detail --id 6135` 取全文。

---

## 2. memorix 命令清单（CLI，均已实测）

### 2.1 取回状态

| 目的                      | 命令                                                                     | 实测      |
| ------------------------- | ------------------------------------------------------------------------ | --------- |
| 有界简报（含 continuity） | `memorix context "<任务>" --task-id <id> --refresh never`                | ✅ exit 0 |
| 接力简报                  | `memorix resume "<任务>" --refresh never`                                | ✅ exit 0 |
| 最近条目                  | `memorix memory recent --limit 10`                                       | ✅        |
| 关键词检索                | `memorix memory search --query "R46" --limit 10`                         | ✅        |
| 取单条详情                | `memorix memory detail --id 6133`                                        | ✅        |
| continuity 台账           | `memorix continuity show --task-id bc1b3527-3223-4f6e-bd46-b493fa6191c1` | ✅        |
| 会话摘要                  | `memorix session context --limit 3`                                      | ✅        |
| 交接工件正文              | `memorix memory detail --id 6133`                                        | ✅        |

### 2.2 写入状态（下一个 agent 用）

| 目的             | 命令                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 新建台账         | `memorix continuity start --task "..." --requirements "a,b"`                                                                            |
| 记决策           | `memorix continuity record --task-id <id> --kind decision --content "..."`                                                              |
| 记验证           | `memorix continuity record --task-id <id> --kind verification --verification-status passed --content "..."`                             |
| 记风险           | `memorix continuity record --task-id <id> --kind risk --content "..."`                                                                  |
| 结束台账         | `memorix continuity close --task-id <id> --status completed --content "..."`                                                            |
| 存观察           | `memorix memory store --text "..." --title "..." --visibility project`                                                                  |
| 交接下一 agent   | `memorix handoff send --summary "..." --context "..."`                                                                                  |
| 归档旧条目       | `memorix memory resolve --ids 6133 --status archived`                                                                                   |
| 团队任务（可选） | `memorix task create --description "..."` → `memorix task claim --task-id <id>` → `memorix task complete --task-id <id> --result "..."` |

### 2.3 MCP 路径（agent 自带 memorix MCP 时）

1. `memorix_session_start`（**必须先调用**，否则本会话内其它 memorix 工具不可用；带 `projectRoot` = 仓库绝对路径）
2. `memorix_project_context` / `memorix_context_pack` → 有界简报
3. `memorix_search` → `memorix_detail` → 按需取全文
4. `memorix_store` → 写入本轮状态；`memorix_resolve` → 标记已完成
5. MCP 遇到困难时改用上面的 CLI（本机已装 memorix v1.9.10，`memorix.ps1`）

### 2.4 两个坑（实测）

1. **`--refresh never` 必须带**：默认 `--refresh auto` 触发 codegraph 刷新扫描 → Node 堆 OOM → **exit 134**；`NODE_OPTIONS=--max-old-space-size=8192` 无效。
2. **检索用 ASCII / 技术词，纯中文查询不命中**：本机 `MEMORIX_EMBEDDING=off` ⇒ BM25 分词对中文无效。
   - `memorix memory search --query "C 类 未启动实验池 收口 unstorage"` → **0 命中**
   - `memorix memory search --query "unstorage"` / `--query "R46"` → **命中**
     ⇒ 交接工件与查询串**不要嵌套英文双引号**（PowerShell 会吃掉内层引号，存进去的命令被截断——本轮 `obs:6132` 因此作废并已 archived）。

---

## 3. 项目当前推进状态（截至 2026-10-31）

### 3.0 遗留项处置批次（2026-10-31，CP-8）

| 项                          | 判定                          | 关键结论                                                                                                                                              |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| R21 字节级复核              | ✅ **复核通过**（遗留项闭合） | `d7a0113` 唯一语义变更 = `externals.trace: false`，其余 74 行为缩进规范化；分支已推送（origin = `d7a0113`）；R21/R22 各落 ✝️ 节（提交 `6175702`）     |
| R48 钉 unstorage            | ✅ **verified（全保真规避）** | nitro 2.13.5 + unstorage 1.17.5 ⇒ build exit 0 / 探针 13/13 / 5 条 bundled cache 与 control 同形态；override 为 workspace 全局钉，nitro 升级须重评    |
| R49 content 2.14.1          | ❌ **判负（同签名 500）**     | prerender 500 与 R46 逐字节同构 ⇒ content 升级不能规避；**R45「构建全绿」归因收窄到 Nuxt 4 renderer 模板**（不是 content 2.14.1 的功劳）              |
| R50 payloadExtraction:false | ✅ **verified（形态订正）**   | 字面「拦截改写 key」结构性不可达（prefixStorage 内联校验 + payloadCache 模块作用域持有）；可行形态 = 调用点消除：build exit 0 / 探针 13/13 / SSR 完好 |
| 隔离目录搬移                | ✅ 完成（物理删除待用户）     | 48 个 `*.stale-*` 目录移出仓库进 `D:\code\ruan-cat\_repro-nm-quarantine`（before=48 / after=0 实证）                                                  |

⇒ **R46 三规避方向全部闭环：A ✅（推荐，全保真）/ B ❌（排除）/ C ✅（牺牲 payload 静态化）**，见 [FINDINGS #33](./experiments/FINDINGS.md)。三个实验分支（`experiment/r48-pin-unstorage-1175` `5e458e1` / `experiment/r49-content-2141-nitro-2135` `89c1534` / `experiment/r50-payload-extraction-off` `dac335d`）均**本地未 push**。

### 3.1 阶段结论：C 类未启动实验池**已清空**

QUEUE 表 4 归零；未启动 + 阻塞池仅剩 **R11**（常驻阻塞）。

| 实验   | 判定                         | 关键结论                                                                                                              |
| ------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| R35/36 | ❌ 判负（零部署额度）        | 根 `vercel.json` 的作用域由 **Project 的 Root Directory** 决定 ⇒ **F38 的交叉污染双向不可复现**；F39 单槽绑定保持成立 |
| R37    | ❌ 判负（零部署额度）        | `--prebuilt` 只认 `join(cwd, project.rootDirectory, '.vercel/output')` ⇒ 搬运到 repo root **不是受支持的路径**        |
| R38    | ❌ 判负 + **原变量不可执行** | `preserveSymlinks` **不是** Vercel 开关，而是 Node 运行时选项；Vercel 侧真正可控变量是 `vercel build --standalone`    |
| R46    | ✅ **阳性复现（阻断级）**    | nitro 2.13.5 → `unstorage@1.17.6` 的 key 校验收紧（`normalizeKey("/")` → 空串 ⇒ falsy ⇒ 判非法）                      |

### 3.2 最重要的一条：R45 归因已被订正

R45 判负（阻断级）**仍然成立**，但根因**不是**「Nuxt 4 世代」本身，而是
**nitro 2.13.5 经 `unstorage@1.17.6` 与 content v2 的 `"/"` key 约定冲突**
⇒ **Nuxt 4 迁移的变量面必须拆开评估**（Nuxt 4 本身 / content 2.14.x / nitro 2.13.5 各自独立）。

同一根因两种表象，只取决于该 `setItem` 有没有被 catch 包裹：

- content runtime 的 `.catch(() => {})` 吞掉异常 ⇒ R45 表现为「**构建全绿 + 内容库为空**」
- nitro prerender 的 `setItem` 未被包裹 ⇒ R46 表现为「**构建直接 500**」

### 3.3 台账与证据入口

| 要查什么              | 去哪                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| 实验状态总表          | `docs/task-artifacts/experiments/QUEUE.md`（表 1 已完成 / 表 3 仅 R11 / 表 4 已清空） |
| 横向发现              | `docs/task-artifacts/experiments/FINDINGS.md`（至 **#32**）                           |
| 阶段计划与 checkpoint | `docs/task-artifacts/experiments/C-PHASE-EXECUTION.md`（**CP-0 …… CP-7 全 ✅**）      |
| 时间线快照（追加式）  | `docs/task-artifacts/progress.md`                                                     |
| 单实验档案            | `docs/task-artifacts/experiments/R{xx}.md`                                            |
| 原始证据              | `evidence/`（`evidence/README.md` 有索引，2026-10-30 已补齐 16 份）                   |
| 仓库纪律              | `AGENTS.md`（§0.5 node_modules 隔离 SOP、§4 交叉引用、§5 契约纪律、Vercel 部署事实）  |
| 分支合并评价          | `docs/task-artifacts/experiments/BRANCH-MERGE-EVALUATION.md`                          |

### 3.4 代码与提交状态（2026-10-31）

- 本地 main 链：`6cfae72`（AGENTS 零额度路径）→ `f927b54`（HANDOFF 建立）→ `6175702`（R21 复核落档）→ `bd9cf26`（R48/R49/R50 落档 + FINDINGS #33 + CP-8）→ `ef5c6f9`（HANDOFF 批次更新）→ `5e12b74` / `f916e51` / `dfa1bb2`（台账落地补漏 / 分支登记全量化 + DoD 升格 / 分支现场审计补齐）——**全部已于 2026-10-31 推入 origin/main（tip = `dfa1bb2`）**。注：后 3 笔在 push 前按 git-commit 技能重写过 trailer（旧 SHA `ec14532` / `0f4737e` / `276d3b0` 已废，树逐字节一致；旧 SHA 曾被 memorix 记录引用，对照关系见 continuity 台账）。
- 实验分支（**已推送备份**，2026-10-31）：`experiment/r48-pin-unstorage-1175`（`5e458e1`）、`experiment/r49-content-2141-nitro-2135`（`89c1534`）、`experiment/r50-payload-extraction-off`（`dac335d`）、`experiment/r46-nitro-2135-bump`（`b1e0bb8`）、`experiment/nuxt4-generation-migration`（未推送）等；三平台工作流触发实证见 §4 第 9 条。
- 验证基线：契约直跑 **26/26 PASS**；main 工作区 node_modules 已 frozen 重建回 control 态（nitropack 2.13.4 / nuxt 3.21.2，`.pnpm` = 1295 含实验期新增版本缓存，属健康）。
- **2026-10-31 里程碑验证基线（两轮）**：①`ef5c6f9` push——CI run `41168485031` 三 job 全绿，双 Project 部署 **READY**（docs `dpl_3v75GqYt4TRSqWzXcuJ2KCQxj2up` / api `dpl_CG1NSjTjmP8BFA8mKsNwkYS31Rfm`）；②`dfa1bb2` push——CI run `41177909466` **success（2m11s）**，生产内容断言复验全绿且与 ①**逐项同量**（docs 首页 ×7 / 107519 B、api `/v1/health` `ok:true`、`/v1/runtime` `node v22.23.4 / nitro3-h3v2 / linux`、`/api/_content/query` 200 / 11927 B——docs-only 提交不改变运行时内容，符合预期）。**F41 观察点**：Linux job 连续绿、无 symlink 驱动故障 ⇒ 维持被动观察。

---

## 4. 遗留问题清单（= memorix continuity 台账的 requirements，2026-10-31 更新）

| #   | 遗留项                                                                     | 解除条件 / 备注                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~R21 提交未字节级复核~~                                                   | ✅ **已闭合（2026-10-31）**：复核通过，唯一语义变更 = `trace: false`（提交 `6175702`）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2   | ~~R46 三个规避方向未验证~~                                                 | ✅ **已闭合（2026-10-31）**：R48 ✅ 全保真 / R49 ❌ 排除 / R50 ✅ 调用点消除（[FINDINGS #33](./experiments/FINDINGS.md)，提交 `bd9cf26`）                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 3   | **F41 未单独验证**                                                         | Windows 本地 vs Vercel Linux 的 symlink 行为差异 → 留给 CI 的 Linux job 观察点（2026-10-31 里程碑 push 的 CI run 是最新观察窗口）                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 4   | **R11 常驻阻塞**                                                           | 无证据驱动目标；解除条件 = **捕获首个 SSR externalization 错误**后重启（R48/R49/R50 三轮均未产生该错误签名，阻塞维持）                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 5   | **隔离目录物理删除**                                                       | 48 个 `*.stale-*` 已移出仓库进 `D:\code\ruan-cat\_repro-nm-quarantine`（agent 侧动作完成）；**物理删除必须由用户执行**                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6   | **下一阶段候选（未入队）**                                                 | Nuxt 4 迁移变量面两轴：renderer 模板轴（R49 给出有利证据）与 content runtime 吞异常轴（R45 阻断仍在）需各自独立实验；编号从 R51 起                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7   | **上游修复行动项（未启动，需用户授权）**                                   | **彻底修复路径已定案**：本仓基线（nitro 2.13.4）不含缺陷、无需立即修；恢复 nitro 升级能力 = 短期按方向 A 钉 `unstorage` 1.17.5（[R48.md](./experiments/R48.md) verified）→ **上游修复**（unstorage 恢复 1.17.5 宽松校验语义 / 或 content 改 `"/"` key 约定 / 或 nitro 回退 unstorage 上界）→ 解除钉。上游 issue 最小材料可由 [R46.md](./experiments/R46.md) 字节级取证 + R48/R49/R50 + [evidence/2026-10-31-……](../../../evidence/2026-10-31-r48-r50-r46-mitigation-directions.md) 直接组装（evidence-policy「上游 issue 最小材料」纪律）；**向 GitHub 提 issue 属对外动作，须用户授权后执行** |
| 8   | **档案假设级 claim 的配套验证（2026-10-31 已补 ✝️ 标注，验证实验未入队）** | 四处推断级表述已显式标注：①[R50.md](./experiments/R50.md)「运行时 SSR 兜底」= Nuxt 语义推断，**无客户端导航/payload URL 级实测**；②[R49.md](./experiments/R49.md) renderer 归因 = 排除法推断，**未做 Nuxt4/Nuxt3 renderer.mjs 字节级对比**（两子机理「键形态 / 异常包裹」未分辨）；③[R48.md](./experiments/R48.md) / R49 / R50 全部**仅 Windows 单平台**，Linux artifact closure（G12）未执行——采纳进基线前必须补；④[R45.md](./experiments/R45.md)「吞异常」环节 = 代码路径 + 终态反推，无运行时实录                                                                                           |
| 9   | ~~实验分支远端备份~~ ✅ **已推送（2026-10-31，用户指令）**                 | `experiment/r46-nitro-2135-bump` / `r48-pin-unstorage-1175` / `r49-content-2141-nitro-2135` / `r50-payload-extraction-off` 四分支已推 origin；**「分支 push 不触发工作流」已由三处 CLI 实证**（非仅 B1 先例）：GitHub Actions `ci.yaml` 触发器 = `pull_request` + `push: main` + 手动 ⇒ 分支零 run；Vercel 部署列表零新增（preview 未启用）；CF Workers Builds trigger `branch_includes: ["main"]` ⇒ 分支不可触发。分支的预期成功/失败仍以本地构建实证为准（r49 的预期失败 = prerender 500 已实测）                                                                                            |
| 10  | ~~F48 独立编号与否~~ ✅ **已立号（2026-10-31，用户拍板）**                 | [failure-catalog](../failure-catalog.md) 新增 **F48**（unstorage 1.17.6 key 校验 × content v2 `"/"` key 冲突，本仓已复现 R46 阳性）；status-matrix 标题与行同步；引用回改完成：R45/R46/R48/R49/R50 五档案头部 + FINDINGS #28/#32/#33 交叉引用 + BRANCH-MERGE-EVALUATION 五行代表故障列 + F45 ✝️ 指针                                                                                                                                                                                                                                                                                           |

---

## 5. 下一个 agent 的起步纪律（摘自 `AGENTS.md`，别踩）

1. **先体检 node_modules**：`.pnpm` ≈ 1209 + `apps/docs/node_modules/nuxt/bin/nuxt.mjs` + `packages/shared-core/node_modules/typescript/bin/tsc` 三项全绿才开工；不健康才隔离重建（**根 + 4 个包级一起移**，命名 `node_modules.stale-*`）。
2. **构建必须串行**，同一工作区禁止并发构建。
3. **build 绿 ≠ 通过**：必须起 `.output/server/index.mjs`、先验 `Listening` 行、再做**响应体内容级断言**（`pnpm probe:content`，13 项）。
4. **探针纪律（F49）**：端口占用即拒绝 + 应答者身份校验；新写探针必须沿用这两道门。
5. **验收不得只看 HTTP 200**（F47 的 200 假阳性）。
6. **实验纪律**：单变量；首轮 `exit 1 + Invalid URL` 一律判废、按 SOP 干净重测；历史归档文档**只追加不改写**。
7. **提交纪律**：中文 Conventional Commits + emoji（权威 `commit-types.ts`：`docs` 📃 / `test` 🧪 / `fix` 🐞 / `config` 🔧）+ `Assisted-by: Mavis / MiniMax-M3` + `Co-authored-by: MiniMax <model@minimax.io>`；每笔提交后 `git show --name-only HEAD` 核验实际文件集合。
8. **push 纪律**：push = 2 次生产部署 ⇒ 批量本地 commit，**验收里程碑才 push**。

---

## 6. 环境速查

- 本机：Windows / PowerShell 5.1 / Node v22.23.1 / pnpm 10.33.0 / Vercel CLI 58.11.0 / tsx 4.21.0 / memorix v1.9.10（`MEMORIX_EMBEDDING=off` ⇒ BM25）
- 团队：`ruancat-projects` / `team_cUeGw4TtOCLp0bbuH8kA7BYH`
  - docs project `prj_nRhiR3d9kkcWp8U9prKNUh5cHdt1`（Root Directory `apps/docs`，framework nuxtjs）
  - api project `prj_AAGUVMU0BfCce4ydRp8MmTdAYc5b`（Root Directory `apps/api`，framework nitro）
- 自定义域名（**可绕过团队 SSO** 做公网冒烟）：
  - `https://shadcn-docs-nuxt-production-repro-docs.vc.ruan-cat.com/`
  - `https://shadcn-docs-nuxt-production-repro-api.vc.ruan-cat.com/`
- 契约直跑：`node --test tests/*.test.mjs`（当前 **26/26 PASS**）

---

### 维护记录

- **2026-10-30**：本文件建立（C 类阶段收口）。对应 memorix 工件 `obs:6130`（阶段纪要）/ `obs:6133`（交接工件）/ continuity 台账 `bc1b3527-3223-4f6e-bd46-b493fa6191c1`。
- **2026-10-31**：遗留项处置批次收口（CP-8）——R21 复核闭合 + R48/R49/R50 三规避方向实证（[FINDINGS #33](./experiments/FINDINGS.md)）+ 隔离目录 48 个移出仓库。memorix 交接工件更新为 `obs:6135`（`obs:6133` 此前已 archived）。§3/§4 已重写为本批状态。
