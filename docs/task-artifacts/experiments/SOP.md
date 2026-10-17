# 标准复现 SOP 与自检流程

> 本 SOP 从 [总检报告 §3.3](../../reports/2026-10-17-branch-pr-fault-reproduction-audit.md)（2026-10-17）扩展而成，对后续所有分支复现有效。背景方法论教训见总检报告 §3.2：跨分支切换时 pnpm 隐藏提升层（`.pnpm/node_modules`）残留上一分支安装态，会制造伪故障信号——受控对照证实同一分支污染态 build exit=1 + Invalid URL、全清重装后 exit=0。

## 环境前提

- 操作系统：Windows（本机复现环境）。
- Node 22.23.1 / pnpm 10.33.0（`packageManager` 字段锁定，不得自行换版本）。
- **复现必须前台执行**：后台任务会被 harness 的 bulk-delete 守卫拦截（`SAFE_DELETE_BULK_CONFIRM_REQUIRED`，曾实测拦截 `.nuxt/dist` 清理 549 文件）。含构建/清理的复现流程一律前台 + 豁免执行。

## 标准流程（7 步）

```text
1. git checkout experiment/<br>
2. mv node_modules node_modules.stale-<br>   # 隔离（关键防伪信号步骤，勿 rm——bulk-delete 守卫拦 + 可回滚）
3. pnpm install --frozen-lockfile
4. pnpm build:packages && pnpm --filter @repro/docs build（timeout 480s）
5. build 绿 → node apps/docs/.output/server/index.mjs + curl 内容断言
6. 捕获信号 → 写入 R{xx}.md 档案 → git checkout main
7. 批次结束：定向清理 node_modules.stale-*（前台、分批）
```

要点：

- 第 2 步是**防伪信号的核心**：隔离（mv 改名）而非删除，既规避 bulk-delete 守卫，又保留回滚能力。
- 第 4 步 timeout 480s：R18/R19 首轮即因长尾超出该上限而 exit 124（详见 [QUEUE.md](./QUEUE.md) 待重测表），重测时可加大但必须记录。
- 第 5 步对应故障目录 F18：`build green` 不是验收，必须实际启动 `.output` 并断言 Content cache/search 内容。

## 复现自检清单

### 执行前

- [ ] 工作区干净（`git status` 无未提交改动，main 为稳定 control）。
- [ ] 目标分支与其单变量已确认（相对基线只改一个变量，与 [pr-roadmap.md](../pr-roadmap.md) 定义一致）。
- [ ] 隔离目录就位（`node_modules` 已 mv 为 `node_modules.stale-<br>`，fresh install 前提成立）。

### 执行中

- [ ] install / build:packages / docs build 各步退出码已逐项记录。
- [ ] 故障信号（或绿对照的无故障事实）已原文摘录，非转述。
- [ ] 与 CI 结论（对应 PR body）已完成对照，一致/不一致均写明。

### 执行后

- [ ] 已回 main（`git checkout main`），不留实验分支工作态。
- [ ] 孤儿进程检查完成——按 F36 纪律**定向**查本仓路径的 node 进程（记录 PID 与命令行，不无差别杀 node）。
- [ ] 隔离目录已登记（`node_modules.stale-*` 名称与去向；批次结束前台分批清理）。
- [ ] [QUEUE.md](./QUEUE.md) 状态与 [FINDINGS.md](./FINDINGS.md)（如有横向发现）已同步更新。

## 异常处理

1. **bulk-delete 守卫拦截**（`SAFE_DELETE_BULK_CONFIRM_REQUIRED`）：转前台豁免执行，不要绕道后台重试。
2. **OOM / 长尾实验**（R20-R26 Windows 资源族等高风险项）：必须设 timeout + 串行执行，**绝不并发**——并发会引入 F43 资源竞争噪声，污染单变量结论。
3. **疑似伪信号**：用受控对照证伪——同一分支污染态 vs clean 态（或全清重装）对比，结果相反即判废（参照总检报告 §3.1 对 r05-r17 首轮批处理的判废依据），按 SOP 重测后才能采信。
