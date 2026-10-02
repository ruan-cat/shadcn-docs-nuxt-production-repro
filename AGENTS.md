# AGENTS.md

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
