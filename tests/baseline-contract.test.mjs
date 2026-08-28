import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const readOptionalJson = async (path) => {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
};

const control = await readJson("experiments/control.json");
const experiment = await readOptionalJson("experiment.json");
const rootManifest = await readJson("package.json");
const docsManifest = await readJson("apps/docs/package.json");
const apiManifest = await readJson("apps/api/package.json");
const uiManifest = await readJson("packages/ui/package.json");

function expected(group, key) {
  const overrideGroup = experiment?.expected?.[group];
  if (overrideGroup && Object.prototype.hasOwnProperty.call(overrideGroup, key)) {
    return overrideGroup[key];
  }
  return control[group][key];
}

function assertOptionalValue(actualObject, key, expectedValue, label) {
  if (expectedValue === null) {
    assert.equal(actualObject[key], undefined, `${label} 应不存在`);
  } else {
    assert.equal(actualObject[key], expectedValue, `${label} 应为 ${expectedValue}`);
  }
}

function assertDependencyGroup(manifest, group, label) {
  for (const key of Object.keys(control[group])) {
    assertOptionalValue(
      manifest.dependencies,
      key,
      expected(group, key),
      `${label} dependencies.${key}`,
    );
  }
}

test("control 或实验声明必须精确约束 Nuxt / Content / H3 / shadcn-docs", () => {
  assertDependencyGroup(docsManifest, "docsDependencies", "apps/docs");
});

test("control 或实验声明必须精确约束根 overrides", () => {
  for (const key of Object.keys(control.rootOverrides)) {
    assertOptionalValue(
      rootManifest.pnpm.overrides,
      key,
      expected("rootOverrides", key),
      `root pnpm.overrides.${key}`,
    );
  }
});

test("control 或实验声明必须精确约束 workspace dependency edges", () => {
  assertDependencyGroup(docsManifest, "docsWorkspaceDependencies", "apps/docs");
  assertDependencyGroup(apiManifest, "apiWorkspaceDependencies", "apps/api");
  assertDependencyGroup(uiManifest, "uiWorkspaceDependencies", "packages/ui");
});

test("独立 Nitro API 不直接依赖 docs 运行时", () => {
  assert.equal(apiManifest.dependencies.nuxt, undefined);
  assert.equal(apiManifest.dependencies.h3, undefined);
  assert.equal(apiManifest.dependencies["shadcn-docs-nuxt"], undefined);
  assert.equal(apiManifest.dependencies["@ztl-uwu/nuxt-content"], undefined);
});

test("实验声明只能覆盖已知核心字段，且必须真的偏离 control", () => {
  if (!experiment) return;

  assert.match(experiment.id, /^R\d{2}$/);
  assert.equal(typeof experiment.reason, "string");
  assert.ok(experiment.reason.trim().length >= 10, "experiment.reason 需要解释实验目的");
  assert.equal(typeof experiment.expected, "object");

  let changed = 0;
  for (const [group, values] of Object.entries(experiment.expected)) {
    assert.ok(Object.prototype.hasOwnProperty.call(control, group), `未知实验分组: ${group}`);
    assert.equal(typeof values, "object");

    for (const [key, value] of Object.entries(values)) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(control[group], key),
        `实验不允许覆盖未知核心字段: ${group}.${key}`,
      );
      assert.notDeepEqual(value, control[group][key], `${group}.${key} 必须真实偏离 control`);
      changed += 1;
    }
  }

  assert.ok(changed >= 1, "实验声明至少需要一个真实偏离 control 的字段");
});
