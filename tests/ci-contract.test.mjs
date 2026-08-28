import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = async (path) => readFile(new URL(path, root), "utf8");

const baseline = await read(".github/workflows/ci.yaml");
const windowsStress = await read(".github/workflows/windows-stress.yaml");
const freshResolution = await read(".github/workflows/fresh-resolution.yaml");
const experimentLockfile = await read(".github/workflows/experiment-lockfile.yaml");

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

test("fresh-resolution 实验允许删除 lockfile 后重新解析，但不得写回 control", () => {
  assert.ok(freshResolution.includes("rm -f pnpm-lock.yaml"));
  assert.ok(freshResolution.includes("pnpm install --no-frozen-lockfile"));
  assert.equal(freshResolution.includes("contents: write"), false);
  assert.equal(freshResolution.includes("git push"), false);
});

test("实验 lockfile 自动刷新必须限制在同仓 experiment 分支，并且只提交 pnpm-lock.yaml", () => {
  assert.ok(experimentLockfile.includes("github.event.pull_request.head.repo.full_name == github.repository"));
  assert.ok(experimentLockfile.includes("startsWith(github.head_ref, 'experiment/')"));
  assert.ok(experimentLockfile.includes("pnpm install --lockfile-only --no-frozen-lockfile"));
  assert.ok(experimentLockfile.includes("grep -v '^pnpm-lock.yaml$'"));
  assert.ok(experimentLockfile.includes("git add pnpm-lock.yaml"));
  assert.ok(experimentLockfile.includes("📦 deps: 刷新单变量实验依赖树"));
});
