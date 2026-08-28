# PR 实验路线图

本文件定义初始化 PR 合并后的后续实验顺序。失败实验允许保留关闭状态，不要求合并到 `main`。

## 阶段 0：初始化与绿色控制组

### PR INIT

目标：建立完整 monorepo、探针、CI、文档任务工件和精确锁定的 Nuxt 3 文档控制组。

正式 control **有意同时包含独立 Nitro 3 sibling API、共享 core 和 workspace UI**，因为本仓的目标就是生产复杂场景，而不是官方最小 starter。

要求：

- `apps/docs` 可独立构建；
- `apps/api` 可独立构建；
- `packages/shared-core`、`packages/ui` 存在；
- 所有故障 workaround 默认关闭；
- CI 不通过“故意失败”来制造效果；
- committed `pnpm-lock.yaml` 冻结后，普通 CI 使用 `--frozen-lockfile`。

## 阶段 1：依赖世代与 H3 串味

### PR R01：移除独立 Nitro 3 sibling，形成 docs-only 反向 control

因为正式 `main` control 已经包含 `apps/api`，R01 不再“重复加入 API”，而是只删除 `apps/api` 及其 workspace edge，形成相同依赖版本下的 docs-only 对照。

目标：回答“独立 Nitro 3 sibling 的存在本身，是否改变 docs 的依赖树、Content H3 解析、build graph 或运行时结果”。

判读：

- main 与 R01 都绿且 Content H3 路径一致：sibling 存在本身不是污染充分条件；
- 删除 sibling 后依赖/H3 路径发生关键变化：记录为 topology evidence，再继续 R02/R03 找到触发运行时失败的必要条件。

### PR R02：删除 docs 显式 H3

单变量：删除 docs 的 `h3: 1.15.11`。

必须保存：

- `pnpm why h3`；
- 所有 H3 实例；
- Content 物理 package context 的实际 H3 解析位置；
- Content cache/search 结果。

### PR R03：Content 精确版本改 caret

单变量：`2.13.9 -> ^2.13.9`，同时只解除为该实验服务的 root Content override。

fresh lockfile，观察是否跨到 2.14.x，并明确区分 manifest 允许范围与实际解析结果。

### PR R04：theme 精确版本改 caret

单变量：`1.1.9 -> ^1.1.9`。

观察是否跨主题 Nuxt 3/Nuxt 4 世代；如果 root overrides 阻止某条预期漂移，必须在 PR 中说明而不是偷偷同时解除多个变量。

### PR R05：移除 `nuxt-og-image` override

记录所有 `@nuxt/kit` / H3 实例。

### PR R06：显式升级 `nuxt-og-image`

与 R05 区分：R05 测“自然漂移”，R06 测“已知版本变化”。

## 阶段 2：workspace 复杂度

### PR R07：移除 shared-core 双向消费做 topology 对照

正式 control 已经让 docs/API 同时消费纯 TS shared-core；R07 通过减法对照确认这条 workspace edge 对解析和 tracing 的影响。

### PR R08：移除 workspace UI 做 docs complexity 对照

正式 control 已包含 Vue + Element Plus + VueUse UI；R08 用减法量化 client/SSR modules、产物、内存和 externalization 差异。

### PR R09：UI 保持 package exports/dist

把当前 production control 的 exports/dist 行为固化成对照证据。

### PR R10：UI 改为 source alias

测 server graph、内存和 artifact closure。

## 阶段 3：Vite / Nitro externalization

### PR R11：第一个精确 `ssr.noExternal`

必须由可复现的首个 SSR externalization 错误驱动。

### PR R12：blanket `ssr.noExternal`

故意复现图放大，不作为候选修复。

### PR R13：第一个精确 `nitro.externals.inline`

必须证明问题发生在 Nitro Rollup 阶段。

### PR R14：blanket Nitro inline

测 build graph / heap 副作用。

## 阶段 4：standalone npm alias / Popper

### PR R15：复现 Element Plus Popper alias 缺包

目标结果可能为：build ✅ / server listen ✅ / GET `/` ❌。

### PR R16：app-local direct alias dependency

只加入：

```json
"@popperjs/core": "npm:@sxzz/popperjs-es@^2.11.7"
```

### PR R17：Nitro `traceAlias`

只测当前版本组合实际效果。

### PR R18：targeted public hoist

仅作为对照。

### PR R19：`nodeLinker: hoisted`

全局拓扑对照，不作为默认建议。

## 阶段 5：Windows / NFT / 内存

### PR R20：Windows 默认 trace 控制

不加 workaround，记录真实构建阶段。

### PR R21：Windows-only `trace:false`

只归因 NFT trace。

### PR R22：Linux `trace:false`

用于证明为什么生产环境不能复制 Windows workaround。

### PR R23：默认 heap

记录 OOM / 完成事实。

### PR R24：4608 MiB

### PR R25：5120 MiB

### PR R26：6144 MiB

所有 heap PR 必须从同一个固定结构基线独立派生，不能层层叠加。

## 阶段 6：Content prerender workaround 副作用

### PR R27：`crawlLinks:false`

### PR R28：`routes.clear()`

### PR R29：两者同时开启

要求不仅看 build，还看 cache/search 和文档页结构化数据。

## 阶段 7：ESM/CJS 与交互

### PR R30：复现 dayjs 入口冲突

### PR R31：复现 mermaid 入口冲突

### PR R32：复现 debug ESM/CJS 入口问题

### PR R33：复现 sanitize-url optimizeDeps 缺口

每个 PR 记录 browser module error 与 hydration 状态，不能只截图 UI。

## 阶段 8：Vercel 多项目污染

### PR R34：两个项目、无根 vercel.json

作为部署 control。

### PR R35：加入 docs 根 vercel.json

观察 API project 设置是否被覆盖。

### PR R36：加入 API 根 vercel.json

观察 docs project。

### PR R37：子包 `.vercel/output` 搬运

### PR R38：preserve symlink vs dereference

## 阶段 9：顺序、缓存与 fresh install

### PR R39：Turbo/cache control

### PR R40：强制 fresh build

### PR R41：删除 lockfile fresh resolve

### PR R42：docs -> api

### PR R43：api -> docs

### PR R44：并行构建

## 阶段 10：Nuxt 4 整体迁移线

### PR R45：Nuxt 4 同代迁移候选

必须一次性作为兼容矩阵迁移：

- Nuxt 4；
- shadcn-docs-nuxt 1.2.x；
- Content 2.14.x；
- 对应 H3/Nitro/OG Image；
- Vue Router 等配套代际。

不能把这条 PR 描述成普通 dependency bump。

## PR 统一模板

每个实验 PR body 至少写：

```text
基线 SHA：
唯一变量：
预期回答的问题：
依赖树证据：
Windows 结果：
Linux 结果：
Docs build：
Content cache/search：
Docs artifact runtime：
API build/runtime：
结论：
是否合并：
```
