# 初始化与实验进度

最后更新：2026-10-16

## 初始化 PR

- [x] 建立空仓库首个 `main` 基线提交
- [x] 创建初始化工作分支
- [x] 写入任务工件总入口
- [x] 写入 F01-F46 完整故障目录
- [x] 写入实验矩阵
- [x] 写入 PR 单变量路线图
- [x] 写入多层验收门禁
- [x] 写入证据规范
- [x] 写入真实项目事故映射
- [x] 建立 Nuxt 3 + shadcn-docs-nuxt + Content docs 应用
- [x] 建立完全独立 Nitro 3 API 应用
- [x] 建立 shared-core 纯 TS workspace 包
- [x] 建立 Vue + Element Plus + VueUse UI workspace 包
- [x] 建立依赖树探针
- [x] 建立 H3 实际解析探针
- [x] 建立 Content HTTP 探针
- [x] 建立 standalone artifact HTTP smoke
- [x] 建立 baseline contract tests
- [x] 建立危险 workaround 防回归测试
- [x] 建立 Linux production CI
- [x] 建立 Windows 解析/API CI
- [x] 建立 Windows 全量压力 workflow
- [x] 建立 fresh dependency resolution workflow
- [x] 开启初始化 Draft PR #1
- [x] 首轮 GitHub Actions 实际执行
- [x] 根据真实 pnpm install 生成首个 lockfile
- [x] 检查实际 Nuxt/Nitro/H3/@nuxt/kit/OG Image 解析
- [x] 修复初始化代码自身的非实验性错误（Tailwind 入口、Nitro 3 handler）
- [x] Linux docs + API artifact runtime 全绿
- [x] Windows 基础解析/API 门全绿
- [x] 提交并冻结首个控制组 lockfile
- [x] 普通 CI 收紧为 `--frozen-lockfile`
- [x] 增加 CI 契约，禁止普通 workflow 恢复动态解析
- [x] Frozen control 三轨再次全绿（run `33171057923`）
- [x] 固化首份 control evidence
- [ ] 将初始化 PR 标记为 Ready
- [ ] 合并初始化 PR 到 `main`

## 已建立的控制事实

- Docs：Nuxt 3.21.2 / Nitro 2.13.4 / shadcn-docs-nuxt 1.1.9 / Content 2.13.9 / H3 1.15.11。
- API：独立 Nitro 3 beta，运行时事件 API 从 `nitro/h3` 使用。
- frozen lockfile SHA256：`1373193329c18cd55e6c6d81da08683ec39ce6c34bd8da1db96730b55be752a8`。
- Content 物理包 context -> H3 v1；Nitro 3 package context -> H3 v2。
- dependency tree 已观察到 `@nuxt/kit` 3.x 与 4.5.2 并存，但 control runtime 全绿。
- Linux fresh docs production：5005 client modules / 3581 SSR modules / 18.6 MB Nitro output。
- Docs `/`、Content cache、Content search、Nitro API `/v1/health` 均通过 standalone HTTP 200。

## 后续实验

### 依赖世代

- [ ] R01 移除独立 Nitro 3 sibling，形成 docs-only 反向 control
- [ ] R02 删除 docs 显式 H3
- [ ] R03 Content caret drift
- [ ] R04 theme caret drift
- [ ] R05 移除 OG Image override
- [ ] R06 指定 OG Image 漂移

### workspace / externalization

- [ ] R07-R14

### standalone npm alias

- [ ] R15-R19

### Windows / NFT / heap

- [ ] R20-R26

### Content prerender 副作用

- [ ] R27-R29

### ESM/CJS hydration

- [ ] R30-R33

### Vercel 多项目

- [ ] R34-R38

### fresh/caching/order

- [ ] R39-R44

### Nuxt 4 迁移线

- [ ] R45

## 注意

初始化 PR 的目标是建立**真实可运行的 frozen control infrastructure**，不是在同一个 PR 里故意触发 F01-F46。故障必须在后续单变量 PR 中逐个复现，否则无法形成可信因果证据。

## 2026-09-29 接力核对与基础设施新增

> Agent：ZCode（CLI）/ GLM-5.3-Flash。基线 SHA `d3fb147`。

### PR 遗产接力核对（修正本文件的历史滞后）

- 初始化 PR **#1 已于 2026-08-28 MERGED**（`2026-8-28-init-production-repro`），上方"初始化 PR"两个未勾选项为滞后状态，予以修正性备注。
- 配套契约/探针 PR 已合并：#2 实验 lockfile 通道、#3 实验声明契约、#5 控制组断言修正、#10 workspace 拓扑契约、#13 UI 入口探针、#14 R09 dist 控制组证据、#17 配置型实验安全契约、#18 闭包探针、#20 父级依赖隔离 smoke、#22 R16 槽位、#24 R17 槽位。
- 实验 PR 按"失败不合并"政策已 CLOSED：#4 R02、#6 R05、#7 R06、#8 R04、#9 R03、#11 R07、#12 R08、#15 R10、#16 R12、#19 R14、#21 R15、#23 R16、#25 R17、#26 R18。
- **PR #27（R19 全局 hoisted node linker 对照）当前 OPEN**，为唯一在途实验 PR。
- 本文件实验清单中的 R01（docs-only 反向 control）尚未开 PR；R20-R45 未启动。
  - ⚠️ **该状态已失效（2026-10-30 追记）**：R01 仍「未开 PR」属**已复核的闭环决策**（A3 项，维持现状不补开 PR，其分支已在远端）；**R20-R45 已大部分执行完毕** —— R20/R23/R24/R25/R26 为 main 原地测量、R21/R27/R28/R29/R31-family 已完成、R06–R17 已于 2026-10-29/30 全部 SOP 干净重测并落档 `verified`；**未启动池现为 14 个**（R22 / R32 / R34–R45）。权威状态见 [experiments/QUEUE.md](./experiments/QUEUE.md)。

### 本轮新增（基线基础设施，非故障实验）

- [x] packages/ui 补 SCSS 构建能力（sass 1.105.0 + tokens.scss + SFC scoped scss + `cssFileName` + exports `./styles.css` + docs css 消费）；产物 `dist/repro-ui.css` 内容断言通过（token 编译硬证据）
- [x] 补齐 packages/ui 缺失的 tsconfig.json（vue-tsc 此前打印 tsc 帮助并 exit 1 的既有隐患）
- [x] 本地验证门禁：frozen install 36.2s / 16 项测试全绿 / typecheck / probe:ui / nuxt prepare
- [x] apps/docs/wrangler.jsonc + `.github/workflows/deploy-cloudflare.yaml`（push main 触发，凭据缺失优雅跳过）
- [x] 本地 CF 全链路：CF preset 构建 exit 0（Windows 默认堆）→ `--dry-run` exit 0（202 资产，ASSETS 绑定）→ workerd 冒烟
- [x] **F47 复现并登记**：CF workerd 上 Content cache/search API 返回 200 + 404 shell HTML（假阳性）；预渲染页面正常。证据 `evidence/2026-09-29-scss-ui-cloudflare-worker-baseline.md`
- [ ] `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets 由用户配置后，下一次 push 自动真实部署
- [ ] F47 根因证实实验（独立 PR）
- [ ] Vercel 部署（use-vercel-deploy-in-monorepo 技能，Git Integration 主链，docs + api 双 Project）——用户授权延后

## 2026-09-30 Vercel 双 Project 部署（进行时）

> Agent：ZCode（CLI）/ GLM-5.3-Flash。技能：use-vercel-deploy-in-monorepo v2.2.0；spec/plan 经用户审核授权（团队 ruancat-projects、命名确定、先 docs 后 api、MCP/CLI 完成修改、push 仅限验收里程碑、dev/main 同步）。

- [x] 阶段 1 本地 `VERCEL=1` 预验证：docs/api 均自动探测 vercel preset，`.vercel/output` 生成，**零仓库变更**；Build Command 定稿 `turbo run build --filter=@repro/docs...` / `--filter=@repro/api...`
- [x] 阶段 2 docs Project 创建：`prj_nRhiR3d9kkcWp8U9prKNUh5cHdt1`；inspect 回读五字段全一致；`link{github, ruan-cat, productionBranch: main}` 回读；nodeVersion 24.x→22.x 写回回读
- [x] 阶段 3 api Project 创建：`prj_AAGUVMU0BfCce4ydRp8MmTdAYc5b`；同构回读全绿
- [x] 阶段 4 分目录单槽 link：`apps/docs` ↔ docs 项目、`apps/api` ↔ api 项目；双 projectId/orgId gate 均 PASS；link 产生的 per-app `.gitignore` 入库、`.env.local` 留本地（已忽略）
- [x] 阶段 5 Git E2E：push `e710f86` → 双 Project 生产 READY；构建日志 `Cloning github` + SHA 精确匹配；api `/v1/health` 健康 JSON ✅；docs 页面/SCSS/UI ✅、**Content API 200+404shell ❌（F47 升级为三 preset 矩阵，L3）**
- [x] 阶段 6 环境变量审计：双 Project `envs: []`；Settings 终审 inspect 全绿
- [x] 阶段 7 收口：README/AGENTS/evidence（`evidence/2026-09-30-vercel-deploy-e2e.md`）/failure-catalog F47 升级/status-matrix L3；dev/main 同步
- [ ] F47 根因单变量实验（`.vercel/output/functions` vs `.output/server` handler 注册对比，套用 R19 模板）
- [ ] 生产别名公网访问（需用户接入自定义域名绕开团队 SSO 保护）

## 2026-09-30 CF 机制修正（Workers Builds 取代 GitHub Actions）与四域名配置

> 用户方向修正：CF 部署必须走 **Workers Builds 识别 GitHub 更新**，禁止 GHA 部署链；同时要求 4 个自定义域名（vc.* → Vercel 双 Project，cf.* → 双 Worker）。

- [x] 回退：删除 `.github/workflows/deploy-cloudflare.yaml`；回退 `apps/docs` 的 wrangler devDep（GHA 专用修复）；GHA 运行记录经 API 删除
- [x] F47 第四格保留：GHA 时期完成的远端 workerd 部署产出的真实证据仍有效（机制更替不影响行为事实）
- [x] api worker 补齐：`apps/api/nitro.config.ts` `cloudflare.wrangler` 配置——worker 名 `shadcn-docs-nuxt-production-repro-api`（修正 nitro 自动命名）+ custom_domain route；CF preset 构建本地验证 ✓
- [x] docs worker 域名：`apps/docs/wrangler.jsonc` 增 custom_domain route `…docs.cf.ruan-cat.com`
- [x] Vercel 双域名：`…docs.vc.ruan-cat.com` / `…api.vc.ruan-cat.com` 已 add 且 `verified: true`（apex 已在账号体系）
- [x] 权限边界实测：现有两个 CF token 均无 Builds API / DNS / Workers Domains 写权限（12006/10405/10000）——Workers Builds 连接与 vc.* CNAME 记录转 Dashboard 人工 gate
- [x] **Workers Builds 连接经 cf CLI 全自动化完成**（Dashboard gate 取消）：
  - `cf builds repos connections upsert`（GitHub App 授权从既有安装继承，无需浏览器流）
  - `cf builds workers create` ×2（docs tag `088d894e…` / api tag `bcb29b48…`；git_repository main + build/deploy 命令 + build token）
  - `cf dns records create` ×2：vc.* CNAME → `cname.vercel-dns.com`（DNS-only）
  - `wrangler deploy` 引导部署 ×2（OAuth 通道完成 `cf.*` 域名绑定，DNS 自动创建；api 经账号 token 上传后 OAuth 补绑——账号 token 缺 zone 级 routes 写）
  - 实测坑位：builds API 按 **script-tag** 寻址（非 worker 名）；nitro 3 worker 名经 `cloudflare.wrangler.name` 覆盖；cf `--body` 对部分端点有校验缺陷（旗标优先）
- [x] F47 矩阵第四格确认：**远端 CF Workers 生产与本地 workerd 行为一致**（页面/SCSS ✅，Content API 200+404shell ❌）——worker `…docs.cf.ruan-cat.com` 实测；api `…api.cf.ruan-cat.com/v1/health` 200 健康 JSON ✅
- [x] **F47 根因实锤（2026-10-03，CF 构建日志栈）**：content handler chunk 解析到 h3@2.0.1-rc.22 的 getQuery（外层 h3@1.15.11），对内部 fetch URL 抛 Invalid URL → 500 → prerender 产出 404 shell；content 包 manifest 无 h3 声明（F04 本体），bundle 型 preset 按其依赖上下文解析 h3→v2
- [x] **修复实证**：pnpm-workspace.yaml packageExtensions（key 须带 @2.13.9 range，裸名无效）注入 h3@1.15.11 → CF Builds 构建后 `…docs.cf.ruan-cat.com` 页面真实内容 200（首页/子页/SCSS×2）；Vercel 侧经 `vercel redeploy`（无缓存重建）后 `…docs.vc.ruan-cat.com` 同步恢复
- [x] 遗留收窄：F47 的**运行时** content API（workerd/Vercel node）仍 404shell——构建期已修、运行时解析链差异留实验
- [x] CI 回绿：prerender 种子让爬取走深后暴露 IPX logo 资产缺失（F44 教材）→ 补 `public/logo{,-dark}.svg`（bda6be9）→ 基线 CI 恢复 success（bda6be9 起三平台全绿）
- [ ] F47 运行时层根因实验（独立 PR，套用 R19 模板）

## 2026-10-16 会话备份唤起与接力上下文恢复

> Agent：ZCode（CLI）/ GLM-5.3-Flash。前会话（sess_d5079b4a……，公开历史 sequence 0-423 / 390 条消息）经 memorix 十六进制归档唤起并逐字节核验；权威入口 `docs/task-artifacts/session-relay.md`。

- [x] 主索引 obs:6042 读回（分片映射、脱敏口径、完整性哈希、F47 两层警示、未完成任务清单）
- [x] 实测发现合并坑位：obs:5989-5998 已被 memorix consolidate 进 obs:5999，逐条直读不可达；正确路径为 5999 解出全部 11 条 hex（顺序 chunk 11→1，按 envelope chunkNumber 重排）
- [x] 11 条 hex 解码与本地档案 `chunks/` 逐字节比对全部一致（本地文件仅多末尾换行符）
- [x] 完整性核验：本地 JSONL 1,203,874 字节 / sha256 `3df00952…` 与基准完全匹配；390 条消息数与基准一致
- [x] 仓库现状核对：HEAD `3f67f36`、工作区干净、failure-catalog F47 分层定案在位——仓库状态与会话终态一致
- [x] 接力上下文文档化：新建 [session-relay.md](./session-relay.md)（唤起命令、坑位、核验记录、任务状态快照）；README 工件清单同步
- 未变项（与备份警示一致）：F47 第二层运行时实验未启动；PR #27（R19）仍 OPEN；R01 与 R20-R45 未启动
  - ⚠️ **该状态已失效（2026-10-30 追记）**：F47 第二层**已定案并修复**（第二/三层）、PR #27 **已 CLOSED**、R01 之外的实验**已大部分执行完毕**（未启动池现为 14 个：R22 / R32 / R34–R45）。本行原文保留为 2026-10-16 时点的快照，**不得据此判断当前状态**；现行状态见 [experiments/QUEUE.md](./experiments/QUEUE.md) 与 [experiments/FINDINGS.md](./experiments/FINDINGS.md)。

### 同日 push `788630b` 生产部署监听与生产级验证

- [x] push main（`3f67f36..788630b`）→ 四项部署自动触发并全部成功：Vercel docs Ready 3m（`bx1y6gzax`）、Vercel api Ready 24s（`de9tf4pfx`）、CF docs Worker success 3m22s（`dadcc6a3`）、CF api Worker success 1m13s（`168c65bb`）——CF 构建记录 commit_hash 实测 `788630b`
- [x] 四域名 HTTP 响应体断言：双平台首页「生产级复现实验室」、子页「绿色控制组」、`/v1/health` 健康 JSON、SCSS 内联令牌（`#2563eb` + 8px computed）全部命中
- [x] F47 分层复验：构建期修复保持；运行时 `/api/_content/*` 双平台仍 200+404shell（已知第二层，非回归）——「200 ≠ 内容正常」纪律再次实证
- [x] 新记录跨平台差异：CF 边缘对无尾斜杠路径 307 → `/guide/baseline/`，Vercel 200 直达，最终内容一致
- [x] 浏览器级验收（agent-browser MCP）：CF 首页/子页 + Vercel 首页，水合 `__vue_app__` true、SCSS 8px computed 生效、三截图视觉完整；CLI `open` 两次挂起 → 按分流纪律切 MCP 工具族（失败路径已记录）
- [x] 证据落盘：`evidence/2026-10-16-push-788630b-production-verify.md`（部署记录、断言矩阵、八要素、失败路径；取代 09-29/09-30 证据成为当前 HEAD 生产快照）

