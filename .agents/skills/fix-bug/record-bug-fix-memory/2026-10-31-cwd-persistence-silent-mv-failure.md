# 2026-10-31 Bash 工具 cwd 跨调用持久 + git 成功掩盖 mv 失败（中间态险情）

## 1. 问题现象

R51 轴 A 实验收尾批次：`mv node_modules …`（隔离 Nuxt 4 依赖树）报 `cannot stat 'node_modules': No such file or directory`，而**同一条命令里**的 `git checkout main` 成功执行（`Switched to branch 'main'`）——结果形成一个中间态：**分支已切回 main，但 root 的 `node_modules` 仍是 Nuxt 4 依赖树**（错误布局）。若后续直接开工，会用 Nuxt 4 树跑 main 的实验（典型污染态）。

## 2. 实际根因

**ZCode Bash 工具的工作目录跨调用持久**（工具契约明文："Working directory persists between calls"）。上一个「定位锚点」批次为了少打路径前缀执行了 `cd docs/task-artifacts && wc -l …`，批次结束后 cwd 停在 `docs/task-artifacts`；紧接着的隔离批次假设 cwd = 仓库根，于是：

- `mv node_modules …` 在 `docs/task-artifacts/` 下找不到目标 → 失败；
- `git checkout main` 在任意子目录都能工作（git 向上查找 repo root）→ 成功；
- 包级循环 `[ -d "$pkg/node_modules" ]` 全部为假 → 静默跳过。

## 3. 关键误导点

1. **git 成功制造了「环境正常」的假象**：git 与 filesystem 命令对 cwd 的敏感性不同——git 向上找 repo root，mv/ls 严格按 cwd。两类命令混在一条复合命令里时，git 的成功输出掩盖了 fs 命令的失败。
2. **`mv … && echo "成功"` 的短路模式**：mv 失败 ⇒ echo 不执行 ⇒ 该步骤**零输出**，失败信号只有 mv 自己一行 stderr，淹没在多行输出里；逐条核验输出的纪律缺失让失败漏网。
3. **长会话的不变量被一次"顺手 cd"打破**：此前 40+ 批次全部工作在仓库根（每批自包含），形成「cwd 永远在根」的心智惯性；没有任何机制在 cwd 漂移时提醒。
4. **家族性**：这是「工具环境状态跨调用持续，而心智模型没有跟踪」家族第三例——前两例为 `powershell -Command` 内联传 `$var` 被 bash 吃掉（2026-10-31 案例三连）、prettier 钩子改写后的 stale read。

## 4. 有效修复

同批立即用**绝对路径**修复：`cd /d/code/ruan-cat/shadcn-docs-nuxt-production-repro && mv node_modules "node_modules.stale-…"` 逐一重跑（5 个一起隔离）→ 再把臂 1 隔离布局改名复原为 control → 复验四问（`.pnpm`=1295 / nuxt.mjs / tsc / `git diff main -- pnpm-workspace.yaml` = 0）确认零损伤。

## 5. 验证方式

- 复验四问全绿（`.pnpm`=1295、`apps/docs/node_modules/nuxt/bin/nuxt.mjs` OK、`packages/shared-core/node_modules/typescript/bin/tsc` OK、workspace diff 0 行）；
- `git log --oneline -1` = 预期 main tip；
- 后续臂 1 布局上的契约测试与构建全部正常——证明中间态被完全纠正，无残留污染。

## 6. 后续约束

1. **涉及 cwd 的 filesystem 命令（mv/cp/ln/相对路径脚本）一律用绝对路径，或在批次开头显式 `cd <仓库根> && …`**——本仓根 = `D:\code\ruan-cat\shadcn-docs-nuxt-production-repro`。禁止「顺手 cd」后不归位。
2. **批次里混用 git 与 filesystem 命令时，git 成功 ≠ 环境正确**——每条 mv/cp 的输出必须逐条核对，不依赖 `&& echo` 的间接信号（失败时 echo 短路 = 零输出）。
3. `cd` 只允许出现在「显式声明本批所有后续路径均相对该目录」的批次里，且批次最后一条命令前应回根或整批用绝对路径。
4. 跨批次使用相对路径前，先 `pwd` 确认（一条命令的成本，换掉整批的错位风险）。
5. 同类家族问题的统一防线：**凡「环境状态」类假设（cwd、变量、stale read、node_modules 布局），动手前用一条只读命令实证**，不靠记忆。
