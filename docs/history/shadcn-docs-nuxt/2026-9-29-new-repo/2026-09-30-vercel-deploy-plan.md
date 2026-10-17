# 2026-09-30 Vercel 双 Project 部署 Plan（执行清单）

> **执行状态：✅ 已完成（2026-09-30）。** 用户六项决策审核通过后按本清单执行：
>
> - 阶段 1 ✅ `VERCEL=1` 预验证：双应用自动探测 vercel preset，**零仓库变更**，Build Command 定稿
> - 阶段 2/3 ✅ 双 Project 创建 + 三层回读（inspect 五字段 + link 对象 + PATCH 回读）
> - 阶段 4 ✅ 分目录单槽 link 双 ID gate PASS
> - 阶段 5 ✅ 两次里程碑 push（`e710f86` E2E 触发 / `c97ec3d` 收口）：Cloning+SHA+READY；api `/v1/health` 健康 JSON；docs 页面/SCSS/UI 存活；**Content API 双平台失效 → F47 升级 L3 三 preset 矩阵**
> - 阶段 6 ✅ 双 Project `envs: []` 审计 + Settings 终审
> - 阶段 7 ✅ README/AGENTS/evidence/progress 收口 + dev/main 同步（`c97ec3d` 双分支同 SHA）
> - 证据：仓库 `evidence/2026-09-30-vercel-deploy-e2e.md`
> - 部署额度纪律执行：共 2 次 push / 4 次生产部署，批量变更均本地 commit 沉淀

> 前置文档：[2026-09-30-vercel-deploy-spec.md](./2026-09-30-vercel-deploy-spec.md)（决策与依据）
> 指导技能：`use-vercel-deploy-in-monorepo` v2.2.0

## 附：2026-09-30 CF 机制修正与四域名任务（用户方向修正后追加）

**用户方向修正**：CF 部署必须走 **Workers Builds 识别 GitHub 仓库更新**（CF 侧 Git 集成），禁止 GitHub Actions 部署链；同时要求 4 个自定义域名（`*.vc.ruan-cat.com` → Vercel 双 Project，`*.cf.ruan-cat.com` → 双 Worker），并要求对等补齐 api Worker。

**已完成（commit `dbe4416`，main/dev 同步）**：

- 回退：删除 `deploy-cloudflare.yaml` + 3 条 GHA 运行记录（API 删除）+ 回退 wrangler devDep；`config!` 破坏性提交注明 BREAKING CHANGE
- api Worker 补齐：`apps/api/nitro.config.ts` `cloudflare.wrangler`（worker 名修正为 `shadcn-docs-nuxt-production-repro-api`——nitro 3 默认按路径自动生成的名字已覆盖；含 custom_domain route）；CF preset 构建本地验证 ✓
- docs Worker：`apps/docs/wrangler.jsonc` 增 custom_domain route
- Vercel 双域名 add + `verified: true`（`…docs.vc.ruan-cat.com` / `…api.vc.ruan-cat.com`）
- 权限边界实测（账号 token + user token）：Builds API `Invalid token/Not found`、DNS `10000`、Workers Domains 写 `10405`——均超 scope，**不得硬试**
- F47 第四格保留（GHA 时期的远端 workerd 证据，机制更替不影响行为事实）

**Dashboard 人工 gate（移交用户，约 5 分钟）**：

1. docs worker → Settings → Builds → Connect：选本仓库，Root Directory `apps/docs`，构建命令 `pnpm install --frozen-lockfile && pnpm build:packages && NITRO_PRESET=cloudflare_module pnpm --filter @repro/docs exec nuxt build`，生产分支 `main`
2. Workers & Pages → Create → Import a repository 建 api Worker：Root Directory `apps/api`，构建 `pnpm install --frozen-lockfile && pnpm build:packages && NITRO_PRESET=cloudflare_module pnpm --filter @repro/api exec nitro build`（worker 名自动取自 nitro 配置）
3. CF DNS（ruan-cat.com zone）加 2 条 CNAME：`shadcn-docs-nuxt-production-repro-docs.vc` 与 `…api.vc` → `cname.vercel-dns.com`（cf.* 两条由 Workers custom_domain 在首次部署时自动创建）

**连完后自动发生**：Workers Builds 首次部署 → `cf.*` 域名绑定 + DNS 自动创建 → 双 Worker 域名冒烟 → F47 矩阵终版。

## 门禁映射总表