## 2026-10-17 应用级 tsconfig 缺失修复（typecheck 通道打通）

> 背景：`pnpm typecheck`（turbo 四包矩阵）自初始骨架 `a1bf378` 起从未全绿——apps/api 无 tsconfig.json（裸 `tsc` 打印帮助 exit 1）、apps/docs 无 tsconfig.json（@nuxt/cli 的 readTSConfig 硬性要求项目根存在该文件）。CI 不跑 typecheck，故从未阻塞部署链。

- [x] apps/api：新增 tsconfig.json，`extends: "nitro/tsconfig"`（nitro 3 官方预设，package exports `./tsconfig`，仅含 compilerOptions 无 include 陷阱）+ include `nitro.config.ts` / `server/**/*.ts` / `node_modules/.nitro/types/**/*.d.ts`（`nitro prepare` 生成的 `nitro/types` 模块增强，实测 prepare 静默写入 `node_modules/.nitro/`，非 `.nitro/`）+ init-tsconfig 增量三件套 → **exit 1 → exit 0**
- [x] apps/docs：新增 tsconfig.json，Nuxt 标准 `extends: ./.nuxt/tsconfig.json` → runner 打通，**首次暴露**上游 layer 源码类型噪声：127 个错误 100% 位于 `shadcn-docs-nuxt@1.1.9` 源码（TS2304 自动导入符号缺失 33 / TS2307 上游内部 `@/` 别名 81 类 / TS2589），本仓代码 0 错误
- [x] exclude 收敛：`**/node_modules/shadcn-docs-nuxt/**` 拦截纯 include 来源（127→86）；剩余 86 个经 .nuxt 生成文件 import 闭包进入程序，exclude 无法拦截——**Nuxt layer 与独立 tsc 的结构性错配，修复归属上游**（可作 upstream issue 证据素材）；vite/nitro 构建不经过 tsc，排除零影响（实测 Build complete）
- [x] 验证：api/docs/shared-core/ui 单包 typecheck 逐一实测；`pnpm test` 6/6（fail 0）；docs 生产构建 ✓；矩阵终态 5/6（docs 红为已定性的上游噪声，非本仓回归）
- 事故附带：init-prettier-git-hooks 的 `pnpm add` 曾致 packages/ui 的 vite 链接瞬时损坏（MODULE_NOT_FOUND）→ `pnpm install --frozen-lockfile` 重连修复（668ms 恢复）

## 2026-10-30 Vercel 生产构建失败事故（`shared-core` 增量 tsc「exit 0 零 emit」）与 hotfix

> 触发：用户报告「vercel 部署出现故障了，main 主分支出现故障了」。性质：**生产故障修复**（非实验），hotfix 直提 main。事故档案（方法论层）：`.agents/skills/fix-bug/record-bug-fix-memory/2026-10-30-vercel-shared-core-incremental-no-emit.md`（本仓该技能首个案例）；生产级证据：`evidence/2026-10-30-vercel-shared-core-hotfix-verify.md`。

- [x] 取证：docs 部署 `dpl_NmhoQN68qKhTC9pz5FragviFiFgj`（SHA `c26c887`）`state=ERROR` / `errorCode=invalid_packagejson` / `errorStep=buildStep`；同 SHA 的 api 部署 READY → 故障域锁定在 docs 构建链；日志首个错误行 `[commonjs--resolver] Failed to resolve entry for package "@repro/shared-core"` + `WARNING no output files found for task @repro/shared-core#build`
- [x] 决定性对比：上次成功部署 `d452ea1` 为 `Cached: 3 cached, 3 total`（全命中，从未执行 tsc）；本次 `Cached: 0 cached, 3 total`（首次真实执行 tsc）→ 缺陷一直存在，**仅在缓存失效时才被执行**
- [x] 隔离探针（TEMP 副本，工作树零污染）：S1 全新构建 ✅ 4 文件 emit；S2 陈旧 tsbuildinfo + dist 缺失 → `tsc exit=0` **零 emit** ❌；S3 typecheck 污染后同样零 emit ❌；FIX-A `--incremental false` 连续两次完整产出 ✅
- [x] 根因：`packages/shared-core/tsconfig.json` 的 `incremental: true` + `tsBuildInfoFile: ./node_modules/.cache/tsconfig.tsbuildinfo` → tsbuildinfo 存在即 `exit 0` 零 emit（哪怕 dist 缺失）；Vercel 跨构建还原 `node_modules/.cache/` → 陈旧 tsbuildinfo 存活 → shared-core 无 `dist/` → docs vite 解析 `main`/`exports`（`./dist/index.js`）失败
- [x] 结构性假阴性：**只有 Vercel 还原该缓存**；CI（全新 checkout）/ Cloudflare Workers Builds（不还原 `node_modules/.cache/`）/ 本地冷构建全绿 → 「其余平台绿」不能作为排除依据
- [x] 修复（职责分离，**不动 tsconfig 的 incremental**，它服务 tsserver/IDE）：`packages/shared-core/package.json` 的 `build` → `tsc -p tsconfig.json --incremental false`、`typecheck` → `--noEmit --incremental false`；根 `clean` 补 `packages/**/node_modules/.cache`（使 `pnpm clean` 真正等价于冷构建）
- [x] 提交并推送 main：`cfb8dd5`（🐞 build 幂等化）/ `e35e315`（🔧 clean 脚本）/ `f211d3a`（📃 事故档案 + 订正 CF 部署机制注释）→ `c26c887..f211d3a main -> main`
- [x] 部署终态（`f211d3a`）：Vercel docs `dpl_H47KSPigrfP32j7R1dkJzK92UE66` **READY**（`aliasError=null`）、Vercel api `dpl_61g3w4YZLTUg6WuLMtVr5xVMaZno` READY、CF 双 Worker Builds **success**（docs `1f81cefe…` / api `3914336d…`）、CI **5/5 success**（含 **Linux 完整生产构建与 artifact smoke**）
- [x] 构建日志全文核验（`vercel inspect --logs`，75,226 字符）：`no output files` = **0**、`Failed to resolve entry` = **0**、`Tasks: 3 successful, 3 total`、`Cached: 1 cached, 3 total`；日志中 12 处 `error` 字样**全部**是 Nuxt 静态 chunk 名（`error-404-*` / `error-500-*`），无真实错误
- [x] 远端 turbo 缓存条目健康性（原未实证项）：shared-core 本次为 **cache hit**（hash `4af19887ba66d90b`，脚本变更已使 hash 从 `b72bf9cba8629655` 变化），该条目还原出可用产物并驱动下游 vite 解析成功 → **新 hash 的缓存条目健康**，非「成功但无产物」坏条目
- [x] 生产响应体内容断言（F47 纪律，不只看 200）：docs `/` title「生产级复现实验室」✅；`/guide/baseline/` title「绿色控制组」✅；`/api/_content/query/index.md` 真实 JSON（3 条 markdown + `workspace-runtime-probe` 节点）✅；api `/v1/health` `{"ok":true,…}` ✅；api `/v1/runtime` `{"runtime":"nitro","generation":"nitro3-h3v2"}` ✅；404 shell 标记 0 命中
- [x] F47 分层复验：构建期问题已修复；**运行时第二层假阳性在 Vercel 生产复现**（`/api/_content/cache.json` 与 `/api/_content/search?q=绿色` 均 200 + HTML 404 shell）——与 10-16 基线逐字一致，**既有缺陷、非本次回归**，仍登记于 `failure-catalog.md:328` / `FINDINGS #9`
- [x] 遗留清理：探针隔离目录 `dist.pre-fix` / `dist.local-fix` 已移出仓库至 `C:\Users\pc\AppData\Local\Temp\pua-quarantine-20261030-123735\`（`.gitignore` 规则 `dist` 不匹配 `dist.pre-fix`）；端口 3399/3401/3402 释放；`node_modules.stale-*` 无残留；`.pnpm` 目录数 1209、nuxt.mjs / tsc 均在位
- [x] 子代理收尾：3 explore + 1 worker 全部 succeeded（1 个历史取证 explore 已取消回收）；`cleanup-agent-team-node-processes` dry-run `CandidateCount=0`、`WorkBuddyPoolCandidateCount=0`，收窄 IncludePattern 复核后唯一命中项是审计命令自身的 PowerShell（`self-or-parent-chain` 受保护）→ **本 run 无孤儿进程残留**
- 遗留项（未在本轮修复，需另行决策）：① F47 第二层假阳性单独立项（`probes/artifact-smoke.ts` 只断言 `response.ok`，从不做响应体检查）；② CI 防回归缺口——`pnpm build:fresh` 的 `--force` 只强制重跑 task、**不清 tsbuildinfo**，runner 全新 checkout 无陈旧缓存 → 该类缺陷在 CI 中**结构性不可见**，建议在契约测试断言 shared-core build script 含 `--incremental false`（改 `tests/` 需 gate）

## 2026-10-30 F47 第二层「HTTP 200 假阳性」定案与修复

> 触发：2026-10-30 Vercel 生产故障 hotfix 收尾时暴露的第二层假阳性（构建期故障已修，运行时假阳性当时仍登记在 `failure-catalog.md` F47 / `FINDINGS #9`）。事故档案（方法论层）：`.agents/skills/fix-bug/record-bug-fix-memory/2026-10-30-f47-content-api-false-positive.md`；生产级证据：`evidence/2026-10-30-f47-content-api-false-positive-fix.md`；横向发现：[FINDINGS #19](./experiments/FINDINGS.md)。

