# 实验任务清单看板

状态定义：

- ✅ **clean 可信完成**：按 [SOP.md](./SOP.md) 隔离重测后结果可信，已入档案。
- ⏳ **待重测**：已有首轮结果但不可采信（timeout 或污染态判废），须按 SOP 重测。
- ⏸️ **前置阻塞**：任务被证据门槛拦下暂不启动（如无证据驱动目标），解除条件达成后方可重启。
- 🆕 **未启动**：分支未建，任务未开始（路线图既定长期状态）。
- 🚫 **判废待重测**：污染态结果无效，按 SOP clean 重测后才可采信。

> 队列排序依据：[总检报告 §4/§5](../../reports/2026-10-17-branch-pr-fault-reproduction-audit.md)（2026-10-17）。

## 表 1：已完成实验

| 实验 | 单变量                                                | PR            | 分支 / 固化方式                                                               | 结果                                                                                                                                                                                                                                        | 档案                           |
| ---- | ----------------------------------------------------- | ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| R02  | 删 docs 显式 h3@1.15.11                               | #4（CLOSED）  | experiment/r02-remove-docs-direct-h3                                          | ✅ 故障复现（Invalid URL → 500 → prerender 失败，与 CI 结论一致）                                                                                                                                                                           | [R02.md](./R02.md)             |
| R03  | Content `^2.13.9`（解除 root override）               | #6（CLOSED）  | experiment/r03-content-caret-drift                                            | ✅ 故障复现（clean 安装态下稳定失败）                                                                                                                                                                                                       | [R03.md](./R03.md)             |
| R04  | theme `^1.1.9`                                        | #7（CLOSED）  | experiment/r04-theme-caret-drift                                              | ✅ 故障复现（clean 安装态下稳定失败）                                                                                                                                                                                                       | [R04.md](./R04.md)             |
| R05  | 移除 og-image override                                | #8（CLOSED）  | experiment/r05-remove-og-image-override                                       | ✅ 绿对照（证明 override 漂移不炸 node-server build）                                                                                                                                                                                       | [R05.md](./R05.md)             |
| R09  | UI 保持 package exports/dist 控制组固化               | #14（MERGED） | 以 #14 固化 dist 控制组（无 experiment 分支）                                 | ✅ 完成                                                                                                                                                                                                                                     | （以 PR #14 固化，无独立档案） |
| R01  | 移除 apps/api sibling，docs-only 反向 control         | 未开 PR       | experiment/r01-remove-nitro-sibling                                           | ✅ clean 可信完成（对照成立，2026-10-18）；分支已建未开 PR（随下一里程碑 push 创建）；CI api job 预期红                                                                                                                                     | [R01.md](./R01.md)             |
| R13  | 精确 `nitro.externals.inline`（externalization 补课） | 未开 PR       | experiment/r13-precise-nitro-inline                                           | ✅ clean 可信完成（排除性证据，2026-10-18）；分支已建未开 PR；根 experiment.json 声明随分支提交                                                                                                                                             | [R13.md](./R13.md)             |
| R20  | Windows 默认 trace 控制（测量型，main 原地）          | 未开 PR       | 无分支（main @ c0c9f448 测量基线）                                            | ✅ clean 可信完成（长尾未复现，冷态 213s / 预热态 169s 均 exit 0，2026-10-18）；为 R21 提供对照                                                                                                                                             | [R20.md](./R20.md)             |
| R23  | 默认 heap（约 4 GiB）（测量型，main 原地）            | 未开 PR       | 无分支（main @ 76bd0fa 测量基线）                                             | ✅ clean 可信完成（OOM 未复现 + 峰值水位量化，2026-10-19）；水位 ~3.5 GiB，距 F24 锚点余量 13.2%                                                                                                                                            | [R23.md](./R23.md)             |
| R24  | 4608 MiB heap 档位（测量型，main 原地）               | 未开 PR       | 无分支（main @ 5557de7 测量基线，环境级单变量 NODE_OPTIONS 注入，无代码变更） | ✅ clean 可信完成（build exit 0 / 160.0s 与 R23 持平，OOM 未复现，2026-10-19）；水位 +8.4% 判据内——水位由构建图决定非堆上限                                                                                                                 | [R24.md](./R24.md)             |
| R25  | 5120 MiB heap 档位（测量型，main 原地）               | 未开 PR       | 无分支（main @ c8b1758 测量基线，环境级单变量 NODE_OPTIONS 注入，无代码变更） | ✅ clean 可信完成（快速验证口径，build exit 0 / 161.0s 与 R23/R24 持平，OOM 未复现，2026-10-19）；峰值 WS 4139 MB +15.0% 超判据——峰值随档位抬升（FINDINGS #16）                                                                             | [R25.md](./R25.md)             |
| R26  | 6144 MiB heap 档位（测量型，main 原地）               | 未开 PR       | 无分支（main @ c8b1758 测量基线，环境级单变量 NODE_OPTIONS 注入，无代码变更） | ✅ clean 可信完成（快速验证口径，build exit 0 / 157.0s 与 R23/R24/R25 持平，OOM 未复现，冒烟三断言全绿，2026-10-19）；峰值 WS 4463 MB +24.0% 超判据——单调趋势确认（FINDINGS #16）                                                           | [R26.md](./R26.md)             |
| R28  | `prerender:routes` 钩子中 `routes.clear()`            | 未开 PR       | experiment/r28-prerender-routes-clear（分支已提交 d088e38）                   | ✅ clean 可信完成（部分命中，2026-10-19）；Prerendered 11 → 5 routes、html 11 → 1——nitropack `/` 回填兜底收窄破坏面（FINDINGS #17）；运行时三断言靠 SSR 兜底，F47 签名不变                                                                  | [R28.md](./R28.md)             |
| R27  | Content prerender 配置加入 `crawlLinks:false`         | 未开 PR       | experiment/r27-prerender-crawllinks-false（分支已提交 4d5c7e0）               | ✅ clean 可信完成（破坏面小于预期，2026-10-27）；契约 12/12、build exit 0（148s）、Prerendered 9 routes（3 页面 + 3 payload + 2 ipx + 1 i18n）、html = 3 且冒烟静态命中；仅 content API 路由缺席——单变量不足以触发 F27 全貌（FINDINGS #18） | [R27.md](./R27.md)             |
| R29  | `crawlLinks:false` + `routes.clear()` 同开            | 未开 PR       | experiment/r29-prerender-both（分支已提交 17e87f7）                           | ✅ clean 可信完成（完整触发，2026-10-27）；契约 12/12、build exit 0（136s）、零预渲染成立（日志三行全缺席、html 11 → 0）；运行时全 SSR 兜底，F47 签名不变——F27 家族完整触达（FINDINGS #18）                                                 | [R29.md](./R29.md)             |

