# 初始化与实验进度

最后更新：2026-08-28

## 初始化 PR

- [x] 建立空仓库首个 `main` 基线提交
- [x] 创建初始化工作分支
- [x] 写入任务工件总入口
- [x] 写入 F01-F46 完整故障目录
- [x] 写入实验矩阵
- [x] 写入 PR 单变量路线图
- [x] 写入多层验收门禁
- [x] 写入证据规范
- [x] 写入真实项目事故映射
- [x] 建立 Nuxt 3 + shadcn-docs-nuxt + Content docs 应用
- [x] 建立完全独立 Nitro 3 API 应用
- [x] 建立 shared-core 纯 TS workspace 包
- [x] 建立 Vue + Element Plus + VueUse UI workspace 包
- [x] 建立依赖树探针
- [x] 建立 H3 实际解析探针
- [x] 建立 Content HTTP 探针
- [x] 建立 standalone artifact HTTP smoke
- [x] 建立 baseline contract tests
- [x] 建立危险 workaround 防回归测试
- [x] 建立 Linux production CI
- [x] 建立 Windows 解析/API CI
- [x] 建立 Windows 全量压力 workflow
- [x] 建立 fresh dependency resolution workflow
- [x] 开启初始化 Draft PR #1
- [x] 首轮 GitHub Actions 实际执行
- [x] 根据真实 pnpm install 生成首个 lockfile
- [x] 检查实际 Nuxt/Nitro/H3/@nuxt/kit/OG Image 解析
- [x] 修复初始化代码自身的非实验性错误（Tailwind 入口、Nitro 3 handler）
- [x] Linux docs + API artifact runtime 全绿
- [x] Windows 基础解析/API 门全绿
- [x] 提交并冻结首个控制组 lockfile
- [x] 普通 CI 收紧为 `--frozen-lockfile`
- [x] 增加 CI 契约，禁止普通 workflow 恢复动态解析
- [x] Frozen control 三轨再次全绿（run `33171057923`）
- [x] 固化首份 control evidence
- [ ] 将初始化 PR 标记为 Ready
- [ ] 合并初始化 PR 到 `main`

## 已建立的控制事实

- Docs：Nuxt 3.21.2 / Nitro 2.13.4 / shadcn-docs-nuxt 1.1.9 / Content 2.13.9 / H3 1.15.11。
- API：独立 Nitro 3 beta，运行时事件 API 从 `nitro/h3` 使用。
- frozen lockfile SHA256：`1373193329c18cd55e6c6d81da08683ec39ce6c34bd8da1db96730b55be752a8`。
- Content 物理包 context -> H3 v1；Nitro 3 package context -> H3 v2。
- dependency tree 已观察到 `@nuxt/kit` 3.x 与 4.5.2 并存，但 control runtime 全绿。
- Linux fresh docs production：5005 client modules / 3581 SSR modules / 18.6 MB Nitro output。
- Docs `/`、Content cache、Content search、Nitro API `/v1/health` 均通过 standalone HTTP 200。

## 后续实验

### 依赖世代

- [ ] R01 移除独立 Nitro 3 sibling，形成 docs-only 反向 control
- [ ] R02 删除 docs 显式 H3
- [ ] R03 Content caret drift
- [ ] R04 theme caret drift
- [ ] R05 移除 OG Image override
- [ ] R06 指定 OG Image 漂移

### workspace / externalization

- [ ] R07-R14

### standalone npm alias

- [ ] R15-R19

### Windows / NFT / heap

- [ ] R20-R26

### Content prerender 副作用

- [ ] R27-R29

### ESM/CJS hydration

- [ ] R30-R33

### Vercel 多项目

- [ ] R34-R38

### fresh/caching/order

- [ ] R39-R44

### Nuxt 4 迁移线

- [ ] R45

## 注意

初始化 PR 的目标是建立**真实可运行的 frozen control infrastructure**，不是在同一个 PR 里故意触发 F01-F46。故障必须在后续单变量 PR 中逐个复现，否则无法形成可信因果证据。
