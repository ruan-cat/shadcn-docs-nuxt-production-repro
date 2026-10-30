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

## Vercel 零额度取证路径（2026-10-30，R35-R38 实证）

部署额度受限时，**配置作用域类问题不必真的部署**——在**仓库外**的 `%TEMP%` 沙箱里即可定案：

- `vercel deploy --dry --debug` → 看 `Found config in file "…"` 与 `Read local config from root directory (…)` 两行的先后 ⇒ **根 `vercel.json` 的作用域由 Project 的 Root Directory 决定**（本仓两个 Project 都设了 Root Directory ⇒ 根配置对两者都无效，F38 的交叉污染**双向不可复现**）。
- `vercel pull --environment=production` → 把设置读回沙箱，**回读比对**声明值是否生效（这是「声明未生效」的决定性证据，不靠推断）。
- `vercel deploy --prebuilt --dry` → `--prebuilt` 只认 `join(cwd, project.rootDirectory, '.vercel/output')`；**搬运 `.vercel/output` 到仓库根不是受支持的路径**。
- 沙箱必须在**仓库外**（`Push-Location $env:TEMP\...`）跑，否则会污染仓库 `.vercel/project.json` 的单槽绑定（F39）。
- 证据：`evidence/2026-10-30-r35-r36-root-vercel-json-no-cross-contamination.md`；FINDINGS #30 / #31。

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
  - `ls node_modules/.pnpm | wc -l` 应 ≈ 1200（正常 **1209**）。若为 1 或远小于此，说明上次实验（尤其 `nodeLinker: hoisted`）留下了扁平破损布局，须先修复。
  - `apps/docs/node_modules/nuxt/bin/nuxt.mjs` 与 `packages/shared-core/node_modules/typescript/bin/tsc` 必须存在；缺失即破损。
- 异常时先恢复再开工，**完整操作见 0.5**：`node_modules` 隔离（**必须命名 `node_modules.stale-<date>`**——`.gitignore:24` 只覆盖 `node_modules.stale-*`，`node_modules.broken-*` 不会被忽略、会污染 `git status`；且**根 + 4 个 workspace 包级 `node_modules` 要一起移**，包级是指向根 `.pnpm` 的绝对 junction，根一动就悬空）→ `pnpm install --frozen-lockfile`（timeout 600）→ 复验 `.pnpm` 恢复 ~1200、nuxt.mjs/tsc 恢复。

### 0.5 node_modules 隔离与重建 SOP（切分支专用）

> **第 0 步 = 体检**，本节 = **治疗**。体检不过 → 走本节；体检通过 → **不要动** `node_modules`。
> 本节命令均为 **Windows PowerShell 5.1** 语法（§0 里的 `ls ... | wc -l` / `mv` 是 bash 写法，在本机不能直接跑，以本节为准）。

#### 0.5.1 判定门：先决定"要不要动"，健康就别动

本仓是 pnpm monorepo：`node_modules/.pnpm`（虚拟 store，**实测健康值 1209 个目录**）+ 根 `node_modules/.pnpm/node_modules`（隐藏提升层，**实测 843 项，属正常布局**）+ 每个 workspace 包自己的 `node_modules`（`apps/api`、`apps/docs`、`packages/shared-core`、`packages/ui`，共 4 个）。

```powershell
# ① 虚拟 store 规模：期望 ≈1209（≥1000）；== 1 或几十 = 扁平/hoisted 破损
(Get-ChildItem 'node_modules/.pnpm' -Directory -Force -ErrorAction SilentlyContinue).Count

# ② 两个关键可执行文件：任一为 False 即破损
Test-Path 'apps/docs/node_modules/nuxt/bin/nuxt.mjs'
Test-Path 'packages/shared-core/node_modules/typescript/bin/tsc'

# ③ 当前分支有没有动 linker 设置（这会让布局不可信）
git diff main -- pnpm-workspace.yaml
Select-String -Path 'pnpm-workspace.yaml' -Pattern 'nodeLinker|node-linker|publicHoistPattern|public-hoist-pattern' -Encoding UTF8

# ④ 上一轮隔离目录是否还在（还在 = 上一轮没收尾）
Get-ChildItem -Directory -Filter 'node_modules.stale-*' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
```

