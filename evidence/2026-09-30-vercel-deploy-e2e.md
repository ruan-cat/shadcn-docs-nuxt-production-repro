# 2026-09-30 Vercel 双 Project 部署 E2E 证据

> Agent 工具：ZCode（CLI）
> AI 模型：GLM-5.3-Flash（account:bigmodel-start-plan/GLM-5.3-Flash）
> 指导技能：use-vercel-deploy-in-monorepo v2.2.0（spec/plan 经用户六项决策审核授权）
> 触发 commit：`e710f86`（🐎 ci: 完成 Vercel 双 Project 创建与 link 门禁，推送触发 Git E2E）

## 1. 拓扑与设置（创建时一次写全 + 三层回读）

| 字段 | docs | api |
| --- | --- | --- |
| Project 名 | shadcn-docs-nuxt-production-repro-docs | shadcn-docs-nuxt-production-repro-api |
| ID | `prj_nRhiR3d9kkcWp8U9prKNUh5cHdt1` | `prj_AAGUVMU0BfCce4ydRp8MmTdAYc5b` |
| Framework | nuxtjs | nitro |
| Root Directory | apps/docs | apps/api |
| Install Command | pnpm install --frozen-lockfile | 同左 |
| Build Command | turbo run build --filter=@repro/docs... | turbo run build --filter=@repro/api... |
| Output Directory | .vercel/output | .vercel/output |
| Node | 22.x（创建默认 24.x → PATCH 回读 22.x） | 同左 |
| Git link | github / ruan-cat / repoId 1349549184 / productionBranch main（API GET 回读） | 同左 |

回读通道：MCP 创建/PATCH 响应 + `vercel project inspect`（双项目五字段全一致）+ `vercel api GET /v9/projects/<id>`（link 对象逐字段）。

Build Command 定稿依据（阶段 1 本地预验证）：`VERCEL=1` 下 docs（2m46s）与 api（947ms）均由 Nitro 自动探测 vercel preset 并生成 `.vercel/output`（functions/static/config.json），**零仓库变更**；turbo 自子目录解析根 `turbo.json` 正常。

## 2. 本地单槽 link 双 ID gate

```log
apps/docs/.vercel/project.json:
{"projectId":"prj_nRhiR3d9kkcWp8U9prKNUh5cHdt1","orgId":"team_cUeGw4TtOCLp0bbuH8kA7BYH"}
apps/api/.vercel/project.json:
{"projectId":"prj_AAGUVMU0BfCce4ydRp8MmTdAYc5b","orgId":"team_cUeGw4TtOCLp0bbuH8kA7BYH"}
```

分目录 link 规避 F39 单槽覆盖；link 生成的 per-app `.gitignore`（`.vercel` + `.env*`）已入库，`.env.local` 留本地（已忽略）。

## 3. Git E2E（正式主链）

- push：`a740604..e710f86 main -> main`
- docs 部署 `dpl_AzW3rUGGzdrNrkaexSRAXnznm2th`：构建事件日志含 `Cloning github` / `Cloning completed` / `pnpm install --frozen-lockfile`；部署对象 `githubCommitSha = e710f86ff2cd856123ce5e03697bc0e77a59967c`（与 push 精确匹配）；**READY**（构建 3m）。
- api 部署：`githubCommitSha = e710f86...` 匹配；**READY**（构建 50s）。
- 环境变量审计：双 Project GET `/v9/projects/<id>/env` → `envs: []`（与 spec §3.5 零依赖设计一致）。
- 部署 URL 受团队 SSO 部署保护（`all_except_custom_domains`，创建时默认）；冒烟经 `vercel curl --yes`（自动生成 protection bypass token）完成。

## 4. 冒烟结果（内容断言，非状态码）

### docs（https://shadcn-docs-nuxt-production-repro-docs-oyq0ebvtm.vercel.app）

| 路由 | 断言 | 结果 |
| --- | --- | --- |
| `/` | 真实标题（非 404 shell） | ✅ `<title>生产级复现实验室 - shadcn-docs-nuxt 生产复现实验室</title>` |
| `/` 含 `repro-runtime-card` | workspace UI + SCSS 链路存活 | ✅ 命中 2 次 |
| `/guide/baseline` | 真实标题 | ✅ `<title>绿色控制组 - …</title>` |
| `/api/_content/cache.json` | 状态码 + 响应体 | ❌ 200 + 404 shell HTML（假阳性） |
| `/api/_content/search` | 状态码 + 响应体 | ❌ 200 + 404 shell HTML（假阳性） |

### api（https://shadcn-docs-nuxt-production-repro-g1x796m4q-ruancat-projects.vercel.app）

| 路由 | 断言 | 结果 |
| --- | --- | --- |
| `/v1/health` | HTTP 200 + 健康 JSON（serverDir 业务 API，G9） | ✅ `{"ok":true,"service":"independent-nitro3-api","timestamp":"2026-10-02T09:54:28.337Z"}` |
| `/v1/runtime` | 200 | ✅（状态码） |

## 5. F47 范围升级（本日最重要的新证据）

Content API 失效**不是 workerd 特有**——Vercel Node runtime（vercel preset）复现同样 200 + 404 shell 假阳性。三 preset 对比矩阵：

| preset | 平台 | Content cache/search | 证据 |
| --- | --- | --- | --- |
| node-server | 本地 Windows + CI Linux（SHA e710f86，run 36591332103 artifact smoke） | ✅ 200 且非空 | control |
| vercel | Vercel 生产（SHA e710f86，dpl_AzW3rUGGzdrNrkaexSRAXnznm2th） | ❌ 200 + 404 shell | 本文件 §4 |
| cloudflare_module | workerd 本地（2026-09-29） | ❌ 200 + 404 shell | F47 初登记 |

修正后的根因假设（结论不超出证据）：**preset 相关的 Nitro 构建差分**——`_content` 服务端 handler 注册或 server asset（content.db）闭包在 vercel/cloudflare_module preset 下与 node-server 不一致，路由 fall-through 到 catch-all 404 渲染并以 200 返回；原生 sqlite 不可加载只是 workerd 侧的可能并发因素，不是 Vercel 侧解释。下一步单变量实验：本地对比 `.vercel/output/functions` 与 `.output/server`（node-server）产物中 `_content` handler 注册与 content.db 资产存在性（套用 R19 单变量模板）。

## 6. 部署额度纪律执行记录

本轮共 2 次 push：`e710f86`（E2E 触发）+ 收口提交；生产部署 2 次（双 Project 各 1），无 preview 消耗。批量变更均以本地 commit 沉淀，符合用户额度授权。

## 7. 状态口径

- docs：`candidate→verified(部分)`——页面/UI/SCSS 产出 verified；Content API 门前 ❌（F47 upgraded）；
- api：`verified`——G9 通过（serverDir 业务 API + 响应体）；
- 遗留：生产别名的公网可访问性受团队 SSO 保护策略约束（自定义域名接入可绕开，属用户后续决策）；F47 根因实验待立 PR。
