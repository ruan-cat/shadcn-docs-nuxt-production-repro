# 2026-09-29 复用 shadcn-docs-nuxt-production-repro 仓库并补齐 SCSS 组件库与部署基础设施

> Agent 工具：ZCode（CLI）
> AI 模型：GLM-5.3-Flash（account:bigmodel-start-plan/GLM-5.3-Flash）

## 1. 任务目标

用户新建"专门用来测试和复测 `init-shadcn-docs-nuxt` 技能的 GitHub 项目"：

- 复杂 monorepo 架构 + 复杂构建链；
- 独立的内部最小 Vue 组件库，**包含 SCSS 构建能力**；
- 核心 Nuxt Content 文档站作为组件库文档站，检验 Nuxt Content 文档站本身的健壮性；
- 全部部署基于 **git 提交触发**（禁止直接上传工件）：
  - Vercel（`use-vercel-deploy-in-monorepo` 全局技能，用户授权"可以稍微靠后一点"）；
  - Cloudflare Workers（本地 wrangler CLI 有完整权限）。

任务文档工件地址：本目录（工作区 `docs\shadcn-docs-nuxt\2026-9-29-new-repo`）。

## 2. 复用决策（gh cli 检索结果）

`gh repo list ruan-cat` 检索发现现存仓库 **`ruan-cat/shadcn-docs-nuxt-production-repro`**（PUBLIC，2026-08-28 最后推送），正是为此目的建立的半成品复现实验室。按用户预设规则（"如果有，我们就复用这个项目，然后继续补充"），决定**复用**，不新建仓库。

已克隆到本地 `D:\code\ruan-cat\shadcn-docs-nuxt-production-repro`（main 分支，与 origin/main 同步，工作区干净）。

### 2.1 现状盘点（复用理由）

| 用户需求                            | 仓库现状                                                                                                                                                          | 差口                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 复杂 monorepo                       | pnpm workspace：apps/docs + apps/api + packages/ui + packages/shared-core                                                                                         | 已满足                                                      |
| 复杂构建链                          | Turbo 2.9.3 串行构建、frozen lockfile、三平台 CI（基线/Windows 压力/fresh-resolution/experiment-lockfile）、7 个依赖/闭包探针、F01-F46 故障目录、R01-R45 实验矩阵 | 已满足                                                      |
| Nuxt Content 文档站                 | apps/docs：Nuxt 3.21.2 + shadcn-docs-nuxt 1.1.9 + @ztl-uwu/nuxt-content 2.13.9 + h3 1.15.11 控制组                                                                | 已满足                                                      |
| 独立 Vue 组件库                     | packages/ui（Vue + Element Plus + VueUse，vite lib 构建）存在，但**无 SCSS 构建能力**                                                                             | **本轮补齐**                                                |
| Cloudflare Workers 部署（git 触发） | 无任何 CF 配置                                                                                                                                                    | **本轮新建**                                                |
| Vercel 部署（git 触发）             | 无                                                                                                                                                                | 按用户授权**稍后**（用 use-vercel-deploy-in-monorepo 技能） |

### 2.2 事故上下文（本仓库的设计动机，已由文档与记忆确证）

- **事故 A（Nuxt 3/4 传递依赖世代污染）**：SmallAliceWeb ai-rag-api 的 `nitro@3.0-beta` 引入 `h3@2.0.1-rc.22` 占据 pnpm 提升层，四个未声明 h3 的包（nuxt-og-image / nuxt-content / mdc / icon）运行时裸 import 解析到 v2 → SSR 500。修复用 `pnpm.packageExtensions` 逐包注入 h3@1.15.11。`nuxt-og-image` 5.1.10+ 同理跨入 Nuxt 4 世代。memorix obs:5881、obs:5711。
- **事故 B（Windows Nitro/NFT）**：eams `@vercel/nft` trace 在 pnpm workspace 高 CPU 长尾假卡死；SSR externalization + symlink 致 `@vueuse/core` 产物缺失；清空 prerender 路由致 document-driven Content 数据为空。
- **事故 C（build 绿但 .output 坏）**：SmallAlice 4 GiB 堆在 `Initializing prerenderer` 处 OOM（exit 134）；Vercel `READY` ≠ runtime 通过；standalone `MODULE_NOT_FOUND`。
- **用户核心假设**："仅将一个独立 Nitro 3 application 加入同一 workspace，就足以改变 docs 应用行为" —— 仓库 apps/api（Nitro 3 beta）即为此实验拓扑，F05/F06 对应。