- [x] **取证定案（三线对齐，证伪旧方向）**：①模块源码 `@ztl-uwu/nuxt-content@2.13.9` `dist/module.mjs:207/238/243` —— 生产构建把 API 路由名指纹化（`cache.<buildIntegrity>.json` / `search-<buildIntegrity>`），canonical 路径 `cache.json` / `search` **只在 dev 模式存在**；②产物路由表 `apps/docs/.output/server/chunks/_/nitro.mjs` 实锤**没有** `/api/_content/cache.json` 与 `/api/_content/search`；③上游 layer `shadcn-docs-nuxt@1.1.9` 的 `pages/[...slug].vue` 在 `!page?.body` 时内联渲染 404 文案但**不抛 `createError`** → 渲染成功即 HTTP 200
- [x] **旧方向作废**：带指纹路由在本机 node-server / Vercel 生产 / Cloudflare 远端**三处逐字一致**返回 200 + 真实内容 → 「serverless 下 sqlite 初始化失败 → handler 崩溃」被证伪。F47 第二层从「平台运行时故障」重定义为「**验收契约假阳性**」，原矩阵的 **preset 维度结论作废**
- [x] **修复三件套**：①`apps/docs/server/api/_content/[...].ts` + `index.ts` 真 404 守卫（`/**` 兜底 + **零段裸前缀** `/api/_content`，后者必需：radix3 的 `/**` 要求前缀后至少一段）；②`probes/content-smoke.ts` 重写为运行时从产物发现真实指纹路由（源码零 10 位以上数字字面量）+ 响应体内容级断言 + **反向 404 断言**；③`ci.yaml` 用 `probe:content` 替换两条 dev-only URL step（旧 `probe:artifact` 只断言 `response.ok`，对 404 shell **恒绿**）
- [x] **CI 防回归断言**：新增 `tests/build-idempotency.test.mjs` 断言 shared-core `build`/`typecheck` 均含 `--incremental false` 且 `build` 调用 `tsc` → 契约 **12/12 → 13/13**（上轮遗留项②闭环）
- [x] **本机验证**：6 次串行冷构建全部 exit 0（151.2s–189.3s，均 `Cached: 0 cached`）；红绿差分「拆守卫 → 重建 → 探针 exit 1 → 装回 → 重建 → 探针 exit 0」在 worker 与独立复核两侧各自复现；最终 **12 条断言全 PASS**（8 真实路由 + 4 条 must-404）
- [x] **独立复核**（`minimax/MiniMax-M3`，只读、零文件改动）：**PASS**（无阻断项），拓出 2 项强制闭环 + 5 项次要 → **全部闭环**：补裸前缀守卫 `index.ts`、QUEUE 看板改写、FINDINGS #19 编号撞车登记 + 合并流程强制前置、failure-catalog 标题指针、探针用法注释、证据表行数
- [x] **提交并推送 main**：`06832db`（🐞 守卫）/ `ad379fb`（🧪 探针 + 契约断言）/ `ac75d39`（🐎 CI）/ `acc4f62`（📃 口径 + 档案 + 证据）→ `e9a2105..acc4f62 main -> main`
- [x] **生产部署响应体级复验**：Vercel docs `dpl_93X1QKoNhXCDVfb5AyLkBdq87rNf` **READY**（`aliasError=null`）、Vercel api `dpl_FfnCCGUUw1uyNbXRM5TNJXUDQTqr` READY、CF 双 Worker Builds **success**、CI **5/5 success**（含 **Linux job 实跑新内容级探针**）；双平台逐字一致——真实指纹路由 200 + 真实内容（search 4956B / cache 10024-10025B / query 9745B），canonical 两条 + 裸前缀两条全部 **404 + application/json**（修复前为 200 + HTML shell）；页面不回归（`/` 与 `/guide/baseline/` 标题正确）；`get_runtime_errors` 24h **零错误**
- 遗留项（未在本轮修复，交用户决策）：①**页面 catch-all 的「所有未知路径返回 200」未修**（如 `/no-such-page-xyz` 仍 200 + HTML）——需覆盖上游 layer 的 `pages/[...slug].vue`，超出本轮范围；②**`/api/_content/query/index.md` 空 query 返回全部文档的弱门未修**（content 模块侧语义缺陷）；③`experiment/integrate-r18-r19`（`155063d`，🟢 可合并待授权）自带 **FINDINGS #19**，与 main 本次占用**撞号**，合并前必须按 `BRANCH-MERGE-EVALUATION.md` §4 第 7 步重编号；④仓库内 `node_modules/node_modules/` 嵌套残留（早于本轮，非本轮产物，不影响验收结论）

## 2026-10-30 F47 第三层：页面 catch-all 真 404 + Content query 空查询弱门

> 触发：上一节遗留项 ①②。本轮用户明确要求「**修复并分发给其他分支使用**」。证据：`evidence/2026-10-30-f47-content-api-false-positive-fix.md` §8。

- [x] **指令一：页面 catch-all 的 200 掩码 —— 根因在上游 layer，修复归属 main**
  - **根因**：上游 layer `shadcn-docs-nuxt@1.1.9` 的 `pages/[...slug].vue`（100 行）在 `!page?.body` 时**内联渲染一段 404 UI 但不抛 `createError`** → 渲染成功即 HTTP 200 + HTML 404 shell。这是 layer 的设计（友好 404 页），不是运行时故障，但让「页面不存在」与「页面存在」在状态码上无法区分。
  - **方案**（零模板复制）：新增 `apps/docs/middleware/content-page-not-found.ts`——**命名中间件**，经 `nuxt.config.ts` 的 `hooks["pages:extend"]` 挂到 layer 的 catch-all 路由 `/:slug(.*)*`。判定条件与 layer **逐字一致**（`!page?.body`），只把「渲染友好 404 页」升级为「真实 HTTP 404」，不改变「哪些页面算存在」的语义。**不复制上游 100 行模板**（layer package.json 有 `exports` 字段，子路径 import 被封死；硬编码 pnpm 哈希路径太脆）。
  - **顺序依据（方案成立前提，已从 Nuxt 源码确认）**：content 模块 documentDriven 插件用 `addRouteMiddleware(async fn)` 注册的是**全局**中间件（Nuxt 源码 `addRouteMiddleware`：`typeof name !== "string"` 即视为 global），负责按路径把文档写进 `useContentState().pages`；Nuxt 执行顺序是「全局 → 命名」（`nuxt/dist/pages/runtime/plugins/router.js`：同一个 Set 先塞 global、再塞 route meta 的命名中间件，按插入序执行）→ 命名中间件跑到时文档**已解析完毕**。写成全局中间件会跑在 documentDriven 之前、state 还是空的，把**全站**误判成 404。
  - **为什么不用 `useContent()`**：它的 `page` 按 `useRoute().path` 派生，而 Nuxt 明确警告「在 middleware 里调用 `useRoute()` 会给出误导性结果」（`nuxt/dist/app/composables/router.js`：应改用 `(to, from)` 参数）→ 改按 `to.path` 直读 `useContentState().pages`，与 documentDriven 写入时的键完全一致。
  - **守卫不允许静默失效**：`pages:extend` 找不到 catch-all 时**直接抛错中止构建**——守卫一旦悄悄消失，F47 的 200 掩码原样回归，而回归时 CI 仍是绿的（200 假阳性）。宁可构建挂掉。
- [x] **附带修复：`/guide` 栏目落地页（`apps/docs/content/1.guide/0.index.md`）**
  - 上游 layer 侧边栏会链接栏目根路径 `/guide`；200 掩码存在时该死链返回「200 + HTML 404 shell」，看起来一直「正常」。掩码移除后 crawler 立刻发现它 → **首轮冷构建 exit 1**（`[404] Page Not Found / Linked from /guide/baseline`）。
  - 处置选择是**补落地页**而不是放宽 `nitro.prerender.failOnError`（后者是 blanket 式放松，违反基线纪律）。`0.` 前缀让落地页在导航 children 里排第一位（实测导航顺序 `[指南, 绿色控制组, 故障域]`）。`nuxt.config.ts` 的 prerender 种子同步补 `/guide`。
- [x] **指令二：Content query 空查询弱门 —— 根因在 content 模块侧**
  - **根因**（`@ztl-uwu/nuxt-content@2.13.9` `dist/runtime/utils/query.js`）：`qid` **只是 `_params` 的缓存键**，从不进入 where 条件；无 `_params` 时 `query.first === false` → `.find()` → 返回**全部文档**。`/api/_content/query/index.md` 声称按 id 取单文档，实际返回全集，**根本不校验 `index.md`**。
  - **方案**：新增 `apps/docs/server/middleware/content-query-guard.ts`——只拦**恰好一段**的 `/api/_content/query/<qid>`，缺 `_params` → **400 + 可执行指引**（说明 qid 语义与两种正确用法）；带 `_params` 放行；`/query/<qid>/<params>` 两段形态与裸 `/api/_content/query` 放行。
  - **语义选择是 400 而非伪造单文档语义**：服务端无法把不透明缓存键 `qid` 可靠解析成单文档，让端点**不再说谎**比伪造更诚实。
  - **两种 `_params` 编码形态实测不同（踩坑记录）**：query-string 形态要 **URL 编码的原始 JSON**（`decodeURIComponent` 后直接 `JSON.parse`）；路径两段形态要 **base64url**。用 base64url 塞进 query-string 会被 content 模块自己打成 400「Invalid _params query」——这是模块侧报错、不是守卫报错，极易误判成守卫误伤。
- [x] **指令四：分支定性订正 —— 两个 retry 分支「保留，不删除」**
  - 独立复核（explore，只读）+ 主代理本地复核结论一致：**「带契约禁止键」属实，「污染分支」不属实**。本仓台账从未把这两个分支称作污染分支；「污染」专指首轮实验的污染态伪信号（`node_modules` 残留 / timeout 假象）。
  - 两分支基于含 F47 修复的新基线 `4b5ff91` 且只加单变量；`AGENTS.md` SOP 第 6 步明文「只加单变量、**不改为过契约**」→ 属**预期对照结论**。
  - R18/R19 必要测试任务**已完成并终局**（DoD 全勾、`verified`、台账 §2 结论列「✅ verified」）→ **无需重跑**。
  - 台账 §1.3 明文「所有 CLOSED 的实验 PR — 其分支**保留作证据**」→ 删除 = 销毁唯一 verified 终版载体（main 上 R18.md/R19.md 仍是 ⏳ 占位版）。**正确处置 = 保留分支 + 只取档案 + 不得带入 `pnpm-workspace.yaml`**。台账新增 §3.1.1 记录这次订正。
  - `experiment/integrate-r18-r19` 已按授权 **push（不合并 main）** → `* [new branch] experiment/integrate-r18-r19 -> experiment/integrate-r18-r19`。
- [x] **指令五：探针改为从内容目录动态推导**（`probes/content-smoke.ts`）
  - 移除硬编码的 `EXPECTED_QUERY_PATHS` / `BASELINE_TITLE`，改为运行时扫描内容目录 → 本地复刻 content v2 的 `_path` 推导规则（`refineUrlPart` 剥数字前缀 / `index` 段清空 / slugify）→ 推导期望 `_path` 集合与锚点文档。源码零 10 位以上数字字面量。
  - 同步补齐第三层语义断言：单段 query 缺 `_params` → **400 + 非 HTML + 报文含 `_params`**；页面 `/no-such-page-xyz` → **404**。
  - 动态性实证：加入 `1.guide/0.index.md` 后，推导集合自动从 3 篇变 4 篇、锚点自动从 `/guide/baseline` 切到 `/guide`，**全程零常量改动**。
- [x] **指令六：`AGENTS.md` 内编写 node_modules 隔离 SOP**（§0.5，含 0.5.1–0.5.8 共 8 小节）
  - **体检 vs 治疗**分离：§0.5.1 判定门「健康就别动」（本仓实测 warm store 重装约 21s、冷 store 可达 12min+，且**重装会掩盖真实故障**——若根因在应用层/上游依赖，被冲掉后就再也复现不出来）。
  - **5 个 `node_modules` 必须一起隔离**：根 + `apps/api` + `apps/docs` + `packages/shared-core` + `packages/ui`。实测包级是指向根 `.pnpm` 的**绝对路径 Junction**，只移根会让包级悬空 → 正好复现出 `Cannot find module 'nuxt/bin/nuxt.mjs'` 那种假故障。
  - **命名收敛到 `node_modules.stale-*`**：`.gitignore:24` 只覆盖 `node_modules.stale-*`；原 §0 写的 `node_modules.broken-<date>` **不被忽略** → 照抄会污染 `git status`。
  - **只改名隔离、绝不删除**：一律 `Move-Item`；物理删除交给用户（`.gitignore:24` 注释已登记）。
  - 全部 PowerShell 块经 AST 解析（5 OK / 0 error）且只读命令**逐字执行过**。
- [x] **本机验证**（standalone，端口 3413）
  - 冷构建 **EXIT=0**（3/3 tasks，**0 cached**，fresh build）
  - `/no-such-page-xyz` → **404 + application/json**（原为 200 + HTML shell）；`/guide/no-such-sub-page` → **404**
  - `/guide` / `/guide/baseline` / `/` → 200 + HTML 正常内容（无回归）
  - `/api/_content/query/index.md`（无 `_params`）→ **400** + JSON + 指引；带 `_params` → **200 + 恰好 1 篇**（`_path=/guide/baseline`、title=绿色控制组）；两段形态 → 200 + 1 篇；裸 `/api/_content/query` → 200 + 全部文档
  - 指纹路由无回归：`cache.<integrity>.json` → 200 + 真实内容；`search-<integrity>` → 200 + `documentCount:10`
  - canonical 两条 + 裸前缀两条 → 404 + application/json（第二层守卫未回归）
  - `pnpm probe:content` → **EXIT=0，13 条断言全 PASS**（8 真实路由 + 4 must-404 + 1 missing-page）；`pnpm test:contracts` → **13/13**
- [x] **观测性修正：404 不再被记成运行时错误**
  - 实测发现去掉 `fatal: true` 是必要的：Nitro 默认错误处理器判定 `isSensitive = error.unhandled || error.fatal`（`nitropack@2.13.4` `dist/core/index.mjs`），`fatal` 为真时会把**每一个 404** 都记成 `[request error] [fatal]` → 污染运行时错误监控、打破「运行时错误零命中」验收门。404 是正常业务结果，不该进错误通道。去掉 `fatal` 不影响状态码（仍是真实 404）。
- **分发策略（用户要求「分发给其他分支使用」）**：修复落在 **main**（2 笔提交，见提交记录），三条路径任选——
  1. **从 main 拉的新分支自动带上**（推荐）：main 是唯一权威源；
  2. **已有分支显式 cherry-pick**：`git cherry-pick <fix-sha> <followup-sha>`（见提交记录里的 SHA），两笔必须一起取——第二笔是观测性修正；
  3. **不做 blanket 分发**：部分实验分支**刻意保留 200 shell** 来复现 F47 历史信号，批量强推会毁掉那些分支的实验前提。→ **opt-in，由分支负责人自行决定**。关闭 PR ≠ 删除分支。