| 技能门禁                                                        | 对应阶段                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| P0-1 侦察                                                       | 阶段 0（已完成只读部分：CLI 认证 / 团队 / 项目名冲突 / 仓库 vercel 配置清白 / nitro.config 核对） |
| P0-2 Git Integration 为正式主链                                 | 全程约束（spec §1）                                                                               |
| P0-3 双 Project 分别建 Git 连接 + 生产分支                      | 阶段 2 / 3 + 阶段 6 / 7 E2E 实证                                                                  |
| P0-4 Node 22.x 决策                                             | spec §3.1（已定，随创建写入）                                                                     |
| P0-5 CLI 单槽 link + 双 ID gate                                 | 阶段 4                                                                                            |
| P0-6 Settings 读取/比较/最小写回                                | 阶段 2/3 创建时一次写全 + GET 回读；无 PATCH 需求则记录"无需变更"                                 |
| P0-7 三环境变量 + 共享变量审计                                  | 阶段 8                                                                                            |
| P0-8 本地构建 + `.vercel/output` 检查                           | 阶段 1（预验证）+ 阶段 5                                                                          |
| P0-9 推送可识别 SHA 触发 Git E2E                                | 阶段 6 / 7                                                                                        |
| P0-10 README + AI 记忆收口                                      | 阶段 9                                                                                            |
| P1 质量门禁（.vercelignore/六层日志/Nitro serverDir/Turbo DAG） | 阶段 5 + 6/7 日志分诊                                                                             |
| 仓库 G 门                                                       | 阶段 5（G5-G6 本地）/ 6（G7 内容断言）/ 7（G9）                                                   |

每个阶段的中止条件统一为：任一验证命令失败或回读与期望不一致 → 停止、记录第一失败门（对齐 F44 纪律）、报告等待决策；不猜测替代 endpoint/字段，不重试超过 2 次。

---

## 阶段 0：前置确认（等待用户）

- [ ] 用户审核 spec §5 六个决策点并答复（团队 / 命名 / 范围 / 创建方式 / 仓库变更授权 / E2E push 授权）。
- [ ] 确认既有事实快照：main 基线 `a740604`；本地工作区干净；仓库无 vercel.json/.vercel/.vercelignore；CLI 58.11.0 OAuth 就绪；团队 `ruancat-projects` 无同名项目。

## 阶段 1：构建命令本地预验证（决定 §3.3 最终形态）

目的：把"Nuxt/Nitro 在 Vercel 环境自动探测 vercel preset"从假设变成证据，确定 Build Command 定稿与是否需要 turbo.json 变更。

```bash
# docs（Windows 本地，限时观察；若触发 F23 长尾则记录并转 Linux 侧验证）
VERCEL=1 pnpm --filter @repro/docs build     # 预期：apps/docs/.vercel/output 生成且非空
ls apps/docs/.vercel/output                   # functions/ static/ 存在性检查

# api
VERCEL=1 pnpm --filter @repro/api build:vercel   # 预期：apps/api/.vercel/output 生成
ls apps/api/.vercel/output
```

- 通过标准：两个 `.vercel/output` 均生成，`functions` 非空（api 按 serverDir 检查模板要求）。
- 分支决策：
  - 双双通过 → Build Command 定稿 docs=`turbo run build --filter=@repro/docs...`、api=`turbo run build --filter=@repro/api...`（**零仓库变更**）；
  - api 自动探测失效 → 提交 `turbo.json` 新增 `build:vercel` 任务（`dependsOn:["^build"]`、`outputs:[".vercel/output/**"]`），Build Command=`turbo run build:vercel --filter=@repro/api...`；独立提交 + 等基线 CI 绿后再进阶段 2；
  - Windows 触发 F23 长尾 → 记录证据，跳过本地预验证，Build Command 按显式方案定稿，正确性由阶段 6/7 的 Vercel Linux 构建实证。

## 阶段 2：创建 Project A（docs）

1. 写路径（按 spec §5.4 用户选择）：
   - **API/MCP 创建**：一次写全 `name` + `gitRepository{repo:"ruan-cat/shadcn-docs-nuxt-production-repro", type:"github"}` + `projectSettings{framework:"nuxtjs", rootDirectory:"apps/docs", installCommand:"pnpm install --frozen-lockfile", buildCommand:<阶段1定稿>, outputDirectory:".vercel/output", nodeVersion:"22.x"}`；teamId=`ruancat-projects`。schema 漂移/字段被拒 → 停止转 Dashboard。
   - **Dashboard 人工 gate**：按上表逐字段导入，我输出配置表并等待完成回执。
2. 回读验证（三层）：
   - `vercel api GET /v9/projects/<name>?teamId=<teamId>`（先 `vercel api --help` 能力探测）→ 逐字段比对 spec §2 表格；未返回的字段记"未返回"；
   - `vercel project inspect <name>` 交叉验证；
   - MCP `get_project` 辅助读取（仅读取，不作为写入证据）。
3. 记录：Project GET 的 `link` 对象实际字段（provider/org/repo/repoId）、`rootDirectory`、五 allowlist 字段、创建返回的 projectId/orgId（阶段 4 双 ID gate 输入）。
4. 创建若自动触发首个部署（来自 main HEAD）：记录 deployment ID/SHA/URL，但**只标 candidate**——正式验收在阶段 6。

## 阶段 3：创建 Project B（api）

