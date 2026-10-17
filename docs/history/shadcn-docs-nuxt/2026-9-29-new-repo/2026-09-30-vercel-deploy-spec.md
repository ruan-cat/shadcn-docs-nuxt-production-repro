# 2026-09-30 Vercel 双 Project 部署 Spec（shadcn-docs-nuxt-production-repro）

> Agent 工具：ZCode（CLI）
> AI 模型：GLM-5.3-Flash（account:bigmodel-start-plan/GLM-5.3-Flash）
> 指导技能：`use-vercel-deploy-in-monorepo` v2.2.0（SKILL.md + 6 references + templates 全量阅读）
> 状态：**待用户审核，未执行任何部署写操作**

## 1. 目标与范围

将 `ruan-cat/shadcn-docs-nuxt-production-repro`（本地 `D:\code\ruan-cat\shadcn-docs-nuxt-production-repro`，main 基线 `a740604`）部署到 Vercel，与既有 Cloudflare Workers 链路并列构成双平台部署验证面：

- **Project A（docs）**：`apps/docs`——Nuxt 3.21.2 + shadcn-docs-nuxt 文档站；
- **Project B（api）**：`apps/api`——独立 Nitro 3 beta API。

硬约束（继承任务与仓库纪律）：

1. 正式交付链**只有 Vercel Git Integration**（push → clone → install → build → output → READY → URL 冒烟）；本地 CLI upload / Prebuilt / MCP 触发仅作辅助诊断，不得作为验收。
2. 同仓双 Project 分别独立创建、连接、验收，**不得由一个的成功推导另一个**。
3. 不创建根 `vercel.json`（保持 D01 控制组条件；F38 多项目根配置污染是仓库在册故障域）。
4. 不做 `.vercel/output` 根搬运、不启用 `--dereference`（F40/F41 域，本轮无模式 A 需求）。
5. 共享环境变量默认零依赖；unlink/删除/改值一律不在授权范围。

## 2. 拓扑决策：模式 B（子包直接产物）

`monorepo-deployment-patterns.md` 给出两种拓扑。选择 **模式 B**：

| 决策项           | Project A（docs）                                      | Project B（api）                                           |
| ---------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| Root Directory   | `apps/docs`                                            | `apps/api`                                                 |
| Framework        | `nuxtjs`                                               | `nitro`                                                    |
| Install Command  | `pnpm install --frozen-lockfile`                       | 同左                                                       |
| Build Command    | `turbo run build --filter=@repro/docs...`              | `turbo run build:vercel --filter=@repro/api...`（见 §3.3） |
| Output Directory | `.vercel/output`                                       | `.vercel/output`                                           |
| 生产分支         | `main`                                                 | `main`                                                     |
| Git 仓库         | `ruan-cat/shadcn-docs-nuxt-production-repro`（github） | 同左                                                       |

模式 B 依据：两个 Project 的 Root Directory、安装、构建、产物口径都是子包本地口径，无根产物需求；模式 A 的根搬运任务（`move-vercel-output-to-root` + symlink/dereference 边界）只增加 F40/F41 风险面，本轮明确不引入。

Root Directory 在创建时随 Project 一次写全（不走 PATCH）：技能规定 rootDirectory 不在既有 Project 的默认 PATCH allowlist，但**创建 API schema 明确包含 `gitRepository` 与 `projectSettings.rootDirectory`**，满足 Git 连接门禁的前置条件 1；前置条件 2（用户明确授权创建并连接仓库）由本次 spec/plan 审核提供。

## 3. 关键决策与证据

### 3.1 Node 版本：22.x

- 证据：仓库根 `engines.node = ">=22.14.0 <23"`；`packageManager = pnpm@10.33.0`；本地实测 Node 22.23.1 全链绿。
- 团队现状：既有项目 22.x/24.x 混用，无强制因素指向 24.x。
- 结论：两个 Project `nodeVersion = 22.x`，随创建写入并 GET 回读。

### 3.2 Install Command`pnpm install --frozen-lockfile`

- 仓库控制组纪律即 frozen lockfile（`baseline-contract`/`ci-contract` 契约测试强制）；显式声明使安装层行为可审计。
- monorepo 行为：Root Directory 设置后 Vercel 在**仓库根**执行 Install Command（lockfile 在根），Build Command 在 Root Directory 执行——E2E 时以构建日志核验该口径。

### 3.3 Build Command 与 workspace 依赖闭包（本 spec 最关键设计点）

docs 与 api 的构建都依赖 workspace 包产物：docs 消费 `@repro/ui` 的 `dist/repro-ui.js` 与 `dist/repro-ui.css`（css 导出是本轮新增能力）；api 消费 `@repro/shared-core` 的 `dist`。技能要求跨包依赖用 Turbo DAG 表达（`dependsOn` + `outputs`），**禁止多步 shell 串接**。

