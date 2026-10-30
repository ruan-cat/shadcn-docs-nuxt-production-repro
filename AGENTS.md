# AGENTS.md

## 本项目的技能表

- `record-bug-fix-memory` — `.agents/skills/fix-bug/record-bug-fix-memory/SKILL.md` — bug 修复后的经验与事故记录沉淀（非调试流程本身）。
  - **存储架构**：双层存储。SKILL.md 只放流程指导和摘要索引，详细案例存储在同目录下的独立 `YYYY-MM-DD-{slug}.md` 文件中。
  - **阅读方式**：使用此技能前，先读 SKILL.md 了解流程，再根据「案例索引」章节按需读取相关的独立案例文件。
  - **写入方式**：新增经验时，创建独立案例文件，同时在 SKILL.md 的「案例索引」追加摘要。禁止将完整事故正文写入 SKILL.md。

## 项目目的

这是一个用于复现 `shadcn-docs-nuxt` 生产级复杂集成问题的实验仓库，不是普通业务项目。

## 开始工作前必须阅读

1. `docs/task-artifacts/README.md`
2. `docs/task-artifacts/failure-catalog.md`
3. `docs/task-artifacts/experiment-matrix.md`
4. `docs/task-artifacts/pr-roadmap.md`
5. `docs/task-artifacts/acceptance-gates.md`
6. `docs/task-artifacts/evidence-policy.md`

## 基线纪律

- `main` 应保持 control 状态。
- 不得在基线随意加入 `trace:false`、blanket `noExternal`、blanket `inline`、`routes.clear()`、hoisted linker 等 workaround。
- 核心依赖升级必须作为独立实验，Nuxt 3 -> Nuxt 4 必须按整体兼容矩阵迁移。
- 不允许手改 `node_modules` 作为修复。
- 不允许只用 Turbo cache hit 作为 fresh build 证据。

## 实验纪律

- 每个 PR 优先只改变一个主要变量。
- PR body 必须写 control SHA、唯一变量、第一失败门、依赖解析和跨平台结果。
- 失败实验可以关闭不合并，不要为了让 CI 绿色而污染实验变量。
- 必须区分历史事故与本仓新复现结果。

## 验收纪律

`build success` 不是最终验收。至少检查：

- Content cache/search；
- standalone artifact startup；
- HTTP runtime；
- 实际 H3 / @nuxt/kit 解析；
- Windows/Linux 差异。

## 文档语言

仓库任务工件、实验报告、PR 说明默认使用中文。

## Git 提交

默认使用中文 Conventional Commits，并遵循 ruan-cat `git-commit` 规则中的 type/emoji 映射。不要凭记忆猜 emoji，提交前应读取权威 `commit-types.ts`。

## Vercel 部署事实（2026-09-30）

- 团队 `ruancat-projects`，Git Integration 主链，生产分支 `main`；push 即触发双 Project 生产部署（注意部署额度，批量本地 commit、验收里程碑才 push）。
- `shadcn-docs-nuxt-production-repro-docs`（root `apps/docs`，nuxtjs）与 `shadcn-docs-nuxt-production-repro-api`（root `apps/api`，nitro）：Install `pnpm install --frozen-lockfile`、Build `turbo run build --filter=@repro/<pkg>...`、Output `.vercel/output`、Node 22.x。
- 本地 link 分目录单槽（`apps/docs` / `apps/api` 各自 `.vercel/project.json`），不得同目录反复 link 覆盖。
- 环境变量零依赖；不做根 `vercel.json`（F38）；F47：Content API 在 vercel/cloudflare_module preset 下 200 假阳性失效，node-server 正常——验收必须做响应体内容断言。
- 部署 URL 受团队 SSO 保护，公网冒烟用 `vercel curl --yes` 或接入自定义域名。
- 证据：`evidence/2026-09-30-vercel-deploy-e2e.md`。

## Cloudflare Workers 部署事实（2026-09-30，机制修正版）

- 部署机制 = **Cloudflare Workers Builds 识别 GitHub 更新**（用户方向修正：禁止 GitHub Actions 部署链；原 `deploy-cloudflare.yaml` 已删除，运行记录已清理）。
- 双 Worker：`shadcn-docs-nuxt-production-repro-docs`（apps/docs/wrangler.jsonc）与 `shadcn-docs-nuxt-production-repro-api`（apps/api/nitro.config.ts `cloudflare.wrangler` 配置，nitro 3 生成 worker 配置）。
- 自定义域名经 wrangler `routes.custom_domain` 声明（`…docs.cf.ruan-cat.com` / `…api.cf.ruan-cat.com`），已绑定并自动建 DNS。
- Workers Builds 连接与构建命令经 **cf CLI**（`cf builds repos connections upsert` + `cf builds workers create`）完成——按 script-tag 寻址（非 worker 名）；改配置用 `cf builds workers update`，勿再走 Dashboard。
- F47：Content API 假阳性在 workerd 本地/远端 + Vercel 三处一致（node-server 正常）——验收必须做响应体内容断言。

## 历史源文档存档（2026-10-17 迁移）

