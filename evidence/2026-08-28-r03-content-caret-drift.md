# R03：Nuxt Content caret drift 实验结果

日期：2026-08-28

## 实验目标

验证 control 中 `@ztl-uwu/nuxt-content@2.13.9` 的全仓精确 pin 被改为应用侧 `^2.13.9`，同时移除 root Content override 后，fresh pnpm 解析是否真正跨 minor，并观察 H3 / @nuxt/kit / Content runtime / production artifact 是否随之改变。

## 基线与单变量

Control main：`b6a8b4f74e1e83aa67c3c17553e6bdb744ab7df0`

唯一语义变量：Content 的有效解析策略。

```text
apps/docs @ztl-uwu/nuxt-content: 2.13.9 -> ^2.13.9
root pnpm.overrides @ztl-uwu/nuxt-content: 2.13.9 -> 移除
```

保持不变：

- Nuxt `3.21.2`
- shadcn-docs-nuxt `1.1.9`
- docs direct H3 `1.15.11`
- nuxt-og-image override `5.1.9`
- 独立 Nitro 3 sibling
- workspace UI / Element Plus / VueUse / shared-core

## Lockfile 证据

实验 lockfile bot commit：

```text
4174cb7f4250121dfe7ed0eb606e7cd634f6c71f
```

lockfile blob：

```text
4f86e540638664c43263484e26721769ba499705
```

有效 runtime 测量锚点：

```text
bc62ee127fe002f68d16138970777e97a50c8a23
```

冻结安装中记录的实验 lockfile SHA256：

```text
32a264f1ca9db75c8ddbb7a20e0f5c870cf044ea858fc987aeaaa28ef5189fed
```

### 实际解析结果

虽然 specifier 已经放宽为 `^2.13.9`，但本次真实 pnpm resolution 仍为：

```text
@ztl-uwu/nuxt-content@2.13.9
```

因此本次 R03 **没有发生实际 Content minor drift**。

## H3 / dependency 证据

GitHub Actions run：

```text
33174486911
```

实际 H3 物理解析：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

这与 frozen control 的 H3 边界一致。

依赖树中仍同时存在 `@nuxt/kit` 3.x 与 `4.5.2`，但结构没有形成新的 runtime failure；这里只记录为依赖结构事实。

## Windows 结果

`Windows 解析、prepare 与独立 API`：全部成功。

- frozen install ✅
- experiment-aware contracts ✅
- workspace packages ✅
- Nuxt prepare ✅
- dependency / H3 probes ✅
- Nitro 3 API build ✅
- Nitro 3 API artifact HTTP ✅

## Linux production 结果

`Linux 完整生产构建与 artifact smoke`：全部成功。

构建规模：

```text
5005 client modules
3581 SSR modules
18.6 MB Nitro output
```

Content prerender：

```text
/api/_content/search ✅
/api/_content/cache.json ✅
```

Standalone artifact HTTP：

```text
Docs / -> HTTP 200
Content cache -> HTTP 200
Content search -> HTTP 200
Nitro 3 API /v1/health -> HTTP 200
```

## 结论

R03 是一个有效的**负结果实验**：

1. 从精确 pin 改成 caret 并解除 root Content override，确实改变了 manifest 策略与 lockfile hash；
2. 但在 2026-08-28 当前 registry / pnpm resolution 条件下，`^2.13.9` 仍解析为 `2.13.9`；
3. 因此本次没有发生真正的 Content minor 漂移；
4. Content 物理包仍解析 H3 v1，没有复现 R02 的 H3 v2 串味；
5. Windows/Linux/runtime/artifact 全绿；
6. 不能把“允许 caret”本身写成当前已复现 defect，也不能把 lockfile 文本变化等同于运行时世代变化。

这与 R02 构成重要对照：R02 的强复现来自删除 docs direct H3 后 Content 的实际 H3 解析发生跨世代变化；R03 在 direct H3 仍存在且 Content 实际版本未漂移时没有触发同类故障。

本 PR 作为实验资产关闭且不合并。
