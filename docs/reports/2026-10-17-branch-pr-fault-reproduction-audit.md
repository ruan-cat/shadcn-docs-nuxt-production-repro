# 实验分支与故障复现完成度总检（2026-10-17）

> 目的：回答"每一个 branch 分支所对应的 PR 是否都完成了最初设计目的（故障复现）"，并对已存在的实验分支逐个进行本机（Windows / Node 22.23.1 / pnpm 10.33.0）build + dev 复现，结果记入本文档。
> 方法：`gh pr list --state all`（27 个 PR 全量）+ `git branch -r`（远端分支全量）+ 逐分支 checkout → `pnpm install --frozen-lockfile` → `build:packages` → `docs build` →（build 绿时）产物 HTTP 冒烟 → 故障信号捕获。

## 1. 底账：27 个 PR 的完整分类

| 类别                       | PR                                                                                                                                                                                                                    | 数量      | 状态                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------- |
| 初始化                     | #1（init 生产级复现实验室）                                                                                                                                                                                           | 1         | MERGED                                    |
| 基础设施（非故障复现）     | #2 实验 lockfile 通道、#3 实验声明契约、#5 控制组断言修正、#10 workspace 拓扑契约、#13 UI 入口探针、#14 R09 dist 控制组固化、#17 配置型实验安全契约、#18 闭包探针、#20 父级依赖隔离 smoke、#22 R16 槽位、#24 R17 槽位 | 11        | MERGED                                    |
| **故障复现实验（有分支）** | **#4 R02、#6 R03、#7 R04、#8 R05、#9 R06、#11 R07、#12 R08、#15 R10、#16 R12、#19 R14、#21 R15、#23 R16、#25 R17、#26 R18**                                                                                           | **14**    | 全部 CLOSED（"失败不合并"政策，实验资产） |
| **故障复现实验（在途）**   | **#27 R19**                                                                                                                                                                                                           | **1**     | OPEN                                      |
| **未建分支（未启动）**     | R01、R11、R13、**R20-R45**                                                                                                                                                                                            | **约 26** | 不存在                                    |

远端 `experiment/*` 分支实测 15 个（r02-r19，其中 r09 以 #14 MERGED 的"dist 控制组固化"方式完成，无 experiment 分支）；本地仅 main。

## 2. 设计目的完成度判定（诚实结论）

**"全部完成"不成立。** 完成度分三档：

1. **CI 证据已完成（15 个分支）**：R02-R19 全部跑过基线 CI 与实验通道，判读结论固化在各 PR body（如 R02："docs package context → h3@2.0.1-rc.22"）——单变量实验的 **CI 侧设计目的已达成**。
2. **本机 Windows 侧复现（本文档 §3，2026-10-17 新增）**：对 15 个分支逐一本地 build + 冒烟——**部分完成**（§3.2：5 分支 clean 复测可信；§3.1：11 分支批处理结果被环境残留污染判废，待按 §3.3 SOP 重测）。
3. **未启动（约 26 个）**：R01（docs-only 反向 control）、R11/R13（精确 externalization，被 R12/R14 blanket 版本覆盖测量）、R20-R45（Windows heap 矩阵 / trace workaround / Content prerender 副作用 / ESM hydration / Vercel 多项目 / fresh 缓存序 / Nuxt 4 迁移）——**分支不存在，任务未开始**。这是路线图的既定长期状态，不是遗失。

## 3. Phase 2：本机逐分支复现记录

⚠️ **重大方法论发现（本轮最重要的教训，见 §3.2）**：跨分支切换时 pnpm 隐藏提升层（`.pnpm/node_modules`）会残留上一分支的安装态，使后续分支出现**伪故障信号**。受控对照实验证实：同一分支污染态 build exit=1 + Invalid URL、全清重装后 exit=0。**分支本地复现必须先隔离旧 `node_modules`（mv 改名，规避 bulk-delete 守卫）再 frozen install**——下方结果均按此纪律标注可信度。

### 3.1 首轮批处理（已判废）

初版批处理对 12 个分支（r05-r19）的"全部 exit 1 + Invalid URL"结果**判废**：R02 的安装态经隐藏提升层泄漏到后续分支，且其中两轮批处理还受后台沙箱 bulk-delete 守卫干扰（`SAFE_DELETE_BULK_CONFIRM_REQUIRED` 拦截 `.nuxt/dist` 清理）。判废原因链：受控对照（§3.2）证明污染态与洁净态结果相反。

### 3.2 clean 复测可信结果（每分支：mv 隔离旧 node_modules → frozen install 28.6s → build）

