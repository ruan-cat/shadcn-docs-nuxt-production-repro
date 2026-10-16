# 2026-10-16 push 788630b 三平台生产部署监听与生产级验证

> 性质：部署验证记录（非故障实验）。触发：push `788630b`（📃 docs: session-relay.md 文档化，docs-only 变更）→ Vercel 双 Project + CF Workers Builds 双 Worker 自动部署。

## 部署监听记录（CLI 实证）

| 平台 | 目标 | 结果 | 部署/构建 ID | 时长 | 源 |
|---|---|---|---|---|---|
| Vercel | docs Project（prj_nRhi…） | ● Ready | `shadcn-docs-nuxt-production-repro-docs-bx1y6gzax.vercel.app` | 3m | Git Integration |
| Vercel | api Project（prj_AAGU…） | ● Ready | `shadcn-docs-nuxt-production-repro-de9tf4pfx-ruancat-projects.vercel.app` | 24s | Git Integration |
| CF Workers Builds | docs worker（tag `088d894e00824f3d9577fd18926d6eb7`） | build_outcome **success** | build `dadcc6a3-1517-4acb-8a2b-3616abbe7429` | 3m22s | push_event |
| CF Workers Builds | api worker（tag `bcb29b488fb641f1947ce87aa9f512c3`） | build_outcome **success** | build `168c65bb-2fd9-4ef5-8f94-369f060b25cc` | 1m13s | push_event |

- commit SHA（全链一致）：`788630b185083f6126f8be1887bf8584bad7971c`（CF build_trigger_metadata.commit_hash 实测；Vercel 经别名归属确认）。
- Vercel 生产别名实测绑定：`…docs.vc.ruan-cat.com` / `…api.vc.ruan-cat.com`（inspect Aliases 列表命中）。
- cf CLI 监听要点：builds API 按 script-tag 寻址；tag 可从 `cf builds get <uuid>` 的 `build_trigger_metadata` 与会话档案交叉确认。

## 生产 URL（四域名）

- Vercel docs：https://shadcn-docs-nuxt-production-repro-docs.vc.ruan-cat.com
- Vercel api：https://shadcn-docs-nuxt-production-repro-api.vc.ruan-cat.com
- CF docs：https://shadcn-docs-nuxt-production-repro-docs.cf.ruan-cat.com
- CF api：https://shadcn-docs-nuxt-production-repro-api.cf.ruan-cat.com

## HTTP 断言（curl，响应体内容断言）

| 断言 | Vercel | CF |
|---|---|---|
| docs `/` HTTP 200 + 「生产级复现实验室」命中 | ✅ ×4 | ✅ ×4 |
| docs `/guide/baseline` 真实内容「绿色控制组」 | ✅ 200 直达，命中 ×3 | 307 → `/guide/baseline/`（尾斜杠规范化）→ 200，命中 ×3 |
| api `/v1/health` | ✅ `{"ok":true,"service":"independent-nitro3-api",…}` | ✅ 同左 |
| SCSS 链路：`entry.BE8lLI6D.css` 哈希一致 + 预渲染 HTML 内联 `.repro-runtime-card[data-v-83c9bc56]{…8px}` + 令牌 `#2563eb` | ✅ | ✅ |
| **F47 第二层（运行时）**：`/api/_content/cache.json` | ❌ 200 + 100,658B HTML 404shell | ❌ 200 + 100,406B HTML 404shell |
| **F47 第二层**：`/api/_content/search`（编码参数） | ❌ 200 + HTML 404shell | ❌ 200 + HTML 404shell |

**F47 分层结论复验**：第一层构建期修复保持（双平台页面真实内容）；第二层运行时假阳性**未变**（与 failure-catalog F47 分层定案一致，非本轮回归）。**新记录的跨平台行为差异**：CF 边缘对无尾斜杠路径 307 规范化，Vercel 直达 200——最终内容一致，非故障。

## 浏览器级验收（agent-browser MCP，headless Chrome，会话 `repro-prod-1016`）

八要素：浏览器=Chrome for Testing（MCP daemon 托管，engine=chrome）；会话=命名会话 repro-prod-1016（MCP 工具族）；精确 URL=下表三组；截图=`D:/store/zcode/tmp/session-relay/shots/`（临时证据，未入库）；部署 ID=上表；提交 SHA=788630b…；加载统计=networkidle 达成；视觉结论=下表。

| 页面 | 标题 | 水合（`#__nuxt.__vue_app__`） | SCSS 令牌（computed `border-radius`） | 截图 | 视觉结论 |
|---|---|---|---|---|---|
| CF `/` | 生产级复现实验室 - … | ✅ true | ✅ 8px | production-cf-docs-home.png | 真实内容+导航/搜索/主题切换完整渲染 |
| CF `/guide/baseline/` | 绿色控制组 - … | ✅（title 实证） | ✅（布局含代码高亮） | production-cf-docs-baseline.png | 侧栏/面包屑/代码块高亮完整 |
| Vercel `/` | 生产级复现实验室 - … | ✅ true | ✅ 8px | production-vc-docs-home.png | 与 CF 截图逐像素同构 |

## 失败路径记录（use-agent-browser 分流纪律）

- agent-browser **CLI** `open` 两次挂起（>60s 无输出；`close`/`doctor` 正常，doctor launch test 0.89s pass）→ 按分流链切换 **MCP 工具族**（`agent_browser_*`），秒级成功，全程复用同一 daemon（reused=true）。
- console 通道未采集（CLI open 路径挂起，未冒二次超时风险）——以水合 eval + 截图视觉证据替代，不影响验收结论。

## 结论

1. push `788630b`（docs-only）触发四项部署全部成功，四域名生产可用。
2. 构建期 F47 修复在三平台持续保持；运行时 F47 第二层假阳性双平台一致未变——**验收必须做响应体内容断言**的纪律再次实证（状态码 200 具有欺骗性）。
3. 本轮无回归；未完成任务清单不变（F47 第二层实验、PR #27、R01/R20-R45）。
4. 本记录取代 2026-09-29 / 2026-09-30 两份 evidence 作为「当前 HEAD 生产状态」的最新快照；历史证据仍有效。
