# R02：移除文档应用显式 H3 后复现 Nuxt Content 跨世代 H3 串味

## 1. 实验结论

本实验已经在 `shadcn-docs-nuxt-production-repro` 中**独立复现** F04 / F06：

> 当 Nuxt 3 文档应用不再显式声明 `h3@1.15.11` 时，`@ztl-uwu/nuxt-content@2.13.9` 自身未声明的裸 `import "h3"` 会在当前 pnpm monorepo 拓扑中解析到独立 Nitro 3 sibling 带来的 `h3@2.0.1-rc.22`；Nuxt 3 自己仍使用 `h3@1.15.11`。最终 Content cache/search 在 Nitro prerender 中以 H3 v2 的 `getQuery()` 处理 Nuxt 3/H3 v1 事件，触发 `Invalid URL`，两条 Content 路由均返回 500，production build 失败。

这不是“同仓存在 Nitro 3 就必然坏”。冻结 control 同样包含 Nitro 3 sibling 和 H3 v1/v2 双世代，但由于 docs 显式声明 H3 v1，Content 物理 package context 也落在 H3 v1，全部 runtime gate 为绿色。

R02 唯一运行时变量就是：**删除 `apps/docs` 的直接 H3 v1 依赖**。

## 2. 对照组

正式 control：

```text
main: 73433e8ce3a4bd20b6c698bd7c970e14f4067146
```

核心依赖：

```json
{
  "nuxt": "3.21.2",
  "shadcn-docs-nuxt": "1.1.9",
  "@ztl-uwu/nuxt-content": "2.13.9",
  "h3": "1.15.11"
}
```

根 overrides：

```json
{
  "@ztl-uwu/nuxt-content": "2.13.9",
  "nuxt-og-image": "5.1.9"
}
```

control 还同时包含：

- 独立 `apps/api` / Nitro 3 beta；
- Nitro 3 自己的 H3 v2；
- `packages/shared-core`；
- Vue + Element Plus + VueUse workspace UI；
- mixed `@nuxt/kit` 3.x / 4.x。

control 的 H3 物理解析：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

control frozen CI / artifact：全部绿色，详见 `evidence/2026-08-28-init-control-baseline.md`。

## 3. 实验变量

实验 PR：#4

```text
https://github.com/ruan-cat/shadcn-docs-nuxt-production-repro/pull/4
```

运行时变量提交：

```text
b336f99f6475f4ca04d9da6c581df086cb101454
🧪 test: 移除文档应用显式 H3 依赖
```

只删除：

```json
"h3": "1.15.11"
```

没有改变：

- Nuxt 3.21.2；
- shadcn-docs-nuxt 1.1.9；
- Content 2.13.9；
- Content root override；
- `nuxt-og-image` 5.1.9 override；
- Nitro 3 sibling；
- workspace UI / shared-core；
- Nuxt config；
- Vite/Nitro externalization；
- Windows workaround；
- prerender 配置。

`experiment.json` 只作为测试元数据声明唯一允许偏离：

```json
{
  "id": "R02",
  "expected": {
    "docsDependencies": {
      "h3": null
    }
  }
}
```

## 4. 实验 lockfile 与测量点

manifest 改变后，实验 lockfile workflow 仅重新解析并提交 `pnpm-lock.yaml`：

```text
071f725118baf65af11138c701e7abedee705371
📦 deps: 刷新单变量实验依赖树
```

由于 GitHub 的 bot push 不会自动再次产生正常 PR job，本实验在**相同 Git tree**上追加零文件变更测量锚点：

```text
291f7852aee937d8f303a4ce8dc3b4c7cf5bdbe5
🧪 test: 固定 R02 实验测量点
```

有效测量 run：

```text
33172470607
https://github.com/ruan-cat/shadcn-docs-nuxt-production-repro/actions/runs/33172470607
```

Windows job 记录的实验 lockfile SHA256：

```text
ee3dcf9edfb244a2c9d2b03084ac5ba0a435e1d4e9c6621616f8cf45aae3076b
```

PR workflow 实际 checkout 的 merge ref：

