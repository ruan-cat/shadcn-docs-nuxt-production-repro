# CI 策略

## 日常基线 CI

普通 PR 默认执行三条证据轨：

1. Ubuntu 静态契约、包构建、依赖树和 H3 解析；
2. Ubuntu 完整 production build + standalone HTTP smoke；
3. Windows install / workspace 包 / Nuxt prepare / H3 解析 / 独立 Nitro 3 API。

Windows 的完整 Nuxt production build 不默认绑定每个 PR，因为历史问题恰好包含高内存、NFT trace 长尾和中断后残留进程。把它做成单独 workflow 可以明确区分“日常 control”与“平台压力实验”。

## 控制组 lockfile 已冻结

初始化阶段曾短暂使用 `pnpm install --no-frozen-lockfile`，唯一目的就是让真实 pnpm runner 生成首份依赖树；随后 GitHub Actions 把该 `pnpm-lock.yaml` 以 `📦 deps: 冻结初始化控制组依赖树` 提交回工作分支。

从此以后，普通基线 CI 和 Windows stress 都必须执行：

```bash
pnpm install --frozen-lockfile
```

`tests/ci-contract.test.mjs` 会阻止以下回归：

- 普通 CI 重新出现 `--no-frozen-lockfile`；
- Windows stress 使用动态解析；
- 初始化期自提交 job 被重新引入；
- 日常 CI 获得不必要的 `contents: write`。

## Windows stress

`windows-stress.yaml` 允许按 old-space 数值触发：

- 4096；
- 4608；
- 5120；
- 6144；
- 其他明确实验值。

数值只是实验变量。任何一次通过都不能直接变成永久推荐值。

## Fresh resolution

`fresh-resolution.yaml` 是唯一故意删除 lockfile 后重新解析的 workflow，用来回答：

- theme caret 会解析到什么；
- Content caret 会解析到什么；
- OG Image / Kit / H3 会出现哪些实例；
- committed lockfile 与 fresh resolve 是否产生不同运行时世代。

它明确执行：

```bash
rm -f pnpm-lock.yaml
pnpm install --no-frozen-lockfile
```

因此 fresh-resolution 的产物只能作为**实验依赖树证据**，不能静默覆盖 `main` 的 control lockfile。