- **本轮遗留项的处置结果（2026-10-30，用户逐项授权后已执行）**：①`experiment/integrate-r18-r19` 的 `FINDINGS.md` 已由 `#19` 重编号为 **`#20`**（`6bab1ba`，分支侧 R18.md 3 处 / R19.md 2 处引用同步改号）——**撞号已消解**；②R18/R19 的 verified **终版档案已并入 main**（只取档案，未带入 `pnpm-workspace.yaml` / lockfile / `nuxt.config.ts`；main 条目号 1–20 连续无重号，契约 13/13）；③`failure-catalog.md` 的 **F20 条目已上修**（由「性能/构建图放大」改为「**可用性灾难：hoisted 使项目不可构建**」，并补 R18 治理盲区与「12min 重装是冷 store 假象」两条订正）；④上游旧分支 `experiment/r18-targeted-public-hoist`(`d319177`) / `experiment/r19-node-linker-hoisted`(`916c0cb`) 已从**本地与远端删除**（唯一可安全删的一对；两个 **retry 分支不受影响，仍保留**）
- **新登记的遗留项（交用户决策）**：①**F17 机理在 FINDINGS 台账中无独立条目**——2026-10-30 复核时发现 `BRANCH-MERGE-EVALUATION.md` §3.5 存在错误指针「FINDINGS #19」，而 F17 机理目前只沉淀在 `R15.md` / `R16.md` / `R17.md` + `evidence/**`，是否补建 FINDINGS 条目待决；②**契约治理盲区**：F20 上修时发现 pnpm 对合法 kebab 键 `public-hoist-pattern` **零警告**，而契约测试只匹配 camelCase 字面 `publicHoistPattern` → 改用合法键名即**漏检**（FINDINGS #20 发现 4），是否在契约层同时枚举 kebab 与 camelCase 两种字面待决（会改动契约数量，需同步 CI 期望值）；③仓库内 `node_modules/node_modules/` 嵌套残留（早于本轮，非本轮产物）

## 2026-10-30 台账订正与上游旧分支处置收口

> 本段为**追加式**记录；上方 2026-09-29 / 2026-10-16 两段的历史快照原文不改写。

- [x] **PR #27 状态订正**：上方「2026-09-29 接力核对」段记载「PR #27 当前 OPEN，为唯一在途实验 PR」——该状态**已失效**。实测 `gh pr list`（#26/#27 于 2026-10-30T07:33:07Z 同刻更新）确认 **#27 与 #26 均已 CLOSED**（#27 因 head 分支 `experiment/r19-node-linker-hoisted` 被删除而由 GitHub 自动关闭）。**当前仓库零 OPEN PR**。
- [x] **R18/R19 终版档案并入 main**：`R18.md` / `R19.md` 已取入 main（`6f93975`）；FINDINGS 条目重编号为 **#20**（分支侧 `6bab1ba` 追加式重编号并 fast-forward 推送，**未用 force push**）。
- [x] **两个上游旧分支已删除**：`experiment/r18-targeted-public-hoist`（`d319177`）/ `experiment/r19-node-linker-hoisted`（`916c0cb`）本地 + 远端均已删除。删除前**先移植**其唯一证据归档（`evidence/2026-08-29-r15-element-plus-popper-alias.md`、`evidence/2026-08-29-r18-targeted-public-hoist-insufficient.md`）入 main——main 与 retry 分支均无副本，直接删等于销毁唯一证据载体。
- [x] **F20 条目上修**：由「性能/构建图放大」改为「**可用性灾难：hoisted 使项目不可构建**」（install / build:packages / docs build 全 exit 1，`.bin` shim 相对路径解析断裂）；「12min 重装」为冷 store 假象（warm store 21s），首轮 exit 124 是误诊；F20 实验方向**终止**，禁止作为 workaround。
- [x] **CI 终态**：`7b9df63` 五门全绿（静态契约 / Linux 完整生产构建与 artifact smoke / Windows 解析 prepare / CF Workers Builds api + docs）。
- [x] **分支计数**：本地 `experiment/*` = 23，远端 = 19；**4 个分支仅存在于本地**（`experiment/r21-windows-only-trace-false`、`r27-prerender-crawllinks-false`、`r28-prerender-routes-clear`、`r29-prerender-both`）——提交尚未推送，属单点证据风险（已登记为待决策项）。
- [x] **本段新登记遗留项**：①F17 机理在 FINDINGS 台账无独立条目（§3.5 指针已订正，缺口未擅自补建）；②契约治理盲区（camelCase `publicHoistPattern:` 与合法 kebab `public-hoist-pattern` 未同时枚举）；③4 个仅本地分支的远端备份；④`node_modules/node_modules/` 嵌套残留。

## 2026-10-30 A/B 类遗留项处置（用户逐项授权，按上一轮推荐方案执行）

> 本段为**追加式**记录。执行范围：A1–A4 + B1–B3，逐项按上一轮给出的推荐方案落地。

- [x] **A1：补建 FINDINGS #21（F17 机理）**——收敛 R15/R16/R17 三份档案：触发条件 = 精确 externalize Element Plus；症状 = **build 全绿 + standalone 正常监听 + 真实请求 500**（`failure-catalog` F18 的典型样本，只看 build 退出码会 100% 漏检）；因果链由 R15 阳性 / R16·R17 阴性三段对照锁定；并订正 `BRANCH-MERGE-EVALUATION.md` §3.5 的错误指针（现指向 #21）。
- [x] **A2：契约层双拼写加固**——`tests/baseline-safety.test.mjs` 的 `pnpmWorkspace.forbidden` 扩为 4 项（camelCase + kebab 各 2）；新增两道**独立于 forbidden 列表**的守卫（元守卫 + 合成样本自证）；契约 **13 → 15**。**红绿差分自证**：拆掉 forbidden 的 kebab 项 → 两守卫**同时变红**（`not ok 8` + `not ok 9`，exit 1）→ 装回 → 15/15 绿。⚠️ 期间发现**元守卫一度是恒真式**（期望值从 forbidden 派生 → 同源自证）→ 已改为独立硬编码列表，重做差分自证。
  - ⚠️ **受控实测推翻了原结论**：临时工作区实验（以传递依赖 `is-odd@3.0.1` → `is-number` 是否被提升到根 `node_modules/` 为判据）证明——`publicHoistPattern:`（camelCase）被 pnpm 接受且**真的生效**；`public-hoist-pattern:`（kebab）被 pnpm **显式 WARN 并忽略**（`ignored because they are not written in camelCase`）。→ `FINDINGS #20` 发现 4 原括注「非 pnpm 合法 kebab 键」**方向相反**，已在 #20 内订正；A2 的性质由「堵已实证漏洞」改为「**纵深防御**」。
- [x] **A3：R01/R13「未开 PR」复核**——结论：**不是缺口，是已复核的闭环决策**（阴性/排除性实验补开 PR 只制造无信息量噪声）；维持现状不补开 PR，已在 QUEUE 表 1 下加注记登记该口径。顺带订正分支名笔误：`r01-remove-nitro-sibling` → **`r01-remove-nitro3-sibling`**（QUEUE + R01.md 两处）。
- [x] **A4：R31-family 档案并入 main**——只取 `R31.md` 终版 + `R30/R32/R33` 状态行共 4 份档案；**未带入** `1.baseline.md` 的 mermaid 复现触发块；**未整文件取入**分支的 `failure-catalog.md`（经比对，分支版比 main 旧、缺 F20 上修与 F29 订正）；分支侧原占 #19 的条目改号 **#22**，5 处引用同步改号；QUEUE 表 1 新增 R31-family 行；R21 一并由表 4 移入表 1，表 4 收敛为 **12 个（R22 + R34-R45）**。
  - ✝️ **2026-10-30 二次订正（台账审计后）**：上句的「表 4 = 12 个」**已作废**——`debug` 经复核**非** `mermaid@11.17.2` 的传递依赖（lock mermaid 依赖块 line 12908–12931 无 `debug`），故「R30/R32/R33 由单一 mermaid 触发块覆盖」的收敛前提被证伪 → **R32 回到未启动池**，表 4 现为 **14 个（R22 / R32 / R34-R45）**，未启动+阻塞池 20 → 15。另：R06–R17 共 9 行此前仍滞留在 QUEUE 表 2（与表定义矛盾），已迁入表 1。详见 [experiments/QUEUE.md](./experiments/QUEUE.md) 表 4 与 [experiments/FINDINGS.md](./experiments/FINDINGS.md) #22。