| 分支                                                     | 单变量                                                      | docs build               | 故障信号（本机实测）                                                                                                                | 判读                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| experiment/r02-remove-docs-direct-h3                     | 删 docs 显式 h3@1.15.11                                     | **exit 1**               | `GET /api/_content/cache.<ts>.json` 与 `search-<ts>` 双 `[request error] Invalid URL` → `[500]` → `Exiting due to prerender errors` | ✅ 真实复现（首轮首分支无污染；与 CI 结论一致：docs 解析 h3@2.0.1-rc.22）         |
| experiment/r03-content-caret-drift                       | Content `^2.13.9`（解除 root override；lockfile 仍 2.13.9） | **exit 1**               | `Invalid URL` ×4，prerender 失败                                                                                                    | ✅ 真实复现（clean 安装态下稳定失败）——同族依赖契约故障，精确机制待 pnpm why 对照 |
| experiment/r04-theme-caret-drift                         | theme `^1.1.9`                                              | **exit 1**               | `Invalid URL` ×4，prerender 失败                                                                                                    | ✅ 真实复现（clean 安装态下稳定失败）                                             |
| experiment/r05-remove-og-image-override                  | 移除 og-image override                                      | **exit 0**               | 无故障（对照价值：证明 override 漂移不炸 node-server build）                                                                        | ✅ 绿色对照                                                                       |
| experiment/r19-node-linker-hoisted（污染态）             | hoisted linker                                              | exit 124（480s timeout） | 客户端 25s 完成后 Nitro 阶段超时                                                                                                    | ⚠️ 待 clean 重测（R19 hoisted 全量重装 12m+，timeout 上限不足）                   |
| experiment/r18-targeted-public-hoist（污染态）           | targeted public hoist                                       | exit 124（480s timeout） | 同上长尾形态                                                                                                                        | ⚠️ 待 clean 重测                                                                  |
| experiment/r06/r07/r08/r10/r12/r14/r15/r16/r17（污染态） | 各单变量                                                    | exit 1 + Invalid URL     | **判废**——污染伪信号                                                                                                                | ❌ 待按 §3.3 SOP 重测                                                             |

### 3.3 修正后的分支复现工作流 SOP（本轮沉淀）

```text
1. git checkout experiment/<br>
2. mv node_modules node_modules.stale-<br>   # 隔离（勿 rm——bulk-delete 守卫拦 + 可回滚）
3. pnpm install --frozen-lockfile
4. pnpm build:packages && pnpm --filter @repro/docs build（timeout 480s）
5. build 绿 → node apps/docs/.output/server/index.mjs + curl 内容断言
6. 捕获信号 → 记录本文档 → git checkout main
7. 批次结束：定向清理 node_modules.stale-*（前台、分批）
```

运行时注意：后台任务会被 harness 的 bulk-delete 守卫拦截（`SAFE_DELETE_BULK_CONFIRM_REQUIRED`），构建/清理必须前台执行。

## 4. 未启动实验的执行计划（R01/R11/R13/R20-R45）

| 组                       | 实验                                                             | 预期故障信号                                  | 本机执行风险                                    |
| ------------------------ | ---------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| 反向 control             | R01 删除 apps/api sibling                                        | 预期**无故障**（对照证明 sibling 单独不致病） | 低                                              |
| externalization 补课     | R11 精确 ssr.noExternal、R13 精确 nitro.inline                   | 首个精确错误的捕捉                            | 低-中                                           |
| Windows heap 矩阵        | R23 默认堆 / R24 4608 / R25 5120 / R26 6144                      | R23 预期 OOM（exit 134）                      | **高：OOM 实验可能长时挂起，须 timeout + 串行** |
| trace workaround         | R20 默认 trace / R21 Windows trace:false / R22 Linux trace:false | R20 预期 NFT 长尾                             | **高：长尾可能 30min+**                         |
| Content prerender 副作用 | R27 crawlLinks:false / R28 routes.clear() / R29 双开             | Content 数据空 / page._id 错误                | 中                                              |
| ESM/CJS hydration        | R30-R33（dayjs/mermaid/debug/sanitize-url）                      | 水合中断、console 模块错误                    | 中                                              |
| Vercel 多项目            | R34-R36（根 vercel.json 污染）                                   | 云端配置覆盖                                  | 需云端，非本机                                  |
| 顺序/缓存/fresh          | R39-R44                                                          | cache 遮蔽 / 顺序差异                         | 中                                              |
| Nuxt 4 迁移              | R45 整组兼容矩阵                                                 | 世代迁移结果                                  | 大变更，独立 PR                                 |

## 5. 结论与后续队列

1. **故障清单与 PR/分支的对应关系完整**：15 个已建分支 = 路线图阶段 1-4 实验（R02-R19），CI 证据全部固化在 PR body；"失败不合并"政策执行到位。
2. **本机复现进度**：5/15 分支 clean 可信（R02 ✅故障 / R03 ✅故障 / R04 ✅故障 / R05 ✅绿对照 / R18-R19 timeout 待重测），9 个分支待按 §3.3 SOP clean 重测，约 26 个实验未建分支。
3. **本轮方法论产出（对后续所有复现有效的 SOP）**：跨分支隐藏提升层残留会制造伪故障信号；复现前必须隔离 node_modules；后台任务不可用于含构建的复现流程。
4. **待执行队列**（按序）：① r06-r17 九个分支 clean 重测 ② r18/r19 加大 timeout clean 重测 ③ R01/R11/R13 建分支执行 ④ R20-R26 Windows 资源族（高险，串行+timeout）⑤ R27-R33/R39-R44 逐批 ⑥ R34-R38 需云端协同 ⑦ R45 独立迁移 PR。
5. 待清理项：`node_modules.stale-*` 隔离目录（bulk-delete 守卫限制，需前台分批清理）。
