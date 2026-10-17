# init 系列全局技能审计与应用报告（2026-10-17）

> 任务：通读全部 11 个 init-* 全局技能（`C:/Users/pc/.workbuddy/skills/init-*/`，SKILL.md 合计约 2,784 行），针对本仓酌情应用。
> 硬约束：`main` 是冻结 control（AGENTS.md 基线纪律）——任何应用不得污染实验变量；涉及构建链的变更必须过零回归验证。

## 1. 十一项技能决策总表

| # | 技能 | 版本 | 决策 | 核心理由 |
| --- | --- | --- | --- | --- |
| 1 | init-shadcn-docs-nuxt | 1.6.1 | ✅ **应用（合规审计模式）** | 本仓即该技能的复测实验田；逐项对照 22 条强约束做审计，不重新初始化 |
| 2 | init-tsconfig | 1.0.0 | ✅ **应用** | monorepo 子包形态命中；仅动 packages ×2 tsconfig + .gitignore，零回归验证通过 |
| 3 | init-ai-md | 23.0.0 | ✅ **应用（部分）** | AGENTS.md 已存在且为唯一事实来源；按技能规定无条件部署 record-bug-fix-memory v2.0.0 + 登记技能表；通用记忆项模板酌情跳过（理由见 §3.3） |
| 4 | init-simple-memorix | 2.7.0 | ✅ **应用（项目级）** | 落地 `.workbuddy/hooks/hooks.json`（仅生命周期 4 事件，无高频噪音）；MCP mode 层属用户级配置未触碰 |
| 5 | init-vscode | 2.0.0 | ✅ **应用** | 本仓有大量构建产物（.nuxt/.output/.turbo/.vercel），三层排除 + files.eol LF 对开发体验有实际价值；纯编辑器配置，零构建链影响 |
| 6 | init-prettier-git-hooks | 4.0.0 | ⏸️ **跳过（opt-in）** | 实验中仓新增 5 devDeps + lockfile 重算 + 全量 md 重排 = 基线噪音；MDC 防护当前无 prettier 链路故无风险；后续如需按技能契约（lint-md@1.0.1 三层一致 + 三链路验证）单独走 |
| 7 | init-playwright | 1.1.0 | ⏸️ **跳过（opt-in）** | 浏览器验证已由 agent-browser MCP 覆盖（evidence 2026-10-16）；技能自带"headless CPU 过载→3 天全删"事故复盘，实验仓不宜引入三件套扩面 |
| 8 | init-pure-admin-iconify | 0.5.0 | ❌ 不适用 | pure-admin 业务后台图标体系；本仓 packages/ui 是最小 SSR 探针包，文档站走 @nuxt/icon 默认链路，引入 unplugin-icons 属实验污染 |
| 9 | init-release-base-relizy-and-bumpp | 3.0.2 | ❌ 不适用 | 实验仓 @repro/* 全部 workspace 私有包，无发版/发布语义；技能自身"非目标"条款禁止在 private 策略未决时落盘 |
| 10 | init-claude-code-statusline | 0.15.0 | ❌ 不适用 | Claude Code CLI 用户级状态栏（.claude/settings.json + statusline.sh），与本仓实验目标无关；如需应由用户在 Claude Code 会话单独执行 |
| 11 | init-linux-cloud-agent-env | 0.1.1 | ❌ 不适用 | 面向云 Linux agent 沙箱（MCP 客户端 + gh/vercel CLI + PR 云任务规范）；本仓为本地 Windows 项目 |

## 2. init-shadcn-docs-nuxt 合规审计（22 条强约束抽核）

审计对象：`apps/docs`（Nuxt 3 文档站）与根 workspace 配置。**结论：合规，无违规项。**

| 契约项 | 本仓现状 | 判定 |
| --- | --- | --- |
| 核心四包按兼容矩阵固定（铁律 7） | nuxt 3.21.2 / shadcn-docs-nuxt 1.1.9 / content 2.13.9 / h3 1.15.11 全精确版本 | ✅ |
| `nuxt-og-image` 根 overrides 固定 5.1.9（铁律 11） | 根 `package.json` `pnpm.overrides`：content 2.13.9 + nuxt-og-image 5.1.9 | ✅ |
| `ogImage: { enabled: false }` 不得直接启用（禁改项 5） | `apps/docs/nuxt.config.ts` 显式 `ogImage: { enabled: false }` | ✅ |
| `@iconify-json/lucide` devDependency 必需 | `apps/docs` devDeps `@iconify-json/lucide@1.2.98` + `icon.serverBundle.collections: ["lucide"]` 默认链路 | ✅ |
| predev / prebuild / postinstall 三处 nuxt prepare | `prepare`（pnpm install 生命周期 = postinstall 等价）+ `predev` + `prebuild` | ✅ |
| i18n 单语最小配置（禁改项 3） | 仅 zh-CN 单 locale | ✅ |
| 无危险 workaround 入基线（铁律 8/13 相关） | nuxt.config 无 `trace:false`/`noExternal`/`routes.clear()`；nitro.prerender 显式种子为 F47 已定案机制（failure-catalog F47 有完整证据链，非盲目 workaround） | ✅ |
| compatibilityDate 2024-09-19 契约 | wrangler.jsonc / api nitro config 固定 2024-09-19 | ✅ |
| Vercel READY ≠ runtime、200 ≠ 内容正常（铁律 12/17） | 已固化为 G 门 + F47 假阳性纪律（acceptance-gates / evidence-policy） | ✅ |
| 依赖漂移实验以单变量 PR 承载（铁律 9/14 相关） | R01-R45 路线图 + experiment.json 声明机制 | ✅ |

## 3. 应用详情

### 3.1 init-tsconfig（形态判定 → 定点落地）

- **形态判定**：`tsconfig.base.json` 为共享 preset（无 include/files）；`apps/docs`、`apps/api` 无 tsconfig.json → 按技能 F 形态**跳过不新建**（不碰 docs/api 构建链）；`packages/shared-core`、`packages/ui` 为形态 D（monorepo 子包，extends base）→ 落地目标。
- **红线规避**：不在 base 层加 `tsBuildInfoFile`（相对路径会解析到 base 所在目录导致两包共享同一缓存文件、互相覆盖——技能红线 #3）；改为各包子配置独立落点 `./node_modules/.cache/tsconfig.tsbuildinfo`（各自目录隔离）。
- **改动**：两包 tsconfig 增加 `incremental: true` + `tsBuildInfoFile` + `assumeChangesOnlyAffectDirectDependencies: true`（仅子包生效），带日期与任务来源注释（tsconfig 官方支持 JSONC 注释）；`.gitignore` 兜底追加 `*.tsbuildinfo`。

**零回归验证（技能 L1 纪律：改前/改后错误数对照）**：

| 包 | 命令 | 改前基线 | 改后 | tsbuildinfo |
| --- | --- | --- | --- | --- |
| @repro/shared-core | `tsc -p tsconfig.json --noEmit` | exit 0 / 0 errors | exit 0 / 0 errors | ✅ 生成 |
| @repro/ui | `vue-tsc --noEmit` | exit 0 / 0 errors | exit 0 / 0 errors | ✅ 生成（vue-tsc 与 incremental 兼容） |

### 3.2 init-ai-md（record-bug-fix-memory + 技能表）

- `CLAUDE.md`/`GEMINI.md` 不存在 → 按技能流程无需重定向，不新建。
- **record-bug-fix-memory 无条件部署**（技能规定不询问）：模板 v2.0.0 逐字复制到 `.agents/skills/fix-bug/record-bug-fix-memory/SKILL.md`（202 行），案例索引初始为空。
- **技能表**：按技能要求插入 AGENTS.md 一级标题之后、其他二级标题之前，含双层存储架构说明与读写指引。
- **通用记忆项模板（01-11）酌情跳过**：本仓 AGENTS.md 已有等价纪律章节（基线纪律/实验纪律/验收纪律/Git 提交/部署事实），通用模板会重复并稀释实验纪律焦点；如需补项走技能的交互选择流程。

### 3.3 init-simple-memorix（项目级 WorkBuddy hooks）

- 落地 `.workbuddy/hooks/hooks.json`：仅保留生命周期 4 事件（SessionStart / UserPromptSubmit / PreCompact / Stop），**无** PreToolUse/PostToolUse 高频噪音事件（符合技能"保留/移除"事件表）。
- 合并策略核对：项目此前无 hooks 配置，属全新创建而非合并；未触碰用户级 `~/.workbuddy/mcp.json`（MCP mode 层需单独授权，且全局已配置）。
- ⚠️ 技能自带标注：WorkBuddy 项目级 hooks 为**实验性、待运行时验证**——如会话中出现 hook 报错或无效果，以此为准排查，不影响仓库实验链路。

### 3.4 init-vscode（工作区性能默认值）

- `.vscode/settings.json`：模板三层排除（files.exclude / files.watcherExclude / search.exclude 同步覆盖 .nuxt/.output/.turbo/.vercel/node_modules 等）+ 策略键（`files.eol: "\n"`、`search.indexing.maxFileSize: 1048576`、tsserver 4096 MiB + watchOptions + tsdk、`vue.server.includeLanguages: ["vue"]`）+ `AGENTS.md` 文件嵌套根节点；另追加 `.workbuddy/memory` 排除（配合本仓 gitignore 策略）。
- `.vscode/extensions.json`：模板部署，replacement mapping 已内建（`FanaticPythoner.better-todo-tree` 推荐 + 旧 `Gruntfuggly.todo-tree` 入 unwanted）；按本仓实际裁剪 UnoCSS/PicGo 等无关推荐，保留 Tailwind/iconify/Volar 等命中项。
- 未触碰 VS Code User Settings 与全局扩展状态（技能 scope 边界）；GUI runtime 验收属用户侧 pending。

## 4. 验证证据汇总

```text
基线 typecheck（改前）：shared-core exit=0/0 err；ui exit=0/0 err
改后 typecheck：        shared-core exit=0/0 err；ui exit=0/0 err（零回归）
tsbuildinfo：           两包 node_modules/.cache/tsconfig.tsbuildinfo 均生成
pnpm test：             6/6 tasks successful（契约 + 包测试；turbo outputs WARNING 为既有提示非失败）
JSON 合法性：           .vscode/settings.json ✓、.workbuddy/hooks/hooks.json ✓（node JSON.parse）
tsconfig 严格消费者排查：tests/ probes/ 无任何 tsconfig 读取（JSONC 注释安全）
git status：            仅本任务计划内文件变更
```

## 5. 遗留与后续

1. init-prettier-git-hooks / init-playwright 为 **opt-in**：用户明确授权后按各自技能契约单独执行（前者注意 lint-md@1.0.1 三层一致铁律；后者注意 headless CPU 安全规范）。
2. record-bug-fix-memory 案例索引为空——首个 bug 修复经验产生时按双层架构写入。
3. .workbuddy/hooks/hooks.json 生效性需下次 WorkBuddy 会话观察（实验性模板）。