| 体检结果                                 | 判定                                                  | 动作                                |
| ---------------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| ① ≥1000（≈1209）且 ② 全 True 且 ③ 无输出 | **健康**                                              | **不要动 `node_modules`**，直接开工 |
| ① == 1 或远小于 1000                     | 扁平/hoisted 破损（典型：`nodeLinker: hoisted` 残留） | 走 0.5.2 隔离重建                   |
| ② 任一 False                             | 链接悬空 / 布局破损                                   | 走 0.5.2 隔离重建                   |
| ③ 有输出                                 | 该分支改过 linker，布局与 main 不可比                 | 走 0.5.2 隔离重建                   |
| ④ 非空                                   | 上一轮没收尾                                          | 先按 0.5.5 处置，再重新体检         |

**为什么"健康就别动"**：本仓实测 **warm store 重装约 21s，但冷 store 可达 12min+**；更关键的是——重装会**掩盖真实故障**：若根因在应用层/上游依赖，被重装冲掉后就再也复现不出来了。所以"每次切分支都重装"是**错误习惯**，本节只在体检判定为不可信时才动手。

#### 0.5.2 隔离：改名移出，**绝不删除**

**为什么不能 `Remove-Item`**：① 本仓硬安全策略会拦截批量删除（`.gitignore` 第 24 行注释已登记：safe-delete 守卫对 >50 文件的删除要求确认，trash 对巨型目录会超时中止）；② 隔离目录是**伪故障的可回溯证据**——出事时要把"污染态"和"干净态"摆在一起对照。

**`node_modules` 有 5 个，缺一不可**：只移根目录是不够的。实测 `apps/docs/node_modules/nuxt` 是 **Junction（绝对路径）**，Target 直指根虚拟 store：

```text
LinkType : Junction
Target   : D:\code\ruan-cat\shadcn-docs-nuxt-production-repro\node_modules\.pnpm\nuxt@3.21.2_@emnapi+core@1._fd53a40557a543a2167c8b9dbb050027\node_modules\nuxt
```

根 `node_modules` 一改名，这个**绝对路径**就悬空了 → 正好复现出 `Cannot find module 'nuxt/bin/nuxt.mjs'` 那种假故障。所以 5 个必须**一起移**。

```powershell
# —— 隔离（全程前台；Move-Item = 同卷重命名，秒级完成）——
$stamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$br    = ((git rev-parse --abbrev-ref HEAD) -replace '[^A-Za-z0-9._-]', '-')   # 分支名净化
$tag   = "stale-$br-$stamp"

# (1) 根 node_modules：虚拟 store .pnpm + 隐藏提升层 .pnpm/node_modules 都在里面
Move-Item -LiteralPath 'node_modules' -Destination "node_modules.$tag"

# (2) 4 个 workspace 包的 node_modules：绝对 junction 指向根 .pnpm，必须一起移
foreach ($pkg in @('apps/api','apps/docs','packages/shared-core','packages/ui')) {
  if (Test-Path -LiteralPath "$pkg/node_modules") {
    Move-Item -LiteralPath "$pkg/node_modules" -Destination "$pkg/node_modules.$tag"
  }
}
```

**命名必须是 `node_modules.stale-*`**（`.gitignore` 实测，判定依据用 `git check-ignore -v --no-index`）：

```text
.gitignore:1:node_modules            node_modules                    ← 忽略
.gitignore:24:node_modules.stale-*   node_modules.stale-r05-20261030  ← 忽略（根级）
.gitignore:24:node_modules.stale-*   apps/docs/node_modules.stale-…   ← 忽略（包级）
                                     node_modules.broken-20261030    ← 不忽略 → 污染 git status
                                     node_modules.stale              ← 不忽略（后缀不能为空）
                                     dist.pre-fix / dist.local-fix  ← 不忽略（`dist` 规则只匹配名为 dist 的项）
```

