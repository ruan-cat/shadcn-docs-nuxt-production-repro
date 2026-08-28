# 配置型单变量实验安全契约

## 背景

控制组必须禁止把历史 workaround 直接固化进 `main`，例如：

- `vite.ssr.noExternal`；
- Nitro `trace: false`；
- `routes.clear()`；
- blanket `externals.inline`；
- `nodeLinker: hoisted`；
- `publicHoistPattern`。

但 R12、R14、R19、R21、R28 等实验本身恰好需要**故意启用其中一个变量**。如果静态安全测试无条件禁止这些字符串，实验会在真正的 build/runtime 门之前被测试基础设施拦截，无法测量 Windows、Linux、Content 和 artifact 行为。

因此配置型实验必须采用“默认禁止 + 显式声明”的方式，而不是删除安全测试。

## experiment.json

配置型实验可以声明：

```json
{
  "id": "R12",
  "reason": "量化 blanket Vite SSR noExternal 对 Nuxt server graph、产物与运行时的影响。",
  "allowedSafetyPatterns": {
    "nuxtConfig": ["noExternal"]
  }
}
```

依赖型实验仍然使用：

```json
{
  "expected": {
    "docsDependencies": {
      "h3": null
    }
  }
}
```

同一个实验也可以同时具有 dependency/workspace 偏离与配置安全声明，但只有实验设计本身确实需要时才允许这样做。

## 当前允许声明的安全 pattern

### apps/docs/nuxt.config.ts

```text
trace: false
routes.clear()
noExternal
externals.inline
inline: [/.*/]
```

### pnpm-workspace.yaml

```text
nodeLinker: hoisted
publicHoistPattern
```

未知 pattern 不能通过声明绕过安全测试。

## 约束

1. `main` 没有 `experiment.json`，所以所有危险 pattern 仍然一律禁止；
2. 实验声明的 pattern 必须真的出现在目标文件中，禁止声明一个不存在的偏离；
3. 未声明的危险 pattern 仍然直接失败；
4. `experiment.id` 必须是 `Rxx`；
5. `reason` 必须解释实验目的；
6. 配置型实验可以不修改 dependency control，此时 `allowedSafetyPatterns` 本身构成实验偏离；
7. 该机制只放行静态测量门，不代表某个 workaround 被推荐、被证明安全或允许合并到 `main`。

## 适用路线

- R12：blanket `vite.ssr.noExternal`；
- R14：blanket Nitro inline；
- R19：全局 hoisted linker；
- R21/R22：`trace:false`；
- R28/R29：`routes.clear()`；
- 后续出现的新 workaround 必须先更新权威安全 pattern 列表，再进入实验，禁止任意字符串自助放行。

## 判读原则

配置实验 PR 的静态契约通过，只表示：

> “这个危险变量是有意加入、已被实验元数据声明。”

它不表示：

> “这个变量是安全的、推荐的、应该合并的。”

真正结论仍由 dependency probe、Nuxt build、Content、Windows/Linux、standalone artifact HTTP 等门禁共同决定。
