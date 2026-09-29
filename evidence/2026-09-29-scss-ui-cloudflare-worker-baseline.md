# 2026-09-29 组件库 SCSS 构建与 Cloudflare Workers 基线证据

> Agent 工具：ZCode（CLI）
> AI 模型：GLM-5.3-Flash（account:bigmodel-start-plan/GLM-5.3-Flash）
> 基线 SHA：`d3fb147`（test: 为 R17 注册 traceAlias 配置审计槽位）
> 性质：基线基础设施新增（非故障实验 PR），按单变量纪律记录

## 1. 变更范围（唯一变量组）

本轮在 control 基线上新增两组基础设施能力，未触碰任何核心依赖版本与危险 workaround：

1. **packages/ui SCSS 构建能力**：`sass@1.105.0` devDependency、`src/styles/tokens.scss` 设计令牌、SFC `<style scoped lang="scss">`、vite `cssFileName: "repro-ui"`、exports 增加 `"./styles.css": "./dist/repro-ui.css"`、apps/docs 以 `css: ["@repro/ui/styles.css"]` 消费。
2. **Cloudflare Workers git 触发部署**：`apps/docs/wrangler.jsonc`（worker 入口 + ASSETS 资产绑定 + `compatibility_date 2024-09-19`）、`.github/workflows/deploy-cloudflare.yaml`（push main 触发，凭据缺失时守门步骤优雅跳过）。

附带修复（Owner 意识，非实验变量）：packages/ui 缺失 `tsconfig.json` 导致 `vue-tsc --noEmit` 打印 tsc 帮助并 exit 1（CI 从未跑过 typecheck 步骤，属既有隐患）。已补最小 tsconfig（extends base + noEmit + include src TS/Vue）。

## 2. 验证门禁证据（G0-G7）

### G0 manifest 与契约

```log
pnpm test（node --test）
# tests 12 / pass 12 / fail 0（根契约）
@repro/ui tests: pass 1 fail 0（package-shape）
@repro/shared-core tests: pass 1 fail 0
@repro/docs tests: pass 2 fail 0（control-contract）
```

baseline-safety 契约通过：apps/docs/nuxt.config.ts 新增 `css: [...]` 未引入任何禁用 pattern（`noExternal` / `trace: false` / `routes.clear()` 等均未出现）。

### G1 fresh/frozen install

```log
pnpm install --frozen-lockfile
Done in 36.2s using pnpm v10.33.0（Windows，exit 0）
```

lockfile 更新仅因新增 `sass@1.105.0` devDependency，核心四包（nuxt 3.21.2 / shadcn-docs-nuxt 1.1.9 / @ztl-uwu/nuxt-content 2.13.9 / h3 1.15.11）与 root overrides 未动。

### G2 依赖解析（探针）

```log
pnpm probe:ui
"resolvedFromDocs": { "path": "...packages/ui/dist/repro-ui.js", "class": "workspace-dist" }
elementPlus -> .pnpm/element-plus@2.13.6_*/es/index.mjs
vueUse     -> .pnpm/@vueuse+core@14.2.1_*/dist/index.js
sharedCore -> packages/shared-core/dist/index.js
```

### G3 prepare

```log
pnpm prepare:docs
◆ Types generated in .nuxt
PREPARE_EXIT=0
```

### G5 生产构建（两个 preset）

```log
# SCSS 构建链（packages/ui，vite lib）
dist/repro-ui.css  0.16 kB │ gzip: 0.13 kB
dist/repro-ui.js   2.15 kB │ gzip: 0.99 kB
✓ built in 341ms

# SCSS 产物内容断言（编译硬证据）
.repro-runtime-card[data-v-83c9bc56]{border:1px solid #e2e8f0;border-radius:8px}
.repro-runtime-card .repro-runtime-card__detail[data-v-83c9bc56]{color:#2563eb}
# $repro-surface-border→#e2e8f0、$repro-radius→8px、@include repro-surface 展开、
# $repro-accent→#2563eb、嵌套选择器 + Vue scoped 属性全部正确编译

# docs cloudflare_module preset（Windows 本地、默认堆、无任何 workaround）
NITRO_PRESET=cloudflare_module pnpm --filter @repro/docs build
✨ Build complete!  CF_BUILD_EXIT=0
.output/server/index.mjs 37.5 kB（worker 入口）
.output/public 6.8 MB（含 _headers、_nuxt、api）
nitro 提示：wrangler deploy .output/server/index.mjs --assets .output/public
```

