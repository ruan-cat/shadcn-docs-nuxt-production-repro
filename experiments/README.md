# 单变量实验声明

`experiments/control.json` 保存初始化冻结控制组中最重要的依赖契约。

正式 `main` **不包含**根目录 `experiment.json`。后续 `experiment/*` 分支如果需要故意偏离核心依赖，必须新增根 `experiment.json`，明确声明允许偏离 control 的字段。

示例：R02 删除 docs 显式 H3。

```json
{
  "id": "R02",
  "reason": "验证 Nuxt Content 未声明 H3 runtime dependency 时，在复杂 pnpm workspace 中实际解析哪个 H3 实例。",
  "expected": {
    "docsDependencies": {
      "h3": null
    }
  }
}
```

其中 `null` 表示该 dependency / override 应当不存在。

## 约束

- `id` 必须是 `R01`～`R99` 形式；
- `reason` 必须是非空中文说明；
- `expected` 只能覆盖 `control.json` 已知的核心字段；
- 至少一个 expected 值必须与 control 不同；
- 未声明偏离的核心字段仍必须等于 control；
- `experiment.json` 只是测试/证据元数据，不参与应用运行时；
- manifest 变化产生的 `pnpm-lock.yaml` 变化由实验 lockfile workflow 自动生成，它是该单变量的必然后果，不算第二个业务变量。

这个机制的目的不是让实验“随便改版本”，而是反过来防止一个 PR 在没有声明的情况下偷偷改变第二个核心依赖。
