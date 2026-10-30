# 2026-10-30 R42/R43/R44 构建顺序与并行度测量证据

> 触发：路线图阶段 9「PR R42：docs -> api / PR R43：api -> docs / PR R44：并行构建」的**测量型**执行
> 关联档案：[R42](../docs/task-artifacts/experiments/R42.md)、[R43](../docs/task-artifacts/experiments/R43.md)、[R44](../docs/task-artifacts/experiments/R44.md)
> 台账：`docs/task-artifacts/failure-catalog.md`（F42 / F43 / F36）、`docs/task-artifacts/acceptance-gates.md`（G5/G6/G7/G8/G9/G13）、`docs/task-artifacts/experiments/FINDINGS.md`（#23：内容幂等、字节非幂等）

## 1. control 与环境

| 项                                     | 值                                                                                                                                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| control SHA（开工时 HEAD）             | `9b2e4ca9bd59cc6358d5a4a651a65c8ecc0e7371`（`main`）                                                                                                                                                                        |
| experiment SHA                         | **无**——本轮为**无代码改动的测量型实验**，不开分支、不开 PR，全程 `main` 原地执行                                                                                                                                           |
| 开工时 HEAD → 收尾时 HEAD              | `9b2e4ca` → `35e8818`（主代理期间的**纯文档提交**：`f76c89a` / `d39fa0a` / `ddd39f6` / `35e8818`）                                                                                                                          |
| 构建输入是否变更                       | **否**：`git diff --stat 9b2e4ca HEAD -- package.json turbo.json pnpm-lock.yaml pnpm-workspace.yaml apps packages` **为空**                                                                                                 |
| OS                                     | Microsoft Windows 10 专业版 10.0.19045.0（x64）                                                                                                                                                                             |
| CPU                                    | 12th Gen Intel(R) Core(TM) i3-12100F，**4 核 / 8 逻辑处理器**（`node -e "os.cpus().length"` = 8）                                                                                                                           |
| Node / pnpm                            | v22.23.1 / 10.33.0                                                                                                                                                                                                          |
| lockfile SHA256                        | `A9EA250BBE26F4160D719464E45469A60477ACB82C2EE95CC712992251096463`（`pnpm-lock.yaml`，与 Linux CI run `41036747720` 上报值**逐字一致**）                                                                                    |
| node_modules 健康度                    | `.pnpm` = **1209**（期望 1209 ✅）、`apps/docs/node_modules/nuxt/bin/nuxt.mjs` ✅、`packages/shared-core/node_modules/typescript/bin/tsc` ✅                                                                                |
| `git diff main -- pnpm-workspace.yaml` | **空**（无 `nodeLinker` / `publicHoistPattern` 任何拼写变体）                                                                                                                                                               |
| 并发构建排查                           | 开工前间隔 **83s** 两次读 `apps/docs/.output/nitro.json` 的 `date` 与 `public/_nuxt/builds/latest.json` 的 `id` → **均未变化**；按 F36 定向查本仓路径 node 进程 = **0**（只记录，未无差别杀 node）；端口 3413 / 3200 零监听 |
| install                                | **未重装**（§0.5.1 判定「健康就别动」——`node_modules` 全程未被触碰，避免掩盖真实故障）                                                                                                                                      |

## 2. 方法与口径（含探针缺陷登记）

### 2.1 为什么不用 turbo 表达顺序

turbo 依赖图为 `shared-core#build → ui#build → docs#build` 且 `shared-core#build → api#build`，
**`docs#build` 与 `api#build` 之间没有任何依赖边** → turbo 无法表达二者先后。故 R42/R43/R44 **全部用手工脚本**
（`pnpm build:packages` → `pnpm build:docs` / `pnpm build:api`），保持三者**同平面**：

- `pnpm build:packages` 是**受控公共前置**，不是变量——手工 `pnpm build:docs` / `build:api` **不经 turbo**，
  会跳过 turbo 的 `^build` 编排，`@repro/ui` 与 `@repro/shared-core` 不会自动先构建；
- R44 的并发用 `Start-Process pnpm.cmd` **同时**起两个 `pnpm run`，**不用 turbo `--concurrency`**（那会引入 turbo 缓存与编排变量）。