- [x] **B1：4 个仅本地分支已推送远端备份**——`r21-windows-only-trace-false`(d7a0113) / `r27-prerender-crawllinks-false`(4d5c7e0) / `r28-prerender-routes-clear`(d088e38) / `r29-prerender-both`(17e87f7)；推送后**本地 = 远端 = 23 个** `experiment/*`，SHA 逐一核对一致（`experiment/*` push **不触发生产部署**）。
- [x] **B2：`integrate-r18-r19` 保留登记**——新增 `BRANCH-MERGE-EVALUATION.md` **§3.7**：保留（依 §1.3；它是「#19→#20 重编号」的唯一操作现场记录），并写明**删除的前置条件**；同时更新总表两行与「关键事实」段（该段仍称 main 的 R18/R19/R30–R33 为占位版，**已过期**）。
- [x] **B3：嵌套 `node_modules/node_modules/` 已隔离**——体检确认外层 store 健康（`.pnpm` 1209 / `nuxt.mjs` ✓ / `tsc` ✓ / 4 个包级 ✓）→ 按 AGENTS §0.5.1 **不动外层**；嵌套目录经实测为**僵尸虚拟 store**（76996 文件 / 580 MB / 内含自己的 `.pnpm` 1170 项），且外层 `.pnpm` 指向它的符号链接数 = **0**（扫描命中项全是 **HardLink 同 inode 兄弟**，不是依赖）。已 `Rename-Item` 就地隔离为 `node_modules/node_modules.stale-20261030-155656`（位于 gitignored 目录内，`git status` 干净）。⚠️ **移出仓库到 `D:\nm-trash\` 被运行时硬安全策略拦截**（禁止递归写/删目标落在工作区外）→ 残留由用户或主代理处置：`Move-Item -LiteralPath '<repo>\node_modules\node_modules.stale-20261030-155656' -Destination 'D:\nm-trash\node_modules.stale-nested-20261030-155656'`。
- [x] **隔离后验收**：docs 生产构建 **exit 0 / 187.4s**（`Build complete!`）+ 内容级探针 **13/13 全绿**（含 canonical 路径与缺失页面的真 404 断言）+ 契约 **15/15** → 依赖树完好，隔离未破坏任何东西。
- [x] **提交与推送**：`56ee0e1`（🔒 契约双拼写加固）/ `c3626b4`（📃 台账）→ `4f44c29..c3626b4 main -> main`（EXIT=0，工作区干净）。

## 2026-10-30 C 类未启动实验池阶段执行（第 1 批：R40 / R39 / R41）

> 本段为**追加式**记录。任务源 = [experiments/C-PHASE-EXECUTION.md](./experiments/C-PHASE-EXECUTION.md)。

- [x] **前置核实**：用户已手动完成 `node_modules/node_modules.stale-20261030-155656` 移出（实测 `D:\nm-trash\node_modules.stale-nested-20261030-155656` 存在，仓内零 `node_modules.stale-*` 残留）；`.pnpm` = 1209 / `nuxt.mjs` ✓ / `tsc` ✓；git 干净 @ `41cd215`。
- [x] **R39/R40 批次（测量型，main 原地，基线 `666b9bc`）**：隔离 node_modules（根 + 4 包级，tag `stale-r3940-20261030-174020`）→ `pnpm install --frozen-lockfile` exit 0 / 34s → **6 次构建**：
  - #1 `pnpm build` 185s / `2 cached, 4 total`；#2 1s / `4 cached` / `143ms FULL TURBO` → **manifest2 与 manifest1 逐行 diff = 0 行**（cache hit 是严格字节级还原）
  - #3 产物改名移走后 167s / `3 cached` → **docs 转 miss，hash 未变**（`.output` 不参与 hash 但缺失即阻断还原）
  - #4 `pnpm build:fresh`（`--force`）165.9s / `0 cached, 4 total` → vs manifest1 = **356 行差异**
  - #5 紧接其后 1s / `4 cached` / `138ms FULL TURBO` → **`--force` 不是冷构建**
  - #6 `.nuxt` 改名移走后 162.7s / `3 cached` → **docs hash 由 `5f736996212e114e` 变为 `032bab828abe7d0e`**（`.nuxt` 参与 hash）
  - **差异归因**：构建指纹类（Content `buildIntegrity` / Nuxt buildId / `nitro.json` date / `nitro.mjs` mtime）+ **枚举顺序不确定性类**（lucide 图标集合 JSON key 序在 m1/m4/m6 间持续变化、`styles.mjs` 的 error-404/500 条目序互换；均为同长度替换）
  - **冒烟**：`pnpm probe:content` **13/13 PASS**（含 canonical 路径与缺失页面的真 404 反向断言）
- [x] **首次建立 Linux 计时基线**：main 的 Linux control CI run `41036747720`（job `123999345078`，`workflow_dispatch` on `41cd215`）——`pnpm build:fresh` = `Tasks: 4 successful` / `Cached: 0 cached` / **`Time: 1m18.339s`**；`nodeModules.exists = true`；`dependencyCount = 207`；隔离父级 node_modules 下 `HTTP 200 OK bytes=107359`；Content 13/13 PASS；`/v1/health` 200 bytes=85。⇒ 仓内此前**只有 Windows 基线**（157–222s），跨平台耗时对照缺基线的问题已解决。
- [x] **R41（fresh resolve 漂移面量化）**：走既有 `fresh-resolution.yaml` workflow（run `41035616455`，artifact `fresh-resolution`）——**直接依赖漂移面 = 0**（nuxt / shadcn-docs-nuxt / content / h3 / vue / vue-router / nitro prerelease / og-image 全部未漂）；**传递依赖差异 = 562 项**（286 同名不同版本 + 276 包名集合增删），含 `@floating-ui/vue` 1.x→2.x **主版本跳跃**；**H3 世代结构不变**（`probe:h3` 五上下文全同 control、`Found 2 versions of h3`、`@nuxt/kit` 仍三代共存）→ **F09 在本拓扑下不成立**，属有效否证。
- [x] **落档与台账同步**：新增 [experiments/R39.md](./experiments/R39.md) / [R40.md](./experiments/R40.md) / [R41.md](./experiments/R41.md)；新增 [experiments/FINDINGS.md](./experiments/FINDINGS.md) **#23**（turbo 缓存还原三机制 + 本仓内容幂等/字节非幂等）与 **#24**（漂移面分层 + F09 不成立）；[experiments/QUEUE.md](./experiments/QUEUE.md) 表 1 新增 R39/R40/R41 三行、表 4 由 **14 → 11**（R22 + R32 + R34-R38 + R45）、未启动+阻塞池 15 → 12；[experiments/C-PHASE-EXECUTION.md](./experiments/C-PHASE-EXECUTION.md) 进度快照补 CP-1……CP-7。
- [x] **提交**：`9b2e4ca`（📃 docs: 完成 R39/R40/R41 实验并落档）。
- [x] **R42 / R43 / R44（构建顺序与并行矩阵）**：✅ **已完成并落档**（worker 串行执行，main 原地，手工序列不经 turbo）。
  - **执行口径**：turbo 依赖图中 `docs#build` 与 `api#build` **无依赖边** → turbo 无法表达先后 → 全部改用**手工脚本**（`pnpm build:packages` → `pnpm build:docs` / `build:api`），`build:packages` 是**受控公共前置**而非变量；R44 并发用 `Start-Process pnpm.cmd` **同时**起两个 `pnpm run`（**不用 turbo `--concurrency`**，那会引入 turbo 缓存与编排变量）。
  - **R42**（docs → api）：docs **159.2s** / api 1.9s / 峰值 WS **3619.2 MB**（vs R23 基线 3599.4 = **+0.55%**）/ 45 个采样点 / 尾行 `DONE peak_MB=3619.2`。
  - **R43**（api → docs）：api 1.9s → docs **154.7s** / 峰值 WS **3580.9 MB**（-0.51%）/ 38 点。→ 与 R42 峰值差 **-1.06%**。
  - **R44**（并发，定案轮 `r44c`）：**并行确实发生**——`OVERLAP 18:29:57.851 nitro=2 nuxt=2 total=4`（最大并发本仓 node 进程数 4）；但**墙钟 159.5s 未变快**（串行 156.6–161.1s）、**峰值 3619.7 MB 未叠加**、**重叠期最大同时 WS 仅 418.6 MB**。根因 = api 构建 `Server built in 51ms` / 产物 62116 B / ~2s，与 docs ~155s 几乎无重叠窗口 → **F43 担心的资源竞争未发生**。
  - **冒烟**：三轮均 `probe:content` **13/13 PASS**（含 4 条 must-404 反向断言）+ `probe:artifact` **HTTP 200 bytes=85**，零 EADDRINUSE，每轮均**先验 `Listening` 行**再发请求。
  - **产物等价**：api 侧三轮**逐字节相同**；docs 侧采用**分层判据**（原始 / 文件名 hash 归一 / 指纹归一 / 指纹+chunk 名归一多重集 / 字符多重集置换检验）——**字面「路径集合 + 排除 volatile 后哈希一致」在 docs 侧结构上不可达**（161 个 `public/_nuxt/<contentHash>.js` 文件名由指纹派生 + chunk 互相引用兄弟 chunk 名 → 级联）；残差收敛到**恒 6 个文件、三轮签名一致**，5 个同名文件**长度相等 + 字符多重集相等**（`styles.mjs` 逐行排序后亦相等）→ **纯置换**，与顺序/并发**无关**。正面证据：prerendered HTML 归一化后 `equal=true`（长度同为 106441，CSS 声明集合 393 = 393 零差集）、HTML 类名使用计数逐类相同、docs 归一化路由表 18 条三轮一致。
  - **判废与误判登记**：①`r44b` **整轮判废**（脚本只等 api 就记 `parallel_wall_s=1.8` 的**假墙钟** + 遗留 docs **孤儿构建进程**，F36 真实样本；处置 = 轮询等待其自然结束 18:26:30→18:29:13，**未无差别杀 node**）；②`r44` **退出码未采集** → 降级为旁证；③分析阶段曾把 R42 产物误配为 `.output.stale-r42`（实为旧产物 O0）→ 改正后残差 12 → 6；④「`.output.stale-*` 会被 Tailwind 扫进 CSS」的怀疑**实测证伪**（Tailwind v4 遵守 `.git/info/exclude`）→ 三轮数据无需重测。
  - **⚠️ 探针口径缺陷（横向教训，已进 FINDINGS #26）**：题面采样器的 `repoCount` 用 `Get-Process` 的 `.Path`（= 可执行文件路径 `node.exe`，**不含命令行**）→ 本机 node 在**仓库之外** ⇒ **计数恒 0**；这正是 R44 首轮「并行确实发生」证据缺失的**直接原因**。补救 = CIM `CommandLine` 口径 + 200ms 粒度进程追踪。**教训：计数恒 0 时先怀疑判据、再下结论。**
- [x] **R22（Linux `trace:false`，阳性复现）**：分支 `experiment/r22-linux-trace-false`（`8be7e3c`，已推送），在**独立 worktree** `.worktrees/r22` 执行（主工作区全程留在 `main` 且 git status 干净）。唯一变量 = `apps/docs/nuxt.config.ts` 加 `nitro.externals.trace = false` + 新增根 `experiment.json`（**未改任何 manifest、未改 lockfile**）。**契约红绿差分自证**：移走 `experiment.json` → `tests/baseline-safety.test.mjs` 变红（exit 1）→ 装回 → 全量契约 **15/15**。
  - CI 实验 run `41039962323`（job `124010065894`）vs main control run `41036747720`（job `123999345078`）：**构建全绿**（`Tasks: 4 successful` / `0 cached` / `1m14.848s` / `✨ Build complete!` / `Server built in 15751ms`），但**首个失败门 = G5 产物自包含门**——`probe:closure` 抛 `Error: 缺少 docs standalone manifest: apps/docs/.output/server/package.json` → **exit 1**。
  - **chunk 普遍变大 3.5%–124%**（`search` 3.19→7.14 kB、`query` 3.44→6.28 kB、`navigation` 3.77→6.76 kB）= 依赖被 `external: true` 而非 inline 的直接证据。
  - **提速收益强平台依赖**：Linux 仅 **-3.5s** vs R21 Windows **-133s** ⇒ 「Windows 上快 133s」不能推广到 CI/生产。
  - **✝️ 两处订正**：①R21 的「F26 缺包链未触发」是**假阴性**（R21 只扫产物裸导入，未跑 `probe:closure` / `probe:artifact`，而后者需要 `trace:false` 下根本不存在的 standalone manifest）；②FINDINGS #13 的「R22 价值下降，建议重估优先级」**已被推翻**。
- [x] **R22 遗留项闭合（本机补测，`.worktrees/r22`）**：install exit 0 / 32s / `.pnpm`=1209 → `build:packages` exit 0 / 4s → `build:docs` **exit 0 / 98s** → 启动产物 `Listening on http://127.0.0.1:3413` → `GET /` = **200 / 107359 B**（与 Linux control CI 的 `bytes=107359` 同量）、`/api/_content/query` = **200 / 11927 B**、`/no-such-page-xyz` = **404** JSON。
  - **✝️ 准确答案 = 「不是运行时 500，而是换机启动即崩」**：本机 200 是**构建机视角的假绿**；把 worktree 的 `node_modules/.pnpm` **改名隔离**（模拟目标机器无这些路径）→ 产物进程 **`ERR_MODULE_NOT_FOUND`**、**连 `Listening` 都起不来**（隔离随即撤销，复验 `.pnpm`=1209 / `nuxt.mjs` ✓ / `tsc` ✓）。
  - **✝️ 机理订正（比原文更精确）**：R22 产物的外部依赖既非裸包名也非 inline，而是 **`file://` 构建机绝对路径**（`import 'file://D:/…/.pnpm/unified@11.0.5/…/index.js'`）；源码依据 `nitropack/dist/rollup/index.mjs:392-398`（`trace === false` 时 external 的 `id` 写成**绝对路径**）与 `:434-437`（`buildEnd()` 直接 return ⇒ 跳过 NFT trace / 拷贝层 / standalone manifest 写出）。
  - **产物形态**：control `.output/server/` 有 `package.json` + `node_modules/`（1790 文件）；R22 **两者皆无**（455 文件）⇒ 与 Linux CI 的 G5 门 exit 1 完全一致。
  - **跨平台一致性**：本机 Windows chunk 变化方向与 Linux CI 一致（`search` +107% vs +124%、`query` +70% vs +83%、`navigation` +68% vs +79%、`index.mjs` +116%）。
  - **新增通用纪律**：产物闭包检查必须**三查**——①裸包名导入 ②`file://` 绝对路径导入 ③manifest + 拷贝层存在性；**只查①会把不可移植产物判成自包含**（R21 与本轮 R22 初判都踩了这个坑）。
  - **R21 对照的新解释**：R21 的「零裸导入」与 R22 的「零裸导入」**同源**（`file://` 路径不被裸导入口径捕获）⇒「Windows 与 Linux 行为不同」的怀疑可撤销；但 R21 提交内容未经字节级复核，**该解释只覆盖「零裸导入」这一条观测**。
  - 证据：[evidence/2026-10-30-r22-runtime-portability.md](../../evidence/2026-10-30-r22-runtime-portability.md)；FINDINGS #25 **发现 7**（订正/深化）。
- [x] **落档与台账同步（本批）**：新增 [experiments/R42.md](./experiments/R42.md) / [R43.md](./experiments/R43.md) / [R44.md](./experiments/R44.md) + [evidence/2026-10-30-r42-r44-build-order-parallel.md](../../evidence/2026-10-30-r42-r44-build-order-parallel.md)；新增 [experiments/FINDINGS.md](./experiments/FINDINGS.md) **#26**（顺序/并发 null + 探针口径恒 0 的方法论陷阱）；[experiments/QUEUE.md](./experiments/QUEUE.md) 表 1 新增 R42/R43/R44 三行、表 4 由 **10 → 7**（R32 + R34-R38 + R45）、未启动+阻塞池 11 → 8；[experiments/C-PHASE-EXECUTION.md](./experiments/C-PHASE-EXECUTION.md) CP-2 / CP-3 转 ✅。
- [x] **归档核盘订正**：R42–R44 evidence §10 初稿把上一轮遗留隔离物写成 `.output.stale-r3940-20261030-174020` / `.nuxt.stale-r3940-20261030-174020`——**磁盘上并不存在该两名**（实为 `node_modules.stale-r3940-output` / `-nuxt` / `-dist`，因 `.gitignore` 的 `dist` 规则**不匹配** `.output.stale-*`，被隔离的产物目录一律借用 `node_modules.stale-*` 形式取得忽略覆盖）。已订正为逐项对照表，并在 [experiments/R39.md](./experiments/R39.md) 追加「隔离物清单」节（**追加式**，不改写原始结论）。
- [x] **R32（debug 真实入场轴，clean negative）**：分支 `experiment/r32-debug-esm-cjs`（`6fc2398`，已推送）；唯一变量 = `apps/docs/package.json` 加 `"debug": "4.4.3"`（lockfile diff **恰好 3 行**，复用同一 store 条目；**未建 `experiment.json`**——`debug` 不在 `control.docsDependencies` 管控面，该变量对契约门不可见，靠自证观察）。**主工作区双臂对照**（control `8bd3f5b` vs 实验 `6fc2398`，同一探针脚本 / 同一端口族 / 同一 vite 缓存隔离口径）：
  - **变量真实生效**：dev stderr 的 `WARN Failed to resolve dependency: debug, present in client 'optimizeDeps.include'` **消失**；`deps/debug.js`（13951 B） 出现；`optimized` 由 `errx` → **`debug, errx`**。
  - **功能影响为零**：首页 200；**剥离 dev-only `data-nuxt-logs` 块后两臂主体逐字节相同**（各 25680 B）；**零 ESM/CJS 入口错误**；客户端产物无新增 chunk（`debug` 无人 import）⇒ **F30 未复现**。
  - **机理坐实**：`debug@4.4.3` 安装态 `dependencies` 仅 `{ ms: "^2.1.3" }`、**无 `exports`/`module`/`type`** ⇒ **结构上不存在入口歧义**。
  - **⚠️ 悬空声明是系统性的**：两臂均命中**同样 9 条** `@nuxt/content > @nuxtjs/mdc > …` / `slugify` 悬空告警 ⇒ 加上 `debug` 共 **10 条**，源头是上游主题 `shadcn-docs-nuxt@1.1.9` 的 `vite.optimizeDeps.include`（`nuxt.config.ts:96-98`）**整体脱节**，单点治 `debug` 只消 10 条里的 1 条。
  - **踩坑登记**：①**探针路径错**（首轮沿用 `.vite/deps`，真实落点是 `node_modules/.cache/vite/client/deps/`）→ 首轮误报「metadata 不存在」；**修正后重跑 control 臂**才采纳实验臂结果；②dev 就绪正则被 ANSI 码打断 → 白等 180s；③**worktree 环境不同类**（`.worktrees/r32` 自带 6 条 `#app-manifest` 预转换错误）→ 改为 `checkout --detach` 释放分支、双臂均在主工作区；④首页字节差 +1018 B **全部**来自 dev-only 日志块，非内容变化。
