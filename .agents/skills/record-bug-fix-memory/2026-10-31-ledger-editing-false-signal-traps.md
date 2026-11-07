# 台账编辑与验证的假信号三连（2026-10-31）

> 类型：**验收 / 记录工具陷阱**（非代码 bug 修复；与 F47 探针家族同源——「工具不报错但事实错」）。
> 触发场景：2026-10-31 R48/R49/R50 批次落档 + 台账回查。

## 事故经过（压缩为高信号事实）

1. **prettier 钩子使缓存 Read 失效**：每次 `git commit`（lint-staged 对 staged 文件跑 `prettier --experimental-cli --write`）之后，先前 Read 过的文件磁盘内容已变；继续用旧上下文 Edit 报 `File has been modified since read`。本会话实测失败 3+ 次（QUEUE.md ×2；package.json 在分支切换后同理）。
2. **markdown 表格插行断裂**：往 QUEUE 表 1 插入 3 个新行时锚点选了表尾注记行首（`> ✅ …`），新行与表主体被一个空行隔开 ⇒ markdown 渲染为无表头的孤立块。**契约测试与 prettier 都不拦这个**——靠独立复核审计的 diff 逐行核对才抓到。
3. **ANSI 构建日志 grep 静默零输出**：`grep -E "Prerendered|Build complete" build.log` 无任何输出，而 `tail` 明明能看到 `✨ Build complete!` ——grep 把含 ANSI 色码（`\x1b[` 高位字节）的日志按 binary 处理且不提示。加 `-a` 后信号齐全。
4. **Git Bash → PowerShell 的 `$var` 被吃**：`powershell -NoProfile -Command "...$q..."` 从 Git Bash 调用时，bash 先把 `$q`/`$before` 展开为空串，PowerShell 收到残缺命令（AGENTS.md §0.5.7 原本只记了 PowerShell 内嵌套的情况，bash→powershell.exe 变体同样中招）。

## 为什么会坏

- prettier 钩子是「提交动作内改写 staged 文件」的设计：文件内容在提交过程中变化，任何基于提交前快照的编辑上下文**必然过期**。
- markdown 表格与后续 blockquote 之间本来就有空行分隔；以注记行为锚插行，插入点天然落在空行之后、脱离表格。
- GNU grep 对含高位字节的文件默认按 binary 处理：计数给 0、不打印行、不报错——静默程度足以被误读成「信号不存在」。
- bash 的变量展开在双引号内也生效，`$` 永远先到 bash 手里。

## 首个可信信号（各自如何打破错误假设）

- ①：Edit 工具显式报错「File has been modified since read」。
- ②：复核审计的「表格行数与空行位置」核对——渲染结果与源码行序不一致。
- ③：`grep -c` 返回 0 与 `tail` 目视矛盾——**两个工具对同一文件给出相反事实**本身就是信号。
- ④：PowerShell 报 `=Stop : 无法将"=Stop"项识别为 cmdlet`（变量名被吃后等号开头）。

## 修复方式（可复用）

- commit 之后要继续编辑同一文件 → **重新 Read**（可只读目标区段）再 Edit。
- 表格插行锚点选**表格最后一行的行尾**（如 `| [R34.md](./R34.md)             |`），不是后续注记的行首。
- 对本仓 build log（`%TEMP%\r{xx}-*.log` 等）提信号一律 `grep -a`。
- 多语句 PowerShell 一律先 `Write` 成 `.ps1`（放 `%TEMP%`，不放仓库）再 `powershell -NoProfile -ExecutionPolicy Bypass -File` 执行。
- 结论表述不得先于事实发生（本批次第 5 险情：progress 曾写「隔离目录已移出」而搬移未执行——先把事做了，再让文字成真）。

## 验证证据（可重复执行）

- 修复后 `node --test tests/*.test.mjs` = **26/26 PASS**（fresh 直跑，含 FINDINGS 交叉引用守卫）。
- 复核审计复跑：3 处 FAIL 全部转 PASS（交叉引用一字不差 / 事实一致 / 表格不断裂）。
- `grep -aE "Prerendered|Build complete" "$TEMP/r48-build.log"` 返回原文行（修复前 0 行）。
- 搬移脚本以 `.ps1 -File` 执行一次成功：`before=48 / after=0 / quarantine count=48`（此前内联 `$var` 形式零成功）。

## 仓库级规则沉淀

- AGENTS.md §0.5.7 已补两条（bash→PowerShell `$var`、ANSI 日志 `grep -a`）。
- evidence/README.md 2026-10-31 追记：**新证据文件的索引登记纳入实验收尾检查项**（与「R{xx}.md 必须被 FINDINGS 或 QUEUE 登记」同级 DoD）——本批次初版又漏登记索引，由台账落地回查捕获，教训再次兑现「索引即目录」。

## 关联

- [FINDINGS #33](../../../docs/task-artifacts/experiments/FINDINGS.md)（R48/R49/R50 批次本体）；progress.md 2026-10-31「落档批次独立复核审计」条。
- 同源先例：[2026-10-30-f47-content-api-false-positive.md](./2026-10-30-f47-content-api-false-positive.md)（探针假信号家族的第三/四个成员——前两个是「判据恒 0」「路径写错」「端口被占」，本案例是「日志提取静默零输出」与「记录工具静默改写」）。
