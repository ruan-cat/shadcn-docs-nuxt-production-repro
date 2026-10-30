# 验收门禁

## 1. 为什么需要多层门禁

本仓库的核心历史教训之一是：

```text
install 通过 != build 通过
build 通过 != artifact 完整
artifact 能启动 != HTTP 请求正常
首页 200 != Nuxt Content 正常
Linux 绿色 != Windows 绿色
Windows workaround 绿色 != Vercel 可部署
```

因此所有结论必须说明通过了哪一道门。

## G0：源码与 manifest 门

检查：

- package manifest 合法；
- workspace dependency 明确；
- 不依赖未提交生成文件；
- 不包含密钥；
- control 版本符合任务工件声明。

## G1：fresh install 门

要求：

- `pnpm install --frozen-lockfile` 对 committed lockfile 成功；
- 指定实验需要时另做 fresh resolve；
- 保存 Node/pnpm/OS；
- 保存 lockfile hash。

## G2：依赖解析门

必须回答：

- docs 最终 Nuxt 是什么；
- docs 最终 Nitro 是什么；
- API Nitro 是什么；
- 所有 H3 实例是什么；
- Content runtime 实际会解析哪一个 H3；
- 所有 `@nuxt/kit` 实例是什么；
- `nuxt-og-image` 是什么；
- shadcn-docs / Content 实际版本是什么。

如果依赖树已经跨世代，后续错误必须先按这一层解释，不能先改 Markdown/CSS。

## G3：prepare / generated state 门

检查 docs：

- `nuxt prepare` 成功；
- `.nuxt` 由当前版本 fresh 生成；
- 生成 aliases/types 不来自旧 cache；
- `#app-manifest` 等入口无异常。

## G4：Content 功能门

必须请求**生产构建实际注册**的 Content API 路由。

> ⚠️ 2026-10-30 契约订正：content v2 在**生产构建**下会给 API 路由名追加构建指纹
> （`cache.<buildIntegrity>.json` / `search-<buildIntegrity>`，指纹来自 `buildIntegrity = Date.now()`，
> **每次构建都变**），无后缀的 `/api/_content/cache.json` 与 `/api/_content/search`
> **只在 dev 模式存在**。请求它们只会落到 catch-all 页面渲染器，得到「HTTP 200 + HTML 404 shell」，
> 与「Content API 故障」不可区分——这正是 F47 第二层的成因（见 failure-catalog F47 的 2026-10-30 根因订正）。

路由来源（**不得硬编码指纹**）：

- 从构建产物读取 —— 扫 `.output/server/**/*.mjs` 的 Nitro 路由表抓真实路由名，或读 `runtimeConfig.public.content.integrity`。

要求：

- HTTP 200；
- `Content-Type` 不是 `text/html`；
- 响应体可 `JSON.parse`，且结构可解析（cache → `contents`；search → `documentIds`；query → 数组）；
- 响应体含**具体文档**的 `_path` 与 `title`（如 `_path === "/guide/baseline"`、`title === "绿色控制组"`）——
  **不能只断言「非空」或「含某个词」**（`/api/_content/query/index.md` 无 `_params` 时回退空 query 返回全部文档，是弱门）；
- 不出现 `ERR_INVALID_URL`；
- 不出现 H3 export mismatch。

**反向断言（防假阳性，必做）**：未注册的 canonical 路径 `/api/_content/cache.json` 与 `/api/_content/search`
必须返回**真实非 200**（404），**不得**返回 `HTTP 200 + HTML 404 shell`。

> F47 教训：状态码 200 + 空错误日志会把「路由不存在 / Content API 故障」误判为通过。
> 只断言 `response.ok` 的探针对 404 shell 恒绿。

## G5：docs production build 门

要求：

- exit code 0；
- 记录最终阶段；
- 记录耗时；
- 可用时记录 max RSS / heap；
- 不能用超时工具把长尾误判为死锁。

## G6：docs artifact startup 门

生产产物必须在 fresh 进程启动。

启动成功只代表监听成功，不代表运行时依赖闭包正确。

## G7：docs HTTP runtime 门

至少请求：

- `/`；
- 一个实际文档路由；
- 依赖 workspace UI 的页面；
- Content cache/search（如果产物形态支持）。

要求无 500 / module not found。

## G8：API production build 门

Nitro 3 API 必须独立构建，不得通过 Nuxt CLI 代替。

## G9：API artifact runtime 门

启动 API artifact，至少请求：

```text
/v1/health
```

验证共享 workspace package 被正确打入或追踪。

## G10：跨应用隔离门

比较：

- docs-only；
- api-only；
- docs + api；
- 不同构建顺序。

如果加入 sibling app 后 docs 解析发生变化，必须保存 dependency resolution 证据。

## G11：Windows 门

Windows 结果必须独立列出：

- install；
- prepare；
- docs build；
- API build；
- artifact；
- trace 行为；
- EPERM / native lock；
- 残留进程（若发生）。

## G12：Linux/Vercel 门

任何 Windows-only workaround 都必须重新通过 Linux artifact closure。

禁止根据 Windows 成功直接宣布生产修复成立。

## G13：缓存无关性门

关键候选至少一次：

- 删除生成产物；
- 禁用/绕开 Turbo cache；
- fresh process；
- 重新执行完整 runtime smoke。

## G14：重复性门

最终“稳定”结论至少需要：

- 同 SHA rerun；
- 一个 fresh runner；
- 若涉及平台差异，Windows + Linux 各自至少一份独立证据。

## 结论等级

| 等级 | 含义                                  |
| ---- | ------------------------------------- |
| L0   | 仅观察到现象，无稳定复现              |
| L1   | 单次本地复现                          |
| L2   | 单变量 PR + CI 复现                   |
| L3   | 两个平台或 fresh runner 重复复现      |
| L4   | 已定位首个失败门和实际解析/产物证据   |
| L5   | 有 control、failure、fix 三组独立对照 |

对上游提交 issue 时，优先使用 L4/L5 证据。