## 表 2：待重测（首轮结果不可采信）

> **R06–R17 重测排期（2026-10-29）**：R06–R17 均为首轮"污染态判废"（exit 1 + Invalid URL，环境被污染所致、非真实结论），须按 `SOP.md` 逐个 SOP 干净重测。执行顺序 R06→R07→R08→R10→R12→R14→R15→R16→R17；重测后档案落 `experiment/rXX-*` 分支并同步本表与 `FINDINGS.md`。R18/R19 已在 `experiment/r18-retry-public-hoist`、`experiment/r19-retry-node-linker-hoisted` 分支重测完成（结论 verified），待并入 main 后由本表移入表 1。

| 实验 | 单变量                            | PR            | 首轮结果                                | 原因                                                                                                                                                                                                                                 | 档案                                   |
| ---- | --------------------------------- | ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| R18  | targeted public hoist             | #26（CLOSED） | exit 124（480s timeout）                | 长尾超时（已重测 verified，分支待并入）                                                                                                                                                                                              | 分支已落档（待并入 main）              |
| R19  | `nodeLinker: hoisted`             | #27（OPEN）   | exit 124（480s timeout）                | hoisted 全量重装超时（已重测 verified，分支待并入）                                                                                                                                                                                  | 分支已落档（待并入 main）              |
| R06  | 显式升级 nuxt-og-image            | #9（CLOSED）  | exit 1 + Invalid URL（首轮·污染态判废） | 已 SOP 干净重测 verified：install/build 全绿（179s）、HTTP 200 + 内容命中                                                                                                                                                            | R06.md（✅ clean verified 2026-10-29） |
| R07  | 移除 shared-core 双向消费         | #11（CLOSED） | exit 1 + Invalid URL（首轮·污染态判废） | 已 SOP 干净重测 verified：install/build 全绿（188s）、HTTP 200 + 内容命中，首轮为污染伪信号                                                                                                                                          | R07.md（✅ clean verified 2026-10-30） |
| R08  | 移除 workspace UI                 | #12（CLOSED） | exit 1 + Invalid URL（首轮·污染态判废） | 已 SOP 干净重测 verified：install/build 全绿（192s）、HTTP 200 + 内容命中，首轮为污染伪信号                                                                                                                                          | R08.md（✅ clean verified 2026-10-30） |
| R10  | UI 改 source alias                | #15（CLOSED） | exit 1 + Invalid URL（首轮·污染态判废） | 已 SOP 干净重测 verified：install/build 全绿（222s）、HTTP 200 + 内容命中，首轮为污染伪信号                                                                                                                                          | R10.md（✅ clean verified 2026-10-30） |
| R12  | blanket `ssr.noExternal`          | #16（CLOSED） | exit 1 + Invalid URL（首轮·污染态判废） | 已 SOP 干净重测 verified：install/build 全绿（207s）、HTTP 200 + 内容命中，首轮为污染伪信号                                                                                                                                          | R12.md（✅ clean verified 2026-10-30） |
| R14  | blanket Nitro inline              | #19（CLOSED） | exit 1 + Invalid URL（首轮·污染态判废） | 已 SOP 干净重测 verified：默认 heap 复现 `exit 134` OOM（Nitro server 打包 ~4.1 GiB，F15 假设成立）；8 GiB heap 重测 `exit 0` + HTTP 200 内容命中——变量真实放大 server bundle 内存越过 4 GiB 默认上限，但属资源约束型 OOM 非逻辑故障 | R14.md（✅ clean verified 2026-10-30） |
| R15  | Element Plus Popper alias 缺包    | #21（CLOSED） | exit 1 + Invalid URL                    | 🚫 污染态判废                                                                                                                                                                                                                        | 待建 R15.md                            |
| R16  | app-local direct alias dependency | #23（CLOSED） | exit 1 + Invalid URL                    | 🚫 污染态判废                                                                                                                                                                                                                        | 待建 R16.md                            |
| R17  | Nitro `traceAlias`                | #25（CLOSED） | exit 1 + Invalid URL                    | 🚫 污染态判废                                                                                                                                                                                                                        | 待建 R17.md                            |

