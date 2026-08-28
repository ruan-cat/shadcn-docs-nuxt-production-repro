# 实验矩阵

## 1. 基础矩阵

| 编号 | 场景 | 单变量 | Docs build | Content API | Docs artifact | API build | API artifact | Windows | Linux |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M00 | 绝对控制组 | 精确锁定全部核心版本 | 待验证 | 待验证 | 待验证 | - | - | 待验证 | 待验证 |
| M01 | 加入独立 Nitro 3 API | 仅新增 `apps/api` | 待验证 | 待验证 | 待验证 | 待验证 | 待验证 | 待验证 | 待验证 |
| M02 | 删除 docs 显式 H3 | 删除 `h3@1.15.11` | 待实验 | 待实验 | 待实验 | 同 M01 | 同 M01 | 待实验 | 待实验 |
| M03 | Content caret | `2.13.9 -> ^2.13.9` | 待实验 | 待实验 | 待实验 | 同 M01 | 同 M01 | 待实验 | 待实验 |
| M04 | theme caret | `1.1.9 -> ^1.1.9` | 待实验 | 待实验 | 待实验 | 同 M01 | 同 M01 | 待实验 | 待实验 |
| M05 | 移除 OG Image override | 允许传递版本漂移 | 待实验 | 待实验 | 待实验 | 同 M01 | 同 M01 | 待实验 | 待实验 |
| M06 | shared-core | 加一个双端共享 workspace edge | 待验证 | 待验证 | 待验证 | 待验证 | 待验证 | 待验证 | 待验证 |
| M07 | workspace UI | docs 引入 Element Plus UI package | 待验证 | 待验证 | 待验证 | 同 M06 | 同 M06 | 待验证 | 待验证 |

## 2. Externalization / artifact 矩阵

| 编号 | 变量 | 目的 |
| --- | --- | --- |
| E01 | package exports -> dist | production 推荐基线 |
| E02 | alias -> workspace source | 测量 server graph 放大 |
| E03 | narrow `ssr.noExternal` | 只修第一个精确 externalization 错误 |
| E04 | blanket `ssr.noExternal` | 复现过度打包副作用 |
| E05 | narrow `nitro.externals.inline` | 精确 bundle closure |
| E06 | blanket `inline` | 复现 Nitro working set 放大 |
| E07 | Popper app-local direct alias dependency | 验证 standalone runtime closure |
| E08 | Nitro `traceAlias` | 验证当前版本实际效果 |
| E09 | `nodeLinker: hoisted` | 验证 flat layout 影响与副作用 |
| E10 | targeted public hoist | 与 direct dependency 比较 |

## 3. Windows / 资源矩阵

| 编号 | OS | trace | heap | 目标 |
| --- | --- | --- | --- | --- |
| W01 | Windows | 默认 | 默认 | 建立原始失败/成功事实 |
| W02 | Windows | 默认 | 4608 | 资源阈值探针 |
| W03 | Windows | 默认 | 5120 | 资源阈值探针 |
| W04 | Windows | 默认 | 6144 | 资源阈值探针 |
| W05 | Windows | false | 默认 | 只归因 NFT trace |
| W06 | Linux | 默认 | 默认 | Linux control |
| W07 | Linux | false | 默认 | 验证生产关闭 trace 的 artifact 风险 |

## 4. Content prerender 矩阵

| 编号 | `crawlLinks` | routes clear | Content cache/search | 目的 |
| --- | --- | --- | --- | --- |
| C01 | true | false | 必须 200 | 正常基线 |
| C02 | false | false | 记录 | 单变量 |
| C03 | true | true | 记录 | 复现清空 document-driven 数据 |
| C04 | false | true | 记录 | 历史最激进 workaround，仅用于证明副作用 |

## 5. 构建顺序矩阵

每一种至少在 committed lockfile 与 fresh lockfile 两种状态下执行：

1. docs only；
2. api only；
3. docs -> api；
4. api -> docs；
5. docs + api 串行 root script；
6. docs + api 并行（只在串行全绿后）；
7. clean generated artifacts 后 docs；
8. clean generated artifacts 后 api -> docs。

## 6. 部署矩阵

一个 GitHub repo，两个部署目标：

| 项目 | Root | Build | Output |
| --- | --- | --- | --- |
| Docs | repository root | filtered docs build | docs/Nuxt 对应产物 |
| API | repository root | filtered Nitro build | `.vercel/output` |

单变量部署实验：

- D01：无根 `vercel.json`，分别使用项目级云配置；
- D02：加入 docs 风格根 `vercel.json`，观察 API 项目；
- D03：加入 API 风格根 `vercel.json`，观察 docs 项目；
- D04：子包产物直接部署；
- D05：产物搬运到 root；
- D06：搬运时 preserve symlink；
- D07：搬运时 dereference。

## 7. 每个矩阵单元必须收集

```text
OS
Node
pnpm
lockfile hash
Nuxt version
Nitro versions (all instances)
H3 versions (all instances)
@nuxt/kit versions (all instances)
shadcn-docs-nuxt version
@ztl-uwu/nuxt-content version
nuxt-og-image version
Vite version
build elapsed time
build exit code
server module count（可获取时）
max RSS / V8 heap（可获取时）
Content cache HTTP status
Content search HTTP status
artifact startup status
artifact GET / status
API health status
```
