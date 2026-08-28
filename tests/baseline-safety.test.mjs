import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const config = await readFile(new URL("../apps/docs/nuxt.config.ts", import.meta.url), "utf8");
const workspace = await readFile(new URL("../pnpm-workspace.yaml", import.meta.url), "utf8");

test("控制组不预置危险构建 workaround", () => {
  const forbidden = [
    "trace: false",
    "routes.clear()",
    "noExternal",
    "externals.inline",
    "inline: [/.*/]",
  ];

  for (const pattern of forbidden) {
    assert.equal(config.includes(pattern), false, `控制组不应包含 ${pattern}`);
  }
});

test("控制组不启用全局 hoisted linker", () => {
  assert.equal(workspace.includes("nodeLinker: hoisted"), false);
  assert.equal(workspace.includes("publicHoistPattern"), false);
});
