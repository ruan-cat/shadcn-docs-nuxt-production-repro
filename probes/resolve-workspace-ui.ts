import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const docsManifestPath = join(repoRoot, "apps/docs/package.json");
const docsDir = dirname(docsManifestPath);
const uiLink = join(docsDir, "node_modules/@repro/ui");
const uiRoot = realpathSync(uiLink);
const uiManifestPath = join(uiRoot, "package.json");
const uiManifest = JSON.parse(readFileSync(uiManifestPath, "utf8"));

function resolveEsm(specifier: string, cwd: string) {
  const script = `console.log(import.meta.resolve(${JSON.stringify(specifier)}))`;
  const resolved = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd,
    encoding: "utf8",
  }).trim();

  return resolved.startsWith("file:") ? fileURLToPath(resolved) : resolved;
}

const uiEntry = resolveEsm("@repro/ui", docsDir);

const classify = (target: string) => {
  const normalized = target.replaceAll("\\", "/");
  if (normalized.includes("/packages/ui/dist/")) return "workspace-dist";
  if (normalized.includes("/packages/ui/src/")) return "workspace-source";
  if (normalized.includes("/node_modules/.pnpm/")) return "pnpm-store";
  return "other";
};

const output = {
  docsContext: relative(repoRoot, docsDir).replaceAll("\\", "/"),
  uiPhysicalRoot: relative(repoRoot, uiRoot).replaceAll("\\", "/"),
  uiManifest: {
    main: uiManifest.main,
    module: uiManifest.module,
    types: uiManifest.types,
    exportsImport: uiManifest.exports?.["."]?.import,
    exportsTypes: uiManifest.exports?.["."]?.types,
  },
  resolvedFromDocs: {
    path: uiEntry,
    relativePath: relative(repoRoot, uiEntry).replaceAll("\\", "/"),
    class: classify(uiEntry),
  },
  resolvedFromUiPackage: {
    elementPlus: resolveEsm("element-plus", uiRoot),
    vueUse: resolveEsm("@vueuse/core", uiRoot),
    sharedCore: resolveEsm("@repro/shared-core", uiRoot),
  },
};

console.log("# workspace UI 入口解析探针");
console.log(JSON.stringify(output, null, 2));
