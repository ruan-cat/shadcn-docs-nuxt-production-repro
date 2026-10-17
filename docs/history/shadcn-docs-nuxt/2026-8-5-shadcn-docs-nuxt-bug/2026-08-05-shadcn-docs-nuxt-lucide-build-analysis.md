# 2026-08-05 shadcn-docs-nuxt 与 Lucide 构建性能关系调研报告

## 1. 结论摘要

本次调研确认了四件事：

1. `shadcn-docs-nuxt@1.1.9` 确实包含 Lucide 图标能力，但它使用的是 `@iconify-json/lucide` + `@nuxt/icon`，不是 `lucide-vue-next`、`lucide-react` 或 `lucide` JS 组件包。
2. `shadcn-docs-nuxt` 源码通过 `<Icon name="lucide:...">` 和字符串图标名使用 Lucide，没有发现从 Lucide barrel 入口导入组件的证据。
3. Iconify 的 Lucide 集合确实会进入 Nuxt 生成产物，可能增加 Nitro/Vite 的构建和内存开销；但当前实际产物规模约 0.5 MiB，客户端扫描产物只有约 1.8 KiB 和 8.1 KiB，不能单独解释历史事故中的约 7 GiB 内存峰值。
4. 已有事故材料把主要问题指向 Nuxt Content/H3 运行时世代失配、Nitro prerender 高峰、Windows NFT trace、SSR externalization、pnpm workspace 符号链接和预渲染逻辑。现有证据不足以把这些事故归因于 Lucide。

因此，准确判断是：

> `shadcn-docs-nuxt` 使用了 Lucide 图标数据，Iconify 集合是一个值得做 A/B 性能验证的次要因素；但“Lucide barrel 导入导致构建慢或 OOM”这一判断不成立，也没有证据支持 Lucide 是当前主要根因。

## 2. 调研范围与证据来源

本次检查覆盖以下对象：

