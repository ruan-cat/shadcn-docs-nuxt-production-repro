# 实验证据目录

本目录用于保存可复核的实验结果说明。

原则：

- 自动生成的大型依赖树、日志和 artifact 优先保存在 GitHub Actions artifact；
- 需要长期引用的摘要再提交到本目录；
- 每份摘要必须写 control SHA、experiment SHA、OS、Node、pnpm、lockfile hash、首个失败门；
- 不提交密钥、完整环境变量或个人本机路径。

建议命名：

```text
YYYY-MM-DD-rXX-实验名称.md
```