- [x] **落档与台账同步（本批）**：更新 [experiments/R32.md](./experiments/R32.md)（填执行记录 / 自检清单 / 结论 / 关键发现）；新增 [evidence/2026-10-30-r32-debug-entry-axis.md](../../evidence/2026-10-30-r32-debug-entry-axis.md)；新增 [experiments/FINDINGS.md](./experiments/FINDINGS.md) **#27**；[experiments/QUEUE.md](./experiments/QUEUE.md) 表 1 新增 R32 行、表 4 由 **7 → 6**（R34-R38 + R45）、未启动+阻塞池 8 → 7；[experiments/C-PHASE-EXECUTION.md](./experiments/C-PHASE-EXECUTION.md) CP-4 转 ✅。
- [x] **R45（Nuxt 4 同代整组迁移，❌ 判负 / 阻断级）**：分支 `experiment/nuxt4-generation-migration`（从 main `b004d0d` 建，**未 push**）。唯一变量 = Nuxt 4 世代整组兼容矩阵迁移：`nuxt` 3.21.2→**4.6.3**、`shadcn-docs-nuxt` 1.1.9→**1.2.2**、`@ztl-uwu/nuxt-content` 2.13.9→**2.14.1**、root override `nuxt-og-image` 5.1.9→**6.10.2**、`vue-router` 4.6.4→**5.4.0**、`vue` 3.5.30→**3.5.44**、`tailwindcss` 4.2.2→**4.3.3**、`@iconify-json/lucide` 1.2.98→**1.2.149**；**`h3` 全程保持 1.15.11**（首版曾升 2.0.8，已回退）。
  - **✝️ 启动前 R-3 前提被实测证伪**：`nuxt@4.6.3` 的服务端运行时仍是 **Nitro 2.13.5 + h3 1.15.11（v1 世代）**（npm 上最新的 `@nuxt/nitro-server@4.6.3` 亦然）⇒ **不存在「Nuxt 4.x 配 Nitro v3 / h3 v2」的官方组合**；`content@2.14.1` 自身不声明 h3 且不用 `event.path`/`event.url` ⇒ **h3 不是 R45 的可迁移轴**（首版 h3 v2 迁移导致 prerender 全 500：`Cannot read properties of undefined (reading 'pathname')`，已回退）。
  - **构建通过**：`build:packages` exit 0 / 3s；`build:docs` **exit 0 / 54s**（`Nuxt 4.6.3 (with Nitro 2.13.5, Vite 8.3.5 and Vue 3.5.44)` / `Server built in 6097ms` / `Prerendered 11 routes in 9.848 seconds`）；`probe:closure` exit 0；契约直跑 **15/15**。
  - **⚠️ 首轮冒烟整轮判废**：第一轮 `probe:content` 报 11 PASS / 2 FAIL，但应答者是 **R22 实验遗留的 standalone**（端口 3413/3414 上 `node index.mjs`，起于 19:02:43 / 19:04:55，早于 R45 构建 19:17:44；用各历史产物指纹反查，**只有 `.worktrees/r22` 的 ts=1793358021786 返回 200**）⇒ 根因是 `probes/content-smoke.ts` 的 `waitForServer` **不校验应答者身份**（端口被占时首轮 fetch 被旧服务应答即判定 ready）⇒ **假 FAIL**。处置：终止两进程 → 复验端口 FREE → 干净端口重跑。
  - **真缺陷（干净端口第二轮，9 项 FAIL）**：`query` / `cache.<ts>.json` / `search-<ts>` / `navigation` **全部返回空集合**（`contents: []` / `documentCount: 0` / `navigation: []`），而 4 条 must-404 与 missing-page 断言仍全绿 ⇒ **HTTP 全 200 但内容真的没有**（比 F47 的「200 假阳性」更重）。
  - **机制**：control 产物内嵌 **5 条** `nitro:bundled:cache:content:*`（**已解析 JSON**），R45 **零条**；control 的 `.nuxt/content-cache/parsed/content/*` 是 JSON，R45 同路径是**原始 markdown**（体积与源文件一一相等）；两版产物里运行时 `getContent` 都被打包成 `if (cached) { return cached.parsed; }` ⇒ **缓存位里是原文时永不解析**（上游 content v2 的「构建期写入 / 运行期消费」契约缺口）。
  - **子因证伪**：content 2.13.9→2.14.1 的 `dist/module.mjs` **逐行相同**（整包差异只有新增 `.d.vue.ts` 类型声明）⇒ **不是 content 升级**；h3 已回退 ⇒ **不是 h3**。
  - **未归因（诚实登记）**：control 为何在相同 module 代码下写入 JSON；`nitropack` 2.13.4→2.13.5 的 `bundledStorage` 注入与 `createStorage` 逻辑逐字等价，但 `core/index.mjs` 整体重构 ⇒ **未逐行定位**。下一步建议 **R46**：control 不动、仅把 lockfile 的 `nitropack` 单点 bump 到 2.13.5 ⇒ 可判定根因在 nitro 2.13.5 还是在 Nuxt 4 世代本身。
  - 证据：[experiments/R45.md](./experiments/R45.md)、[evidence/2026-10-30-r45-nuxt4-generation-migration.md](../../evidence/2026-10-30-r45-nuxt4-generation-migration.md)；FINDINGS #28。

- [x] **R34（两项目无根 `vercel.json`，部署 control，✅ 判绿 / 零新增部署）**：本实验**不改仓库任何文件** ⇒ 无变量漂移、未开 PR、未 push。以 Vercel **只读** API + 自定义域名抓取核验既有部署：
  - **F38**：仓库根 / `apps/docs` / `apps/api` **三处均无 `vercel.json`** ✓
  - **F39 单槽**：`apps/docs/.vercel/project.json` → `prj_nRhiR3d9kkcWp8U9prKNUh5cHdt1`、`apps/api/.vercel/project.json` → `prj_AAGUVMU0BfCce4ydRp8MmTdAYc5b`，两目录**各仅一个 `project.json`** ✓
  - **双部署 READY**：docs `dpl_8TfQgjTwSNzgNxxkiQ4m6HMnAvUs` / api `dpl_6vHNn7PUNy6vBiqsUcV1SRPW2AcT`，**同 commit `41cd215`、同分支 `main`** ✓
  - **云端构建**：install `pnpm install --frozen-lockfile`、`Scope: all 5 workspace projects`、turbo build（3 packages in scope）✓
  - **运行时内容断言**（非 200 假阳性）：docs 首页含「生产级复现实验室」**7 处**；api `/v1/health` `ok:true`；api `/v1/runtime` = `nitro3-h3v2` / `node v22.23.4` / `platform linux` ✓；api 根 404 为 Nitro 自身错误体（**预期**）
  - **零新增部署** ⇒ 不消耗部署额度；R35/R36 的无污染对照基线已就位。
  - 证据：[experiments/R34.md](./experiments/R34.md)、[evidence/2026-10-30-r34-vercel-control-readonly.md](../../evidence/2026-10-30-r34-vercel-control-readonly.md)；FINDINGS #29。
- [x] **R34-R38（Vercel 多项目污染组）**：⛔「待用户确认」项**已被实证消解**——四实验全部走**零部署额度**路径完成（详见下列三条），不再需要部署额度授权，也不需要为 F38 开口子。
- [x] **R35 / R36（根 `vercel.json` 作用域，❌ 判负，零部署额度）**：在 `%TEMP%` 沙箱内用 `vercel deploy --dry --debug` + `vercel pull --environment=production` 取证。关键日志：`Found config in file "…\<cwd>\vercel.json"` → `Read local config from root directory (apps/docs)`；pull 回读后 docs / api 两个 Project 的 `buildCommand` / `outputDirectory` / `rootDirectory` **全部未变**（根配置声明的 `R35-ROOT-BUILD-COMMAND` / `R36-ROOT-OUTPUT-DIR` 等值均未生效）⇒ **根 `vercel.json` 的作用域由 Project 的 Root Directory 决定**，对另一 Project **不生效** ⇒ **F38 的交叉污染在当前架构下双向不可复现**。仓库 `.vercel/project.json` 单槽绑定未被触碰 ⇒ **F39 保持成立**。
  - **诚实标注**：结论性质 = **结构判定 + 等价验证**，**不是** F38 原式复现（未做真实部署、未在云端观察构建被改写）。
  - 证据：[experiments/R35.md](./experiments/R35.md)、[experiments/R36.md](./experiments/R36.md)、[evidence/2026-10-30-r35-r36-root-vercel-json-no-cross-contamination.md](../../evidence/2026-10-30-r35-r36-root-vercel-json-no-cross-contamination.md)；FINDINGS #30。
- [x] **R37（`.vercel/output` 搬运到 repo root，❌ 判负，零部署额度）**：`vercel deploy --prebuilt --dry` 双向对照——放**仓库根** ⇒ `Error: The provided path "…\apps\docs" does not exist.`；放**官方位** `apps/docs/.vercel/output` ⇒ `Error: The "--prebuilt" option was used, but no prebuilt output found in ".vercel/output".`（**已定位到官方位**，仅内容不完整，因是伪造的最小产物）⇒ `--prebuilt` 只认 `join(cwd, project.rootDirectory, '.vercel/output')` ⇒ **搬运到 repo root 不是受支持的路径**，**不存在「搬运后跨 app 污染」的中间态**。F40 四问逐条判读已入档案。
- [x] **R38（preserve symlink vs dereference，❌ 判负 + 原变量不可执行，零部署额度）**：取证确认 `preserveSymlinks` **不是** `vercel.json` 的键（官方属性表无此键）、**不是** `vercel build` 的 flag（本机 CLI 58.11.0 的 build 选项只有 `prod`/`environment`/`target`/`output`/`yes`/`standalone`/`deployment`/`project`）、**不是** `@vercel/nft` 的选项（nft 默认 realpath = dereference），而是 **Node 运行时选项**（`NODE_OPTIONS=--preserve-symlinks`）；**Vercel 侧真正可控的变量是 `vercel build --standalone`**（上游 commit `c4667d3`：standalone 下 package-manager symlink 由「跳过」改为「保留」，否则目标在子目录外被跳过 → 运行时 `Cannot find module`，PIPE-6621；自 vercel@54.21.0 默认开启，本机 58.11.0 已含）。本仓风险面真实（`@repro/shared-core` / `@repro/ui` 的 `workspace:*` symlink 指向 Root Directory 之外的 `.pnpm` 虚拟 store），但 R34 的云端运行时断言全通过 ⇒ **当前未触发**（是需监控的脆弱面，不是已发生故障）。
- [x] **F49 探针加固（提交 `d2dd32b`）**：R45 首轮冒烟的假 FAIL 暴露 `probes/content-smoke.ts` 的 `waitForServer` **不校验应答者身份**（端口被占时首轮 fetch 被上一轮遗留的 standalone 应答即判定 ready ⇒ 假 PASS / 假 FAIL 双向风险）。两道新门：①**端口占用即拒绝**（spawn 前用 `node:net` 探测目标端口，已占用 ⇒ 直接 `exit 1` 并打印「端口 ${port} 已被占用，拒绝复用既有服务」，附 `--allow-port-reuse` 逃生开关）；②**应答者身份校验**（就绪判据从「fetch 有应答」改为**子进程自己打印的 `Listening on <url>` 行**，依据 `nitropack/dist/presets/node/runtime/node-server.mjs:33`；并比对子进程自称监听**端口**与探针请求端口——**只比端口不比 host**，因 Windows 上 `127.0.0.1` 可能报成 `::1`）。
  - **契约守卫** `tests/probe-guard.test.mjs` 锁定两道门**及其调用点**（`await isPortOccupied(port)` / `LISTENING_PATTERN.exec(log)` / `await waitForServer(base, child, serverLog)`）——**只查函数名存在会退化成恒真式**，本轮已实测踩坑并修正为「检查调用点」。
  - **红绿差分自证**：绿态（端口空闲）probe exit 0 / 13/13 PASS / 捕获到 `Listening on http://127.0.0.1:3413`；红态（用 `cmd.exe /c set NITRO_PORT=3413&& node index.mjs` 起 stale standalone，PID 16896，与 R45 事故现场同构）probe **exit 1** 并明确拒绝；守卫自证：拆掉 `isPortOccupied` 调用点后契约 `not ok 3`，装回后 **19/19 PASS**。
  - **首版红态自证失败并修正**：第一次用 `Start-Process node` 起 stale server 时进程立刻退出（`alive=False`、端口无人监听），探针正常 exit 0 —— 是**测试装置错误**而非探针缺陷，改用 cmd 包装 + env 后成功复现。