### 2.2 内存采样器（重建）与**探针口径缺陷**

题面采样器按原文重建（5s 间隔、stopfile + deadline 双兜底、尾行 `DONE peak_MB=<值>`），
实测三窗口覆盖构建全程，尾行均正确：

- 采样点 = 5s × 点数：R42 45 点（18:07:35→18:11:16 ≈ 221s）、R43 38 点（18:12:19→18:15:26 ≈ 187s）、
  R44 `r44c` 36 点（18:29:42→18:32:38 ≈ 176s）、R44 `r44` 40 点（≈ 196s）。

> ⚠️ **探针口径缺陷（必读）**：题面采样器的 `repoCount` 判据为
> `Get-Process node | Where-Object { $_.Path -like '*shadcn-docs-nuxt-production-repro*' }`。
> `.Path` 是**可执行文件路径**（= `node.exe`），**不含命令行**；本机 node 装在**仓库之外**
> （`D:\store\nvm-desktop\22.23.1\node.exe`、`C:\Users\pc\.nvmd\bin\node.exe`）
> ⇒ 该计数**恒为 0**（实测三轮全为 0）。
> **这正是 R44 首轮「并行确实发生」证据缺失的直接原因**——若沿用该判据，会把「没采到证据」误判成「没发生」。
> 补救：补建 **CIM `CommandLine` 口径**采样器（`mem-sampler-cim.ps1`：`cim_repoNodeCount` / `cim_repoSum_WS_MB` /
> `cim_maxWS_peak_MB`）与 **200ms 粒度进程追踪**（`proc-trace.ps1` / `race-detect.ps1`：`kind=NUXT(docs)` /
> `kind=NITRO(api)` / `OVERLAP` 行），才拿到并发直接证据。
> **教训：计数恒 0 时先怀疑判据、再下结论。**

### 2.3 产物等价判据（分层）

本仓 fresh 构建**内容幂等、字节非幂等**（FINDINGS #23）：content `buildIntegrity = Date.now()` 指纹、
Nuxt `buildId` UUID、`nitro.json` 的 `date`、资源 mtime，以及**枚举顺序不确定性**（lucide 图标 JSON key 序、
`styles.mjs` / `client.precomputed.mjs` 条目序）→ **「两次 fresh 构建产物字节相同」不是可达判据**，只能判**内容等价**。
题面 4 项合取逐项如实记录，并补充分层口径：

