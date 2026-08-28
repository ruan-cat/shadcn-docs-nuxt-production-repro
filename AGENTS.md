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