## 3. 本轮实施清单

1. **packages/ui 补 SCSS 构建能力**（最小化）：
   - devDependency 新增 `sass`（精确版本）；
   - 新增 `src/styles/tokens.scss` 设计令牌；
   - `ProductionRuntimeCard.vue` 增加 `<style scoped lang="scss">`；
   - vite lib 构建产出 `dist/repro-ui.css`，exports 增加 `"./styles.css"`；
   - apps/docs 消费 `css: ["@repro/ui/styles.css"]`，打通 "scss 源码 → 组件库构建 → 文档站消费" 全链路。
2. **Cloudflare Workers git 触发部署**：
   - `apps/docs/wrangler.jsonc`（main = `.output/server/index.mjs`，assets binding，compatibility_date = `2024-09-19`，与 init-shadcn-docs-nuxt 技能契约一致）；
   - `.github/workflows/deploy-cloudflare.yaml`：push main 触发 → frozen install → build:packages → `NITRO_PRESET=cloudflare_module` 构建 docs → `cloudflare/wrangler-action@v3` 部署；**凭据缺失时优雅跳过**（守门步骤写 GITHUB_ENV），保持 main 绿色；
   - 凭据策略：本地 wrangler 为 OAuth 登录，无法铸造 API Token；已用 AskUserQuestion 询问用户凭据策略（A 铸造 API Token / B 复制 OAuth / C Workers Builds / D 先交付流水线），用户未即时响应，按兜底 **D 执行**：交付流水线 + 本地全链路验证（`wrangler dev` runtime smoke + `wrangler deploy --dry-run`），secret 留待用户配置，之后一次 push 即自动部署。
3. **本地验证门禁**（对齐 acceptance-gates G0-G7）：
   - frozen install → lockfile hash 记录；
   - `pnpm build:packages`（含新 SCSS）→ typecheck → 契约测试 + 包测试；
   - `probe:deps / probe:h3 / probe:ui` 依赖证据；
   - docs 默认 preset 与 CF preset 双构建；`wrangler dev` 本地 workerd HTTP smoke（`/`、`/api/_content/cache.json`、`/api/_content/search`）；`wrangler deploy --dry-run` 配置校验。
4. **仓库文档与证据**：README（架构 + 新章节）、progress.md（2026-09-29 段落）、experiment-matrix 部署矩阵 D08、evidence/2026-09-29-*.md 证据链；若 CF runtime 出现 Content native sqlite 边界问题，在 failure-catalog 登记新故障条目（F47 起编）。
5. **提交推送**：读全局 `git-commit` 技能的权威 emoji 映射后，中文 Conventional Commits 分笔提交并 push（触发基线 CI 与部署 workflow）。
6. **Vercel（明确延后）**：使用 `use-vercel-deploy-in-monorepo` 技能，Git Integration 主链，两个 Project（docs / api）分别验收；本轮仅在 README/progress 留待办。

## 4. 契约与纪律遵守

- 仓库 AGENTS.md：main 保持 control；不加 `trace:false`、blanket `noExternal/inline`、`routes.clear()` 等危险 workaround；`baseline-safety` 契约测试禁止字符串（`noExternal` 等）不得出现在 apps/docs/nuxt.config.ts；新增 workflow 为增量不破坏 ci-contract；ui 包测试只断言 Element Plus/VueUse 依赖存在。
- 基线新增 `sass` 为 devDependency（不在 control.json 依赖约束组内），属基础设施而非故障实验。
- 提交 = commit + push（用户持久授权）；部署 workflow 首跑在无 secret 时跳过，不产生红 X。

## 5. 状态记录（2026-09-29 会话收口，2026-09-30 补充核对）