| 层级 | 口径                                                                                   | 说明                                                                                                             |
| ---- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | 路径集合一致（全量相对路径）                                                           | 字面口径                                                                                                         |
| 1b   | 路径集合一致（**文件名 content-hash 归一**后）                                         | `public/_nuxt/<8位hash>.js` → `<HASH>.js`；`name.<hash>.<ext>` → `name.<HASH>.<ext>`；UUID basename → `<UUID>.*` |
| 2    | 排除 volatile 后哈希一致（严格字节）                                                   | 题面 volatile：`nitro\.json$`、`_nuxt\builds\`、`_payload\.json$`、`chunks\_\(nitro\|storage\|error-500)\.mjs$`  |
| 2b   | 排除 volatile 后**归一**哈希一致（JSON key 排序 / 行尾归一）                           | 消除枚举顺序                                                                                                     |
| 2c   | **指纹归一**（10 位以上数字 → `<TS>`、UUID → `<UUID>`）后逐文件哈希一致                | 消除构建指纹                                                                                                     |
| 2d   | **指纹 + chunk 名归一**后内容**多重集**一致                                            | 消除 chunk 名级联（chunk 互相引用兄弟 chunk 名 → 改名级联）                                                      |
| 2e   | **置换检验**：长度相等 + **字符多重集相等**（+ 排序行相等）                            | 证明「同内容、异顺序」                                                                                           |
| 3    | 指纹归一化后路由表一致（`server/**/*.mjs` 的 `route: '...'` 集合，`\d{10,}` → `<TS>`） | 题面口径                                                                                                         |

> ⚠️ **「字节相同不是可达门」的直接证据**：161 个 `public/_nuxt/<contentHash>.js` 的**文件名本身由构建指纹派生**，
> 且 chunk 内部互相引用兄弟 chunk 名 → 指纹一变，文件名与内容**同时**变（级联）。
> 因此题面判据 1（原始路径集合）与 2（严格字节哈希）在 docs 侧**结构上不可达**；下文同时给出「字面合取 FAIL」与「内容等价 PASS」。

## 3. 执行矩阵（三轮 + 并行重复样本）

| 轮次                   | 顺序 / 并发度                               | build:packages | docs 构建                                                                                                                          | api 构建                                                     | 墙钟                    | 峰值 WS       | 采样点数 | 采样尾行              | 判废             |
| ---------------------- | ------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------- | ------------- | -------- | --------------------- | ---------------- |
| **R42**                | 串行 **docs → api**                         | exit 0 / 3.5s  | exit 0 / **159.2s**（Client 26603ms / Server 16164ms / Prerendered 11 routes 12.365s / Nuxt Nitro server built / Build complete!） | exit 0 / 1.9s（`Server built in 56ms`，`index.mjs` 62116 B） | 164.6s                  | **3619.2 MB** | 45       | `DONE peak_MB=3619.2` | 否               |
| **R43**                | 串行 **api → docs**                         | exit 0 / 5.7s  | exit 0 / **154.7s**（Client 21883ms / Server 15962ms / Prerendered 11 routes 13.539s / Build complete!）                           | exit 0 / 1.9s（`Server built in 49ms`，`index.mjs` 62116 B） | 162.3s                  | **3580.9 MB** | 38       | `DONE peak_MB=3580.9` | 否               |
| **R44** `r44c`（定案） | **并发**（`Start-Process pnpm.cmd` 同时起） | exit 0 / 3.1s  | exit 0 / **159.5s**（Client 23133ms / Server 16945ms / Prerendered 11 routes 12.732s / Build complete!）                           | `Server built in 51ms`，`index.mjs` 62116 B，**~2s 完成**    | **159.5s**              | **3619.7 MB** | 36       | `DONE peak_MB=3619.7` | 否               |
| R44 `r44`（旁证）      | 并发                                        | exit 0 / 3.5s  | 163.1s（退出码未采集）                                                                                                             | ~2s                                                          | 163.1s                  | **3589 MB**   | 40       | `DONE peak_MB=3589`   | 否（降级为旁证） |
| R44 `r44b`             | 并发                                        | exit 0         | 未等待完成                                                                                                                         | exit 0 / ~2s                                                 | 记录值 1.8s（**假值**） | 3560 MB       | 37       | `DONE peak_MB=3560`   | **是**——见 §6    |

峰值 WS vs **R23 历史基线 3599.4 MB**（29 点 × 5s）：R42 **+0.55%**、R43 **-0.51%**、R44 `r44c` **+0.56%**、R44 `r44` **-0.29%**
→ **全部在 ±10% 判据内**。CIM 口径本仓 node 进程峰值 WS：R42 3616 / R43 3563.9 / R44 `r44c` 3613.3 MB（合计峰值 3623.7 / 3571.7 / 3621.1 MB）。

**并行直接证据原文**（`%TEMP%\r4244\r44c-race.log`）：

```plain
18:29:57.722 pid=32328 ws_MB=7.8 kind=NUXT(docs)
18:29:57.747 pid=36132 ws_MB=66.1 kind=NUXT(docs)
18:29:57.761 pid=30652 ws_MB=7.8 kind=NITRO(api)
18:29:57.845 pid=21956 ws_MB=83.9 kind=NITRO(api)
OVERLAP 18:29:57.851 nitro=2 nuxt=2 total=4
DONE maxSumWS_MB=418.6 maxProcCount=4 sawNitro=True sawNuxt=True
```

→ 并行**确实发生**，最大并发本仓 node 进程数 **4**；**重叠期最大同时 WS 仅 418.6 MB**（api 构建 ~2s，与 docs ~155s 几乎无重叠窗口）。

**各轮产物指纹**（证明三者是三次独立构建、指纹互不相同）：

| 轮次       | `buildIntegrity` | `buildId`                              | `nitro.json date`        | api `index.mjs` |
| ---------- | ---------------- | -------------------------------------- | ------------------------ | --------------- |
| R42        | `1793354913751`  | `afdcacb9-5541-4557-84a3-0a0adb0841e6` | 2026-10-30T10:11:05.547Z | 62116 B         |
| R43        | `1793355176497`  | `36851eba-226f-4735-b129-19b94a8cc064` | 2026-10-30T10:15:23.375Z | 62116 B         |
| R44 `r44c` | `1793356203174`  | `10c6a807-0265-4508-b44a-0dba29efabcc` | 2026-10-30T10:32:34.166Z | 62116 B         |

## 4. 首个失败门

**本轮无失败门**——三轮全部走完 G5（docs production build）/ G6（artifact startup）/ G7（HTTP runtime）/ G8（API build）/ G9（API artifact runtime）：

| 门                                       | R42                                                               | R43                | R44 `r44c`                 |
| ---------------------------------------- | ----------------------------------------------------------------- | ------------------ | -------------------------- |
| G5 docs production build                 | ✅ exit 0 / 159.2s                                                | ✅ exit 0 / 154.7s | ✅ exit 0 / 159.5s（并发） |
| G6 docs artifact startup                 | ✅ `Listening on http://127.0.0.1:3413`                           | ✅ 同              | ✅ 同                      |
| G7 docs HTTP runtime（Content 响应体级） | ✅ 13/13 PASS                                                     | ✅ 13/13 PASS      | ✅ 13/13 PASS              |
| G8 API production build                  | ✅ exit 0 / 1.9s                                                  | ✅ exit 0 / 1.9s   | ✅ ~2s（并发）             |
| G9 API artifact runtime                  | ✅ `HTTP 200 OK bytes=85`                                         | ✅ 同              | ✅ 同                      |
| G13 缓存无关性                           | ✅ 手工序列不经 turbo；每轮均隔离 `.output`/`.nuxt`/`dist` 后重建 | ✅                 | ✅                         |

