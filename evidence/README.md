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

## 归档索引（2026-10-30 建立）

| 文件                                                   | 对应实验 / 主题                                                     | 状态                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------- |
| `2026-08-28-init-control-baseline.md`                  | 初始 control 基线                                                   | ✅ 现行                                        |
| `2026-08-28-r09-ui-exports-dist-control.md`            | R09：UI exports/dist 控制组固化                                     | ✅ 现行                                        |
| `2026-08-29-r15-element-plus-popper-alias.md`          | R15：复现 F17（Element Plus Popper npm alias standalone 缺包）      | ✅ 现行（2026-10-30 自上游旧分支移植，见下注） |
| `2026-08-29-r18-targeted-public-hoist-insufficient.md` | R18（首轮）：targeted `publicHoistPattern` 不足以修复 alias closure | ✅ 现行（2026-10-30 自上游旧分支移植，见下注） |
| `2026-09-29-scss-ui-cloudflare-worker-baseline.md`     | SCSS/UI 在 Cloudflare Worker 的构建基线                             | ✅ 现行                                        |
| `2026-09-30-vercel-deploy-e2e.md`                      | Vercel 双 Project 部署端到端                                        | ✅ 现行                                        |
| `2026-10-16-push-788630b-production-verify.md`         | `788630b` 推送后的生产部署验证                                      | ✅ 现行                                        |
| `2026-10-30-f47-content-api-false-positive-fix.md`     | F47 第二/三层：「HTTP 200 假阳性」定案与修复                        | ✅ 现行                                        |
| `2026-10-30-vercel-shared-core-hotfix-verify.md`       | shared-core 增量 tsc「exit 0 零 emit」hotfix 验证                   | ✅ 现行                                        |

> **2026-10-30 移植追记**：上表标「自上游旧分支移植」的两份归档，原先**只存在于**
> `experiment/r18-targeted-public-hoist` / `experiment/r19-node-linker-hoisted`，
> main 与 retry 分支均无副本。这两个旧分支已于同日经用户授权删除，为避免
> **销毁唯一证据载体**，先把两份归档移植入 main，再执行删除。
> 关联：R15 机理在 FINDINGS 台账中**尚无独立条目**（已知台账缺口，见
> [BRANCH-MERGE-EVALUATION.md §3.5](../docs/task-artifacts/experiments/BRANCH-MERGE-EVALUATION.md)）。
