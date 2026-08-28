import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const outputRoot = join(repoRoot, "apps/docs/.output/server");
const outputManifestPath = join(outputRoot, "package.json");
const sourceElementManifestPath = join(
  repoRoot,
  "packages/ui/node_modules/element-plus/package.json",
);

const normalize = (value: string) => value.replaceAll("\\", "/");
const rel = (value: string) => normalize(relative(repoRoot, value));

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function inspectPath(path: string) {
  if (!existsSync(path)) {
    return { exists: false };
  }

  const stat = lstatSync(path);
  const result: Record<string, unknown> = {
    exists: true,
    path: rel(path),
    isSymlink: stat.isSymbolicLink(),
  };

  if (stat.isSymbolicLink()) {
    result.linkTarget = normalize(readlinkSync(path));
  }

  try {
    result.realPath = rel(realpathSync(path));
  } catch (error) {
    result.realPathError = String(error);
  }

  return result;
}

function resolveFromOutput(specifier: string) {
  const script = [
    "const { createRequire } = require('node:module');",
    "const { join } = require('node:path');",
    "const req = createRequire(join(process.cwd(), 'package.json'));",
    `try { console.log(req.resolve(${JSON.stringify(specifier)})); }`,
    "catch (error) { console.error(error.code + ': ' + error.message); process.exit(42); }",
  ].join("\n");

  try {
    const stdout = execFileSync(process.execPath, ["-e", script], {
      cwd: outputRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return { ok: true, path: rel(stdout) };
  } catch (error: any) {
    return {
      ok: false,
      exitCode: error?.status,
      stderr: String(error?.stderr ?? "").trim(),
    };
  }
}

if (!existsSync(outputManifestPath)) {
  throw new Error(`缺少 docs standalone manifest: ${outputManifestPath}`);
}

const outputManifest = readJson(outputManifestPath);
const sourceElementManifest = existsSync(sourceElementManifestPath)
  ? readJson(sourceElementManifestPath)
  : undefined;

const outputNodeModules = join(outputRoot, "node_modules");
const elementPath = join(outputNodeModules, "element-plus");
const popperPath = join(outputNodeModules, "@popperjs/core");
const sxzzPath = join(outputNodeModules, "@sxzz/popperjs-es");

const result = {
  output: {
    packageJson: rel(outputManifestPath),
    dependencyCount: Object.keys(outputManifest.dependencies ?? {}).length,
    dependencies: outputManifest.dependencies ?? {},
    nodeModules: inspectPath(outputNodeModules),
  },
  sourceElementPlus: sourceElementManifest
    ? {
        version: sourceElementManifest.version,
        popperSpecifier: sourceElementManifest.dependencies?.["@popperjs/core"],
      }
    : { missing: true },
  outputPaths: {
    elementPlus: inspectPath(elementPath),
    popperLogicalName: inspectPath(popperPath),
    sxzzPhysicalName: inspectPath(sxzzPath),
  },
  outputResolution: {
    elementPlus: resolveFromOutput("element-plus"),
    popperLogicalName: resolveFromOutput("@popperjs/core"),
    sxzzPhysicalName: resolveFromOutput("@sxzz/popperjs-es"),
  },
};

console.log("# Docs standalone 依赖闭包探针");
console.log(JSON.stringify(result, null, 2));
console.log("# 判读提示");
console.log("1. control 中 Element Plus 如果被 bundle，output node_modules 不存在它也可以是正常结果。");
console.log("2. R15 目标不是人为删除 Popper，而是先让 Element Plus 真实 externalize，再观察 logical alias 是否被 standalone closure 保留。");
console.log("3. build/listen 成功不能替代 GET / 的真实 runtime smoke。");