- `D:\code\ruan-cat\SmallAliceWeb\packages\ai-vue-doc\package.json`
- `D:\code\ruan-cat\SmallAliceWeb\packages\ai-vue-doc\nuxt.config.ts`
- `D:\code\ruan-cat\eams-component-lib\packages\vue-element-cui-nuxt\package.json`
- `D:\code\ruan-cat\eams-component-lib\packages\vue-element-cui-nuxt\nuxt.config.ts`
- 两个项目已生成的 `.nuxt` Iconify bundle 产物
- `shadcn-docs-nuxt@1.1.9` 的本地安装包 manifest、配置和组件源码
- `D:\code\ruan-cat\SmallAliceWeb\reports\2026-08-01-nuxt-content-monorepo-build-fragility-incident.md`
- `D:\code\ruan-cat\SmallAliceWeb\.agents\skills\fix-bug\record-bug-fix-memory\2026-08-01-nuxt-content-monorepo-compatibility.md`
- `D:\code\ruan-cat\eams-component-lib\.claude\skills\fix-bug\record-bug-fix-memory\SKILL.md`
- [lucide issue #2806](https://github.com/lucide-icons/lucide/issues/2806)

## 3. shadcn-docs-nuxt 是否包含 Lucide

### 3.1 上游 manifest 的直接依赖

本地安装的 `shadcn-docs-nuxt@1.1.9` manifest 在 `dependencies` 中声明了：

```json
"@iconify-json/lucide": "^1.2.88",
"@nuxt/icon": "^1.15.0"
```

这说明“shadcn-docs-nuxt 包含 Lucide 图标能力”的判断成立。需要注意，`@iconify-json/lucide` 是 Iconify 的图标集合数据包，不是 `lucide-vue-next` 组件包。

该发布包的源码还依赖 `@iconify/utils`，通过 Nuxt Icon 的 `<Icon>` 组件解析 `lucide:icon-name` 字符串。`SmartIcon.vue` 的核心逻辑是：

```vue
<template>
	<Icon v-if="checkIcon(name)" :name :size />
</template>
```

它没有导入任何 Lucide Vue 组件。

### 3.2 上游配置中的图标行为

`shadcn-docs-nuxt@1.1.9` 的 `nuxt.config.ts` 配置了：

```ts
icon: {
	clientBundle: {
		scan: true,
		sizeLimitKb: 512,
	},
},
```

这会扫描组件中的静态图标名，并将实际使用到的图标放入客户端 bundle。它不是扫描 Lucide JS barrel，也不是把所有 Lucide Vue 组件自动注册进应用。

`@nuxt/icon` 的本地 README 还明确说明：安装本地 `@iconify-json/*` 集合后，Nitro 默认会把图标集合作为动态 chunk 放入 server bundle；图标数量较大时，可能使构建变慢并增加内存占用。该文档建议通过 `serverBundle.collections` 限制集合，或通过 `externalizeIconsJson` 避免将 JSON 内联进产物。

## 4. SmallAliceWeb 实际情况

### 4.1 package.json 与 Nuxt 配置

`ai-vue-doc` 直接声明了：

```json
"@nuxt/icon": "1.15.0",
"@ztl-uwu/nuxt-content": "2.13.9",
"h3": "1.15.11",
"nuxt": "^3.21.2",
"shadcn-docs-nuxt": "1.1.9",
"@iconify-json/lucide": "^1.2.98"
```

其 [nuxt.config.ts](/D:/code/ruan-cat/SmallAliceWeb/packages/ai-vue-doc/nuxt.config.ts:58) 配置了：

```ts
icon: {
	serverBundle: {
		collections: ["lucide"],
	},
	clientBundle: {
		scan: true,
		sizeLimitKb: 512,
	},
},
```

因此，SmallAliceWeb 已经把服务端 Iconify 集合范围限制为 Lucide，不存在“默认把所有本地 Iconify 集合一起打包”的现象。

### 4.2 当前依赖解析

`pnpm why` 显示当前稳定解析结果为：

```log
@ztl-uwu/nuxt-content 2.13.9
h3 1.15.11
nuxt 3.21.2
shadcn-docs-nuxt 1.1.9
@iconify-json/lucide 1.2.118
```

Content、Nuxt、Nitro 和 H3 当前落在同一条 Nuxt 3/H3 v1 依赖线上。

### 4.3 `.nuxt` 产物证据

生成的 [nuxt-icon-server-bundle.mjs](/D:/code/ruan-cat/SmallAliceWeb/packages/ai-vue-doc/.nuxt/nuxt-icon-server-bundle.mjs:11) 内容为：

```js
'lucide': () => import('@iconify-json/lucide/icons.json', { with: { type: 'json' } })
```

这证明服务端确实会加载 Lucide Iconify JSON，但它是 JSON 集合动态导入，不是 Lucide JS barrel。

当前产物观测值：

- `@iconify-json/lucide/icons.json`：约 `568,280` bytes，包含约 `1,808` 个图标。
- `.nuxt/prerender/chunks/_/icons.mjs`：约 `557,149` bytes。
- `.nuxt/nuxt-icon-client-bundle.mjs`：`1,859` bytes，扫描出 `5` 个图标。

客户端产物只包含扫描到的实际图标；服务端产物包含整个 Lucide 集合的动态加载入口。这个开销值得优化验证，但与历史事故中的约 `7 GiB` Nitro prerender 峰值不在同一数量级。

### 4.4 与 SmallAliceWeb 历史事故的关系

历史事故报告明确记录了两类问题：

1. `@ztl-uwu/nuxt-content` 漂移到 `2.14.1` 后，运行时 H3 import 解析到 `h3@2.0.1-rc.22`，而 Nuxt 3/Nitro 仍需要 H3 v1，导致 `ERR_INVALID_URL`、`sendError` 导出错误和 Content API `500`。
2. Nuxt SSR、Content 索引和 Nitro prerender 叠加后，在默认约 `4 GiB` 堆下发生真实 OOM；提高到 `8 GiB` 后，约 `7 GiB` 峰值进程可以自然完成。

报告没有把这两类问题归因到 Lucide。固定 Content/H3 版本并串行构建后，历史验证结果为单包构建成功、两次全量构建均为 `9 successful, 9 total`。

## 5. eams-component-lib 实际情况

### 5.1 package.json 与 Nuxt 配置

`vue-element-cui-nuxt` 当前声明了：

```json
"nuxt": "^3.21.2",
"shadcn-docs-nuxt": "^1.1.9",
"@iconify-json/lucide": "^1.2.98"
```

与 SmallAliceWeb 不同，eams 当前 package.json 没有直接声明 `@ztl-uwu/nuxt-content` 或 `h3`，Content 和 H3 主要通过主题及 Nuxt 传递依赖获得。这保留了依赖实例漂移风险，但本身不能证明已经发生事故。

其 [nuxt.config.ts](/D:/code/ruan-cat/eams-component-lib/packages/vue-element-cui-nuxt/nuxt.config.ts:126) 同样限制了服务端集合：

```ts
icon: {
	serverBundle: {
		collections: ["lucide"],
	},
	clientBundle: {
		scan: true,
		sizeLimitKb: 512,
	},
},
```

### 5.2 当前依赖解析与产物

`pnpm why` 当前显示：

```log
shadcn-docs-nuxt 1.1.9
@ztl-uwu/nuxt-content 2.13.9
h3 1.15.9
@iconify-json/lucide 1.2.98
```

当前解析结果只发现一份 H3 和一份 Content，但 eams 的主题依赖仍使用 caret 范围，后续重新安装时必须继续检查实际解析树。

生成的服务端 bundle 同样动态导入：

```log
@iconify-json/lucide/icons.json
```

当前产物观测值：

- `.nuxt/prerender/chunks/_/icons.mjs`：约 `534,526` bytes。
- `.nuxt/nuxt-icon-client-bundle.mjs`：`8,118` bytes，扫描出 `20` 个图标。
- `@iconify-json/lucide` 本地集合文件约 `0.55 MiB`。

eams 的页面和 Markdown 内容使用了较多静态 `lucide:*` 图标，因此客户端扫描产物比 SmallAliceWeb 大，但仍然是 KiB 级别。

### 5.3 与 eams 历史事故的关系

eams 的事故记忆将主要问题归纳为：

- Windows 下 `@vercel/nft` trace 在 pnpm workspace 中高 CPU、长时间卡在 Nitro 收尾。
- Vite SSR externalization 使 workspace 包和 Element Plus 的传递依赖无法被 Vercel NFT 正确追踪。
- pnpm 符号链接和多版本 `@vueuse/core` 增加了运行时依赖缺失风险。
- 为缩短构建而清空 prerender 路由，导致 document-driven Nuxt Content 的运行时内容数据为空。

这些问题与 Iconify 图标集合打包是不同的链路。不能因为事故现场同时出现图标或 `shadcn-docs-nuxt`，就把 NFT、SSR 和 prerender 问题改写成 Lucide 问题。

## 6. lucide issue #2806 是否适用于本项目

用户提供的 [lucide issue #2806](https://github.com/lucide-icons/lucide/issues/2806) 标题是：

```text
Importing any component from lucide-svelte makes dev app reload 10 times slower
```

issue 的复现代码是从 `lucide-svelte` barrel 入口导入组件，例如：

```ts
import { Bold } from "lucide-svelte";
```

评论中有人指出 Vite 对 barrel 文件的处理可能导致整个入口被评估，并建议改为单图标路径导入。

但本次两个项目的源码扫描结果没有发现：

```log
lucide-vue-next
lucide-react
@lucide/*
from "lucide"
import * as Lucide
```

当前实际链路是：

```log
<Icon name="lucide:search" />
    -> @nuxt/icon
    -> @iconify-json/lucide/icons.json
```

所以 issue #2806 可以证明“某些 Lucide 组件包的 barrel import 可能使 Vite dev 变慢”，但不能证明本项目的 `@nuxt/icon` + Iconify JSON 链路也存在相同问题。

## 7. 判断矩阵

| 判断                                | 证据                                                      | 结论               |
| :---------------------------------- | :-------------------------------------------------------- | :----------------- |
| `shadcn-docs-nuxt` 包含 Lucide      | manifest 直接依赖 `@iconify-json/lucide`                  | 成立               |
| 项目使用 Lucide 图标                | `.vue`、Markdown 和 app config 使用 `lucide:*`            | 成立               |
| 项目使用 `lucide-vue-next` barrel   | 源码和依赖扫描没有命中                                    | 不成立             |
| Lucide Iconify JSON 会进入构建产物  | `.nuxt/nuxt-icon-server-bundle.mjs` 动态导入 `icons.json` | 成立               |
| Iconify 可能增加构建开销            | `@nuxt/icon` 官方文档明确警告                             | 成立，属于次要风险 |
| Iconify 解释约 7 GiB OOM            | 现有产物仅约 0.5 MiB，事故证据指向其他链路                | 当前不成立         |
| issue #2806 可直接解释本项目 dev 慢 | issue 对象是 Lucide 组件 barrel，本项目无该导入           | 不成立             |

## 8. 建议的验证顺序

本次只做调研，没有改动两个目标项目。若要继续验证性能，建议使用同一机器、同一 Node/pnpm、同一缓存状态，分别记录构建耗时、峰值工作集、V8 堆、产物大小和退出码：

1. 保持现有配置，记录 `nuxt prepare`、`nuxt dev` 首次启动和 `nuxt build` 的基线。
2. 只将 `icon.serverBundle.externalizeIconsJson` 设为 `true`，重新比较 Nitro 构建时间和峰值内存。
3. 对客户端再做 `clientBundle.scan: false` + 显式 `clientBundle.icons` 的对照实验，并验证所有页面的图标是否仍然正常。
4. 若性能变化很小，应停止继续追 Lucide，把分析重点转回 Content/H3 解析树、Nitro prerender 路由、NFT trace、SSR externalization 和并发构建。
5. 对 eams 继续保留 caret 依赖审计，升级主题、Content、Nuxt 或 H3 时必须重新运行 `pnpm why` 和 fresh build，不要只看 package.json。

不建议直接删除 `@iconify-json/lucide`、关闭 `@nuxt/icon`、把所有图标改成 `lucide-vue-next`，也不建议通过关闭 Content prerender 或清空路由来掩盖构建问题。这些做法会改变功能或绕开真正的依赖问题。

## 9. 证据边界

- 本次没有重新执行两个项目的完整生产构建，因此没有声称当前状态已经复现或排除全部 OOM。
- `.nuxt` 产物证明了 Iconify Lucide 参与构建，但不能仅凭产物大小推导完整构建耗时因果关系。
- SmallAliceWeb 的 H3/Content 和 eams 的 NFT/SSR/prerender 结论来自既有事故记录；它们是已记录的历史根因，不等价于本次对两个项目执行了新的全量性能剖析。
- 当前最稳妥的结论是“Lucide 是次要候选因素，非已证实主因”，而不是“Lucide 完全没有任何性能影响”。

## 10. 参考链接与文件

- [shadcn-docs-nuxt package.json（本地安装包）](/D:/code/ruan-cat/SmallAliceWeb/packages/ai-vue-doc/node_modules/shadcn-docs-nuxt/package.json:48)
- [shadcn-docs-nuxt nuxt.config.ts（本地安装包）](/D:/code/ruan-cat/SmallAliceWeb/packages/ai-vue-doc/node_modules/shadcn-docs-nuxt/nuxt.config.ts:74)
- [@nuxt/icon README（本地安装包）](/D:/code/ruan-cat/SmallAliceWeb/packages/ai-vue-doc/node_modules/@nuxt/icon/README.md:401)
- [SmallAliceWeb package.json](/D:/code/ruan-cat/SmallAliceWeb/packages/ai-vue-doc/package.json:19)
- [eams-component-lib package.json](/D:/code/ruan-cat/eams-component-lib/packages/vue-element-cui-nuxt/package.json:27)
- [SmallAliceWeb 构建脆弱性事故报告](/D:/code/ruan-cat/SmallAliceWeb/reports/2026-08-01-nuxt-content-monorepo-build-fragility-incident.md:39)
- [SmallAliceWeb Nuxt Content 兼容性记忆](/D:/code/ruan-cat/SmallAliceWeb/.agents/skills/fix-bug/record-bug-fix-memory/2026-08-01-nuxt-content-monorepo-compatibility.md:12)
- [lucide issue #2806](https://github.com/lucide-icons/lucide/issues/2806)

## 11. 依赖范围精细对比

### 11.1 工具链版本与依赖规模

下表先固定实际环境，再比较两个目标包的声明范围。版本号带“实际”表示锁定或 `pnpm why` 观察到的解析结果；带“声明”表示 package manifest 中的范围或直接版本。

|       对比项        | SmallAliceWeb `ai-vue-doc` | eams `vue-element-cui-nuxt` |     证据类型     |
| :-----------------: | :------------------------: | :-------------------------: | :--------------: |
|      实际 Node      |         `v22.23.1`         |         `v22.23.1`          |     当前实测     |
|      实际 pnpm      |         `v10.34.5`         |         `v10.34.5`          |     当前实测     |
| 根 `packageManager` |       `pnpm@10.29.2`       |       `pnpm@10.32.1`        |     配置读取     |
|    根 Node 要求     |        `>=22.14.0`         |         `>=20.19.0          |                  | >=22.12.0 |     | >=24.0.0` | 配置读取 |
|      生产依赖       |           11 个            |            10 个            | package manifest |
|      开发依赖       |            1 个            |            9 个             | package manifest |
|     工具链漂移      |    实际 pnpm 高于根声明    |    实际 pnpm 高于根声明     |     配置对比     |

因此，两个 monorepo 都存在“实际 pnpm 与根 `packageManager` 不一致”的工具链漂移。Node 运行时满足两边的根约束，但 pnpm 版本差异仍可能改变 workspace 链接、hoist 和依赖解析行为，不能把当前解析结果直接视为所有安装环境的稳定结果。

### 11.2 SmallAliceWeb 直接依赖范围

|    类别     |                                 直接声明与实际版本                                 | 证据类型 |
| :---------: | :--------------------------------------------------------------------------------: | :------: |
| 生产依赖 1  |                               `@nuxt/icon` `1.15.0`                                | 当前实测 |
| 生产依赖 2  |                      `@ruan-cat-drill-doc/ai-vue` `workspace`                      | 当前实测 |
| 生产依赖 3  |                              `@vueuse/nuxt` `14.3.0`                               | 当前实测 |
| 生产依赖 4  |                          `@ztl-uwu/nuxt-content` `2.13.9`                          | 当前实测 |
| 生产依赖 5  |                      `element-plus` `^2.13.5`，实际 `2.14.3`                       | 当前实测 |
| 生产依赖 6  |                                   `h3` `1.15.11`                                   | 当前实测 |
| 生产依赖 7  |                          `nuxt` `^3.21.2`，实际 `3.21.2`                           | 当前实测 |
| 生产依赖 8  |                             `shadcn-docs-nuxt` `1.1.9`                             | 当前实测 |
| 生产依赖 9  |                        `tailwindcss` `^4.2.1`，实际 `4.3.3`                        | 当前实测 |
| 生产依赖 10 |                               `tailwindcss-animate`                                | 当前实测 |
| 生产依赖 11 |                           `vue` `^3.5.30`，实际 `3.5.31`                           | 当前实测 |
| 开发依赖 1  |                  `@iconify-json/lucide` `^1.2.98`，实际 `1.2.118`                  | 当前实测 |
|    脚本     | `predev`、`prebuild`、`postinstall` 执行 `nuxt prepare`；`build` 执行 `nuxt build` | 当前实测 |

SmallAlice 将 `@nuxt/icon`、Content、H3 和 Nuxt 直接固定在应用包中，依赖链边界相对明确；但 Element Plus、Tailwind CSS 和 Vue 仍有 caret 范围，重新安装时仍需以锁文件和 `pnpm why` 为准。

### 11.3 eams 直接依赖范围与传递依赖

|        类别         |                              直接声明与实际版本                              | 证据类型 |
| :-----------------: | :--------------------------------------------------------------------------: | :------: |
|     生产依赖 1      |                 `@eams-monorepo/vue-element-cui` `workspace`                 | 当前实测 |
|     生产依赖 2      |                        `element-plus`，实际 `2.13.6`                         | 当前实测 |
|     生产依赖 3      |                              `entities` `7.0.1`                              | 当前实测 |
|     生产依赖 4      |                               `nuxt` `3.21.2`                                | 当前实测 |
|     生产依赖 5      |                          `shadcn-docs-nuxt` `1.1.9`                          | 当前实测 |
|     生产依赖 6      |                              `std-env` `3.10.0`                              | 当前实测 |
|     生产依赖 7      |                            `tailwindcss` `4.2.2`                             | 当前实测 |
|     生产依赖 8      |                            `tailwindcss-animate`                             | 当前实测 |
|     生产依赖 9      |                                `vue` `3.5.30`                                | 当前实测 |
|     生产依赖 10     |                             `vue-router` `4.6.4`                             | 当前实测 |
|      开发依赖       | 共 9 个；含 `@iconify-json/lucide` `1.2.98`、Vite `8.0.1` 及 Vue/Vitest 工具 | 当前实测 |
|     未直接声明      |                          `@nuxt/icon`、Content、H3                           | 当前实测 |
| `pnpm why` 传递结果 |     `@nuxt/icon` `1.15.0`、Content `2.13.9`、H3 `1.15.9`、Nitro `2.13.1`     | 当前实测 |

eams 通过 `shadcn-docs-nuxt`/Nuxt 传递获得 `@nuxt/icon`、Content 和 H3。SmallAlice 的 H3 为 `1.15.11`、Nitro 为 `2.13.3`，eams 则为 H3 `1.15.9`、Nitro `2.13.1`。这不是 Lucide 差异，而是两条实际运行时依赖解析结果的差异。

### 11.4 workspace 与多 Vite 风险

|              检查项               |   SmallAliceWeb    |                                  eams                                   | 证据类型 |
| :-------------------------------: | :----------------: | :---------------------------------------------------------------------: | :------: |
| 根 workspace overrides `entities` |   未发现对应设置   |                           `entities: ^7.0.1`                            | 配置读取 |
| `.npmrc link-workspace-packages`  |       未发现       |                                 `deep`                                  | 配置读取 |
|     `.npmrc shamefully-hoist`     |       未发现       |                                 `true`                                  | 配置读取 |
|             Vite 实例             | 未发现同等冲突证据 | Nuxt client 日志打印 Vite `7.3.1`，子包 devDependency 显式 Vite `8.0.1` | 当前实测 |

eams 实际存在两份 Vite：Nuxt client 日志打印 `7.3.1`，子包开发依赖显式声明 `8.0.1`。这不是 Lucide 的根因证据，但会增加插件、SSR externalization 和构建诊断的复杂度。`shamefully-hoist=true` 还可能掩盖未直接声明的幽灵依赖，历史上已经出现过 `std-env` 类似风险。

## 12. Nuxt 与构建配置差异

### 12.1 共同的图标与主题配置

|           配置项           |    SmallAliceWeb     |         eams         | 证据类型 |
| :------------------------: | :------------------: | :------------------: | :------: |
|         `extends`          |  `shadcn-docs-nuxt`  |  `shadcn-docs-nuxt`  | 当前配置 |
| `serverBundle.collections` |   只保留 `lucide`    |   只保留 `lucide`    | 当前配置 |
|    `clientBundle.scan`     |        `true`        |        `true`        | 当前配置 |
| `clientBundle.sizeLimitKb` |        `512`         |        `512`         | 当前配置 |
|     Iconify 服务端集合     | Lucide JSON 动态加载 | Lucide JSON 动态加载 | 当前产物 |

共同配置说明两边都没有把全部 Iconify 集合无条件加入 server bundle，也没有使用 Lucide JS barrel。SmallAlice 扫描出 5 个客户端图标，eams 扫描出 20 个；两者的数量都不足以解释 GiB 级别内存峰值。

### 12.2 SmallAlice 配置链

|       配置区域        |                              实际配置                               |              影响判断              | 证据类型 |
| :-------------------: | :-----------------------------------------------------------------: | :--------------------------------: | :------: |
| Vite SSR/Nitro inline |          主要覆盖 ai-vue、Element Plus、VueUse 及传递依赖           |  SSR 需要处理较大的非外部化依赖链  | 配置推断 |
|     Windows trace     |                            `trace=false`                            |    避免 Windows NFT trace 长尾     | 当前配置 |
|   Tailwind content    | 扫描本地 `content`、`components` 与 `shadcn-docs-nuxt` node_modules | 扫描面扩大，增加 Tailwind 分析成本 | 配置推断 |
|      Content/H3       |               直接声明 Content `2.13.9`、H3 `1.15.11`               |        运行时版本边界更明确        | 当前实测 |

SmallAlice 的 `tailwind.config` 将本地内容、组件和主题 node_modules 纳入扫描。它不是 Lucide 的直接证据，但会扩大初始化和变更扫描面；构建 OOM 仍需结合 Content index 与 Nitro prerender 峰值判断。

### 12.3 eams 配置链

|     配置区域      |                                 实际配置                                 |                 影响判断                  | 证据类型 |
| :---------------: | :----------------------------------------------------------------------: | :---------------------------------------: | :------: |
|     应用清单      |                     `experimental.appManifest=false`                     |      关闭该实验特性，减少一条生成链       | 当前配置 |
|     transpile     |                                 `ohash`                                  |              强制进入转译链               | 当前配置 |
|   optimizeDeps    |      include `debug`、`dayjs`、`@braintree/sanitize-url`、`mermaid`      |            扩大依赖预优化范围             | 配置推断 |
|       alias       |                       `dayjs`、`mermaid`、`debug`                        |          改变解析路径和打包输入           | 当前配置 |
|   workspace SSR   | workspace `vue-element-cui` 与完整 Element Plus 依赖 `noExternal`/inline |      必须打包更大的 workspace SSR 链      | 配置推断 |
| Content highlight |                              预加载四种语言                              |       增加 Content 初始化和高亮资源       | 配置推断 |
|     OG Image      |                             `ogImage=false`                              |             关闭 OG Image 链              | 当前配置 |
|  Nitro prerender  |                            `crawlLinks=true`                             |           扩大爬取和预渲染路径            | 配置推断 |
|   Windows trace   |                              `trace=false`                               | 回避 NFT trace 长尾，但不是跨平台通用解法 | 当前配置 |

eams 的 workspace alias 直指组件库源码，且 `noExternal`/inline 涵盖 workspace 组件库和完整 Element Plus 依赖。因此 eams 构建必须处理更大的 workspace SSR 链；这比 20 个 Lucide 图标更接近构建复杂度的主要解释。

### 12.4 跨平台配置边界

eams 根 `CLAUDE` 明确禁止无条件使用 `nitro.externals.trace=false` 和 `inline=[/.*/]`，并要求在生产实际部署中验证。当前配置是 Windows 条件化的 `trace=false`，并不等于已解决跨平台风险：它只能说明当前 Windows 复现路径规避了 trace，不能证明 Linux/Vercel 或生产部署行为等价。

## 13. 构建速度与结果实测

### 13.1 SmallAlice 标准构建

|      项目      |                                        结果                                         |   状态   | 证据类型 |
| :------------: | :---------------------------------------------------------------------------------: | :------: | :------: |
|      命令      |                `pnpm --filter @ruan-cat-drill-doc/ai-vue-doc build`                 |  已执行  | 当前实测 |
|    开始时间    |                                   `05:50:13.103`                                    |  已记录  | 当前实测 |
|    结束时间    |                                   `05:52:38.583`                                    |  已记录  | 当前实测 |
|    墙钟耗时    |                                     `145.479s`                                      |  已记录  | 当前实测 |
|  client 阶段   |                                      `60.905s`                                      |  已完成  | 当前实测 |
|  server 阶段   |                                      `45.630s`                                      |  已完成  | 当前实测 |
|    失败阶段    |                         `[nitro] Initializing prerenderer`                          |   失败   | 当前实测 |
|    进程结果    |                                     `exit 134`                                      |   失败   | 当前实测 |
|     stderr     | `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory` |   失败   | 当前实测 |
| 主 Node 工作集 |                                    约 `4.05 GiB`                                    | 峰值观测 | 当前实测 |

该命令是正式基线：它不是“构建慢但成功”，而是 client/server 阶段完成后，在 Nitro 初始化 prerenderer 时因 JavaScript heap OOM 失败。

### 13.2 SmallAlice 提高堆上限后的构建

|      项目      |                                            结果                                             |   状态   | 证据类型 |
| :------------: | :-----------------------------------------------------------------------------------------: | :------: | :------: |
|      命令      | `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @ruan-cat-drill-doc/ai-vue-doc build` |  已执行  | 当前实测 |
|    启动时间    |                                         `05:53:29`                                          |  已记录  | 当前实测 |
|    观测位置    |                             content snapshot / Nitro prerender                              | 仍在运行 | 当前实测 |
| 主 Node 工作集 |                                        约 `5.76 GiB`                                        | 峰值观测 | 当前实测 |
|    结束方式    |                                          人工停止                                           | 人工中止 | 当前实测 |
| 自然 exit code |                                             无                                              |  不适用  | 当前实测 |

这次运行不能称为成功，也不能称为 OOM：进程在自然结束前被人工中止，既没有成功产物完成证据，也没有自然退出的 OOM 错误。另有一次带错误额外参数的 verbose run 约 `26.2s` 返回成功，但输出出现 `--logLevel` 目录且未完成 document prerender，不能作为正式基线。

### 13.3 eams 标准构建

|       项目       |                                                                   结果                                                                   |  状态  | 证据类型 |
| :--------------: | :--------------------------------------------------------------------------------------------------------------------------------------: | :----: | :------: |
|       命令       |                                                             `pnpm run build`                                                             | 已执行 | 当前实测 |
|     构建结果     |                                                          输出 `Build complete!`                                                          |  成功  | 当前实测 |
|     墙钟耗时     |                                                               约 `100.4s`                                                                |  成功  | 当前实测 |
|      运行时      |                                               Nuxt `3.21.2`、Nitro `2.13.1`、Vercel preset                                               | 已记录 | 当前实测 |
| client transform |                                                              `3751 modules`                                                              | 已记录 | 当前实测 |
|     Iconify      |                                                           `20 icons / 6.68KB`                                                            | 已记录 | 当前实测 |
|  Vercel output   |                                                        总 `8.88MB`，gzip `1.46MB`                                                        | 已记录 | 当前实测 |
|  server bundle   |                                                           `server.mjs 2.54MB`                                                            | 已记录 | 当前实测 |
|       警告       | chunk 大于 `500kB`、Tailwind sourcemap 可能不正确、Nitro cache-driver external unresolved、Nuxt Image 缺少 `sharp` 的 `win32-x64` 二进制 | 非失败 | 当前实测 |

eams 这次是自然完成的成功构建。上述警告需要单独治理，但不能改写为构建失败。

### 13.4 两次构建的可比边界

|      比较项       |                                    结论                                     |     证据类型      |
| :---------------: | :-------------------------------------------------------------------------: | :---------------: |
|      总秒数       |                             不能直接作公平排名                              |     配置推断      |
| Nuxt/Nitro preset |                         eams 明确使用 Vercel preset                         |     当前实测      |
|     内容规模      |                      两边页面与 Markdown 内容规模不同                       |     配置推断      |
|     SSR 打包      |           eams 包含 workspace 组件库和更大的 Element Plus SSR 链            |     配置推断      |
|   prerender/NFT   |                   两边路由爬取、Nitro 收尾和 NFT 路径不同                   |     配置推断      |
|  更可靠比较单位   | client transform、server、Content snapshot、prerender、产物大小和峰值工作集 | 当前实测/配置推断 |

因此，eams 约 `100.4s` 成功与 SmallAlice 约 `145.479s` OOM 不能仅用总秒数比较。应比较分阶段耗时、模块数、prerender 路径、产物大小和内存峰值。

## 14. 慢速与失败根因分层

### 14.1 证据层级

|    层级    |                                                 结论                                                  |           证据类型            |    当前强度    |
| :--------: | :---------------------------------------------------------------------------------------------------: | :---------------------------: | :------------: |
|  直接观测  |                          SmallAlice 在 Nitro prerenderer 初始化阶段自然 OOM                           | 构建 stderr、exit 134、工作集 |       高       |
|  直接观测  |                                    eams 自然输出 `Build complete!`                                    |           构建日志            |       高       |
|  直接观测  |                             SmallAlice 客户端 5 图标，eams 客户端 20 图标                             |        `.nuxt` bundle         |       高       |
|  配置推断  |                   SmallAlice 的 Content index 与 Nitro prerender 是主要内存峰值候选                   |    阶段位置、历史同类结果     |      中高      |
|  配置推断  | eams 的 3751 modules、workspace Element Plus SSR、Content prerender/Vercel 输出和多 Vite 链增加复杂度 | Nuxt 配置、构建日志、依赖解析 |      中高      |
|  历史记录  |                        SmallAlice 的 Content/H3 世代失配曾造成运行时故障和 OOM                        |     事故报告与兼容性记忆      | 高，对历史事件 |
|  历史记录  |             eams 曾有 NFT trace 长尾、SSR externalization 缺依赖和 prerender 路由连锁故障             |         eams 事故记录         | 高，对历史事件 |
| 反事实缺口 |                             尚没有只禁用 Iconify JSON 的同机 A/B 构建数据                             |         当前证据边界          |    明确缺口    |

### 14.2 SmallAlice 根因分层

1. **首要解释，配置推断并有当前实测阶段支撑**：Content index/snapshot 与 Nitro prerender 在 server 阶段之后形成内存峰值，标准 4 GiB 堆在 `Initializing prerenderer` 处自然 OOM。
2. **次要放大因素，配置推断**：Vite SSR/Nitro inline 覆盖 ai-vue、Element Plus、VueUse 及传递依赖；Tailwind 扫描面也包含本地目录和主题 node_modules。
3. **历史兼容性风险，历史记录**：Content `2.14.1`/H3 `2.0.1-rc` 与 Nuxt 3/H3 v1 失配曾引发运行时错误；当前固定 Content `2.13.9`、H3 `1.15.11` 是已验证基线。
4. **未证实主因，当前实测**：Lucide 服务端 JSON 约 `0.5 MiB`、客户端只扫描 5 个图标，量级不足以解释约 `4 GiB` 堆上限触发。

### 14.3 eams 根因分层

1. **首要复杂度来源，配置推断并由当前实测支持**：`3751 modules`、workspace 组件库源码 alias、完整 Element Plus SSR `noExternal`/inline、Content highlight 预加载和 Vercel 输出共同扩大构建链。
2. **多工具链放大因素，当前实测/配置推断**：Nuxt client 使用 Vite `7.3.1`，子包显式 devDependency 为 Vite `8.0.1`；根 workspace 的 deep linking、全局 hoist 和 overrides 增加解析复杂度。
3. **历史失败模式，历史记录**：Windows NFT trace 长尾和残留进程、SSR externalization 加 workspace symlink 导致 `@vueuse/core` 缺失、清空 prerender routes 导致 Content 数据链故障。
4. **当前构建状态，当前实测**：标准构建成功；现有 chunk、sourcemap、cache-driver 和 sharp 警告是治理项，不是本次失败。
5. **未证实主因，当前实测**：eams 的 20 个客户端图标产物为 `6.68KB`，不能解释完整构建链的主要耗时。

## 15. 构建低速/失败隐患清单

### 15.1 已证实或已有历史证据的风险

|                        风险                         |                    影响                     |     证据类型      |             处理边界             |
| :-------------------------------------------------: | :-----------------------------------------: | :---------------: | :------------------------------: |
| SmallAlice Content index + Nitro prerender 内存峰值 |           4 GiB 标准构建自然 OOM            | 当前实测/配置推断 |    优先采集阶段峰值和路由规模    |
|       SmallAlice Content/H3 caret 或传递漂移        |   可能重现 H3 v2 RC 与 Nuxt 3/H3 v1 失配    |     历史记录      |    继续锁定并运行 `pnpm why`     |
|              eams workspace SSR 链过大              | 增加 transform、SSR、NFT 和 Vercel 输出成本 | 配置推断/当前实测 |    先分阶段计时，不要先删功能    |
|               eams Windows NFT trace                |          长尾、残留进程、假性卡住           |     历史记录      |    保留条件化策略并做生产验证    |
|         eams SSR externalization 与 symlink         |      运行时缺失 `@vueuse/core` 等依赖       |     历史记录      |  用产物运行验证，不靠本地 hoist  |
|             eams 清空 prerender routes              |         Content document 数据链断裂         |     历史记录      | 不以关闭/清空 prerender 掩盖问题 |

### 15.2 工具链和配置漂移风险

|                风险                |                  影响                  |     证据类型      |               验证动作               |
| :--------------------------------: | :------------------------------------: | :---------------: | :----------------------------------: |
| 实际 pnpm `10.34.5` 与根声明不一致 |  workspace 链接和 hoist 行为可能漂移   | 当前实测/配置读取 |        在统一 pnpm 版本下复跑        |
|  eams 根 `shamefully-hoist=true`   |      掩盖幽灵依赖，换环境后才失败      | 配置推断/历史记录 | 用 production-like 安装验证直接声明  |
|           eams 两份 Vite           |        插件与 SSR 行为诊断复杂         |     当前实测      | 记录 Nuxt 实际 Vite 与子包 Vite 来源 |
|        主题与传递依赖 caret        | 重新安装可能改变 Content/H3/Nitro 解析 | 当前实测/配置推断 |     固定关键版本并比较 lockfile      |
|  Windows `trace=false` 跨平台差异  |   本地与 Vercel/Nitro 行为可能不一致   | 配置推断/历史记录 |     至少执行一次生产实际部署验证     |
|       Tailwind 扫描范围较大        |        初始化和变更扫描成本上升        |     配置推断      |         统计扫描文件数和耗时         |

### 15.3 不应作为当前方案的动作

- 不建议删除 Lucide 或 `@iconify-json/lucide`：共同产物证据只显示低量级次要成本。
- 不建议关闭 Content 或清空 prerender 路由：历史记录已证明这会破坏 document-driven 内容链。
- 不建议用无条件 `nitro.externals.trace=false` 或 `inline=[/.*/]`：eams 根 `CLAUDE` 已将其列为禁止做法，并要求实际生产部署验证。

## 16. 最终判断与优先级

### 16.1 最终判断

|                判断                 |                                                 结论                                                 |     证据类型      |
| :---------------------------------: | :--------------------------------------------------------------------------------------------------: | :---------------: |
|     Lucide/Iconify 是否共同存在     |                                                  是                                                  |     当前实测      |
|       Lucide 是否是高量级成本       |                 否；SmallAlice 5 个客户端图标，eams 20 个，服务端 JSON 约 `0.5 MiB`                  |     当前实测      |
| Lucide 是否解释 SmallAlice 当前 OOM |                       否；首要候选是 Content index + Nitro prerender 内存峰值                        | 当前实测/配置推断 |
|    Lucide 是否解释 eams 构建长尾    | 否；首要复杂度是 3751 modules、workspace Element Plus SSR、Content prerender/Vercel 输出和多 Vite 链 | 当前实测/配置推断 |
|         SmallAlice 当前基线         |                         Content `2.13.9` + H3 `1.15.11`，属于已验证兼容基线                          |     历史记录      |
|            共同主要风险             |                                 主题 caret、传递依赖和 pnpm 版本漂移                                 | 当前实测/配置推断 |

最终结论是：Lucide/Iconify 共同存在，但属于低量级次要成本，不是当前 OOM 或构建长尾的主要解释。SmallAlice 应首先分析 Content index 与 Nitro prerender 的内存峰值；eams 应首先分析 `3751 modules`、workspace Element Plus SSR、Content prerender/Vercel 输出和多 Vite 链。两边共同优先治理主题 caret/传递依赖与 pnpm 版本漂移。不要删除 Lucide，也不要关闭 Content 或 prerender。

### 16.2 优先级排序

| 优先级 |                                           工作项                                            |                        成功证据                         | 证据类型 |
| :----: | :-----------------------------------------------------------------------------------------: | :-----------------------------------------------------: | :------: |
|   P0   | SmallAlice 记录 Content index、snapshot、prerender 的路由数、阶段耗时、V8 heap 与进程工作集 |         标准命令自然完成或明确定位新的峰值阶段          | 当前实测 |
|   P0   |                      固定并审计两边 Nuxt/Content/H3/Nitro 与 pnpm 版本                      |        `pnpm why`、lockfile 和实际运行时版本一致        | 当前实测 |
|   P1   |           eams 拆分 workspace SSR、Element Plus、Content、Vercel 输出和 NFT 阶段            |             3751 modules 及各阶段耗时可解释             | 当前实测 |
|   P1   |                       验证 eams Vite `7.3.1`/`8.0.1` 的来源和兼容边界                       |            生产-like 构建仅使用预期 Vite 链             | 当前实测 |
|   P2   |                                对 Iconify JSON 做单变量 A/B                                 | 记录 build/dev 首次启动、峰值内存、产物和页面图标完整性 | 当前实测 |
|   P2   |                       检查 chunk、sourcemap、cache-driver、sharp 警告                       |             警告分类为可接受或已有修复证据              | 当前实测 |

## 17. 推荐验证矩阵

### 17.1 统一实验条件

| 控制项 |                          统一要求                           |              目的              | 证据类型 |
| :----: | :---------------------------------------------------------: | :----------------------------: | :------: |
|  Node  |                    两边均使用 `v22.23.1`                    |      排除 Node 运行时差异      | 当前实测 |
|  pnpm  |                先选择并记录同一版本，再复跑                 |   排除 pnpm 解析/hoist 漂移    | 配置推断 |
|  缓存  |              分别记录 cold cache 与 warm cache              | 区分下载、预优化和真正构建成本 | 当前实测 |
|  配置  |                     一次只改变一个变量                      |     避免把多个原因混成结论     | 证据方法 |
|  结果  | 记录阶段耗时、峰值工作集、V8 heap、模块数、产物大小、退出码 |        形成可复核证据链        | 证据方法 |
|  进程  |              记录自然成功、自然失败或人工中止               |   防止把中止误报成成功/失败    | 证据方法 |

### 17.2 分项目验证矩阵

|    项目    |                       基线命令                       |                         单变量实验                          |                          必须观察                          |                     通过标准                      |
| :--------: | :--------------------------------------------------: | :---------------------------------------------------------: | :--------------------------------------------------------: | :-----------------------------------------------: |
| SmallAlice | `pnpm --filter @ruan-cat-drill-doc/ai-vue-doc build` | 仅设置 `externalizeIconsJson=true`；再单独改变 client scan  | Content snapshot、Nitro prerender、heap、工作集、自然 exit | 不丢页面图标，且能说明峰值或确认 Iconify 影响很小 |
| SmallAlice |      同上，固定 Content `2.13.9` + H3 `1.15.11`      |           对比统一 pnpm 版本与当前 pnpm `10.34.5`           |                 `pnpm why`、阶段日志、产物                 |                依赖解析差异可解释                 |
|    eams    |                   `pnpm run build`                   | 仅改变 Iconify JSON externalization；保留 Content/prerender |    3751 modules、SSR、Content、Vercel output、NFT、警告    |  仍输出 `Build complete!`，且功能和部署验证通过   |
|    eams    |                         同上                         |    对比 Nuxt 实际 Vite `7.3.1` 与子包 Vite `8.0.1` 来源     |                   依赖树、插件、SSR 产物                   |           不出现 workspace 运行时缺依赖           |
|    两边    |            同一 Node/pnpm、cold/warm 两组            |                   保持所有非目标配置不变                    |                  墙钟、分阶段、峰值、产物                  |             只对支持证据的变量下结论              |

### 17.3 新增参考

本次新增对比所对应的目标文件和规则文件如下：

- [SmallAliceWeb `ai-vue-doc/package.json`](/D:/code/ruan-cat/SmallAliceWeb/packages/ai-vue-doc/package.json:1)
- [SmallAliceWeb `ai-vue-doc/nuxt.config.ts`](/D:/code/ruan-cat/SmallAliceWeb/packages/ai-vue-doc/nuxt.config.ts:1)
- [eams `vue-element-cui-nuxt/package.json`](/D:/code/ruan-cat/eams-component-lib/packages/vue-element-cui-nuxt/package.json:1)
- [eams `vue-element-cui-nuxt/nuxt.config.ts`](/D:/code/ruan-cat/eams-component-lib/packages/vue-element-cui-nuxt/nuxt.config.ts:1)
- [eams 根 `CLAUDE.md`](/D:/code/ruan-cat/eams-component-lib/CLAUDE.md:1)
- [eams 构建事故记录技能 `SKILL.md`](/D:/code/ruan-cat/eams-component-lib/.claude/skills/fix-bug/record-bug-fix-memory/SKILL.md:1)
- [eams 构建事故案例文件](/D:/code/ruan-cat/eams-component-lib/.claude/skills/fix-bug/record-bug-fix-memory/2026-08-01-nuxt-content-monorepo-build-fragility-incident.md:1)

以上新增内容只描述证据、配置推断和历史记录，不对两个 monorepo 做任何修改。

同时使用 `pnpm why` 检查了两个项目当前实际依赖解析结果，并使用 Memorix 搜索了 SmallAliceWeb 和 eams-component-lib 在 Nuxt Content、`shadcn-docs-nuxt`、H3 和构建失败方面的历史记录。Memorix 命中了 SmallAliceWeb 的 Node/Nitro 决策记录，但没有提供新的 eams-component-lib 对应事故记录；eams 的判断以仓库自身事故记忆和当前产物为准。