- **docs**：`turbo run build --filter=@repro/docs...`——`--filter=...` 语法把 shared-core、ui 纳入依赖闭包并按 `^build` 拓扑排序；turbo 从 `apps/docs` 向上解析根 `turbo.json`。Nuxt 构建在 Vercel 环境（`VERCEL=1`）由 Nitro 自动探测 vercel preset，产物落 `apps/docs/.vercel/output`。
- **api**：优先方案 A——为 `turbo.json` 新增 `build:vercel` 任务（`dependsOn: ["^build"]`，`outputs: [".vercel/output/**"]`），Build Command = `turbo run build:vercel --filter=@repro/api...`，显式调用 api 已有的 `build:vercel` 脚本（`nitro build --preset vercel`），确定性最高。
- **预验证降级路径**：计划阶段 1 会在本地用 `VERCEL=1` 实测两个构建（见 plan §阶段 1）。若 Windows 本地触发 F23（NFT trace 长尾）则记录证据并改为仅在 Linux/Vercel 侧验证；若 Nitro 3 自动探测失效，则 api 同样走显式 `build:vercel` 任务。**若实测证明两个应用 auto-detect 均可靠，api 也可退到零仓库变更方案（`turbo run build --filter=@repro/api...`）**——以实测证据定稿，不预设。

turbo.json 新增任务属基线基础设施变更（无契约测试约束 turbo.json），独立提交并过基线 CI 后才进入平台侧步骤。

### 3.4 Nitro serverDir 与 API 冒烟

`apps/api/nitro.config.ts` 已核对：`serverDir: "server"`（目录存在，含 `routes/v1/health.get.ts`、`runtime.get.ts`），`compatibilityDate: "2024-09-19"` 与技能契约一致。E2E 必须请求 `serverDir` 提供的业务 API：`/v1/health`（G9）。

### 3.5 环境变量：默认零依赖

- 两个应用构建与运行时均无需环境变量；不预设 `ENABLE_EXPERIMENTAL_COREPACK=1`（仅当 install 层报 pnpm engine 错误时按 shared-env reference 的完整 GET/link/回读流程条件化引入）；不预设 `VERCEL_DEEP_CLONE=true`（无 Git 历史依赖的构建逻辑）。
- 仍按 P0 门禁 7 执行三环境项目变量 + 共享变量审计（GET 确认为空/符合预期并记录）。

### 3.6 凭据与写路径边界

- Vercel CLI 58.11.0 已 OAuth 认证（`ruan-cat`，团队 `ruancat-projects`——只读侦察确认，无同名项目冲突）。
- 写路径优先级（技能固定）：CLI 专用命令（link/inspect/部署日志）→ `vercel api`（能力探测后使用）→ 直接 REST（仅 `VERCEL_TOKEN`，当前会话未确认存在）→ MCP 仅辅助**读取** → Dashboard 人工 gate。
- **绝不**读取/打印 CLI 私有认证文件与 token；REST 报告只列字段名与变更状态，不打印 body。
- Project 创建走 MCP/API 创建通道的前置条件：schema 含 `gitRepository`（✓ 已核）+ 用户授权（= 本次审核）。任一执行时点 schema 漂移或字段被拒 → 停止，转 Dashboard 人工 gate，不猜字段。

### 3.7 与仓库故障目录的对照（F38-F41 主动规避）

| 故障                                | 本 spec 的规避                                                            |
| ----------------------------------- | ------------------------------------------------------------------------- |
| F38 根 vercel.json 跨项目污染       | 不创建任何 vercel.json；仓库当前无此类文件（已核查）                      |
| F39 `.vercel/project.json` 单槽覆盖 | 分目录 link：`apps/docs` ↔ docs 项目、`apps/api` ↔ api 项目，两槽互不覆盖 |
| F40 产物搬运 symlink 边界           | 模式 B 无搬运环节                                                         |
| F41 Windows/Vercel preset 行为差异  | 本地 `VERCEL=1` 预验证仅作诊断；正式验收只认 Vercel Linux 构建产物        |

## 4. 验收门禁映射

- 技能 P0 门禁 1-10 与 P1 质量门禁：plan 逐阶段对应（见 plan 文档 §门禁映射表）。
- 首次 Git E2E checklist 13 项：plan 阶段 6/7 逐项落证据。
- 仓库侧 G 门：docs 冒烟含内容断言（`/guide/baseline` 标题 + Content API 响应体，非状态码——F18/记忆#17 纪律）；api 冒烟必须含 `serverDir` 提供的 `/v1/health`（G9）。
- 状态口径：未完成全部外部门前一律 `candidate/needs_check`，不写"生产通过"。

## 5. 待用户确认的决策点

1. **目标团队**：`ruancat-projects`（唯一团队，既有项目均在此）——确认或改个人空间。
2. **项目命名**：建议 `shadcn-docs-nuxt-production-repro-docs` / `shadcn-docs-nuxt-production-repro-api`（与仓库名对齐、无冲突）——可改短名。
3. **范围**：双 Project 一次做完（推荐，F38-F41 本就是仓库实验域）；或先 docs 后 api。
4. **创建方式**：MCP/API 创建一次写全（推荐，前置条件满足，Root Directory 随创建写入）；或 Dashboard 手动导入（我会给出逐字段配置表）。
5. **仓库侧变更授权**：`turbo.json` 新增 `build:vercel` 任务（若阶段 1 实测证明可省略则不提交）；以及收口阶段的 README/AGENTS/evidence/progress 提交推送。
6. **E2E push 授权**：push 到 main 触发生产部署（同时会触发 CF workflow——已实证优雅跳过，无副作用）。