### 已完成

- [x] 上下文收集（三项目 memorix、工作区事故文档、init-shadcn-docs-nuxt 技能 22 条强约束、use-vercel-deploy-in-monorepo 技能、仓库 6 份必读 task-artifacts + 4 份契约测试）
- [x] 复用决策落档（本文件 §2）
- [x] packages/ui SCSS 构建能力：sass@1.105.0 + tokens.scss + SFC scoped scss + vite `cssFileName:"repro-ui"` + exports `./styles.css` + docs css 消费；产物 `dist/repro-ui.css` 内容断言通过；顺带补齐 ui 包缺失的 tsconfig.json（vue-tsc 既有隐患）
- [x] 本地验证门禁：frozen install 36.2s / 16 项测试全绿 / vue-tsc exit 0 / probe:ui / nuxt prepare exit 0（G0-G3）
- [x] Cloudflare 流水线：apps/docs/wrangler.jsonc + deploy-cloudflare.yaml（push main 触发、凭据缺失 GITHUB_ENV 守门优雅跳过）
- [x] 本地 CF 全链路验证：CF preset 构建 exit 0（Windows 默认堆）→ `--dry-run` exit 0（202 资产、ASSETS 绑定）→ workerd 冒烟 → **F47 复现并登记**（Content API 200 + 404 shell 假阳性，预渲染页正常）
- [x] 仓库文档与 evidence：failure-catalog F47、status-matrix F47 行、experiment-matrix D08、progress 2026-09-29 接力核对（PR #1 已合并等滞后修正）、evidence/2026-09-29-scss-ui-cloudflare-worker-baseline.md、README 架构与部署章节
- [x] 提交推送：三笔中文规范提交 `f0ff510`（feat ui）/ `a849527`（ci docs）/ `a740604`（docs F47+接力核对）已推 main（`d3fb147..a740604`）
- [x] CI 远端验证：基线 CI run `36591332103` ✓（三 job 全绿：Linux 生产构建+artifact smoke、Windows 解析+独立 API、契约探针——SCSS 改动通过跨平台控制链）；部署 workflow run `36591331875` ✓（1m30s，注解确认守门步骤实际执行「未配置 secret 本次跳过」，main 保持绿色）
- [x] memorix / auto-memory 沉淀：CLI long-term 记忆 `5607876b`；本地记忆 shadcn-docs-nuxt-repro-repo-state、shadcn-docs-nuxt-verification-discipline

### PR / issue 参考检索结论（2026-09-30 补充核对）

- issue：仓库无 issue。
- PR #27（R19 全局 `nodeLinker: hoisted` 对照，OPEN，在途）：**方法论范本级参考**——从真实复现 F17 的 R15 失败分支派生、严格单变量、PR body 显式声明不叠加 R16/R17/R18 方案、预设 A/B 两种判读结果。**F47 根因证实实验应完全套用此模板**（从 F47 复现分支派生，单变量区分「原生 sqlite 绑定不可加载」vs「`_content` 路由未注册」，显式禁止叠加 clientDB 等缓解方案）。
- 其余 PR 状态已由 progress.md 接力核对收口（#1 已合并、R02-R18 已关闭为实验资产）。
- 环境观察项（非阻塞）：actions 提示 Node 20 弃用（checkout@v4 等被迫跑 Node 24）；ubuntu-latest 将于 2026-10-19 迁移 Ubuntu 26。

### 遗留（按优先级）

1. `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` GitHub secrets 由用户配置（本地 wrangler 为 OAuth 无法铸造 API Token；AskUserQuestion 四选项未获响应，按兜底方案 D 交付）→ 配置后下一次 push 自动真实部署，届时补 F47 线上证据（远端 workerd 是否与本地行为一致）。
2. F47 根因证实实验（独立实验 PR，套用 R19 模板）。
3. Vercel 部署（`use-vercel-deploy-in-monorepo` 技能、Git Integration 主链、docs + api 双 Project）——用户授权延后。
4. R01（docs-only 反向 control）与 R20-R45 实验路线未启动（仓库既有路线图，非本轮范围）。