## 5. 产物等价四/六项结果

### 5.1 api 侧（`apps/api/.output`，2 文件）——**三轮逐字节相同**

| 判据                       | R42↔R43                               | R42↔R44 | R43↔R44 |
| -------------------------- | ------------------------------------- | ------- | ------- |
| 1 路径集合一致             | ✅ PASS（2 = 2，零差异）              | ✅ PASS | ✅ PASS |
| 2 排除 volatile 后哈希一致 | ✅ PASS（**零差异**）                 | ✅ PASS | ✅ PASS |
| 2b 归一哈希一致            | ✅ PASS                               | ✅ PASS | ✅ PASS |
| 3 指纹归一化路由表一致     | ✅ PASS（3 = 3）                      | ✅ PASS | ✅ PASS |
| 归一化路由表               | `/v1/**`、`/v1/health`、`/v1/runtime` | 同      | 同      |

### 5.2 docs 侧（`apps/docs/.output`，1790 文件 / 非 volatile 1780 / volatile 10）

| 判据                                   | R42↔R43                                                                    | R42↔R44               | R43↔R44               |
| -------------------------------------- | -------------------------------------------------------------------------- | --------------------- | --------------------- |
| 1 路径集合一致（原始）                 | ⚠️ **FAIL**：onlyA=161 / onlyB=161（`public/_nuxt/<contentHash>.js` 改名） | ⚠️ FAIL（同上）       | ⚠️ FAIL（同上）       |
| 1b 路径集合一致（文件名 hash 归一）    | ✅ **PASS**（onlyA=0 / onlyB=0）                                           | ✅ PASS               | ✅ PASS               |
| 2 排除 volatile 后哈希一致（严格字节） | ⚠️ **FAIL**（329 个文件差异）                                              | ⚠️ FAIL               | ⚠️ FAIL               |
| 2b 归一哈希一致                        | ⚠️ FAIL（329）                                                             | ⚠️ FAIL               | ⚠️ FAIL               |
| 2c 指纹归一后逐文件哈希一致            | ⚠️ FAIL（169，含 161 个改名 chunk）                                        | ⚠️ FAIL（169）        | ⚠️ FAIL（169）        |
| 2d 指纹 + chunk 名归一后内容多重集一致 | ⚠️ FAIL（残差 6 / 6）                                                      | ⚠️ FAIL（残差 6 / 6） | ⚠️ FAIL（残差 6 / 6） |
| 3 指纹归一化路由表一致                 | ✅ **PASS**（18 = 18）                                                     | ✅ PASS               | ✅ PASS               |
| 2e 置换检验（长度 + 字符多重集）       | ✅ **PASS**（残差 5 个同名文件长度相等、字符多重集相等）                   | ✅ PASS               | ✅ PASS               |

