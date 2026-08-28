import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("Nuxt 3 控制组核心版本必须精确锁定", () => {
  assert.equal(manifest.dependencies.nuxt, "3.21.2");
  assert.equal(manifest.dependencies["shadcn-docs-nuxt"], "1.1.9");
  assert.equal(manifest.dependencies["@ztl-uwu/nuxt-content"], "2.13.9");
  assert.equal(manifest.dependencies.h3, "1.15.11");
});