`.gitignore` 原文相关行：

```text
node_modules            ← 第 1 行
dist                    ← 第 8 行
node_modules.stale-*    ← 第 24 行
```

> `docs/task-artifacts/experiments/SOP.md` 第 2 步只写了 `mv node_modules node_modules.stale-<br>`（**仅根目录，步骤不完整**）。AGENTS.md 是 AI 记忆文件，**以本节为准**：根 + 4 个包级一起移。

#### 0.5.3 重建

```powershell
# —— 必须在仓库根（workspace root）执行，timeout 上限 600s ——
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { Write-Output "install 失败 exit=$LASTEXITCODE —— 禁止继续，见下方归因" }
```

失败时**分类归因，不要盲目重试、更不要跳过复验**：

| 报错                                             | 归因                      | 处置                                                                                                                                                 |
| ------------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_PNPM_OUTDATED_LOCKFILE`                     | lockfile 与分支不匹配     | 先确认 lockfile 变化**是不是本实验的变量**；是变量才允许 `--no-frozen-lockfile` 并把 lockfile diff 记入档案；不是变量 → 分支状态不对，回干净基线重来 |
| `ERR_PNPM_IGNORED_BUILDS` / `blockExoticSubdeps` | pnpm 10+ 拦截依赖构建脚本 | 属**依赖解析**问题，不是 `node_modules` 布局问题；按需在 `pnpm-workspace.yaml` 显式声明 `onlyBuiltDependencies` 并记入档案                           |
| store 损坏 / 网络超时                            | pnpm store 侧问题         | 先 `pnpm store status` 定位；确需清理 store 时同样**改名隔离**，不要 `Remove-Item`                                                                   |

> 冷 store 场景重装可达 12min+，timeout 必须拉长并**串行**跑，不得与其它实验并发。

#### 0.5.4 复验：**全绿才准开工**

```powershell
# ① 虚拟 store 规模：期望 ≈1209（≥1000）
(Get-ChildItem 'node_modules/.pnpm' -Directory -Force -ErrorAction SilentlyContinue).Count
# ② 关键可执行文件：均须 True
Test-Path 'apps/docs/node_modules/nuxt/bin/nuxt.mjs'
Test-Path 'packages/shared-core/node_modules/typescript/bin/tsc'
# ③ 包级 node_modules 已重建
Test-Path 'apps/docs/node_modules'
# ④ pnpm 状态文件已生成
Test-Path 'node_modules/.modules.yaml'
# ⑤ 隔离目录已就位（名字都应是 node_modules.stale-*）
Get-ChildItem -Directory -Filter 'node_modules.stale-*' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
```

- 任一项不过 → **不许开工**，回 0.5.2 重来。
- `node_modules/.pnpm/node_modules`（隐藏提升层，实测 843 项）**存在是正常的**，别去动它，也别把它当成污染标记。

#### 0.5.5 收尾：隔离目录怎么处置

**仍然不删——移出仓库**（同卷重命名，秒级；跨卷会退化成 copy+delete，几千文件极慢）：

```powershell
# 隔离区：与仓库同卷、仓库之外
$quarantine = 'D:\code\ruan-cat\_repro-nm-quarantine'
New-Item -ItemType Directory -Force -Path $quarantine | Out-Null

