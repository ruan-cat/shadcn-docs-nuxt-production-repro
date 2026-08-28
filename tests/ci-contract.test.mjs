import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = async (path) => readFile(new URL(path, root), "utf8");

const baseline = await read(".github/workflows/ci.yaml");
const windowsStress = await read(".github/workflows/windows-stress.yaml");
const freshResolution = await read(".github/workflows/fresh-resolution.yaml");

test("普通基线 CI 必须使用 frozen lockfile，且不得保留初始化自提交", () => {
  assert.ok(baseline.includes("pnpm install --frozen-lockfile"));
  assert.equal(baseline.includes("--no-frozen-lockfile"), false);
  assert.equal(baseline.includes("freeze-control-lockfile"), false);
  assert.equal(baseline.includes("contents: write"), false);
});

test("Windows 压力实验也必须消费同一冻结依赖树", () => {
  assert.ok(windowsStress.includes("pnpm install --frozen-lockfile"));
  assert.equal(windowsStress.includes("--no-frozen-lockfile"), false);
});

test("只有 fresh-resolution 实验允许删除 lockfile 后重新解析", () => {
  assert.ok(freshResolution.includes("rm -f pnpm-lock.yaml"));
  assert.ok(freshResolution.includes("pnpm install --no-frozen-lockfile"));
});