## 表 3：前置阻塞（⏸️）

| 实验 | 单变量                                        | PR   | 阻塞原因                                                                                       | 解除条件                                | 档案               |
| ---- | --------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------ |
| R11  | 精确 `ssr.noExternal`（externalization 补课） | 未建 | 无证据驱动目标（R12 blanket 全绿未产生首个 SSR externalization 错误，详见 [R11.md](./R11.md)） | 捕获首个 SSR externalization 错误后重启 | [R11.md](./R11.md) |

> **历史登记追记（2026-10-27）**：R27/R29 的契约阻塞已解除——用户 gate 授权扩展权威 pattern 列表（main @ 4211796 加入 `crawlLinks: false` 字面），两实验已执行完成并移入表 1（原阻塞登记见 git 5cdf1e8 与 [FINDINGS #17](./FINDINGS.md)）。本表现仅剩 R11。

## 表 4：未启动 17 个（R22、R30-R45）

> R27/R29 已于 2026-10-19 移入表 3（契约阻塞），2026-10-27 契约扩展（4211796）解除阻塞并执行完成后移入表 1；R28 已于 2026-10-19 完成移入表 1。实测核对：未启动+阻塞池 20 → 18（表 3 仅剩 R11，本表 17 个 = R22 + R30-R45）。

按总检报告 §4/§5 执行队列排序：

| 序  | 实验   | PR   | 单变量 / 目标                                                                                                                       | 执行平台               | 风险     |
| --- | ------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------- |
| 🔍  | 排查项 | —    | F47 第二层平台维度定案：Linux node-server 响应体级复验（CI probe:artifact 升级内容断言或手动复验）——见 [FINDINGS #9](./FINDINGS.md) | Linux（CI 或手动复验） | 待定案   |
| ①   | R21    | 未建 | Windows-only `trace:false`                                                                                                          | Windows 本机           | 高：长尾 |

> **R21 已完成测量（2026-10-18，分支 experiment/r21-windows-only-trace-false，变更留工作区未 commit）**：build 绿 79.8s（vs R20 213s，快 ~133s）；`.output/server/node_modules` 消失（16.6MB→8.2MB）但 F26 缺包链未触发——产物零裸导入，依赖已在构建链早期全量 inline，孤立环境三断言全绿。详见 [R21.md](./R21.md)。

| ② | R22 | 未建 | Linux `trace:false` | 需 Linux CI | 高：依赖 CI 协同 |
| ③ | R30-R33 | 未建 | ESM/CJS hydration（dayjs/mermaid/debug/sanitize-url） | 本机 | 中 |
| ④ | R39-R44 | 未建 | 顺序、缓存与 fresh install 矩阵 | 本机 | 中 |
| ⑤ | R34-R38 | 未建 | Vercel 多项目污染 | 需云端（Vercel） | 需云端协同，非本机 |
| ⑥ | R45 | 未建 | Nuxt 4 整组兼容矩阵迁移 | 本机 + CI | 大变更，独立 PR |

> **R25/R26 优先级重估注记（2026-10-19，R24 完成后）**：R20/R23/R24 三轮一致——构建水位由构建图决定（峰值 ~3.5-3.9 GiB），heap 上限提升不改变水位与时长（R23/R24 build 均 160s）。R25（5120 MiB）/R26（6144 MiB）更高档位预期同结果，建议降级为**快速验证**（单轮构建 + 水位抽查即可，无需完整周期）。档位验证照 R24 用 `getHeapStatistics` 实测留证（V8 对齐 +48 MiB）。详见 [R24.md](./R24.md) 与 [FINDINGS #15](./FINDINGS.md)。
>
> **R25/R26 完成追记（2026-10-19）**：已按快速验证口径执行并移入表 1——build exit 0（161.0s / 157.0s）与 R23/R24 一致，但峰值 WS 4139 / 4463 MB（+15.0% / +24.0%）**超出 ±10% 判据**，#15 "水位不变"结论已被 [FINDINGS #16](./FINDINGS.md) 修正：构建行为与结局与档位无关（成立且强化），峰值水位随 heap 上限单调抬升。

## DoD（完成定义）

一个实验从看板移入"已完成"必须同时满足：

1. R{xx}.md 档案填齐（执行记录表、结论、关键发现）（例外：以 PR 固化的控制组实验如 R09 豁免独立档案）；
2. [SOP.md](./SOP.md) 复现自检清单全勾；
3. QUEUE.md 状态与 FINDINGS.md（如有横向发现）已同步；
4. 结论标注为 `candidate` / `verified`（标注规则见 [_TEMPLATE.md](./_TEMPLATE.md)）。
