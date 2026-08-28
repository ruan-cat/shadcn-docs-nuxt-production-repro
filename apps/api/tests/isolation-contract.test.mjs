import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("独立 API 不得直接依赖 Nuxt/Content/shadcn docs", () => {
  assert.equal(manifest.dependencies.nuxt, undefined);
  assert.equal(manifest.dependencies["shadcn-docs-nuxt"], undefined);
  assert.equal(manifest.dependencies["@ztl-uwu/nuxt-content"], undefined);
});