```text
b5fc4b3fbafcddba33e426225a137033e6fc04fe
```

## 5. Windows：H3 实际解析发生决定性变化

Windows Server 2025 / Node v22.23.2 / pnpm 10.33.0。

### 5.1 依赖树仍同时包含 H3 v1/v2

`pnpm why -r h3`：

```text
h3@1.15.11
  <- Nuxt 3 / Nitro 2 / shadcn-docs-nuxt 各模块

h3@2.0.1-rc.22
  <- nitro@3.0.260610-beta
  <- @repro/api

Found 2 versions of h3
```

因此 R02 没有“把整个 Nuxt 3 栈升级成 H3 v2”。Nuxt 自己的 H3 v1 仍然存在。

### 5.2 但是 package-context resolution 已经改变

R02 实际探针：

```text
docs package context -> h3
  h3@2.0.1-rc.22

Content physical package context -> h3
  h3@2.0.1-rc.22

Nuxt package context -> h3
  h3@1.15.11

Nitro 3 package context -> h3
  h3@2.0.1-rc.22

API package context -> bare h3
  h3@2.0.1-rc.22
```

与 control 对比：

| Context | Control | R02 |
| --- | --- | --- |
| docs package | H3 v1 | **H3 v2** |
| Content physical package | H3 v1 | **H3 v2** |
| Nuxt package | H3 v1 | H3 v1 |
| Nitro 3 package | H3 v2 | H3 v2 |
| API bare package context | H3 v1 | H3 v2 |

这直接证明：删除 app-local H3 后，pnpm workspace 中“哪个 H3 对幽灵裸 import 可见”发生了变化。

### 5.3 Windows 本轮没有执行 docs full production

日常 Windows job 只覆盖：

- frozen install ✅；
- root experiment contract ✅；
- workspace packages build ✅；
- `nuxt prepare` ✅；
- dependency / H3 probe ✅；
- 独立 Nitro 3 API build ✅；
- API artifact `/v1/health` HTTP 200 ✅。

因此不能写“Windows docs production 仍然成功”。Windows full Nuxt build 属于专门 stress workflow，R02 当前未执行该门。

## 6. Linux：Content prerender 真实失败

Linux job 继续执行完整 production build。

在失败前已经完成：

```text
frozen install ✅
shared-core build ✅
workspace UI build ✅
独立 Nitro 3 API build ✅
Nuxt prepare ✅
Nuxt client build ✅
Nuxt SSR build ✅
```

Nuxt 环境仍然是：

```text
Nuxt 3.21.2
Nitro 2.13.4
Vite 7.3.6
Vue 3.5.30
```

client build 约：

```text
5011 modules transformed
```

SSR build：

```text
3581 modules transformed
```

真正第一处生产运行时失败出现在 **Nitro prerender / Nuxt Content cache/search**。

### 6.1 Content cache 500

日志：

```text
[GET] http://localhost/api/_content/cache.1787921214205.json
Invalid URL
```

关键调用栈：

```text
new URL (node:internal/url:818:25)
getQuery (.../h3@2.0.1-rc.22/.../h3/dist/h3.mjs:584:34)
isPreview (.../.nuxt/prerender/chunks/nitro/nitro.mjs:4219:24)
...
Object.handler (.../h3@1.15.11/node_modules/h3/dist/index.mjs:2017:19)
```

也就是说，同一条请求栈中可以同时看到：

```text
Content isPreview
-> H3 v2 getQuery

外层 Nuxt/Nitro handler
-> H3 v1
```

这就是本实验要捕捉的跨世代 runtime mixing。

### 6.2 Content search 500

第二条独立 Content 路由同样失败：

```text
[GET] http://localhost/api/_content/search-1787921214205
Invalid URL
```

关键调用同样落到：

```text
h3@2.0.1-rc.22
getQuery()
```

Nitro 最终报告：

```text
/api/_content/cache... [500] Server Error
/api/_content/search... [500] Server Error
Errors prerendering
Exiting due to prerender errors.
```

因此 build 并不是在 Vite client/SSR 编译阶段坏掉，而是**真正执行 Content server handler 时**才暴露依赖契约错误。