与阶段 2 完全同构（framework=`nitro`、rootDirectory=`apps/api`、buildCommand 按阶段 1 定稿），独立回读、独立记录，不得复用 A 的证据。

## 阶段 4：本地单槽 link（双目录、双 ID gate）

```bash
cd apps/docs && vercel link --project <docs 项目名> --yes
cat .vercel/project.json        # projectId/orgId 与阶段 2 记录精确比对
cd ../api && vercel link --project <api 项目名> --yes
cat .vercel/project.json        # 同上与阶段 3 记录精确比对
```

- 通过标准：两个目录各自的 projectId/orgId 与远端记录完全相等；不一致立即停止。
- 说明：分目录 link 规避 F39 单槽覆盖；`.vercel` 已在 .gitignore。

## 阶段 5：本地辅助链核验（可选，仅诊断用途）

- 检查 `.vercelignore`：仓库无此文件 → 记录"无需"（Git 主链 clone 全仓，workspace 输入不缺）。
- 若阶段 1 已产出本地 `.vercel/output`：核对其 functions/static 结构（**只作本地辅助链结论，不关闭任何 Git E2E 项**）。

## 阶段 6：Git E2E — Project A（docs）

1. 触发：向 main push 可识别 commit（收口文档提交天然满足；或空提交标注 `vercel-e2e-docs`）。
2. 观测（`vercel inspect`/MCP 读部署 + 日志）：
   - 日志含 `Cloning`（或等价 checkout）且 commit SHA 与 push 一致 → Git 主链证据 1；
   - Install 层：确认在仓库根执行 `pnpm install --frozen-lockfile`、pnpm 10.33.0、Node 22.x；
   - Build 层：turbo DAG 顺序（shared-core → ui → docs）；
   - Output 层：`.vercel/output` 生成；
   - READY + 生产/预览 URL。
3. URL 冒烟（内容断言，非状态码）：
   - `/` HTTP 200 且非 404 shell；
   - `/guide/baseline` 200 且 `<title>` 为「绿色控制组 - ……」；
   - `/api/_content/cache.json` 与 `/api/_content/search`：**状态码 + 响应体断言**（Vercel Node runtime 下 Content API 预期可用；若呈现 F47 式 200+404shell 则登记新平台域发现）；
   - 首页含 `repro-runtime-card`（workspace UI + SCSS 链路在 Vercel 产物中存活的证据）。
4. 六层日志分诊树备用：上传/安装/构建/产物/运行时/域名，先确认部署来源是 Git clone。

## 阶段 7：Git E2E — Project B（api）

同构执行：push（或复用同一 commit 的自动部署）→ Cloning+SHA → install/build（shared-core → api build:vercel）→ `.vercel/output` → READY → **`/v1/health` HTTP 200 且响应体为健康 JSON**（serverDir 业务 API，G9；可加 `/v1/runtime`）。

## 阶段 8：环境变量与设置终审

- GET 两 Project 的项目变量（production/preview/development 三环境）→ 记录为空/符合预期；
- GET 团队共享变量列表 → 确认无需链接（如出现部署所需缺失项，按 shared-env reference 完整流程处理并停下报告，不擅自创建同名项目变量）；
- `vercel project inspect` 交叉验证终态设置；Settings 若有任何变更 → 用新的 Git 部署重新验收（旧部署不继承新配置）。

## 阶段 9：收口

- 仓库 `README.md` 增补最小 Vercel 部署章节（Project 名/用途、Git 主链/分支/Root Directory、framework/Node 选择理由、Install/Build/Output、变量状态、link 纪律、生产 URL + 最后 E2E commit/状态/日期）；
- `AGENTS.md` 等价更新（`CLAUDE.md`/`GEMINI.md` 若存在同步更新；三份全无则转 init-ai-md）；
- 新增 `evidence/2026-09-30-vercel-deploy-e2e.md`（双 Project 完整证据包：创建回读、双 ID gate、E2E 日志关键行、冒烟断言、deployment ID/SHA）；
- 更新仓库 `docs/task-artifacts/progress.md` + 工作区计划文档状态；提交推送（该 push 同时构成一次新的 Git 触发部署，顺势复验）；
- 未完成项一律标 `candidate/needs_check`。

---

## 执行预算与风险

- 预计提交：阶段 1 可能 1 笔（turbo.json，视实测）、阶段 9 共 1-2 笔（文档收口）。
- 风险登记：① install 层 pnpm engine 错误 → 按 shared-env reference 条件化处理 Corepack 变量（停下报告，不擅自建变量）；② docs 构建层 turbo 从子目录解析失败 → 改用根口径模式 A 评估（需重新过 spec 审核）；③ Windows 本地 `VERCEL=1` 构建 F23 长尾 → 仅记录，不阻塞正式链。
- 明确不做：根 vercel.json、产物搬运、`--dereference`、共享变量创建/删除、unlink、域名购买/变更、删除任何既有资源。