- [x] **R46（nitro 2.13.5 单点 bump，✅ 阳性复现 / 阻断级）**：分支 `experiment/r46-nitro-2135-bump`（`b1e0bb8`，**未 push**）。control（Nuxt 3.21.2 / content 2.13.9）其余一切不动，只把 `nitropack` 从 `2.13.4` bump 到 `2.13.5` ⇒ docs build **exit 1**，prerender 500：`[request error] [unhandled] [GET] http://localhost/` → `[unstorage] Invalid key: "/"`（`itemKey` @ `unstorage.lWbgcyKt.mjs:102:13` → `nsStorage.setItem` `:113:25` → `Object.render` @ `apps/docs/.nuxt/prerender/chunks/_/renderer.mjs:390:22`）。
  - **根因（字节级）**：`nitropack@2.13.5` 相对 2.13.4 的**唯一依赖增量** = `"unstorage": "^1.17.5"` → `"^1.17.6"`；nitro 自身在 storage 全链路（`createStorage` / `snapshotStorage` / `_snapshot` / `buildProduction` / `rollup storage()` / `resolveStorageOptions` / `loadOptions`）**逐字相同** ⇒ **nitro 无责**。`unstorage@1.17.6` 的 `prefixStorage` 新增 `itemKey(key)`：`if (!normalizeKey(key)) throw new Error("[unstorage] Invalid key")`；而 `normalizeKey("/")` → `":"` → `""` ⇒ **falsy ⇒ `"/"` 被判非法**。1.17.5 的 `prefixStorage` **无任何校验**。
  - **R46b 二次隔离**（nitro 2.13.5 **+ unstorage 1.17.5**）build **exit 0**、prerender 11 routes、探针 **13/13 PASS**、产物仍有 **5 条** `nitro:bundled:cache:content:*`、缓存位仍是 `{parsed, hash}` JSON ⇒ **nitro 2.13.5 的其它改动全部无责**，唯一元凶是 unstorage 1.17.6。
  - **同一根因两种表象**：content runtime `dist/runtime/server/storage.js:163` 是 `await cache.setItem(id, { parsed, hash }).catch(() => {})` ⇒ 异常被**静默吞掉** ⇒ JSON 写不回缓存位 ⇒ 缓存停留在 `build:before` 写的裸 markdown ⇒ `_snapshot` 抄走原文 ⇒ 生产运行时 `isProduction && cached` ⇒ `return cached.parsed` = **undefined** ⇒ **R45 内容库为空**（构建全绿、数据全空）；而 nitro prerender 写根路由 payload（key `"/"`）的 `setItem` **未被 catch 包裹** ⇒ 直接抛 ⇒ **R46 prerender 500**。
  - **⇒ R45 判负归因订正**（R45.md 追加「✝️ 归因订正」节，原文不改写）：根因不是「Nuxt 4 世代」本身，而是「nitro 2.13.5 经 unstorage 1.17.6 与 content v2 的 `"/"` key 约定冲突」⇒ **Nuxt 4 迁移的变量面应拆开评估**。
  - 证据：[experiments/R46.md](./experiments/R46.md)、[evidence/2026-10-30-r46-nitro-2135-attribution.md](../../evidence/2026-10-30-r46-nitro-2135-attribution.md)；FINDINGS #32。
- [x] **R47（干净态验证，归因辅助，已落档于 R46）**：发现 main 工作区 `node_modules` 被 **R45 分支污染**（`apps/docs/node_modules/nuxt` → nuxt 4.6.3、content 2.14.1）⇒ 按 AGENTS.md §0.5 隔离**根 + 4 个包级** `node_modules` 后 `pnpm install --frozen-lockfile` 重建（exit 0 / 35.3s），复验 `.pnpm` = **1209**、nuxt 3.21.2 / content 2.13.9 / nitropack 2.13.4 / unstorage 1.17.5。删除 `.nuxt/content-cache` / `.nuxt/snapshot` / `.output` 后 `build:fresh`（0 cached）**仍产出 5 条 `nitro:bundled:cache:content:*`，缓存位是 `{"parsed":{...}}` JSON**（2907/2245/5548/1478 B，mtime = 本次构建时刻）⇒ **证伪了「control 依赖残留缓存」的假设**；诊断实证时序 = `build:before` 写**裸 markdown**（851/724/459/277 B，与源文件体积一一相等）→ 同一批文件随后被改写为 `{parsed, hash}` JSON → `_snapshot` 抄走 JSON（content-cache mtime 20:04:51 / snapshot 20:04:52）。
- [x] **阶段收口（第六批 + C 类池清空）**：QUEUE 表 4 **清空**（表 1 收齐 R35 / R36 / R37 / R38 / R46 五行）；未启动+阻塞池 5 → **1**（R11 常驻阻塞：无证据驱动目标，解除条件 = 捕获首个 SSR externalization 错误）；FINDINGS 新增 **#30 / #31 / #32**，#28 的「发现 7（未归因部分）」由 #32 闭合；FINDINGS 与 R{xx}.md 交叉引用**一字不差**校验通过；`C-PHASE-EXECUTION.md` CP-6 / CP-7 转 ✅；prettier 已跑；契约直跑 **26/26 PASS**（原 19 + 新增 FINDINGS 交叉引用守卫 7）。
  - **顺带修掉的既有缺陷**：`docs/` 下 **15 处 evidence 相对链接少一层目录深度**（`docs/task-artifacts/progress.md` 5 处用 `../evidence/`；`docs/task-artifacts/experiments/FINDINGS.md` 9 处 + `R39.md` 1 处用 `../../evidence/`）⇒ 实际指向**不存在的** `docs/evidence/` ⇒ 全部改为正确深度（`../../evidence/` / `../../../evidence/`）。同目录内 `BRANCH-MERGE-EVALUATION.md`、`docs/task-artifacts/README.md`、`docs/history/README.md` 的链接深度**本来就是对的**，未动。
- [x] **遗留项登记（不在本阶段关闭）**：
  - **R21 提交仍未字节级复核**（`experiment/r21-windows-only-trace-false` / `d7a0113`，仅本地）——R22 遗留项闭合时只能就「零裸导入」一条给出解释。
  - **R46 可操作的规避方向未验证**（钉 `unstorage` 1.17.5 / 升级 content 避开 `"/"` key / 应用层改写 key）——需独立实验。
  - **F41（Windows 本地 vs Vercel Linux 的 symlink 行为差异）本轮未单独验证**——留给 CI 的 Linux job 观察点。
  - **R11 常驻阻塞**（无证据驱动目标）。
  - **隔离目录物理清理**（`node_modules.stale-*` 等）由用户 / 主代理批量执行（运行时硬安全策略不允许本代理删除）。
