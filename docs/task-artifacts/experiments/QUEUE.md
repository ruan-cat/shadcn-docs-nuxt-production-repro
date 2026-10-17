# 实验任务清单看板

状态定义：

- ✅ **clean 可信完成**：按 [SOP.md](./SOP.md) 隔离重测后结果可信，已入档案。
- ⏳ **待重测**：已有首轮结果但不可采信（timeout 或污染态判废），须按 SOP 重测。
- 🆕 **未启动**：分支未建，任务未开始（路线图既定长期状态）。
- 🚫 **判废待重测**：污染态结果无效，按 SOP clean 重测后才可采信。

> 队列排序依据：[总检报告 §4/§5](../../reports/2026-10-17-branch-pr-fault-reproduction-audit.md)（2026-10-17）。

## 表 1：已完成实验

| 实验 | 单变量                                        | PR            | 分支 / 固化方式                               | 结果                                                                                                    | 档案                           |
| ---- | --------------------------------------------- | ------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------ |
| R02  | 删 docs 显式 h3@1.15.11                       | #4（CLOSED）  | experiment/r02-remove-docs-direct-h3          | ✅ 故障复现（Invalid URL → 500 → prerender 失败，与 CI 结论一致）                                       | [R02.md](./R02.md)             |
| R03  | Content `^2.13.9`（解除 root override）       | #6（CLOSED）  | experiment/r03-content-caret-drift            | ✅ 故障复现（clean 安装态下稳定失败）                                                                   | [R03.md](./R03.md)             |
| R04  | theme `^1.1.9`                                | #7（CLOSED）  | experiment/r04-theme-caret-drift              | ✅ 故障复现（clean 安装态下稳定失败）                                                                   | [R04.md](./R04.md)             |
| R05  | 移除 og-image override                        | #8（CLOSED）  | experiment/r05-remove-og-image-override       | ✅ 绿对照（证明 override 漂移不炸 node-server build）                                                   | [R05.md](./R05.md)             |
| R09  | UI 保持 package exports/dist 控制组固化       | #14（MERGED） | 以 #14 固化 dist 控制组（无 experiment 分支） | ✅ 完成                                                                                                 | （以 PR #14 固化，无独立档案） |
| R01  | 移除 apps/api sibling，docs-only 反向 control | 未开 PR       | experiment/r01-remove-nitro-sibling           | ✅ clean 可信完成（对照成立，2026-10-18）；分支已建未开 PR（随下一里程碑 push 创建）；CI api job 预期红 | [R01.md](./R01.md)             |

## 表 2：待重测（首轮结果不可采信）

| 实验 | 单变量                            | PR            | 首轮结果                 | 原因                                    | 档案        |
| ---- | --------------------------------- | ------------- | ------------------------ | --------------------------------------- | ----------- |
| R18  | targeted public hoist             | #26（CLOSED） | exit 124（480s timeout） | 长尾超出 timeout 上限                   | 待建 R18.md |
| R19  | `nodeLinker: hoisted`             | #27（OPEN）   | exit 124（480s timeout） | hoisted 全量重装 12m+，timeout 上限不足 | 待建 R19.md |
| R06  | 显式升级 nuxt-og-image            | #9（CLOSED）  | exit 1 + Invalid URL     | 🚫 污染态判废                           | 待建 R06.md |
| R07  | 移除 shared-core 双向消费         | #11（CLOSED） | exit 1 + Invalid URL     | 🚫 污染态判废                           | 待建 R07.md |
| R08  | 移除 workspace UI                 | #12（CLOSED） | exit 1 + Invalid URL     | 🚫 污染态判废                           | 待建 R08.md |
| R10  | UI 改 source alias                | #15（CLOSED） | exit 1 + Invalid URL     | 🚫 污染态判废                           | 待建 R10.md |
| R12  | blanket `ssr.noExternal`          | #16（CLOSED） | exit 1 + Invalid URL     | 🚫 污染态判废                           | 待建 R12.md |
| R14  | blanket Nitro inline              | #19（CLOSED） | exit 1 + Invalid URL     | 🚫 污染态判废                           | 待建 R14.md |
| R15  | Element Plus Popper alias 缺包    | #21（CLOSED） | exit 1 + Invalid URL     | 🚫 污染态判废                           | 待建 R15.md |
| R16  | app-local direct alias dependency | #23（CLOSED） | exit 1 + Invalid URL     | 🚫 污染态判废                           | 待建 R16.md |
| R17  | Nitro `traceAlias`                | #25（CLOSED） | exit 1 + Invalid URL     | 🚫 污染态判废                           | 待建 R17.md |

