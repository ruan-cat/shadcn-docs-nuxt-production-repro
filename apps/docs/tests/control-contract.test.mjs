import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("Docs 包保持可独立构建的 Nuxt 应用结构", () => {
  assert.equal(manifest.private, true);
  assert.equal(manifest.type, "module");
  assert.equal(manifest.scripts.prepare, "nuxt prepare");
  assert.equal(manifest.scripts.build, "nuxt build");
  assert.equal(manifest.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(typeof manifest.dependencies.nuxt, "string");
  assert.equal(typeof manifest.dependencies["shadcn-docs-nuxt"], "string");
  assert.equal(typeof manifest.dependencies["@ztl-uwu/nuxt-content"], "string");
});

test("核心依赖与 workspace edge 由根级 experiment-aware 契约统一校验", () => {
  assert.ok(manifest.dependencies.nuxt);
  assert.ok(manifest.dependencies["shadcn-docs-nuxt"]);
  assert.ok(manifest.dependencies["@ztl-uwu/nuxt-content"]);
});