## 7. 第一失败门

按本仓 G0-G14：

| Gate | R02 |
| --- | --- |
| G0 manifest / experiment contract | ✅ |
| G1 frozen install | ✅ |
| G2 dependency resolution | **发生关键漂移：Content -> H3 v2** |
| G3 Nuxt prepare | ✅ |
| G4 Content cache/search runtime | **❌ 500 / Invalid URL** |
| G5 docs production build | **❌，由 G4 prerender error 导致** |
| G6 docs artifact startup | 未执行 |
| G7 docs artifact HTTP | 未执行 |
| G8 Nitro 3 API build | ✅ |
| G9 Nitro 3 API artifact HTTP | ✅ 200 |
| G10 cross-app isolation | 已证明 topology 对 H3 可见性有影响 |
| G11 Windows | prepare/resolution/API ✅；docs full build 未执行 |
| G12 Linux production | ❌ Content prerender |
| G13 cache independence | fresh runner / frozen experiment lockfile |
| G14 repeatability | 当前 1 个有效 production failure run，后续如需上游 L5 可增加同 SHA rerun |

## 8. 一个额外的测试工具问题

静态 contract job 中，根级实验契约已经全部通过；随后 package-level：

```text
apps/docs/tests/control-contract.test.mjs
```

仍旧写死要求 `h3 === "1.15.11"`，因此作为旧测试出现失败。

这不是 R02 runtime 失败证据，也不影响 Linux production job 独立得到的 Content prerender 500。后续应在 `main` 通过单独测试基础设施 PR 让该 package-level contract 也理解 `experiment.json`，不能在 R02 内偷偷修改测试后把它算作运行时变量。

## 9. 本仓现在可以确认的结论

### 已确认

1. **F04 本仓已复现**：当前 `@ztl-uwu/nuxt-content@2.13.9` 对 H3 的运行时解析依赖外部 workspace 可见性；当 app 不再显式兜底 H3 v1 时，Content physical package context 会落到 H3 v2。
2. **F06 本仓已复现**：Nuxt 3/H3 v1 与 Nitro 3/H3 v2 可以在同一个 Content 请求链里发生实际跨世代混用，并导致 `Invalid URL` / cache/search 500。
3. control 与 R02 的唯一运行时差异是 app-local H3 direct dependency；因此 `h3@1.15.11` 在 control 中事实上承担了一个**兼容性护栏**角色。
4. sibling Nitro 3 的存在本身不是充分条件：control 也有 Nitro 3 sibling，但 Content context 因 direct H3 v1 而保持正常。
5. 错误发生在 Content handler / Nitro prerender，而不是 Markdown、Tailwind、Vite client 或 SSR compilation。

### 不能扩大为

1. 不能说所有 pnpm monorepo 一定出现该错误；
2. 不能说只要使用 Nitro 3 sibling 就一定污染 Nuxt 3；
3. 不能说所有 Content 2.13.9 安装都必然解析到 H3 v2；
4. 不能说 Windows full production 已经复现相同 500——本轮 Windows 只执行到 prepare/resolution/API；
5. 不能把 mixed `@nuxt/kit` 3/4 本身写成本次根因，本次单变量直接指向 H3 visibility。

## 10. 对上游问题报告的价值

这个 PR 已经具备非常清晰的 control/failure 对照：

```text
Control
apps/docs dependencies.h3 = 1.15.11
Content physical context -> H3 v1
Content cache/search -> 200
production build -> success

R02
apps/docs dependencies.h3 = <absent>
Content physical context -> H3 v2
Content cache/search -> 500 Invalid URL
production build -> fail
```

因此上游真正需要回答的接口契约问题是：

> `@ztl-uwu/nuxt-content` 的运行时代码既然直接使用 `h3`，它预期由谁声明/约束 H3 的兼容版本？为什么该约束没有通过 dependency / peerDependency 使包管理器能够稳定维护 Nuxt 3/H3 v1 与 Nuxt 4/H3 v2 的世代边界？

这比只报告“Nuxt build 报 Invalid URL”更接近根因。