**残差 6 个文件的逐项归因（三轮签名完全一致 → 与顺序/并发无关）**：

| 残差文件                                               | 归因                                                                                            | 证明                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `server/chunks/build/styles.mjs` (+`.map`)             | **模块条目枚举顺序**不同                                                                        | 长度相等（3663 B）+ 字符多重集相等 + **排序行相等** → 纯置换 |
| `server/chunks/build/client.precomputed.mjs` (+`.map`) | **Vite manifest 条目顺序**不同                                                                  | 长度相等（198907 B）+ 字符多重集相等                         |
| `server/chunks/build/server.mjs`                       | **lucide 图标集合 JSON key 序**不同（A 以 `sun` 开头、B 以 `languages` 开头）                   | 长度相等（1377412 B）+ 字符多重集相等                        |
| `public/_nuxt/<1 个 chunk>`（改名）                    | 携带 content 指纹的 chunk；内容差异 = lucide 图标 key 序 + 压缩器局部标识符命名（`tj` vs `t7`） | 长度相等（1392964 B）；标识符归一后仅剩图标 key 序           |

**佐证（内容等价的正面证据）**：

- prerendered HTML（`public/index.html` 等 4 个）：R42↔R43 **归一化后 `equal=true`**（长度同为 106441，7 个 `<style>` 块与 4 个 `<script>` 块长度逐块相同，CSS 声明集合 393 = 393 且零差集）；
- HTML **类名使用计数逐类相同**（`rotate-` 48 / `pan-` 8 / `backdrop-blur` 28 / `ring-` 384 / `transform` 48 / `scale-` 136 / `blur-` 16）；
- docs 归一化路由表 18 条在三轮完全一致：`/`、`/**`、`/__nuxt_error`、`/__nuxt_island/**`、`/_i18n/:hash/:locale/messages.json`、`/_ipx/**`、`/api/_content`、`/api/_content/**`、`/api/_content/cache.<TS>.json`、`/api/_content/navigation`、`/api/_content/navigation/:qid`、`/api/_content/navigation/:qid/**:params`、`/api/_content/query`、`/api/_content/query/:qid`、`/api/_content/query/:qid/**:params`、`/api/_content/search-<TS>`、`/api/_mdc/highlight`、`/api/_nuxt_icon/:collection`。

**过程中一次「误判→证伪」的记录（保留以免后人重犯）**：中途曾怀疑「`.git/info/exclude` 未登记 `*.stale-*` → Tailwind v4 自动源扫描会把上一轮产物扫进 CSS」。**实测证伪**：
`.git/info/exclude` 已登记 `apps/docs/.output.stale-*`，Tailwind 遵守之——证据是 R42/R43 两轮 HTML 类名使用计数**完全相同**、
内联 CSS 归一化后逐字相同，且旧产物（O0）多出的 `skew-*`/`pinch-*` **未**出现在两轮新产物中。故三轮数据**无需重测**。

## 6. 冒烟断言原文

**R42**（`%TEMP%\r4244\r42-smoke-content.log` / `r42-smoke-artifact.log`）：

