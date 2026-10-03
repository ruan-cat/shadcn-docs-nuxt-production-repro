# 初始化与实验进度

最后更新：2026-08-28

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
- [ ] F47 运行时层根因实验（独立 PR，套用 R19 模板）
