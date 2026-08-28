import { spawn } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [entryArg, urlArg, ...flags] = process.argv.slice(2);
const isolateParentNodeModules = flags.includes("--isolate-parent-node-modules");
const unknownFlags = flags.filter((flag) => flag !== "--isolate-parent-node-modules");

if (!entryArg || !urlArg || unknownFlags.length > 0) {
  console.error(
    "用法: pnpm probe:artifact <server-entry> <url> [--isolate-parent-node-modules]",
  );
  if (unknownFlags.length > 0) {
    console.error(`未知参数: ${unknownFlags.join(", ")}`);
  }
  process.exit(2);
}

const entry = resolve(entryArg);
const target = new URL(urlArg);
const port = target.port || (target.protocol === "https:" ? "443" : "80");
const repoNodeModules = resolve("node_modules");
const hiddenRepoNodeModules = resolve(".node_modules-artifact-smoke-hidden");

if (!existsSync(entry)) {
  console.error(`产物入口不存在: ${entry}`);
  process.exit(2);
}

if (isolateParentNodeModules) {
  if (!existsSync(repoNodeModules)) {
    console.error(`无法隔离父级依赖：仓库 node_modules 不存在: ${repoNodeModules}`);
    process.exit(2);
  }
  if (existsSync(hiddenRepoNodeModules)) {
    console.error(`无法隔离父级依赖：临时目录已存在: ${hiddenRepoNodeModules}`);
    process.exit(2);
  }
}

console.log(`# 启动产物: ${entry}`);
console.log(`# 探测地址: ${target}`);
console.log(`# 子进程 cwd: ${dirname(entry)}`);

let parentNodeModulesHidden = false;
if (isolateParentNodeModules) {
  renameSync(repoNodeModules, hiddenRepoNodeModules);
  parentNodeModulesHidden = true;
  console.log("# 隔离模式: 已临时隐藏仓库根 node_modules，禁止 .output 向父级回退解析");
}

const child = spawn(process.execPath, [entry], {
  cwd: dirname(entry),
  env: {
    ...process.env,
    HOST: target.hostname,
    PORT: port,
    NITRO_HOST: target.hostname,
    NITRO_PORT: port,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => process.stdout.write(`[server] ${chunk}`));
child.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));

let lastError: unknown;
let success = false;

try {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`服务在探测前退出，exit=${child.exitCode}`);
    }

    try {
      const response = await fetch(target);
      const text = await response.text();
      console.log(`HTTP ${response.status} ${response.statusText} bytes=${Buffer.byteLength(text)}`);
      if (!response.ok) {
        console.error(text.slice(0, 2000));
        throw new Error(`HTTP smoke 失败: ${response.status}`);
      }
      success = true;
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    }
  }

  if (!success) {
    throw lastError ?? new Error("服务在超时前没有响应");
  }
} finally {
  if (child.exitCode === null) child.kill("SIGTERM");
  if (parentNodeModulesHidden) {
    renameSync(hiddenRepoNodeModules, repoNodeModules);
    parentNodeModulesHidden = false;
    console.log("# 隔离模式: 已恢复仓库根 node_modules");
  }
}

if (!success) process.exitCode = 1;