- [x] **R21 提交字节级复核（2026-10-31，遗留项 #1 闭合）**：`d7a0113` 逐 hunk 复核**通过**——唯一语义变更 = `nitro.externals.trace: false`（+ `experiment.json` 声明），其余 74 行 diff 为 `apps/docs/nuxt.config.ts` 整体缩进规范化（2 空格 → Tab），无语义漂移；`git rev-list --count 0964a2e2..d7a0113` = **1**（单提交、基线一致）；实测分支**已推送**（`origin/experiment/r21-windows-only-trace-false` = `d7a0113` = 本地 tip）⇒ 上文遗留项登记中「仅本地」为过时表述，以本条为准。R22 遗留项的「未复核」前提解除，其对「零裸导入」的口径盲区订正不受影响。落档：[experiments/R21.md](./experiments/R21.md) 与 [experiments/R22.md](./experiments/R22.md) 各追加「✝️」节（原文不改写）。
- [x] **R48（钉 `unstorage` 1.17.5，R46 规避方向 A，✅ verified，2026-10-31）**：分支 `experiment/r48-pin-unstorage-1175`（`5e458e1`，未 push）。R46 失败态之上仅钉 unstorage 1.17.5 ⇒ build **exit 0**（Prerendered 11 routes 与 control 同数）、探针 **13/13**（指纹路由 `cache.1793418443932.json` 200/12244B 内容级断言）、closure exit 0、产物 5 条 `nitro:bundled:cache:content:*` 与 control 同形态 ⇒ **R46 故障面全部消除**。lockfile 证据：`unstorage@1.17.6` = 0 处 / 1.17.5 = 4 处 / nitropack 仅 2.13.5；diff 856 行为全量重解析的键重排（以版本集合为准不以行数为准）。
- [x] **R49（content 2.13.9→2.14.1，R46 规避方向 B，❌ 判负，2026-10-31）**：分支 `experiment/r49-content-2141-nitro-2135`（`89c1534`，未 push）。R46 失败态之上仅升 content（unstorage 1.17.6 回归）⇒ docs build **exit 1**，prerender 500 **同签名逐字节复现**（`itemKey` @ `unstorage.lWbgcyKt.mjs:102:13` → `renderer.mjs:390:22`，失败路由 `/` 881ms）⇒ **content 升级不能规避**（失败写入在 Nuxt 生成 renderer，与 content 版本无关）；**额外产出：R45「构建全绿」归因收窄到 Nuxt 4 renderer 模板**（R45 Nuxt4+content2.14.1 绿 vs R49 Nuxt3+同依赖红，唯一系统性差异 = Nuxt 世代）。theme 兼容混淆已排除（`shadcn-docs-nuxt@1.1.9` 范围 `^2.13.9` 满足 2.14.1，构建推进到 prerender 才失败）。
- [x] **R50（`experimental.payloadExtraction: false`，R46 规避方向 C，✅ verified + 形态订正，2026-10-31）**：分支 `experiment/r50-payload-extraction-off`（`dac335d`，未 push）。**结构性取证**：校验在 unstorage 1.17.6 `prefixStorage` 包装器内联（先于 driver 委托）+ `payloadCache` 由生成 renderer 模块作用域 `useStorage("internal:nuxt:prerender:payload")` 持有且每次调用新建 ⇒ 插件/driver/根 patch 全部不可达，**字面「拦截改写 key」结构性不可能**；唯一可达形态 = 消除调用点（`NUXT_PAYLOAD_EXTRACTION` → false，模板裁剪写入分支）。实测 build **exit 0**、Prerendered 11→**7**（4 个 payload 文件消失、`_payload.json` = 0）、探针 **13/13**、closure exit 0、`GET /` = 200/107432B（control 107359B，SSR 完好）。
- [x] **遗留项清单状态更新（2026-10-31）**：~~R21 字节级复核~~ ✅ 闭合（见上）；~~R46 三规避方向未验证~~ ✅ 闭合（R48 ✅ / R49 ❌ / R50 ✅，[FINDINGS #33](./experiments/FINDINGS.md)）；**隔离目录搬移已完成**：主代理把 **48 个**隔离目录（`node_modules.stale-*` / `.output.stale-*` / `.nuxt.stale-*` / `dist.stale-*`，根 + 4 包级）移出仓库进 `D:\code\ruan-cat\_repro-nm-quarantine`（实测 before=48 / after=0 / quarantine=48，`git status` 干净），**物理删除仍待用户**；仍开放——**F41**（Windows vs Vercel Linux symlink 差异，CI Linux job 观察点）、**R11**（常驻阻塞，解除条件不变）。
- [x] **落档批次独立复核审计（2026-10-31，全部在提交 `bd9cf26` 前修复）**：复核子代理逐项审计抓到 **3 处 FAIL + 1 处流程险情**——①R48 档案 numstat 分解误差（写 578+/282-，实测 `pnpm-lock.yaml` 单文件 575+/281-，合计 856 正确）；②R49/R50 基线 SHA 应为 `6175702`（`f927b54` 之后的 docs-only 提交，依赖态相同，仅 R48 基线确为 `f927b54`）；③QUEUE 表 1 插行被空行截断（新三行渲染为无表头孤立块——契约测试与 prettier 都不拦，靠独立复核抓到）；④progress 曾写「隔离目录已移出」而搬移**尚未执行**（先写结论后做事，红线一未遂）。**处置**：①②按实测订正；③重排插行锚点（表格行尾）；④先把搬移真正执行（48 个目录 → `_repro-nm-quarantine`，before=48/after=0 实证）再让表述成真。**教训**：台账插行锚点必须选表格最后一行的行尾；结论表述不得先于事实发生。案例沉淀：`.agents/skills/fix-bug/record-bug-fix-memory/2026-10-31-ledger-editing-false-signal-traps.md`。
- [x] **2026-10-31 里程碑推送（`f927b54..ef5c6f9`）**：CI run `41168485031` 三 job 全绿（Windows 解析 1m6s / Linux 完整生产构建与 artifact smoke 2m9s / 静态契约与依赖探针 36s）；双 Project 生产部署 **READY** @ `ef5c6f9`；生产内容断言全绿——docs 首页「生产级复现实验室」×7 / 107519 B、api `/v1/health` `ok:true`、`/v1/runtime` `node v22.23.4 / nitro3-h3v2 / linux`、docs `/api/_content/query` 200 / 11927 B（与本地探针同量，响应体级断言而非仅 HTTP 200）。**F41 观察点记录**：Linux job 构建与 artifact smoke 绿、无 symlink 驱动故障 ⇒ F41 维持被动观察（本仓不部署 Windows 产物，差异面暂无可观测触发条件）。
- [x] **分支现场 vs 档案全量核对（2026-10-31，用户质询触发）**：对全部 30 个 `experiment/*` 分支做 merge-base 口径 diff 与档案逐字对照（机械事实：tip SHA / 变更文件清单 / experiment.json 在位性 / 提交 message，QUEUE 记载的 tip SHA 全部与实际相符；memorix 近期记录 #6101/#6110/#6120/#6121 内容均已被 FINDINGS/QUEUE 吸收，无未落档发现）。**结论：22 个分支档案与现场完全一致，6 处真实缺口已按追加式 ✝️ 补齐**——①[R46.md](./experiments/R46.md)：分支 tip `b1e0bb8` 实际带**两行** override（含 unstorage 1.17.5 钉）⇒ 分支现场即 R46b 现场，而 R46b 此前只落在 QUEUE/FINDINGS、档案未记载，且「方向 A 未验证」表述已被 R46b+R48 双重实测推翻；②[R07.md](./experiments/R07.md)：3 个源码文件的 shared-core 内联重写未列入变量条目（判性：移除消费边的必要载体）；③[R08.md](./experiments/R08.md)：`WorkspaceRuntimeProbe.vue` 本地等价重写同上；④[R15.md](./experiments/R15.md)：分支叠带 R16/R17 两个槽位提交（`82143c0` / `f138b09`）的提交级 provenance；⑤[R45.md](./experiments/R45.md)：12 文件中 6 真变量 + 6 docs 副本的口径区分；⑥[R21.md](./experiments/R21.md)：头部预期分支名与实际分支名不一致。**全部判性为「载体/provenance 缺口，非变量污染」——没有任何一份档案的实验结论因现场核对被推翻**。
- [x] **项目总盘点：未验证项 + 未落档发现（2026-10-31 第二轮，双探索子代理 + 生产断言复验）**：
  - **生产断言闭合**：`dfa1bb2` push 的生产内容断言复验全绿且与 `ef5c6f9` 轮**逐项同量**（docs 首页 ×7 / 107519 B、api `/v1/health` `ok:true`、`/v1/runtime` `node v22.23.4 / nitro3-h3v2 / linux`、`/api/_content/query` 200 / 11927 B）——docs-only 提交不改变运行时内容，符合预期。
  - **memorix vs markdown**：近 30 条 obs 逐条比对落点，**唯一未落档 = #6121**（prettier 字节保真 / `.prettierignore` 两份移植证据排除）——本批补进 [evidence/README.md](../../evidence/README.md) 追记；**同时订正上文「分支现场审计」条目的一处自证失实**（该条写「#6121 内容均已被 FINDINGS/QUEUE 吸收」，grep 证伪——红线二自查被抓，以本条为准）。
  - **git message vs markdown**：main 近 25 条与全部分支 tip message 均已落档；`git stash list` 空、工作区干净；`.workbuddy/hooks/hooks.json` 为唯一存疑孤儿（被 git 跟踪但文档零提及，疑为工具注入配置，待用户定夺）。
  - **未验证项固化**：[HANDOFF](./HANDOFF.md) §4 新增 #8 / #9 / #10（四处假设级 claim 已补 ✝️ 标注而配套验证未入队——R50 运行时兜底 / R49 renderer 字节级对比 / R48-R50 Linux closure / R45 吞异常实录；实验分支远端备份待确认；F48 独立编号待定夺）；[R48.md](./experiments/R48.md) / [R49.md](./experiments/R49.md) / [R50.md](./experiments/R50.md) / [R46.md](./experiments/R46.md) / [R45.md](./experiments/R45.md) 五档案追加「✝️」节，[FINDINGS](./experiments/FINDINGS.md) #32 发现 5 与 #33 发现 2 各加 inline ✝️。
  - **status-matrix 行态订正**：F09 / F26 / F38 / F39 / F40 / F42 / F43 七行停留在「待实验」态而对应实验（R41 / R22 / R35-R38 / R42-R44）早已完成落档——按 QUEUE 表 1 逐行订正（「索引滞后于台账」同款缺口第三次出现，前两次为 evidence 索引漏登记）。
- [x] **分支备份推送 + 三平台工作流观察 + F48 立号 + SOP 技能（2026-10-31 第三轮，用户四项指令）**：
  - **分支推送**：`experiment/r46-nitro-2135-bump` / `r48-pin-unstorage-1175` / `r49-content-2141-nitro-2135` / `r50-payload-extraction-off` 四分支推 origin（用户指令）。**「分支 push 不触发工作流」由三处 CLI 直接实证**（从 B1 先例推断升级为实证）：GitHub Actions `ci.yaml` 触发器 = `pull_request` + `push: main` + 手动 ⇒ 分支零 run（`gh run list --branch` 空）；Vercel `vercel ls` 双 Project 部署列表零新增（preview 未启用）；CF `cf builds triggers list` 实测 `branch_includes: ["main"]` ⇒ 分支不可触发。**script-tag 寻址记录**：docs `088d894e00824f3d9577fd18926d6eb7` / api `bcb29b488fb641f1947ce87aa9f512c3`（源：evidence/2026-10-16）。分支预期成功/失败以本地构建实证为准（r49 的预期错误 = prerender 500 已实测）。
  - **main 推送的三平台全触发实证**：`dfa1bb2` push 精确触发 CF 双 worker 构建（`cf builds get` 实证 commit_hash = dfa1bb2、outcome success；docs/api 各一）；CF 自定义域名内容断言 ×7 / 107317 B 当前真实。
  - **F48 立号**（用户拍板）：[failure-catalog](./failure-catalog.md) 新增 F48（unstorage 1.17.6 key 校验 × content v2 `"/"` key 冲突，本仓已复现）；引用回改 11 处——R45/R46/R48/R49/R50 五档案头部、FINDINGS #28/#32/#33 交叉引用、BRANCH-MERGE-EVALUATION 五行代表故障列、status-matrix 标题 + F48 行 + F45 指针、F45 ✝️ 收口句。
  - **SOP 技能落地**：新增项目级技能 `.agents/skills/experiment-ledger-sop/SKILL.md`（实验全流程台账 SOP：开工门 / 验收门 / 落档门九项 / 平台覆盖矩阵 / 收口门 / 编辑纪律 / CLI 坑位速查——把 2026-10-31 三轮审计暴露的丢三落四缺口固化为门禁）；AGENTS.md 技能表注册为强制第一技能 + 标准测试 SOP 节加指引。

- [x] **R51 轴 A（Nuxt4/Nuxt3 生成 renderer 字节级对比，✅ verified，2026-10-31）**：取证型双臂，无代码变更、无新分支。臂 1 = `main` @ `ee0f51a` fresh build（probe:content **13/13** + closure exit 0；生成 renderer `.nuxt/prerender/chunks/_/renderer.mjs` = **523 行** / sha256 `2d9f1565…`）；臂 2 = `experiment/nuxt4-generation-migration` @ `7714f5d` 现场复建（隔离 `node_modules.stale-r51-nuxt4-20261031-172947` ×5 → frozen install 30.4s → build 全绿 / Prerendered 11 / 4 个 `_payload.json`）。**结论**：①**键形态子机理实锤**——N3 生成 renderer `:390` 内联三元键 `"/"` 抛 unstorage 1.17.6 校验（= R46/R49 报错行），N4 写入迁入 `nuxt@4.6.3/dist/runtime/server/renderer/index.js:676-679` `getPayloadCacheKey` ⇒ 根路由键 = `"/.json"` 校验**通过**；②**包裹子机理否定**——两侧 `payloadCache.setItem` 均裸 await（N3 `:382` 直渲键合法，解释报错栈为何落在 `:390:22`）；③payloadCache 实例链 = nitro-server@4.6.3 `cache.mjs` → `useStorage(nitropack/runtime)` → unstorage **1.17.6**（nitropack 侧 symlink 实测）——N4 写入确实穿过校验，非换无校验实例；④renderer 模板 307→**27 行薄壳**（`createNuxtRenderer("nuxt/internal/renderer")`）、`.nuxt/prerender` 布局在 N4 消失；⑤unstorage 归位矩阵实测——`content@2.13.9/2.14.1` 与 `nitro-server@4.6.3` 均 **1.17.5（无校验）**、`nitropack@2.13.4/2.13.5` = 1.17.5/1.17.6。**台账联动**：FINDINGS **#34** 新增 + #32 发现 5 / #33 发现 2 inline ✝️ + [R49.md](./experiments/R49.md) ✝️ 闭合 + QUEUE 表 1 R51 行 + status-matrix F45/F48 ✝️ + evidence 索引；**上游 issue（F48 句柄）证据链零推断环节**。执行险情如实登记：①`cd docs/task-artifacts` 污染了持久 cwd ⇒ `mv node_modules` 在子目录失败而 `git checkout main` 照常执行（分支先切、node_modules 未动）——绝对路径修复，无损伤；②台账更新险些在 nuxt4 分支上做（该分支 FINDINGS 只到 #28）——切回 main 后落档，恢复 control 布局用臂 1 隔离目录改名复原（零重建）。

- [x] **R51 批次收口（2026-10-31 第四轮，用户五问驱动）**：①**#32 发现 5 订正补进 [R45.md](./experiments/R45.md)** ✝️ 节（「内容库为空与 unstorage 1.17.6 无关——content 侧 prefixStorage 为自 import 的 1.17.5」落到 R45 档案本体，此前只在 FINDINGS/R51）；②**init-shadcn-docs-nuxt 全局技能 1.6.1→1.7.0**——22 条事故记忆中 unstorage 此前**零提及**，新增第 23 条（unstorage 1.17.6 key 校验世代边界：N3 `"/"` 500 / N4 `"/.json"` 天然合法 / 两种规避 / Nuxt 4 不免疫内容空阻断）+ incident-repair.md **事故 C** 节 + 高价值信号表行 + 检修入口与 description 触发词；③**cwd 跨调用持久险情沉淀** record-bug-fix-memory 案例 `2026-10-31-cwd-persistence-silent-mv-failure.md`（git 成功掩盖 mv 失败的中间态险情；「工具环境状态跨调用持续」家族第三例）+ SKILL.md 索引 + memorix gotcha **#6145**；④**pr-roadmap R32 状态行订正**（🆕 未启动 → ✅ 已执行终结 2026-10-30 verified，与 QUEUE 表 2 / FINDINGS #27 对齐）；⑤**G12 Linux closure 达成**——`workflow_dispatch` 三分支 CI：r48 ✅ success 1m54s（G12 正向）/ r49 ❌ failure 1m22s（Linux `[unstorage] Invalid key: "/"` @ `renderer.mjs:390:22` 与 Windows **行号列号逐字一致**；contracts 红为契约捕获 content override 漂移属预期判违）/ r50 ✅ success 1m38s（run `41192048834`/`41192051449`/`41192054732`）；R48/R49/R50 三档案平台局限 ✝️ 同步 + BRANCH-MERGE R48 行 G12 达成注记；⑥**上游 issue 草稿组装**：[upstream-issue-f48-draft.md](./upstream-issue-f48-draft.md)（nuxt 仓主靶标题 + unstorage 备选标题 + 最小复现 + 字节级根因链 + workarounds 表；**提交动作等用户授权**）。

- [x] **main push 里程碑 + monorepo 技能发布闭环（2026-10-31 第五轮）**：①**main push**（`dfa1bb2..067c2c3`，用户授权）：CI run `41194130270` success（2m16s）、Vercel 双 Project Ready（docs 19s / api 15s）、CF 双 worker build success；生产断言 4/4 与基线逐项同量（docs 首页 ×7 / 107519 B、`/api/_content/query` **200 / 11927 B**、api health `ok:true`、runtime `nitro3-h3v2 / node v22.23.4 / linux`）——断言执行教训：`_content/query` 在 **docs** 域名（F47 家族），打到 api 域名是 404 假信号。②**monorepo `init-shadcn-docs-nuxt` 1.7.0 标准发布**（独立子代理全链）：主代理此前的**实体文件直改是流程错误**（安装产物不直接编辑），已按用户纠正的标准流程重做——monorepo dev 源迁移四块增强（子代理额外修正「22 条记忆」计数标题遗漏）→ `release-ai-plugins.ps1` v11.2.0（3 CHANGELOG + 12 版本 JSON + skill-registry.json，registry check 通过；version bump 由脚本完成防双跳）→ commit `15e5eec2`（✨ feat，emoji 依权威 commit-types.ts）+ `a74c9a2f`（📢 publish）push dev → CI 双 workflow success（Registry Check `41194940938` / CI `41194940839`）→ 重装 dev-skills 7 + common-tools 16 技能，源↔实体 **byte-identical** 实证。流程纪律入 auto-memory（global-skill-upgrade-workflow）+ memorix #6148。**安装命令备忘**：用户模板的 `--skill '_'` 在当前 skills CLI 是 no-op（通配符为 `'*'`，原样命令两遍取证零安装），按用户意图以 `'*'` 等价执行；Codex CLI 真实加载 smoke 未测（如实登记）。

- [x] **R52：content 吞异常轴（R51 轴 B）——R45 真因闭合 + F50 立号（2026-10-31 第六轮）**：同分支 A/B 诊断插桩对照（`experiment/r52-content-cache-axis`，插桩 `b981900` → 增补 → N4 版本集合 `a6fab32`，业务零变更）。**静态取证**：content 预热钩子定位（module.mjs `:640-670`——`.nuxt/content-cache/parsed/*` 裸 markdown 是**设计行为**）、bundledStorage 注册（`:275-276`）、`_snapshot` 时机/跳过条件（nitropack `:1585`/`:1655`）、content 2.13.9↔2.14.1 `storage.js` 逐字相同 + `module.mjs` 仅版本常量差。**A 轮（control）**：mtime 时序实锤（预热 20:12:51 裸 md → prerender 回写 20:14:11 JSON → content-index 20:14:12 → `_snapshot` 读 fs → bundled 5 条）+ 插桩双实例 buildDir 恒 `.nuxt`。**B 轮（N4）**：初版插桩发现主 bundle 实例 `getKeys("/cache/content")` = **[]** 而 prerender 实例读到 4 条 → 增补 base 值观测 → **断点铁证**：N4 主 bundle 实例的 buildDir 被改写为 `node_modules/.cache/nuxt/.nuxt` ⇒ `cacheContentBase` 随实例错位 ⇒ `_snapshot` 读空 ⇒ **bundled 零条** ⇒ 运行时 Content API 全空；假绿面 = prerender 期 `sourceBase`（绝对路径）不受错位影响页面渲染成功；`node_modules/.cache/nuxt/` 整体不存在 = prerender `setItem` 写丢失被 `.catch` 吞（workerd 去向待深挖）。**台账**：R52.md + FINDINGS **#35** + QUEUE R52 行 + **F50 立号**（failure-catalog 至 F50）+ status-matrix F45/F48 ✝️ + R45.md 第三笔 ✝️（真因闭合）+ evidence + progress + HANDOFF；**Nuxt 4 迁移两大世代缺口定案**（F48 = N3 世代 500 / F50 = N4 世代空集合）。执行险情如实登记：包级 node_modules 交换的 `$pkg` 含斜杠拼接坑**第二次**（目标名 `apps/api-…` 隐含子路径不存在 → 静默失败 + 悬空 junction 混合态）——`tr '/' '-'` 修复，家族案例已存档。
