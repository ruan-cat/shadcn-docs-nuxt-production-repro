import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const [entryArg, urlArg] = process.argv.slice(2);

if (!entryArg || !urlArg) {
  console.error("用法: pnpm probe:artifact <server-entry> <url>");
  process.exit(2);
}

const entry = resolve(entryArg);
const target = new URL(urlArg);
const port = target.port || (target.protocol === "https:" ? "443" : "80");

if (!existsSync(entry)) {
  console.error(`产物入口不存在: ${entry}`);
  process.exit(2);
}

console.log(`# 启动产物: ${entry}`);
console.log(`# 探测地址: ${target}`);

const child = spawn(process.execPath, [entry], {
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
}

if (!success) process.exitCode = 1;
