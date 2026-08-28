# CI 策略

## 日常基线 CI

普通 PR 默认执行三条证据轨：

1. Ubuntu 静态契约、包构建、依赖树和 H3 解析；
2. Ubuntu 完整 production build + standalone HTTP smoke；
3. Windows install / workspace 包 / Nuxt prepare / H3 解析 / 独立 Nitro 3 API。

Windows 的完整 Nuxt production build 不默认绑定每个 PR，因为历史问题恰好包含高内存、NFT trace 长尾和中断后残留进程。把它做成单独 workflow 可以明确区分“日常 control”与“平台压力实验”。

## Windows stress

`windows-stress.yaml` 允许按 old-space 数值触发：

- 4096；
- 4608；
- 5120；
- 6144；
- 其他明确实验值。

数值只是实验变量。任何一次通过都不能直接变成永久推荐值。

## Fresh resolution

`fresh-resolution.yaml` 故意删除 lockfile 后重新解析，用来回答：

- theme caret 会解析到什么；
- Content caret 会解析到什么；
- OG Image / Kit / H3 会出现哪些实例；
- committed lockfile 与 fresh resolve 是否产生不同运行时世代。

## 为什么当前安装使用 `--no-frozen-lockfile`

初始化 PR 由 GitHub 连接器直接创建文件，当前尚没有通过真实 pnpm 解析生成并提交的 lockfile。首轮 CI 需要先生成真实 lockfile 和构建证据；在控制组完成首轮验证后，应把生成的 lockfile 纳入后续基线，并将普通 CI 收紧到 `--frozen-lockfile`。

这个状态属于初始化阶段任务，不得长期保留为最终控制组状态。