### G6/G7 Cloudflare Workers 运行时门（本地 workerd）

```log
wrangler deploy --dry-run（apps/docs）
✨ Read 202 files from the assets directory .output/public
Total Upload: 7620.52 KiB / gzip: 1588.39 KiB
env.ASSETS  Assets
--dry-run: exiting now.  DRYRUN_EXIT=0

wrangler dev --port 8787（workerd 本地）
[wrangler:info] Ready on http://127.0.0.1:8787
GET / 200 OK
GET /guide/baseline 200 OK
GET /api/_content/cache.json 200 OK
GET /api/_content/search 200 OK
```

**内容断言（非状态码断言，按 F18/技能记忆 #17 纪律）**：

| 路由 | HTTP | 响应体断言 | 判定 |
| --- | --- | --- | --- |
| `/guide/baseline` | 200 | `<title>绿色控制组 - shadcn-docs-nuxt 生产复现实验室</title>`（真实内容） | ✅ 预渲染静态资产在 workerd 正常 |
| `/` | 200 | 真实首页标题（非 404 shell） | ✅ |
| `/api/_content/cache.json` | **200** | **404 错误页 HTML**（catch-all 假象） | ❌ Content 运行时 API 失效 |
| `/api/_content/search` | **200** | **404 错误页 HTML**（catch-all 假象） | ❌ 同上 |

wrangler dev 日志全程零错误输出——Content API 失效是静默 fall-through：服务端 API 路由在 workerd 上未按预期响应，nitro catch-all 渲染 404 shell 并以 200 返回。

### 残留进程清理（Windows）

wrangler dev 的 workerd 孤儿进程树（PID 11440 → 18744 → 23140）已 taskkill //T 全链终止，8787 端口释放（LISTEN 清零）。

## 3. 新故障登记：F47

**F47：Nuxt Content v2 运行时 API 在 Cloudflare Workers（workerd）目标失效，且以 HTTP 200 + 404 shell 假阳性呈现**

- 状态：`本仓已复现`（L1：单次本地 workerd 复现；待 CI/真实部署重复）
- 第一失败门：CF 目标的 Content API 门（等价 G4），预渲染页面门（G6/G7 静态资产）通过
- 错误信号：`/api/_content/cache.json` 与 `/api/_content/search` 返回 200 但响应体为 404 错误页 HTML；wrangler 日志无错误
- 根因假设（待后续实验证实，结论不超出证据）：Nuxt Content v2 服务端 DB 链路依赖 workerd 无法加载的原生 sqlite 绑定，`_content` 服务端路由失效后由 nitro catch-all 兜底渲染 404 shell；HTTP 200 与空错误日志共同构成假阳性，仅凭状态码与日志会误判为通过
- 与历史事故的边界：这是**新平台域**（Cloudflare Workers 运行时），与 F26（trace:false 泄漏致缺包）、F18（build 绿但 .output 坏）不同门、不同根因层

## 4. 部署矩阵新增：D08

| 编号 | 目标 | 触发方式 | 凭据 |
| --- | --- | --- | --- |
| D08 | Cloudflare Workers（docs） | GitHub Actions push main（`deploy-cloudflare.yaml`） | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets；缺失时守门步骤写 `CF_CREDENTIALS_PRESENT=false` 优雅跳过，main 保持绿色 |

本地验证形态：`--dry-run`（闭包校验，不上传）+ `wrangler dev`（workerd 运行时冒烟）。**不使用本地直接 `wrangler deploy`**——正式部署链只允许 git 提交触发，符合任务约束。

## 5. 遗留事项

1. `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` GitHub secrets 待用户配置（本地 wrangler 为 OAuth 登录，无法铸造 API Token；已向用户说明凭据策略选项）。
2. F47 根因证实实验（native sqlite 绑定加载 vs 路由未注册）待独立实验 PR。
3. Vercel 部署（use-vercel-deploy-in-monorepo 技能、Git Integration 主链、docs + api 双 Project）按用户授权延后。
4. status-matrix 中 F01-F46 与 27 个 PR 的历史状态存在滞后（初始化 PR #1 已 MERGED 但复选框未勾选；R02-R18 实验 PR 已 CLOSED 未回填），本次仅做接力核对备注，不擅自改写历史状态矩阵。