# 根级 stale 目录
Get-ChildItem -Directory -Filter 'node_modules.stale-*' -ErrorAction SilentlyContinue | ForEach-Object {
  Move-Item -LiteralPath $_.FullName -Destination (Join-Path $quarantine $_.Name)
}
# 包级 stale 目录（加父目录名防重名）
Get-ChildItem -Path 'apps','packages' -Directory -Filter 'node_modules.stale-*' -Recurse -Depth 1 -ErrorAction SilentlyContinue | ForEach-Object {
  Move-Item -LiteralPath $_.FullName -Destination (Join-Path $quarantine ("$($_.Parent.Name)-$($_.Name)"))
}
```

| 时机                                                             | 动作                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 单变量实验的"污染态 vs 干净态"对照**还没跑完**                   | **保留**，别动                                                                                      |
| 该隔离目录是上一轮伪故障的**回溯证据**（对应 `R{xx}.md` 待复核） | **保留**到档案结案                                                                                  |
| 对照跑完 + 结论已写入 `R{xx}.md` + QUEUE/FINDINGS 已同步         | 移出仓库进隔离区                                                                                    |
| 物理删除                                                         | **交给用户 / 主代理**（`.gitignore:24` 注释已登记"等用户批量删除确认后物理清理"）。agent 侧一律不删 |

收尾后重跑 `git status --short`：**必须干净**——出现未忽略的 `node_modules.stale-*` / `dist.pre-fix` 之类残留，说明命名或位置错了。

#### 0.5.6 禁止事项清单

- **不得手改 `node_modules` 里的文件当修复**（基线纪律已定）。内容模块 / app 依赖的问题必须在 **app 层或上游**解决；改 `node_modules` 会被下一次 `pnpm install` 悄悄抹掉。
- **不得把 `node_modules` 的问题当成应用层 bug 去改业务代码**。先按 0.5.1 判定：是布局问题就重建，是应用问题才改代码——顺序反了会造出"改了一堆代码但根因在环境"的假修复。
- **不得在同一工作区并发跑构建**（会污染 `.output` / `.nuxt` 产物，实验结论失效）。切分支实验必须**串行**。
- **不得用 `Remove-Item -Recurse -Force` 之类永久删除命令**（会被运行时硬安全策略拦截）。一律 `Move-Item` 改名隔离。
- **不得因为 `pnpm install` 报错就静默跳过复验**。报错就停，按 0.5.3 归因。
- **不得在健康态下"预防性"重装**（理由见 0.5.1 末段）。
- **不得用 `Copy-Item` 代替 `Move-Item`** 做隔离（会复制几千文件，且 junction 语义被破坏）。

#### 0.5.7 Windows / PowerShell 5.1 实测坑（本机 `windows-powershell 5.1.19041.6456`）

- `Get-Content` / `Select-String` 读 UTF-8 文件**必须显式 `-Encoding UTF8`**。PS 5.1 默认按系统 ANSI 代码页读无 BOM 的 UTF-8 → 中文乱码；**更阴的是中文正则会静默匹配失效**（不报错，只是匹配不到），极易误判成"配置没写"。
- PS 5.1 **不支持 `&&` / `||`**。用 `;` 分隔 + 检查 `$LASTEXITCODE`。
- **禁止嵌套 `powershell -NoProfile -Command "..."`**：外层会先吃掉 `$var`（`$stamp` 变空串 → 隔离目录名残缺）。直接在当前 shell 执行。
- `Remove-Item` 被运行时硬安全策略拦截 → 一律改用 `Move-Item` 隔离。
- `.gitignore` 的 `dist` 规则**不匹配** `dist.pre-fix` / `dist.local-fix`。同理，`node_modules.broken-*`、`node_modules.stale`（无后缀）也**不被忽略** → 隔离目录只能用 `node_modules.stale-<分支>-<日期>`。
- `Move-Item` 目标已存在会失败（`node_modules.stale-xxx` 重名）→ 换 `$stamp` 重跑，别退化成删除。
- `Get-ChildItem -Filter` 配 `-Directory` 才只出目录；跨目录扫包级残留用 `-Recurse -Depth 1`（`apps`、`packages` 各一层）。
- 路径含中文/空格时一律用 `-LiteralPath`，避免通配符误伤。

#### 0.5.8 自检清单（复制到会话里逐条打勾，全绿才准开工）

- [ ] `.pnpm` 目录数 ≈ 1209（≥1000），不是 1、不是几十
- [ ] `apps/docs/node_modules/nuxt/bin/nuxt.mjs` 存在
- [ ] `packages/shared-core/node_modules/typescript/bin/tsc` 存在
- [ ] `git diff main -- pnpm-workspace.yaml` 无输出（无 `nodeLinker` / `node-linker` / `publicHoistPattern` / `public-hoist-pattern`，camelCase 与 kebab **双拼写**都要查）
- [ ] 根 + `apps/api` + `apps/docs` + `packages/shared-core` + `packages/ui` 共 5 个 `node_modules` 都在，链接不悬空
- [ ] 本轮隔离目录已登记（名称 + 去向），命名全是 `node_modules.stale-*`
- [ ] `git status --short` 干净（无未忽略的 `node_modules.stale-*` / `dist.pre-fix` 残留）
- [ ] 构建**串行**执行，未与其它 agent / 实验并发

### 1. 复现必须前台执行

- 含构建/清理的复现一律**前台**运行，禁止后台任务（harness `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 守卫会拦截后台批量删除，曾实测拦截 `.nuxt/dist` 清理 549 文件）。后台跑出的结果不可采信。

