import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const buildDir = join(repoRoot, "apps/docs/.output/server/chunks/build");
const mapFile = readdirSync(buildDir).find(
  (name) => name.startsWith("WorkspaceRuntimeProbe-") && name.endsWith(".mjs.map"),
);

if (!mapFile) {
  throw new Error("没有找到 WorkspaceRuntimeProbe server sourcemap");
}

const mapPath = join(buildDir, mapFile);
const sourceMap = JSON.parse(readFileSync(mapPath, "utf8"));
const sources = Array.isArray(sourceMap.sources) ? sourceMap.sources : [];
const normalize = (value: string) => value.replaceAll("\\", "/");
const normalizedSources = sources.map(normalize);
const uiSourceHits = normalizedSources.filter((source: string) =>
  source.includes("packages/ui/src/"),
);
const uiDistHits = normalizedSources.filter((source: string) =>
  source.includes("packages/ui/dist/"),
);

const result = {
  mapFile,
  sourceCount: normalizedSources.length,
  uiSourceHits,
  uiDistHits,
};

console.log("# R10 server sourcemap workspace UI 入口证据");
console.log(JSON.stringify(result, null, 2));

if (uiSourceHits.length === 0) {
  throw new Error("R10 无效：server sourcemap 没有出现 packages/ui/src，无法证明 source alias 进入构建图");
}
