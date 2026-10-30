import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readOptionalJson = async (path) => {
	try {
		return JSON.parse(await readFile(new URL(path, root), "utf8"));
	} catch (error) {
		if (error?.code === "ENOENT") return undefined;
		throw error;
	}
};

const config = await readFile(new URL("../apps/docs/nuxt.config.ts", import.meta.url), "utf8");
const workspace = await readFile(new URL("../pnpm-workspace.yaml", import.meta.url), "utf8");
const experiment = await readOptionalJson("experiment.json");

const policies = {
	nuxtConfig: {
		text: config,
		forbidden: [
			"trace: false",
			"routes.clear()",
			"noExternal",
			"externals.inline",
			"inline: [/.*/]",
			"traceAlias",
			"crawlLinks: false",
		],
	},
	pnpmWorkspace: {
		text: workspace,
		// 同一危险键必须同时枚举 camelCase 与 kebab 两种拼写。
		// 实测（2026-10-30，pnpm 10.33.0）：pnpm-workspace.yaml 只认 camelCase——写 kebab 会被 pnpm 显式
		// WARN「ignored because they are not written in camelCase」并**忽略**，不产生 public hoist；
		// 而写非法 camelCase 键则零警告、静默容忍。故契约侧按纵深防御处理：两种拼写都不得逃过字面检测。
		forbidden: ["nodeLinker: hoisted", "node-linker: hoisted", "publicHoistPattern", "public-hoist-pattern"],
	},
};

// 与上面的 forbidden 列表**独立硬编码**的期望值。
// 若二者同源（元守卫从 forbidden 派生），元守卫会退化成恒真式——删除任一拼写都不会变红，
// 这正是本守卫要防的回归：任何人对 forbidden 的删改都必须让元守卫变红。
const REQUIRED_WORKSPACE_FORBIDDEN_PATTERNS = [
	"nodeLinker: hoisted",
	"node-linker: hoisted",
	"publicHoistPattern",
	"public-hoist-pattern",
];

function allowedPatterns(group) {
	return experiment?.allowedSafetyPatterns?.[group] ?? [];
}

// 判违集合 = 出现在目标文件里、但没有被实验显式声明的危险 pattern
function violations(policy, text, allowed) {
	return policy.forbidden.filter((pattern) => text.includes(pattern) && !allowed.includes(pattern));
}

for (const [group, policy] of Object.entries(policies)) {
	test(`${group} 的危险 workaround 必须由配置型实验显式声明`, () => {
		const allowed = allowedPatterns(group);
		assert.ok(Array.isArray(allowed), `${group} allowedSafetyPatterns 必须是数组`);

		for (const pattern of allowed) {
			assert.ok(policy.forbidden.includes(pattern), `${group} 不允许声明未知安全 pattern: ${pattern}`);
			assert.equal(policy.text.includes(pattern), true, `${group} 声明了 ${pattern}，但目标文件没有实际出现该实验变量`);
		}

		// 主路径统一走 violations()，与合成样本自证共用同一判定实现，避免两套逻辑漂移。
		const found = violations(policy, policy.text, allowed);
		assert.deepEqual(found, [], `控制组不应包含未声明的危险配置：${found.join(", ")}`);
	});
}

test("pnpm-workspace 危险键必须同时枚举 camelCase 与 kebab 两种拼写", () => {
	for (const pattern of REQUIRED_WORKSPACE_FORBIDDEN_PATTERNS) {
		assert.ok(
			policies.pnpmWorkspace.forbidden.includes(pattern),
			`pnpmWorkspace 危险键列表缺少拼写 ${pattern}（治理盲区：pnpm 对非法 camelCase 键零警告）`,
		);
	}
});

test("camelCase 与 kebab 两种拼写都必须触发判违（合成样本自证）", () => {
	const samples = [
		{ text: "nodeLinker: hoisted", pattern: "nodeLinker: hoisted" },
		{ text: "node-linker: hoisted", pattern: "node-linker: hoisted" },
		{ text: "publicHoistPattern: ['*']", pattern: "publicHoistPattern" },
		{ text: "public-hoist-pattern: ['*']", pattern: "public-hoist-pattern" },
	];

	for (const { text, pattern } of samples) {
		assert.ok(violations(policies.pnpmWorkspace, text, []).includes(pattern), `危险配置 ${text} 未被判违`);
	}
});