### 2. 严格走 SOP 7 步，隔离改名而非删除

- `git checkout experiment/<br>` → `mv node_modules node_modules.stale-<br>`（**改名隔离，勿 rm**）→ `pnpm install --frozen-lockfile` → `build:packages && docs build`（默认 timeout 480s，长尾可加大但**必须记录实际 timeout 与退出码**）→ 启 `.output` 先验 `Listening` 行再 curl 内容断言 → 写 `R{xx}.md` → `git checkout main` → 定向清理 `node_modules.stale-*`（**按 0.5.5 处置：移出仓库，不删**）。
- 上面的 `mv node_modules` **只覆盖根目录**：`node_modules` 实为 5 个（根 + `apps/api` + `apps/docs` + `packages/shared-core` + `packages/ui`），包级是指向根 `.pnpm` 的**绝对 junction**，只移根会让包级悬空 → 隔离/重建/复验/收尾的完整流程**以 0.5 为准**。
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

- 契约测试（`tests/baseline-safety.test.mjs`）把 `pnpm-workspace.yaml` 当**纯文本**子串匹配：`forbidden = ["nodeLinker: hoisted", "node-linker: hoisted", "publicHoistPattern", "public-hoist-pattern"]`（camelCase + kebab **双拼写**，2026-10-30 起 4 项）。
- **事实纠正（2026-10-30 受控实测，pnpm 10.33.0）**：`pnpm-workspace.yaml` 的设置键**只认 camelCase**——camelCase 拼写被接受且**零警告**；kebab 拼写被**显式 WARN 并忽略**（`The following settings in pnpm-workspace.yaml were ignored because they are not written in camelCase`）→ **kebab 拼写不产生 hoist 风险**。因此契约枚举 kebab 属**纵深防御**（防未来 pnpm 改行为、防作者意图被静默忽略），**不是**堵「改用合法 kebab 即漏检」的已实证漏洞——旧版本此处结论方向相反，已订正，勿再引用旧表述。
- **仍然成立的治理盲区**：pnpm 对**非法 camelCase 键零警告**（如 `publicHoistPattern:` 会被接受）→ pnpm 侧对危险 workspace 配置**不提供任何校验信号**，检测全压在契约测试的字面子串上；命中即违约，须如实记录，**不得因「pnpm 没报错」而判绿**。
- 冒烟验收必须做**响应体内容断言**（Content cache/search 命中），不只看 HTTP 200——F47 证明 node-server/worker/Vercel 均存在 200 假阳性。

### 6. 污染态判废项重测：不复用旧分支、隔离、串行

- 首轮 `exit 1 + Invalid URL` 一律判废，按 SOP 干净重测后才可采信（参照总检报告 §3.1 对 r05-r17 首轮批处理的判废依据）。
- 重测**不复用**被污染旧分支（旧分支曾混入无关文档），应从当前 main 起新分支、只加单变量、不改为过契约。
- OOM / 长尾实验（R20-R26 等）必须 timeout + **串行**，绝不并发——并发引入资源竞争噪声，污染单变量结论。
