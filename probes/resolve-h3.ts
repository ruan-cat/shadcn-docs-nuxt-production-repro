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

const docsH3 = safeResolve("docs -> h3", docsManifest, "h3");
const contentManifest = safeResolve(
  "docs -> @ztl-uwu/nuxt-content/package.json",
  docsManifest,
  "@ztl-uwu/nuxt-content/package.json",
);

if (contentManifest) {
  safeResolve("content package context -> h3", contentManifest, "h3");
}

const docsNuxtManifest = safeResolve("docs -> nuxt/package.json", docsManifest, "nuxt/package.json");
if (docsNuxtManifest) {
  safeResolve("nuxt package context -> h3", docsNuxtManifest, "h3");
}

const apiNitroManifest = safeResolve("api -> nitro/package.json", apiManifest, "nitro/package.json");
if (apiNitroManifest) {
  safeResolve("nitro3 package context -> h3", apiNitroManifest, "h3");
}

safeResolve("api package context -> h3", apiManifest, "h3");

console.log("\n# 判读提示");
console.log("控制组期望 docs/Content 运行时属于 H3 v1；独立 Nitro 3 可以拥有自己的 H3 v2。两者路径不应被静默混用。");
if (!docsH3) process.exitCode = 1;
