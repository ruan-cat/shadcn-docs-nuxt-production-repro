# R04：shadcn-docs-nuxt theme caret drift 实验结果

日期：2026-08-28

## 实验目标

验证 control 中 `shadcn-docs-nuxt@1.1.9` 从精确版本改为 `^1.1.9` 后，fresh pnpm 解析是否进入更高主题版本，并观察传递依赖、H3 / @nuxt/kit 世代以及 Windows/Linux production runtime 是否发生变化。

## 基线与唯一变量

Control main：`b6a8b4f74e1e83aa67c3c17553e6bdb744ab7df0`

唯一运行时变量：

```text
shadcn-docs-nuxt: 1.1.9 -> ^1.1.9
```

保持不变：

- Nuxt `3.21.2`
- `@ztl-uwu/nuxt-content@2.13.9`
- docs direct H3 `1.15.11`
- root Content override `2.13.9`
- root `nuxt-og-image` override `5.1.9`
- 独立 Nitro 3 sibling
- workspace UI / Element Plus / VueUse / shared-core

## Lockfile 证据

实验 lockfile bot commit：

```text
b398529873fae7ba6825da69973cff12e6cf782a
```

lockfile blob：

```text
b086e975610cb270165242a76c109bcc0a0cdea6
```

有效 runtime 测量锚点：

```text
caf29fcaddc491c5f88db0e0dca5b1d2289e2840
```

有效 GitHub Actions run：

```text
33175035738
```

实验 lockfile SHA256：

```text
f43cf27532f5a983631b912460a29431400be0d996602fd3487cbb2a247f2152
```

### 实际主题解析结果

虽然应用 specifier 已放宽为 `^1.1.9`，本次真实 pnpm resolution 仍为：

```text
shadcn-docs-nuxt@1.1.9
```

因此本次 R04 **没有发生实际 theme version drift**。

Control overrides 仍有效：

```text
@ztl-uwu/nuxt-content -> 2.13.9
nuxt-og-image -> 5.1.9
```

## dependency / H3 证据

依赖树仍保持 control 结构：

```text
shadcn-docs-nuxt@1.1.9
@ztl-uwu/nuxt-content@2.13.9
nuxt-og-image@5.1.9
@nuxt/kit 3.x 与 4.5.2 并存
```

H3 物理解析仍为：

```text
docs package context -> h3@1.15.11
Content physical package context -> h3@1.15.11
Nuxt package context -> h3@1.15.11
Nitro 3 package context -> h3@2.0.1-rc.22
API package context -> bare h3@1.15.11
```

没有复现 R02 的 Content -> H3 v2 串味。

## Windows 结果

`Windows 解析、prepare 与独立 API` 全部成功：

- frozen install ✅
- experiment-aware contracts ✅
- workspace packages ✅
- Nuxt prepare ✅
- dependency / H3 probes ✅
- Nitro 3 API build ✅
- Nitro 3 API artifact HTTP ✅

## Linux production 结果

`Linux 完整生产构建与 artifact smoke` 全部成功。

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

R04 是一个有效的负结果实验：

1. `1.1.9 -> ^1.1.9` 改变了 manifest policy 与 lockfile hash；
2. 但在 2026-08-28 当前 registry / pnpm resolution 条件下，实际 theme 仍为 `1.1.9`；
3. 因此没有发生真正的 theme version drift；
4. Content、OG Image、H3、@nuxt/kit 的实际运行时边界与 control 一致；
5. Windows/Linux/runtime/artifact 全绿；
6. 不能把“theme 使用 caret”本身写成当前已复现 defect，也不能把 lockfile 文本变化等同于依赖世代漂移。

本 PR 作为实验资产关闭且不合并。