- 历史源文档 4 份（Lucide 排除性调研、复用计划、Vercel 部署 spec/plan）已 byte-identical 迁移入仓 `docs/history/shadcn-docs-nuxt/`，索引与吸收状态映射见 `docs/history/README.md`。
- 迁移副本是历史存档，不随实验状态更新；**现行状态与结论一律以 `docs/task-artifacts/` 与 `evidence/` 为准**，不得引用历史副本中的过时数据作为验收依据。
- 外部源目录 `D:/store/WorkBuddy/2026-6-30-common/docs/shadcn-docs-nuxt/` 仅作 provenance 保留。

## 标准测试 SOP（防 AI 重犯错）

> 详尽的 7 步复现流程见 `docs/task-artifacts/experiments/SOP.md`，本节约为其**不可妥协的 AI 执行纪律**（缺漏即判违规）。本节约针对 2026 多轮"污染态误判 / node_modules 破损 / 档案台账脱节"事故设立，确保任意会话、任意上下文压缩后的 AI 都能复现同一正确流程，不再踩同一坑。

### 0. 前置：永远先独立核验 `node_modules` 健康度（防伪信号第一关）

- 开工前**不要盲信上一次"环境已 clean"的声明**，必须独立核验：
  - `ls node_modules/.pnpm | wc -l` 应 ≈ 1200（正常 ~1210）。若为 1 或远小于此，说明上次实验（尤其 `nodeLinker: hoisted`）留下了扁平破损布局，须先修复。
  - `apps/docs/node_modules/nuxt/bin/nuxt.mjs` 与 `packages/shared-core/node_modules/typescript/bin/tsc` 必须存在；缺失即破损。
- 异常时先恢复再开工：`mv node_modules node_modules.broken-<date>` → `pnpm install --frozen-lockfile`（timeout 600）→ 复验 `.pnpm` 恢复 ~1200、nuxt.mjs/tsc 恢复。

### 1. 复现必须前台执行

- 含构建/清理的复现一律**前台**运行，禁止后台任务（harness `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 守卫会拦截后台批量删除，曾实测拦截 `.nuxt/dist` 清理 549 文件）。后台跑出的结果不可采信。

### 2. 严格走 SOP 7 步，隔离改名而非删除

- `git checkout experiment/<br>` → `mv node_modules node_modules.stale-<br>`（**改名隔离，勿 rm**）→ `pnpm install --frozen-lockfile` → `build:packages && docs build`（默认 timeout 480s，长尾可加大但**必须记录实际 timeout 与退出码**）→ 启 `.output` 先验 `Listening` 行再 curl 内容断言 → 写 `R{xx}.md` → `git checkout main` → 定向清理 `node_modules.stale-*`。
- timeout 失败（exit 124）≠ 真实故障结论：R18/R19 首轮即因 480s 上限 exit 124（timeout 假象），重测加大 timeout 后须如实记录，不得把 timeout 失败当故障证据。

### 3. `git checkout main` 不还原 gitignored 的 `node_modules` —— 必须显式重建

- 实验若改了 `pnpm-workspace.yaml`（如 `nodeLinker: hoisted` / `publicHoistPattern`），`git checkout main` **不会**还原 `node_modules` 布局。回 main 后必须 `pnpm install --frozen-lockfile` 并复验 `.pnpm` ~1200 + nuxt.mjs/tsc 存在，确认回到 symlinked 默认态，否则下一实验会被伪故障污染。

### 4. 档案与台账三处同步（杜绝"分支落档、main 看板滞后"）

- 每完成一实验立刻同步三处，缺一即 DoD 未达成：
  1. `R{xx}.md` 档案填齐（执行记录表、结论、`candidate`/`verified` 标注）；
  2. `QUEUE.md` 从"待重测/污染态判废"移入完成态，注明落档分支；
  3. `FINDINGS.md`（如有横向发现）同步，**条目号与 Rxx.md 正文交叉引用必须一字不差**（曾发生 `#20` 与 `## 19.` 错位误导结论）。
- 落档在分支上的实验，必须在同步到 main 的同一批提交里更新 QUEUE/FINDINGS，禁止"分支落档即算完成"而 main 看板滞后。

### 5. 契约与响应体断言是事实，不是意见

- 契约测试（`tests/baseline-safety.test.mjs`）把 `pnpm-workspace.yaml` 当**纯文本**子串匹配：`forbidden = ["nodeLinker: hoisted", "publicHoistPattern"]` 是 camelCase 字面量（非 pnpm 合法 kebab 键）。pnpm 对非法键零警告 → 这是**治理盲区**，命中即违约，须如实记录，不得因"pnpm 没报错"而判绿。
- 冒烟验收必须做**响应体内容断言**（Content cache/search 命中），不只看 HTTP 200——F47 证明 node-server/worker/Vercel 均存在 200 假阳性。

### 6. 污染态判废项重测：不复用旧分支、隔离、串行

- 首轮 `exit 1 + Invalid URL` 一律判废，按 SOP 干净重测后才可采信（参照总检报告 §3.1 对 r05-r17 首轮批处理的判废依据）。
- 重测**不复用**被污染旧分支（旧分支曾混入无关文档），应从当前 main 起新分支、只加单变量、不改为过契约。
- OOM / 长尾实验（R20-R26 等）必须 timeout + **串行**，绝不并发——并发引入资源竞争噪声，污染单变量结论。
