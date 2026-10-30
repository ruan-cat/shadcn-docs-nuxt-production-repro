# R35 / R36 证据：根 `vercel.json` 无法覆盖对方 Project 的设置（零部署额度）

- 日期：2026-10-30
- 环境：Windows 10.0.19045 / Node v22.23.1 / pnpm 10.33.0 / Vercel CLI 58.11.0
- 关联故障：F38（[failure-catalog](../docs/task-artifacts/failure-catalog.md)）/ F39
- 前置：R34（部署 control，只读核验，见 [2026-10-30-r34-vercel-control-readonly.md](./2026-10-30-r34-vercel-control-readonly.md)）
- **部署额度消耗：0**（本轮零新增部署；`vercel deploy --dry` 与 `vercel pull` 均不创建部署）

## 结论摘要

在「两个 Project 都设置了 Root Directory（`apps/docs` / `apps/api`）」的当前架构下，
**仓库根的 `vercel.json` 不可能覆盖对方 Project 的 Build Command / Output Directory**。
⇒ R35 / R36 的预期故障信号**结构上不可复现**，两实验判负（阴性确认）。

## 取证一：CLI 的配置发现路径（`vercel deploy --dry --debug`）

沙箱（仓库外 `%TEMP%\vc-probe-r35b`）内容：

- `.vercel/project.json` = docs project（`prj_nRhiR3d9kkcWp8U9prKNUh5cHdt1`）的真实绑定
- 根 `vercel.json` = R35 变量（`buildCommand: R35-ROOT-BUILD-COMMAND`、`outputDirectory: R35-ROOT-OUTPUT-DIR`）
- `apps/docs/vercel.json` = 对照（`buildCommand: DOCS-INNER-BUILD-COMMAND`）

命令与输出（原文）：

```plain
$ vercel deploy --dry --yes --debug
exit=0
> [debug] Found config in file "...\vc-probe-r35b\vercel.json"
> [debug] Read local config from root directory (apps/docs)
[client-debug] Found 2 files in the specified directory
{
  "files": [
    { "path": "apps/docs/vercel.json", ... },
    { "path": "vercel.json", ... }
  ]
}
```

**读法**：

1. CLI 在 cwd 找到根 `vercel.json`；
2. 但随后**项目配置改从 Root Directory（`apps/docs`）读取**（`Read local config from root directory (apps/docs)`）；
3. 根 `vercel.json` 仍会作为**源码文件**进入上传的 file tree，但它**不是**项目配置。

⇒ 根配置只在「该 Project 的 Root Directory = 仓库根」时才是项目配置。
本仓两个 Project 的 Root Directory 分别是 `apps/docs` / `apps/api` ⇒ 根配置对二者都不是项目配置。

## 取证二：项目设置未被改写（`vercel pull`，零部署额度）

`vercel pull --yes --environment=production` 把 Project 设置读回沙箱 `.vercel/project.json`：

**R35（docs project，根 `vercel.json` 存在）**

```json
{
	"projectId": "prj_nRhiR3d9kkcWp8U9prKNUh5cHdt1",
	"projectName": "shadcn-docs-nuxt-production-repro-docs",
	"settings": {
		"framework": "nuxtjs",
		"installCommand": "pnpm install --frozen-lockfile",
		"buildCommand": "turbo run build --filter=@repro/docs...",
		"outputDirectory": ".vercel/output",
		"rootDirectory": "apps/docs",
		"nodeVersion": "22.x"
	}
}
```

**R36（api project，根 `vercel.json` 存在）**

```json
{
	"projectId": "prj_AAGUVMU0BfCce4ydRp8MmTdAYc5b",
	"projectName": "shadcn-docs-nuxt-production-repro-api",
	"settings": {
		"framework": "nitro",
		"installCommand": "pnpm install --frozen-lockfile",
		"buildCommand": "turbo run build --filter=@repro/api...",
		"outputDirectory": ".vercel/output",
		"rootDirectory": "apps/api",
		"nodeVersion": "22.x"
	}
}
```

**判读**：

- `buildCommand` 仍是各自真实的 turbo 命令，**不是** `R35-ROOT-BUILD-COMMAND` / `R36-ROOT-BUILD-COMMAND`；
- `outputDirectory` 仍是 `.vercel/output`，**不是** `R35-ROOT-OUTPUT-DIR` / `R36-ROOT-OUTPUT-DIR`；
- `rootDirectory` 未被改写；
- ⇒ **根 `vercel.json` 对两个 Project 均无覆盖效果**。

## 纪律声明

- 本结论是**结构判定 + 等价验证**，**不是** F38 原式复现（未做真实部署、未观察云端构建被改写）。
  诚实标注：F38 的历史事故形态在当前架构下已不可复现；本实验证明的是「根配置不生效」这一机制。
- 全部操作在**仓库外**的 `%TEMP%` 沙箱内完成；仓库工作区未被 `vercel pull` / `vercel link` 写入
  （`.vercel/project.json` 的单槽绑定未被覆盖，F39 保持成立）。
- `vercel deploy --dry` 会发起 API 调用但**不创建部署**，不消耗部署额度。

## 官方出处（子代理取证）

- `vercel.json` 应位于 project root directory：https://vercel.com/docs/project-configuration/vercel-json
- Root Directory 语义（不可用 `..` 上跳）：https://vercel.com/docs/builds/configure-a-build#root-directory
- CLI `compileVercelConfig(workPath)` 只在 workPath 内查找、无向上遍历：
  https://github.com/vercel/vercel/blob/main/packages/cli/src/util/compile-vercel-config.ts
- `deploy` 在 rootDirectory 存在时调用 `compileVercelConfig(join(cwd, rootDirectory))`；目录内无配置时仅告警不生效：
  https://github.com/vercel/vercel/blob/main/packages/cli/src/commands/deploy/index.ts
- 唯一例外：私有键 `git.skipUnaffectedProjects` 只从仓库根 `vercel.json` 读取，且只影响「跳过未变更项目」判定，
  不构成 Build/Output 污染：https://openapi.vercel.sh/vercel.json