```plain
# 路由来源: artifact(route-table)
[server] Listening on http://127.0.0.1:3413
PASS /api/_content/query/index.md/eyJ3aGVyZSI6W3siX3BhdGgiOiIvZ3VpZGUifV19} (query-qid-params) 200 application/json bytes=2183
PASS /api/_content/query/index.md (query-qid) 400 application/json bytes=518
PASS /api/_content/query (query) 200 application/json bytes=11927
PASS /api/_content/cache.1793354913751.json (cache) 200 application/json bytes=12244
PASS /api/_content/search-1793354913751 (search) 200 text/plain; charset=utf-8 bytes=6977
PASS /api/_content/navigation/index.md/eyJ3aGVyZSI6W3siX3BhdGgiOiIvZ3VpZGUifV19} (navigation-qid-params) 200 application/json bytes=86
PASS /api/_content/navigation/index.md (navigation-qid) 200 application/json bytes=86
PASS /api/_content/navigation (navigation) 200 application/json bytes=244
PASS /api/_content/cache.json (must-404) 404 application/json bytes=223
PASS /api/_content/search (must-404) 404 application/json bytes=215
PASS /api/_content (must-404) 404 application/json bytes=201
PASS /api/_content/ (must-404) 404 application/json bytes=203
PASS /no-such-page-xyz (missing-page) 404 application/json bytes=159
# 全部通过
# 启动产物: apps/api/.output/server/index.mjs
[server] ➜ Listening on: http://127.0.0.1:3200/
HTTP 200 OK bytes=85
```

**R43**（`r43-smoke-content.log` / `r43-smoke-artifact.log`）：同 13 条 PASS 逐条同形（指纹换为 `1793355176497`），
`[server] Listening on http://127.0.0.1:3413` + `HTTP 200 OK bytes=85`，**exit 0 / 0**。

**R44 `r44c`**（`r44-smoke-content.log` / `r44-smoke-artifact.log`）：同 13 条 PASS 逐条同形（指纹 `1793356203174`），
`[server] Listening on http://127.0.0.1:3413` + `HTTP 200 OK bytes=85`，**exit 0 / 0**。

三轮 `EADDRINUSE` 命中均为 **0**，且每轮均**先验到 `Listening` 行**再发请求（R19/R24 教训已闭环）。

## 7. 判废记录

| 轮次                             | 判废原因                                                                                                                                                                                                                           | 处置                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R44 `r44b`**                   | **脚本缺陷 + 孤儿构建进程（F36 真实样本）**：脚本只 `WaitForExit()` 了 api 进程便记录 `parallel_wall_s=1.8`（docs 当时**尚未完成**，1.8s 是被 api 提前结束打断的假墙钟）；该轮把 docs 构建留成**后台孤儿进程**，命令返回时仍在运行 | **整轮数据不可采信**（墙钟 / 采样 / 产物均作废），由 `r44c` 取代。补救：以轮询等待该孤儿进程自然结束（18:26:30→18:29:13），确认「剩余本仓 node 进程 = 0」后才启动下一轮；**未无差别杀 node** |
| R44 `r44`（第 1 次）             | 非判废，但**退出码未采集**（`Start-Process -PassThru` 的 `ExitCode` 在进程对象离开作用域后读为空）                                                                                                                                 | 降级为并行重复样本旁证（峰值 3589 MB / 40 点 / 163.1s），定案依据取 `r44c`                                                                                                                   |
| 探针口径缺陷（不判废整轮）       | 题面采样器 `repoCount` 用 `.Path`（可执行文件路径，不含命令行）⇒ **恒为 0**                                                                                                                                                        | 保留题面采样器作为**峰值主口径**（与 R23 基线同口径可比），另建 CIM `CommandLine` 口径与 200ms 进程追踪补齐并发证据                                                                          |
| 快照配对错误（分析阶段，已修正） | 曾把 R42 的产物目录误配为 `.output.stale-r42`（实为**开工前的旧产物 O0**），导致与 R43 比对出现 12 个残差并误导出「CSS 实质差异」结论                                                                                              | 已定位并改正：R42 产物实为 `.output.stale-r43`；改正后残差降为 6，与 R42↔R44 / R43↔R44 **签名一致**                                                                                          |

## 8. 关键发现

1. **构建顺序不改变可见状态（null，但属「已测出无差异」而非「未测」）**：R42↔R43 峰值 WS 差 **-1.06%**
   （3619.2 vs 3580.9，≤10% 判据内），api 产物**逐字节相同**，docs 产物差异**全部**归因于构建内生非确定性，
   **无一条可归因于顺序**；三轮残差**签名完全一致**（恒 6 个文件）→ 差异与顺序/并发**无关**。
