import { spawnSync } from "node:child_process";

const packages = [
  "nuxt",
  "nitro",
  "nitropack",
  "h3",
  "shadcn-docs-nuxt",
  "@ztl-uwu/nuxt-content",
  "nuxt-og-image",
  "@nuxt/kit",
  "element-plus",
  "@vueuse/core",
];

const targets = ["@repro/docs", "@repro/api"];

console.log("# 依赖树探针");
console.log(`Node: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);

for (const target of targets) {
  console.log(`\n## ${target}`);
  const result = spawnSync(
    "pnpm",
    ["--filter", target, "list", ...packages, "--depth", "6"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    console.error(`依赖树探针失败：${target}，exit=${result.status}`);
    process.exitCode = 1;
  }
}

console.log("\n## H3 反向依赖");
const why = spawnSync("pnpm", ["why", "-r", "h3"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (why.stdout) process.stdout.write(why.stdout);
if (why.stderr) process.stderr.write(why.stderr);
if (why.status !== 0) process.exitCode = 1;
