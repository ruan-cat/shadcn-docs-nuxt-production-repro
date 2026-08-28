# F01-F46 当前状态矩阵

最后更新：2026-08-28。

状态定义：

- `控制组已观察`：在稳定 control 中已经能观察到结构事实，但没有发生功能失败；
- `控制组已验证`：control 已通过相应功能/运行时门禁；
- `待单变量实验`：必须由后续独立 PR 验证；
- `历史已发生`：真实业务仓库曾出现，但本仓不能直接继承该结论；
- `本仓已复现`：只有本仓独立实验得到失败证据后才能使用。

| ID | 当前状态 | 初始化 control 结论 / 下一步 |
| --- | --- | --- |
| F01 | 控制组已观察 | `shadcn-docs-nuxt` Layer 实际带入大量 Nuxt modules、MDC、i18n、OG、Content 等依赖；control 仍可运行，不把“复杂”本身写成失败。 |
| F02 | 待单变量实验 | R04：theme `1.1.9 -> ^1.1.9` fresh resolve。 |
| F03 | 待单变量实验 | R03：Content `2.13.9 -> ^2.13.9` fresh resolve。 |
| F04 | 控制组受保护 | control 显式声明 `h3@1.15.11`；R02 删除该声明后测 Content 物理包实际解析。 |
| F05 | 控制组已验证 | 同仓已存在独立 Nitro 3 sibling，当前 docs 与 API 均绿色；这证明“仅存在 sibling”当前不等于污染。R01 做 docs-only 反向对照。 |
| F06 | 待单变量实验 | 需要 R02/R03 等变量触发后，用 Content package context H3 路径证明是否串味。 |
| F07 | 控制组受保护 | root override 固定 `nuxt-og-image@5.1.9`；R05/R06 解除或提升。 |
| F08 | 控制组已观察 | 即使精确 control，依赖树中仍同时存在 `@nuxt/kit` 3.x 与 4.5.2；当前所有运行时门禁绿色，所以这是结构事实，不是当前故障。 |
| F09 | 待单变量实验 | committed lockfile 已冻结；fresh-resolution workflow 专门比较重新解析。 |
| F10 | 待单变量实验 | 后续改变 root H3/工具依赖与 hoist 可见性。 |
| F11 | 控制组已验证 | `shared-core` 已同时被 docs/API 消费且保持纯 TS，双端 build/runtime 绿色。 |
| F12 | 控制组已验证 | `packages/ui` 已进入 docs SSR，产物中有 `WorkspaceRuntimeProbe` chunk；Element Plus/VueUse 路径不是纸面依赖。 |
| F13 | 待单变量实验 | R09/R10：package exports/dist vs source alias。 |
| F14 | 待单变量实验 | R12：blanket `ssr.noExternal`。 |
| F15 | 待单变量实验 | R14：blanket Nitro inline。 |
| F16 | 待单变量实验 | 对比 Vite 与 Nitro 不同阶段，不机械镜像配置。 |
| F17 | 历史已发生 / 待本仓复现 | R15：Element Plus Popper npm alias standalone closure。 |
| F18 | 控制组已验证 | CI 已证明必须实际启动 artifact；当前 docs/API build + artifact HTTP 均绿色。后续故障 PR 用相同门禁捕捉 build-green/runtime-red。 |
| F19 | 历史已发生 / 待本仓复现 | R17：在 F17 成立后单独测试 `traceAlias`。 |
| F20 | 待单变量实验 | R19：`nodeLinker: hoisted`。 |
| F21 | 待单变量实验 | R18：targeted public hoist 与 direct dependency 对照。 |
| F22 | 待资源实验 | 当前 Linux docs 全量 build 可完成；后续记录 NFT / final server 内存。 |
| F23 | 历史已发生 / 待 Windows stress | 手动 Windows full Nuxt workflow。 |
| F24 | 历史已发生 / 待 heap 矩阵 | R23-R26。 |
| F25 | 待单变量实验 | control 不含 `trace:false`；R21 只在 Windows 打开。 |
| F26 | 历史已发生 / 待本仓复现 | R22 等生产关闭 trace 对照。 |
| F27 | 历史已发生 / 待本仓复现 | R27-R29。control 保持 `crawlLinks:true`。 |
| F28 | 历史已发生 / 待本仓复现 | 只有清空 prerender 后出现数据缺失才可标本仓复现。 |
| F29 | 控制组已验证 | artifact 中 cache/search 均 HTTP 200 且非空。 |
| F30 | 待单变量实验 | R30-R33；当前不预塞 dayjs/mermaid/debug compatibility workaround。 |
| F31 | 历史已发生 / 待本仓复现 | 后续多版本 `entities` / artifact closure。 |
| F32 | 历史已发生 / 待本仓复现 | 当前 workspace UI artifact 绿色，后续 externalization 实验。 |
| F33 | 历史已发生 / 待本仓复现 | 后续 i18n / `@intlify/*` 多版本实验。 |
| F34 | 控制组已验证 | CI 每轮 fresh checkout，`nuxt prepare` 后构建；后续专门做 stale/generated 实验。 |
| F35 | 控制组受保护 | production 使用 `turbo --force`，关键证据不依赖 cache hit。 |
| F36 | 历史已发生 / 待 Windows 实验 | 不提供全量杀 node 脚本；只记录 PID/命令行。 |
| F37 | 历史已发生 / 待 Windows 实验 | native addon EPERM 与 runtime 失配保持分离。 |
| F38 | 历史已发生 / 待本仓部署实验 | R34-R36：同 repo 两个 Vercel projects 与根配置。 |
| F39 | 历史已发生 / 待部署实验 | `.vercel/project.json` 单槽。 |
| F40 | 历史已发生 / 待部署实验 | R37-R38：产物搬运、symlink、dereference。 |
| F41 | 待部署/平台实验 | 同 preset Windows/Linux 对照。 |
| F42 | 待单变量实验 | R42/R43：docs -> api 与 api -> docs。 |
| F43 | 待单变量实验 | R44：只在串行 control 稳定后测并行。 |
| F44 | 待组合对照 | 后续每个 workaround PR 都同时记录第一失败门和副作用门。 |
| F45 | 待 Nuxt 4 迁移 | R45：整组兼容矩阵迁移，禁止普通单包 bump。 |
| F46 | 控制组已建立 | 已有生产复杂度 control；后续用逐层减法/加压 PR 量化官方最小场景与真实复杂度之间的可靠性落差。 |

## 初始化阶段已经得到的关键事实

1. 独立 Nitro 3 sibling 与 Nuxt 3 docs **可以在冻结 control 中同时工作**，因此不能把“同仓存在 Nitro 3”直接写成污染根因。
2. Content 物理包上下文当前解析 H3 v1；Nitro 3 自己的 package context 解析 H3 v2；两条世代在同一 lockfile 中并存。
3. API package context 如果裸解析未声明的 `h3`，当前会看到 H3 v1；API 源码因此必须坚持显式从 `nitro/h3` 使用自己的事件 API。这是“workspace 可见性风险”，不是当前 API 故障。
4. 精确锁定核心四包也不能让整个依赖树只剩 `@nuxt/kit` 3.x；control 已观察到 4.5.2 nested Kit，但 runtime 仍全绿。
5. 后续 issue 必须把“mixed generation dependency tree”与“实际 runtime failure”分开陈述。