2. **并行构建在本仓无收益、也无资源竞争**：并行墙钟 159.5–163.1s vs 串行 156.6–161.1s（**未变快**）；
   峰值 WS 3619.7 / 3589 MB（**未叠加**，远非「两构建 WS 之和」）；**重叠期最大同时 WS 仅 418.6 MB**。
   根因是拓扑：api 构建 `Server built in 51ms`、产物 62.1 kB、耗时 ~2s，与 docs 的 ~155s 几乎无重叠窗口
   → **F43 担心的「资源竞争与缓存写入干扰」在本拓扑下未发生**。
3. **计数恒 0 时先怀疑判据、再下结论**（方法论）：题面 `repoCount` 用 `.Path` 判本仓进程 → 本机 node 在仓库之外 ⇒ 恒 0，
   直接导致 R44 首轮「并行确实发生」证据缺失；改用 CIM `CommandLine` 口径 + 200ms 进程追踪后，
   立刻拿到 `OVERLAP nitro=2 nuxt=2 total=4` 的直接证据。**判据错误会被误读成「现象不存在」**。
4. **字节相同不是可达门**：本仓 fresh 构建**内容幂等、字节非幂等**（FINDINGS #23）——161 个
   `public/_nuxt/<contentHash>.js` 的文件名由构建指纹派生，且 chunk 互相引用兄弟 chunk 名 → 级联；
   故只能判**内容等价**（分层判据），字面「路径集合 + 排除 volatile 后哈希完全一致」在 docs 侧结构上不可达。
5. **内存水位由构建图决定，与执行次序/并发度无关**：R42 3619.2 / R43 3580.9 / R44 3619.7（+旁证 3589、3560）MB，
   全部落在 R23 基线 3599.4 MB 的 ±10% 带内，与既有结论（R24「水位由构建图决定，非堆上限」）一致。
6. **隔离目录未被 Tailwind 扫描（一次误判的证伪）**：`.git/info/exclude` 已登记 `apps/docs/.output.stale-*`，
   Tailwind v4 遵守之（证据：两轮 HTML 类名计数完全相同、内联 CSS 归一化后逐字相同）→ 隔离口径本身不污染测量。

## 9. 遗留与未覆盖

1. **本轮仅 Windows 实测**；Linux 侧「构建顺序/并发」结论未验证（Linux CI job 由主代理在 `main` 上跑）。
2. **`repoCount` 探针口径缺陷未修复入库**（采样器在 `%TEMP%`，未入仓）；若后续要常态化监控内存峰值，
   建议改用 CIM `CommandLine` 口径并入 `probes/`（本轮未做，超出授权写集）。
3. **并发收益的边界未探**：api 构建体量极小才导致并行无收益；若 api 侧体量上升（如真实业务 API），
   并行的内存叠加与墙钟收益需**重测**，本轮结论不可外推。
4. **字面 4 项合取在 docs 侧不可达**这一结论，基于「指纹派生文件名 + chunk 名级联」两处机理；
   若上游 Nuxt/Vite 改变 chunk 命名策略，判据需重新评估。
5. **`QUEUE.md` / `FINDINGS.md` / `progress.md` 未同步**——按本轮授权边界由主代理统一处理；
   本 agent 只写 `R42.md`、`R43.md`、`R44.md` 与本文件。

## 10. 证据文件路径（全部在 `%TEMP%\r4244\`，本机可写位置；未入仓）

