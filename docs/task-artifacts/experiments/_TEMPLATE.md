# R{xx}：{标题}

- 关联故障：F{nn}（[failure-catalog](../failure-catalog.md) 条目）
- 关联 PR：#{n}（{state}）｜ 分支：experiment/{slug}（{存在/未建}）
- 单变量：{描述}
- 预期故障信号：{信号}
- 状态：✅clean 可信完成 / ⏳待重测 / 🚫判废待重测 / 🆕未启动

## 执行记录

| 日期 | 环境（OS/Node/pnpm） | 基线 SHA | install | build:packages | docs build | 冒烟 | 信号摘要 | 判读 |
| ---- | -------------------- | -------- | ------- | -------------- | ---------- | ---- | -------- | ---- |

## 复现自检清单

- [ ] node_modules 已隔离后 fresh install（防提升层残留伪信号）
- [ ] 唯一变量确认（实验分支相对基线只改该变量）
- [ ] 预期信号命中/未命中已原文摘录
- [ ] 与 CI 结论（PR body）对照完成
- [ ] 证据日志留存指针（/tmp/exp-*.log 或 evidence/）
- [ ] 回 main + 孤儿进程检查（F36 定向查本仓路径 node 进程）
- [ ] QUEUE / FINDINGS 已同步

## 结论

{candidate / verified + 一句话判读}

## 关键发现

{本实验特有发现；有横向价值则同步 FINDINGS.md}
