# CF Workers deploy 阶段平台瞬时错误取证：code 10500（2026-10-31，非本仓故障）

> **现象**（用户截图报告）：main push 后 CF api worker 流水线 fail。
> **定性**：**Cloudflare 平台侧瞬时内部错误**——与仓库代码/配置无关；后继 push 已自愈，生产当前健康。

## 取证原文

失败 build：api worker `1fb9022e-545f-482f-9d3f-dc8bbe90a6db`（created `2026-10-31T13:54:01Z`，commit `65c31d4`，branch main）：

```text
"✘ [ERROR] A request to the Cloudflare API (/accounts/3412269ab0def154c8806e38acd1b493/workers/scripts/shadcn-docs-nuxt-production-repro-api/deployments) failed."
"  Internal authentication error: internal server error [code: 10500]"
"Failed: error occurred while running deploy command"
```

- 失败阶段 = **deploy**（`npx wrangler deploy --config apps/docs/wrangler.jsonc`）——**构建（install/build:packages/nuxt build）本身成功**；
- `code: 10500` + `Internal authentication error: internal server error` = **CF API 服务端内部错误**（deployments 端点），非凭据失效（同 commit docs worker deploy success、前后 push 的 api deploy 均 success）；
- 该 commit（65c31d4）为 docs-only 落档，**api 构建输入零变化**。

## 时间线与自愈

| UTC   | commit    | api worker          | docs worker |
| ----- | --------- | ------------------- | ----------- |
| 13:13 | `44051cc` | success             | success     |
| 13:54 | `65c31d4` | **fail（10500）**   | success     |
| 14:13 | `ddff7a0` | **success**（自愈） | success     |

## 恢复确认（2026-10-31T14:16Z）

- api 最新构建（`6a011023`，ddff7a0）= **success**；docs 最新（`badde395`，ddff7a0）= **success**；
- 生产断言：api `/v1/health` `ok:true`、`/v1/runtime` `nitro3-h3v2 / node v22.23.4 / linux`、docs 首页 200 / 107519 B / 标记 ×7；
- Vercel 双 Project 最近三笔部署全 **Ready**（零失败）。

## 判别知识（沉淀）

CF Workers 流水线 fail 时**先分清阶段**：构建命令失败（install/build 报错——查本仓代码/依赖）vs **deploy 命令失败**（wrangler 调 CF API 报错——先看错误码：`10500`/`internal server error` = 平台瞬时错误，后继 push 自愈，无需仓库侧修复；凭据类错误才会持续复现）。docs-only push 期间 api worker 的构建输入不变，其 fail 必然是平台/环境侧。