| 文件                                                                                                                                        | 内容                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `r42-mem.log` / `r43-mem.log` / `r44-mem.log` / `r44b-mem.log` / `r44c-mem.log`                                                             | 题面口径采样器原始采样行（尾行 `DONE peak_MB=…`）                      |
| `r42-cim.log` / `r43-cim.log` / `r44-cim.log` / `r44b-cim.log` / `r44c-cim.log`                                                             | CIM `CommandLine` 口径采样器（本仓进程数 / WS 合计 / 单进程峰值）      |
| `r44c-race.log`                                                                                                                             | **并发直接证据**（200ms 粒度 `NUXT(docs)` / `NITRO(api)` / `OVERLAP`） |
| `r44c-proc.log`                                                                                                                             | 进程轨迹（PID + 命令行 + WS）                                          |
| `r42-build-*.log` / `r43-build-*.log` / `r44*-build-*.log`                                                                                  | 各轮构建完整 stdout                                                    |
| `r42-docs-exit.txt` / `r42-api-exit.txt` / `r43-*.txt` / `r44-exit.txt` / `r44b-exit.txt` / `r44c-exit.txt`                                 | 退出码与耗时                                                           |
| `r42-smoke-*.log` / `r43-smoke-*.log` / `r44-smoke-*.log`                                                                                   | 冒烟探针原始输出（含 13 条 PASS 与 `Listening` 行）                    |
| `snap-r42.json` / `snap-r43.json` / `snap-r44.json`                                                                                         | 产物等价快照（路径集合 / 逐文件哈希 / 指纹归一哈希 / 归一化路由表）    |
| `mem-sampler.ps1` / `mem-sampler-cim.ps1` / `proc-trace.ps1` / `race-detect.ps1`                                                            | 采样与追踪脚本                                                         |
| `artifact-snapshot.mjs` / `artifact-compare.mjs` / `residual.mjs` / `residual2.mjs` / `perm-check.mjs` / `pair-check.mjs` / `html-diff.mjs` | 等价判据与归因脚本                                                     |

仓库内隔离目录（**保留原地，未删除**，已由 `.git/info/exclude` 的 `apps/docs/.output.stale-*` / `apps/api/.output.stale-*` 等规则覆盖）：
`apps/docs/.output.stale-r42`（开工前旧产物 O0）、`apps/docs/.output.stale-r43`（= R42 产物）、
`apps/docs/.output.stale-r44`（= R43 产物）、`apps/docs/.output.stale-r44b`（= R44 尝试 1 产物）、
`apps/docs/.output.stale-r44c`（= R44 尝试 2 产物）、`apps/docs/.nuxt.stale-*`、`apps/api/.output.stale-*`、
`packages/shared-core/dist.stale-*`、`packages/ui/dist.stale-*`。

上一轮（R39/R40）遗留的隔离物（**保留原地，未删除**，清单经 2026-10-30 归档时逐项核盘）：

| 磁盘路径                                                             | 实际内容                                                             | 原目录             | 命名理由                                                                                                |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| `node_modules.stale-r3940-20261030-174020`（仓库根）                 | 旧 `node_modules`                                                    | `node_modules`     | `.gitignore:24` 覆盖 `node_modules.stale-*`                                                             |
| `apps/{docs,api}/node_modules.stale-r3940-20261030-174020`           | 旧包级 `node_modules`                                                | `node_modules`     | 同上                                                                                                    |
| `packages/{shared-core,ui}/node_modules.stale-r3940-20261030-174020` | 旧包级 `node_modules`                                                | `node_modules`     | 同上                                                                                                    |
| `apps/docs/node_modules.stale-r3940-output`                          | `nitro.json` + `public/` + `server/`                                 | `.output`          | `.gitignore` 的 `dist` 规则**不匹配** `.output.stale-*`，故借用 `node_modules.stale-*` 模式取得忽略覆盖 |
| `apps/api/node_modules.stale-r3940-output`                           | `nitro.json` + `public/` + `server/`                                 | `apps/api/.output` | 同上                                                                                                    |
| `apps/docs/node_modules.stale-r3940-nuxt`                            | `cache/` `content-cache/` `dist/` `manifest/` `module/` `prerender/` | `.nuxt`            | 同上                                                                                                    |
| `packages/{shared-core,ui}/node_modules.stale-r3940-dist`            | `index.js`(+map/+d.ts) / `repro-ui.js`+`repro-ui.css`                | `dist`             | 同上                                                                                                    |

> ⚠️ **订正（2026-10-30 归档核盘）**：本节初稿曾写作「另存在 `.output.stale-r3940-20261030-174020` /
> `.nuxt.stale-r3940-20261030-174020`」——**该两个路径在磁盘上并不存在**（首轮 R42 分析阶段还曾因此把
> R42 产物误配为 `.output.stale-r42`）。实际命名如上表：**一律以 `node_modules.stale-r3940-*` 承载
> 被隔离的 `.output` / `.nuxt` / `dist`**，以确保落在 `.gitignore:24` 的忽略覆盖内、不污染 `git status`。
