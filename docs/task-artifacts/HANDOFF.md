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

| 用途         | 类型                | ID / 句柄                                      | 何时用                             |
| ------------ | ------------------- | ---------------------------------------------- | ---------------------------------- |
| 阶段收口纪要 | `what-changed`      | `obs:6130`                                     | 要本轮的完整结论与原始数据         |
| **交接工件** | `what-changed`      | `obs:6133`                                     | **下一个 agent 的第一读**          |
| 遗留项台账   | `continuity ledger` | `bc1b3527-3223-4f6e-bd46-b493fa6191c1`（open） | 查「还剩什么、已定了什么」         |
| 本次会话     | `session`           | `sess-mvuyu5hn-kr39xz`                         | 追溯本次会话                       |
| 旧交接工件   | `what-changed`      | `obs:6132`（**已 archived**）                  | 引号转义被破坏导致命令被截断，作废 |

> 检索用 `memorix memory detail --id 6133` 取全文。

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

## 3. 项目当前推进状态（截至 2026-10-30）

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

### 3.4 代码与提交状态

- `main` = `6cfae72`（本地）｜`origin/main` = `a166cad` ⇒ **本地领先 1 笔**（`6cfae72` = AGENTS.md 增补「Vercel 零额度取证路径」，按部署额度纪律与下一里程碑合并推送）。
- 本轮 6 笔提交：`d67adaa` R35-R38 落档 → `6562663` R46 落档 → `90d70da` 交叉引用守卫 → `309e8f0` 阶段收口台账 → `a166cad` 契约计数订正 → `6cfae72` AGENTS.md 零额度路径。
- 实验分支（均**未 push**）：`experiment/r46-nitro-2135-bump`（`b1e0bb8`）、`experiment/nuxt4-generation-migration`、`experiment/r21-windows-only-trace-false`（`d7a0113`，未复核）、`experiment/r32-debug-esm-cjs` 等。
- 验证基线：CI `run 41056802246` **全绿**；生产双 Project 部署 **READY @ `a166cad`**；生产内容断言通过（docs 首页「生产级复现实验室」×7、api `/v1/health` = `ok:true`、api `/v1/runtime` = `node v22.23.4 / nitro3-h3v2 / linux`）。
- 契约直跑：`node --test tests/*.test.mjs` → 当前 **26/26 PASS**（原 19 + 新增 FINDINGS 交叉引用守卫 7）。

---

## 4. 遗留问题清单（= memorix continuity 台账的 requirements）

| #   | 遗留项                     | 解除条件 / 备注                                                                                                 |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | **R21 提交未字节级复核**   | `experiment/r21-windows-only-trace-false` / `d7a0113`（仅本地）；R22 遗留项闭合时只能就「零裸导入」一条给出解释 |
| 2   | **R46 三个规避方向未验证** | 钉 `unstorage` 1.17.5 / 升级 content 避开 `"/"` key / 应用层拦截改写该 key —— 各自需**独立实验**                |
| 3   | **F41 未单独验证**         | Windows 本地 vs Vercel Linux 的 symlink 行为差异 → 留给 CI 的 Linux job 观察点                                  |
| 4   | **R11 常驻阻塞**           | 无证据驱动目标；解除条件 = **捕获首个 SSR externalization 错误**后重启                                          |
| 5   | **隔离目录物理清理**       | `node_modules.stale-*` / `.output.stale-*` 等 ⇒ **必须由用户 / 主代理删除**（运行时硬安全策略拦截 agent 删除）  |
| 6   | **main 领先 1 笔待推送**   | `6cfae72`；push 触发双 Project 生产部署 ⇒ 与下一里程碑合并推送                                                  |

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
