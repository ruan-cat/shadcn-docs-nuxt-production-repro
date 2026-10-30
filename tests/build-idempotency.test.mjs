import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

const sharedCore = await readJson("packages/shared-core/package.json");
const sharedCoreBuild = sharedCore.scripts?.build ?? "";
const sharedCoreTypecheck = sharedCore.scripts?.typecheck ?? "";

test("shared-core 的构建与类型校验通道必须禁用 TypeScript 增量", () => {
	assert.ok(
		sharedCoreBuild.includes("--incremental false"),
		"packages/shared-core 的 build 脚本必须包含 --incremental false：TypeScript 增量模式下只要 tsbuildinfo 存在就 exit 0 但零 emit，Vercel 跨构建还原 node_modules/.cache/ 后 shared-core 会缺失 dist/，docs 解析 main/exports 失败即 invalid_packagejson 部署失败",
	);
	assert.ok(
		sharedCoreTypecheck.includes("--incremental false"),
		"packages/shared-core 的 typecheck 脚本必须包含 --incremental false：--noEmit 状态写进 tsbuildinfo 会污染 build 路径，同样造成 exit 0 零 emit",
	);
	assert.ok(
		/\btsc\b/.test(sharedCoreBuild),
		"packages/shared-core 的 build 脚本必须调用 tsc，否则 --incremental false 断言会在脚本被替换后静默失效",
	);
});
