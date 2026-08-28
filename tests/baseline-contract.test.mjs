import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

const rootManifest = await readJson("package.json");
const docsManifest = await readJson("apps/docs/package.json");
const apiManifest = await readJson("apps/api/package.json");

test("控制组固定 Nuxt 3 / Content / H3 / shadcn-docs 版本", () => {
  assert.equal(docsManifest.dependencies.nuxt, "3.21.2");
  assert.equal(docsManifest.dependencies["shadcn-docs-nuxt"], "1.1.9");
  assert.equal(docsManifest.dependencies["@ztl-uwu/nuxt-content"], "2.13.9");
  assert.equal(docsManifest.dependencies.h3, "1.15.11");
});

test("根 overrides 固定 Content 与 Nuxt 3 OG Image 控制线", () => {
  assert.equal(rootManifest.pnpm.overrides["@ztl-uwu/nuxt-content"], "2.13.9");
  assert.equal(rootManifest.pnpm.overrides["nuxt-og-image"], "5.1.9");
});

test("独立 Nitro API 不直接依赖 docs 运行时", () => {
  assert.equal(apiManifest.dependencies.nuxt, undefined);
  assert.equal(apiManifest.dependencies.h3, undefined);
  assert.equal(apiManifest.dependencies["shadcn-docs-nuxt"], undefined);
  assert.equal(apiManifest.dependencies["@ztl-uwu/nuxt-content"], undefined);
});
