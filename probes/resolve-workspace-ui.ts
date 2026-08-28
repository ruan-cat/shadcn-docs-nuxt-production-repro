import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const docsManifestPath = join(repoRoot, "apps/docs/package.json");
const docsRequire = createRequire(docsManifestPath);
const uiEntry = docsRequire.resolve("@repro/ui");
const uiLink = join(repoRoot, "apps/docs/node_modules/@repro/ui");
const uiRoot = realpathSync(uiLink);
const uiManifestPath = join(uiRoot, "package.json");
const uiManifest = JSON.parse(readFileSync(uiManifestPath, "utf8"));
const uiRequire = createRequire(uiManifestPath);

const classify = (target: string) => {
  const normalized = target.replaceAll("\\", "/");
  if (normalized.includes("/packages/ui/dist/")) return "workspace-dist";
  if (normalized.includes("/packages/ui/src/")) return "workspace-source";
  if (normalized.includes("/node_modules/.pnpm/")) return "pnpm-store";
  return "other";
};

const output = {
  docsContext: relative(repoRoot, dirname(docsManifestPath)).replaceAll("\\", "/"),
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
    elementPlus: uiRequire.resolve("element-plus"),
    vueUse: uiRequire.resolve("@vueuse/core"),
    sharedCore: uiRequire.resolve("@repro/shared-core"),
  },
};

console.log("# workspace UI 入口解析探针");
console.log(JSON.stringify(output, null, 2));
