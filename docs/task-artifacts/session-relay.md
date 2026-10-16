# 会话接力与备份唤起

最后更新：2026-10-16

本文件是跨会话 / 跨 agent 接力的上下文入口：记录完整会话备份的唤起方法、实测坑位、核验结果与恢复出的任务状态。新会话从这里开始，**不要依赖 memorix 自然语言搜索**（实测中文标题分词不命中、topicKey 不进 fast 索引、hex 载荷不匹配自然语言查询）。

## 备份系统事实（权威索引 memorix obs:6042）

- archiveId：`zcode-session-public-v1:sess_d5079b4a-507a-410d-88e3-56168ff338aa:through-423`
- 来源会话：`sess_d5079b4a-507a-410d-88e3-56168ff338aa`；公开历史覆盖 sequence 0-423；公开消息 390 条（user 16 / assistant 374）；34 条隐藏消息（todo 提醒/后台通知）与全部私有推理未导出。
- 分片：11 个，原映射 obs:5989-5999；载荷格式 `ARCHIVE_JSON_HEX_V1=<hex>`，hex 解码后为 envelope JSON `{archiveId, chunkNumber, chunkCount, sequenceStart, sequenceEnd, messageCount, messages}`。
- 脱敏口径：凭据模式替换为 `[REDACTED_CREDENTIAL]`（assigned_secret 45 / auth_header 3 / query_secret 2）；内部块（system-reminder/task-notification/analysis 等）替换为 `[OMITTED_INTERNAL_BLOCK]`。
- 完整性基准：`public-session-history.jsonl` 1,203,874 字节，sha256 `3df0095217d853cf8749f182cea861a6bb33ee9b12826c131990b7a2e06fe130`；manifestContentSha256 `bd3e7d5f7d198cb4673f8880b7159bef8501c241a1dd2fd2f39d3997a75eae7a`。
- 废弃记录：obs:5986（旧索引）与 obs:5987（旧 19 分片方案残留）已于 2026-10-16 resolved，勿读。
- 本地档案副本（manifest.json、public-session-history.jsonl、chunks/、全部校验回执）：`C:/Users/pc/.memorix/backups/shadcn-docs-nuxt-production-repro/sess_d5079b4a-507a-410d-88e3-56168ff338aa/`

## 唤起命令

CLI：

```bash
memorix memory detail --id 6042   # 主索引：分片映射、脱敏口径、完整性哈希、警示、任务清单
memorix memory detail --id 5999   # 全部 11 个分片载荷（见下方合并坑位）
```

MCP 等价：`memorix_detail` 传 typedRefs `["obs:6042"]` / `["obs:5999"]`。

兜底发现机制：`memorix memory recent --limit 3`（实测 6042 与 5999 会出现在列表里）。

### ⚠️ 合并坑位（2026-10-16 实测）

memorix 已把 11 个分片 consolidate 进 obs:5999：`memorix memory detail --id 5989` 至 `5998` 均报 `No readable memory found`，MCP `memorix_detail` 直读同样失败。5999 的 facts 含全部 11 条 hex，**顺序为 chunk 11→1**，须按 envelope 的 chunkNumber 重排后再解码拼接。

### 解码注意事项

- 本地 `chunks/` 文件比 hex 解码结果恰好多 1 字节（末尾换行符），属正常差异，逐字节比对时剥离。
- 自行 `JSON.stringify` 重建 JSONL 的 sha256 与基准不同属行序列化差异，**勿据此误判内容损坏**；以字节数与本地档案比对为准。

## 唤起核验记录（2026-10-16）

- [x] 主索引 obs:6042 读回（11/11 核验通过声明、F47 两层警示、未完成任务清单）
- [x] 11 条 hex 解码（390 条消息、1,203,874 字节，字节数与基准一致），与本地档案 `chunks/` 逐字节比对全部一致
- [x] 本地 JSONL sha256 与基准 `3df00952…` 完全匹配
- [x] 仓库现状核对：HEAD `3f67f36`、工作区干净（仅 `docs/prompts/` 未跟踪）、failure-catalog F47 分层定案在位

## 恢复出的任务状态快照（截至 HEAD 3f67f36）

### 已收口

- 基础设施：SCSS UI 全链路；CF Workers Builds 全自动化（cf CLI，**禁止 GitHub Actions 部署链**）；Vercel 双 Project 七阶段闭环；四自定义域名（vc.* / cf.* 双 docs/api）。三平台全绿：CI、Workers Builds docs+api 双 success、Vercel Ready。
- F47 两层定案（详见 [failure-catalog](./failure-catalog.md) F47 节）：
  - 第一层（构建期）h3 v2 世代串味：**已修 verified**。`pnpm-workspace.yaml` packageExtensions（key 须带显式 range）注入 h3@1.15.11 至 content/mdc/icon/og-image 四包 → 产物 h3 v2 清零、Invalid URL 清零、CF+Vercel 页面恢复真实内容。教训：构建成功也要 grep 残留错误，outcome success ≠ 错误清零。
  - 第二层（运行时）：**未修**。workerd 与 Vercel node 上 `/api/_content/*` 返回 200 + 404-shell HTML（假阳性），与 h3 无关（h3 v2 已从产物清零仍复现）；锁定 content 运行时 DB/存储初始化在 serverless 运行时的失败。验收必须做响应体内容断言。

### 未完成任务（按优先级）

1. **F47 第二层根因实验**（首要）：对比 workerd 与 Vercel node 的 content 运行时 DB 初始化失败点；独立 PR，套用 R19 模板（PR #27 OPEN 可参照）。
2. 处置 PR #27（R19 全局 hoisted node linker 对照）状态。
3. R01（docs-only 反向 control）与 R20-R45 路线图未启动（R02-R18 已按"失败不合并"政策关闭）。

### 工件指针

- 进度账本：[progress.md](./progress.md)（2026-09-29 / 2026-09-30 / 2026-10-16 三段收口）
- 故障目录：[failure-catalog.md](./failure-catalog.md) F47 节
- 证据：`evidence/2026-09-29-scss-ui-cloudflare-worker-baseline.md`、`evidence/2026-09-30-vercel-deploy-e2e.md`、`evidence/2026-10-16-push-788630b-production-verify.md`（最新生产快照）
- 工作区（仓库外）：`D:/store/WorkBuddy/2026-6-30-common/docs/shadcn-docs-nuxt/2026-9-29-new-repo/` 下 spec/plan/工具清单四件套
