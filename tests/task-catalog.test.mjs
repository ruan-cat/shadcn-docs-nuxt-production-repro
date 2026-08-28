import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const catalog = await readFile(
  new URL("../docs/task-artifacts/failure-catalog.md", import.meta.url),
  "utf8",
);

const requiredIds = Array.from({ length: 46 }, (_, index) => `F${String(index + 1).padStart(2, "0")}`);

test("完整故障目录 F01-F46 不得意外丢失", () => {
  for (const id of requiredIds) {
    assert.ok(catalog.includes(`## ${id}`), `缺少故障条目 ${id}`);
  }
});