## 表 3：未启动 28 个（R11/R13/R20-R45）

按总检报告 §4/§5 执行队列排序：

| 序  | 实验    | PR   | 单变量 / 目标                                                                                                                       | 执行平台               | 风险                       |
| --- | ------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------- |
| 🔍  | 排查项  | —    | F47 第二层平台维度定案：Linux node-server 响应体级复验（CI probe:artifact 升级内容断言或手动复验）——见 [FINDINGS #9](./FINDINGS.md) | Linux（CI 或手动复验） | 待定案                     |
| ①   | R11     | 未建 | 精确 `ssr.noExternal`（externalization 补课）                                                                                       | 本机                   | 低-中                      |
| ②   | R13     | 未建 | 精确 `nitro.externals.inline`（externalization 补课）                                                                               | 本机                   | 低-中                      |
| ③   | R20     | 未建 | Windows 默认 trace 控制                                                                                                             | Windows 本机           | 高：NFT 长尾可能 30min+    |
| ④   | R21     | 未建 | Windows-only `trace:false`                                                                                                          | Windows 本机           | 高：长尾                   |
| ⑤   | R23     | 未建 | 默认 heap（预期 OOM，exit 134）                                                                                                     | Windows 本机           | 高：OOM，须 timeout + 串行 |
| ⑥   | R24     | 未建 | 4608 MiB heap                                                                                                                       | Windows 本机           | 高：OOM 矩阵，串行         |
| ⑦   | R25     | 未建 | 5120 MiB heap                                                                                                                       | Windows 本机           | 高：OOM 矩阵，串行         |
| ⑧   | R26     | 未建 | 6144 MiB heap                                                                                                                       | Windows 本机           | 高：OOM 矩阵，串行         |
| ⑨   | R22     | 未建 | Linux `trace:false`                                                                                                                 | 需 Linux CI            | 高：依赖 CI 协同           |
| ⑩   | R27     | 未建 | `crawlLinks:false`                                                                                                                  | 本机                   | 中                         |
| ⑪   | R28     | 未建 | `routes.clear()`                                                                                                                    | 本机                   | 中                         |
| ⑫   | R29     | 未建 | 两者同时开启                                                                                                                        | 本机                   | 中                         |
| ⑬   | R30-R33 | 未建 | ESM/CJS hydration（dayjs/mermaid/debug/sanitize-url）                                                                               | 本机                   | 中                         |
| ⑭   | R39-R44 | 未建 | 顺序、缓存与 fresh install 矩阵                                                                                                     | 本机                   | 中                         |
| ⑮   | R34-R38 | 未建 | Vercel 多项目污染                                                                                                                   | 需云端（Vercel）       | 需云端协同，非本机         |
| ⑯   | R45     | 未建 | Nuxt 4 整组兼容矩阵迁移                                                                                                             | 本机 + CI              | 大变更，独立 PR            |

## DoD（完成定义）

一个实验从看板移入"已完成"必须同时满足：

1. R{xx}.md 档案填齐（执行记录表、结论、关键发现）（例外：以 PR 固化的控制组实验如 R09 豁免独立档案）；
2. [SOP.md](./SOP.md) 复现自检清单全勾；
3. QUEUE.md 状态与 FINDINGS.md（如有横向发现）已同步；
4. 结论标注为 `candidate` / `verified`（标注规则见 [_TEMPLATE.md](./_TEMPLATE.md)）。
