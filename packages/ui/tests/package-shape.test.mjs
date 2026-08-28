import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("UI 包保留生产复杂依赖", () => {
  assert.equal(manifest.dependencies["element-plus"], "2.13.6");
  assert.equal(manifest.dependencies["@vueuse/core"], "14.2.1");
});
