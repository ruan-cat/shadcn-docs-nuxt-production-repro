import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsManifest = resolve(root, "apps/docs/package.json");
const apiManifest = resolve(root, "apps/api/package.json");

function safeResolve(label: string, baseFile: string, specifier: string) {
  try {
    const resolver = createRequire(baseFile);
    const resolved = resolver.resolve(specifier);
    console.log(`${label}: ${resolved}`);
    return resolved;
  } catch (error) {
    console.log(`${label}: <无法解析>`);
    console.log(`  ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

console.log("# H3 实际解析探针");
console.log(`repo: ${root}`);

const docsH3 = safeResolve("docs package context -> h3", docsManifest, "h3");

const contentEntry = safeResolve(
  "docs -> @ztl-uwu/nuxt-content entry",
  docsManifest,
  "@ztl-uwu/nuxt-content",
);
if (contentEntry) {
  safeResolve("Content package context -> h3", contentEntry, "h3");
}

const docsNuxtManifest = safeResolve("docs -> nuxt/package.json", docsManifest, "nuxt/package.json");
if (docsNuxtManifest) {
  safeResolve("Nuxt package context -> h3", docsNuxtManifest, "h3");
}

const apiNitroManifest = safeResolve("api -> nitro/package.json", apiManifest, "nitro/package.json");
if (apiNitroManifest) {
  safeResolve("Nitro 3 package context -> h3", apiNitroManifest, "h3");
}

safeResolve("API package context -> bare h3", apiManifest, "h3");

console.log("\n# 判读提示");
console.log("1. 控制组期望 docs 与 Content 的运行时 H3 都属于 v1。");
console.log("2. 独立 Nitro 3 自己可以拥有 H3 v2；这不等于 docs 已被污染。");
console.log("3. API package context 的裸 h3 解析仅用于暴露 workspace 可见性；API 源码本身不应裸 import 未声明的 h3。");
console.log("4. 后续删除 docs 显式 H3 或放宽 Content 版本后，必须比较 Content package context 的路径是否发生变化。");

if (!docsH3 || !contentEntry) process.exitCode = 1;
