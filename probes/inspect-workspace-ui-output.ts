import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const normalize = (value: string) => value.replaceAll("\\", "/");
const scanRoots = [
  join(repoRoot, "apps/docs/.nuxt/dist/server"),
  join(repoRoot, "apps/docs/.output/server"),
];

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const target = join(directory, entry);
    const stat = statSync(target);
    if (stat.isDirectory()) {
      files.push(...walk(target));
    } else if (/\.(?:mjs|js|json|map)$/.test(entry)) {
      files.push(target);
    }
  }
  return files;
}

const scannedFiles = scanRoots.flatMap(walk);
const sourceFiles: string[] = [];
const distFiles: string[] = [];
const sourceSamples: Array<{ file: string; match: string }> = [];
const distSamples: Array<{ file: string; match: string }> = [];
const workspaceMapSources: Array<{
  file: string;
  sourceCount: number;
  sources: string[];
}> = [];

for (const file of scannedFiles) {
  const content = normalize(readFileSync(file, "utf8"));
  const relativeFile = normalize(relative(repoRoot, file));

  if (content.includes("packages/ui/src/")) {
    sourceFiles.push(relativeFile);
    if (sourceSamples.length < 20) {
      const index = content.indexOf("packages/ui/src/");
      sourceSamples.push({
        file: relativeFile,
        match: content.slice(Math.max(0, index - 90), index + 180),
      });
    }
  }

  if (content.includes("packages/ui/dist/")) {
    distFiles.push(relativeFile);
    if (distSamples.length < 20) {
      const index = content.indexOf("packages/ui/dist/");
      distSamples.push({
        file: relativeFile,
        match: content.slice(Math.max(0, index - 90), index + 180),
      });
    }
  }

  if (
    basename(file).startsWith("WorkspaceRuntimeProbe-") &&
    file.endsWith(".mjs.map")
  ) {
    try {
      const sourceMap = JSON.parse(content);
      const sources = Array.isArray(sourceMap.sources)
        ? sourceMap.sources.map((value: unknown) => normalize(String(value)))
        : [];
      workspaceMapSources.push({
        file: relativeFile,
        sourceCount: sources.length,
        sources: sources.slice(0, 20),
      });
    } catch {
      // 诊断辅助信息，不让单个非 JSON map 阻断主扫描。
    }
  }
}

const result = {
  scannedRoots: scanRoots.map((root) => normalize(relative(repoRoot, root))),
  scannedFileCount: scannedFiles.length,
  uiSourcePathFileCount: sourceFiles.length,
  uiDistPathFileCount: distFiles.length,
  uiSourcePathFiles: sourceFiles.slice(0, 50),
  uiDistPathFiles: distFiles.slice(0, 50),
  sourceSamples,
  distSamples,
  workspaceMapSources,
};

console.log("# R10 Nuxt/Vite/Nitro 生成图 workspace UI 路径证据");
console.log(JSON.stringify(result, null, 2));

if (sourceFiles.length === 0) {
  throw new Error(
    "R10 provenance 未证明：扫描 .nuxt/dist/server 与 .output/server 后仍未发现 packages/ui/src 路径",
  );
}
