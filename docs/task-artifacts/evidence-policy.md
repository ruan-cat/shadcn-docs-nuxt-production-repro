# 证据与结论规范

## 1. 结论必须小于或等于证据

禁止：

- 因一次 minor 漂移失败就写“所有 minor upgrade 都会失败”；
- 因 Windows 失败就写“Nuxt 在 Windows 无法使用”；
- 因 `trace:false` 有效就写“应该永久关闭 NFT”；
- 因某个 workaround 让 build 绿色就写“问题已解决”；
- 因某个 sibling package 存在就直接认定它污染了 H3。

推荐：

> 在固定版本/固定 OS/固定 workspace topology 下，改变变量 X 后，首个失败门从 G4 变为错误 Y；依赖探针显示运行时代码解析到 Z。

## 2. 每个实验必须有 control

实验结果至少记录：

```text
control commit
experiment commit
compare/diff
唯一变量
control result
experiment result
```

## 3. 记录“实际解析”，不只记录 manifest

manifest 只能说明允许范围。

必须补：

- lockfile actual version；
- `pnpm list/why`；
- `import.meta.resolve` / `require.resolve` 等可执行解析证据；
- artifact 中实际 package closure。

## 4. 记录第一失败门

例如：

```text
G1 install ✅
G2 dependency tree ✅
G3 prepare ✅
G4 Content API ❌ ERR_INVALID_URL
G5 未执行
```

比只写“build failed”更有价值。

## 5. 区分根因与放大器

例：

- H3 代际失配：运行时根因；
- 8 GiB：资源控制，不是根因修复；
- blanket noExternal：可能是图放大器；
- Windows orphan process：可能放大第二轮测试资源压力；
- root vercel.json：部署配置污染，与 Content H3 根因不是一件事。

## 6. 区分 upstream contract 与 integration stress

所有 issue/README 应使用中性表述：

- “dependency contract 未表达实际运行时边界”；
- “在 production-style pnpm monorepo 中暴露”；
- “当前版本组合下可复现”；
- “需要上游确认预期兼容范围”。

避免用无法由实验直接支持的绝对归责。

## 7. 保存失败也是成功的实验结果

失败 PR 不需要修改到绿色再关闭。

如果它完成了单变量因果回答，应保留：

- PR body；
- CI logs/artifact；
- dependency tree；
- exact error；
- 结论；
- “不合并”的原因。

## 8. 不允许污染证据的做法

- 手改 `node_modules`；
- 同一个实验同时升级多个核心包；
- 失败后临时添加多个 alias 再一起提交；
- 同时修改 linker + hoist + noExternal + inline；
- 复用旧 `.nuxt` / `.output` 证明 fresh build；
- 用 Turbo cache hit 代替真实构建；
- 只看首页截图判断 Content 正常。

## 9. 历史事实与本仓库复现结果分栏

历史项目已经出现过的事故可以作为实验来源，但本仓库必须重新验证。

统一标记：

- `历史已发生`：来源于真实项目记录；
- `本仓已复现`：新仓库实验得到；
- `本仓未复现`：实验未出现；
- `待验证`：尚未运行。

## 10. 上游 issue 最小材料

最终向上游报告时应尽量包含：

1. 最小仓库 URL；
2. control PR；
3. failure PR；
4. 单一 diff；
5. OS / Node / pnpm；
6. exact package versions；
7. dependency resolution；
8. first failing gate；
9. exact stack；
10. 可执行复现命令。
