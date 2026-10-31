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

| 文件                                                            | 对应实验 / 主题                                                                        | 状态                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `2026-08-28-init-control-baseline.md`                           | 初始 control 基线                                                                      | ✅ 现行                                        |
| `2026-08-28-r09-ui-exports-dist-control.md`                     | R09：UI exports/dist 控制组固化                                                        | ✅ 现行                                        |
| `2026-08-29-r15-element-plus-popper-alias.md`                   | R15：复现 F17（Element Plus Popper npm alias standalone 缺包）                         | ✅ 现行（2026-10-30 自上游旧分支移植，见下注） |
| `2026-08-29-r18-targeted-public-hoist-insufficient.md`          | R18（首轮）：targeted `publicHoistPattern` 不足以修复 alias closure                    | ✅ 现行（2026-10-30 自上游旧分支移植，见下注） |
| `2026-09-29-scss-ui-cloudflare-worker-baseline.md`              | SCSS/UI 在 Cloudflare Worker 的构建基线                                                | ✅ 现行                                        |
| `2026-09-30-vercel-deploy-e2e.md`                               | Vercel 双 Project 部署端到端                                                           | ✅ 现行                                        |
| `2026-10-16-push-788630b-production-verify.md`                  | `788630b` 推送后的生产部署验证                                                         | ✅ 现行                                        |
| `2026-10-30-f47-content-api-false-positive-fix.md`              | F47 第二/三层：「HTTP 200 假阳性」定案与修复                                           | ✅ 现行                                        |
| `2026-10-30-r22-runtime-portability.md`                         | R22 遗留项闭合：`trace:false` 产物的运行时可移植性（`file://` 绝对路径）               | ✅ 现行                                        |
| `2026-10-30-r32-debug-entry-axis.md`                            | R32：`debug` 真实入场轴（clean negative）+ 上游 `optimizeDeps` 悬空                    | ✅ 现行                                        |
| `2026-10-30-r34-vercel-control-readonly.md`                     | R34：部署 control 只读核验（零新增部署，零额度消耗）                                   | ✅ 现行                                        |
| `2026-10-30-r35-r36-root-vercel-json-no-cross-contamination.md` | R35 / R36：根 `vercel.json` 作用域（判负）+ R37 搬运位对照                             | ✅ 现行                                        |
| `2026-10-30-r42-r44-build-order-parallel.md`                    | R42 / R43 / R44：构建顺序与并行矩阵（null）                                            | ✅ 现行                                        |
| `2026-10-30-r45-nuxt4-generation-migration.md`                  | R45：Nuxt 4 同代整组迁移（❌ 判负：生产内容库为空）                                    | ✅ 现行                                        |
| `2026-10-30-r46-nitro-2135-attribution.md`                      | R46：nitro 2.13.5 → `unstorage@1.17.6` 单变量归因（✅ 阳性复现）                       | ✅ 现行                                        |
| `2026-10-30-vercel-shared-core-hotfix-verify.md`                | shared-core 增量 tsc「exit 0 零 emit」hotfix 验证                                      | ✅ 现行                                        |
| `2026-10-31-r48-r50-r46-mitigation-directions.md`               | R48 / R49 / R50：R46 三规避方向实证（A ✅ 全保真 / B ❌ 同签名 500 / C ✅ 调用点消除） | ✅ 现行                                        |

> **2026-10-30 索引补登记追记**：上表建立时只登记了 9 份，仓内实际已有 16 份 —— **R22 / R32 / R34 / R35-R36 / R42-R44 / R45 / R46 七份漏登记**（文件本身都在，缺的是索引行）。本次按「索引即目录」的约定补齐，避免「证据存在但检索不到」。
>
> **2026-10-30 移植追记**：上表标「自上游旧分支移植」的两份归档，原先**只存在于**
> `experiment/r18-targeted-public-hoist` / `experiment/r19-node-linker-hoisted`，
> main 与 retry 分支均无副本。这两个旧分支已于同日经用户授权删除，为避免
> **销毁唯一证据载体**，先把两份归档移植入 main，再执行删除。
> 关联：R15 机理在 FINDINGS 台账中**已有独立条目**——[FINDINGS #21](../docs/task-artifacts/experiments/FINDINGS.md)
> 「F17 机理定案：externalize Element Plus 切断 `@popperjs/core` 的 npm alias 链」
> （2026-10-30 用户授权 A1 补建；此前此处记载的「尚无独立条目」缺口**已消解**）。
>
> **2026-10-31 追记**：R48-R50 批次证据 `2026-10-31-r48-r50-r46-mitigation-directions.md` 补登记——初版落档时**再次漏登记索引**（上一条 2026-10-30 追记的同款教训），由用户质询触发的台账落地回查捕获。**新证据文件的索引登记自此纳入实验收尾检查项**（与「R{xx}.md 必须被 FINDINGS 或 QUEUE 登记」同级的 DoD）。
>
> **2026-10-31 字节保真纪律追记（obs 6121 落档）**：`.prettierignore` 中排除的两份 2026-08-29 移植证据（`2026-08-29-r15-element-plus-popper-alias.md` / `2026-08-29-r18-targeted-public-hoist-insufficient.md`）**不得移出排除清单**——prettier 重排会破坏「移植副本 == 被删分支原件」的唯一字节级凭据（上游旧分支已删，副本即原件）。该纪律此前只存在于 `.prettierignore` 注释（配置非文档），2026-10-31 总盘点时发现未落任何 markdown，特此补记。
