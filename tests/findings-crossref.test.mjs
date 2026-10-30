import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const experimentsDir = new URL("../docs/task-artifacts/experiments/", import.meta.url);
const findings = await readFile(new URL("FINDINGS.md", experimentsDir), "utf8");
const queue = await readFile(new URL("QUEUE.md", experimentsDir), "utf8");

/**
 * 交叉引用守卫：FINDINGS 条目号与 R{xx}.md / QUEUE.md 的引用必须**一字不差**。
 *
 * 背景（AGENTS.md §4 记录的事故）：曾发生「FINDINGS #20」实际指向正文 `## 19.` 的错位，
 * 且错位会**同时污染多处台账**（FINDINGS / R{xx}.md / QUEUE），让下游决策整体作废。
 * 本守卫把「号 → 条目」的对应关系固化为可复跑的契约测试。
 *
 * 期望值全部**独立硬编码**（下方的最小阈值与必备文件清单），
 * 不从被检查的清单派生 —— 否则守卫会退化成恒真式。
 */

/** FINDINGS 的条目号集合（从正文标题解析） */
const findingNumbers = new Set();
const findingTitles = new Map();
for (const line of findings.split(/\r?\n/)) {
	const match = /^## (\d+)\.\s+(.*)$/.exec(line);
	if (!match) {
		continue;
	}
	const number = Number(match[1]);
	assert.ok(!findingNumbers.has(number), `FINDINGS 条目号重复：#${number}`);
	findingNumbers.add(number);
	findingTitles.set(number, match[2].trim());
}

/** 档案文件（排除 _TEMPLATE.md 与本守卫自身） */
const archiveFiles = (await readdir(experimentsDir)).filter((name) => /^R\d+\.md$/.test(name)).sort();

/** 收集所有文件里指向 FINDINGS 条目的引用（两种写法都算） */
function collectFindingRefs(text) {
	const refs = [];
	for (const match of text.matchAll(/【FINDINGS #(\d+)】/g)) {
		refs.push({ number: Number(match[1]), style: "bracket" });
	}
	for (const match of text.matchAll(/\[FINDINGS #(\d+)\]/g)) {
		refs.push({ number: Number(match[1]), style: "link" });
	}
	return refs;
}

/** 独立硬编码的最低门槛：交叉引用不是空跑（防恒真式） */
const MIN_EXPECTED_CROSS_REFS = 20;
const REQUIRED_CROSS_REF_FILES = [
	{ file: "R45.md", number: 32, why: "R45 的归因订正必须指向 #32（unstorage 归因）" },
	{ file: "R46.md", number: 32, why: "R46 是 #32 的证据来源，必须回指" },
	{ file: "R35.md", number: 30, why: "R35 是 #30 的证据来源，必须回指" },
	{ file: "R36.md", number: 30, why: "R36 是 #30 的证据来源，必须回指" },
	{ file: "R37.md", number: 31, why: "R37 是 #31 的证据来源，必须回指" },
	{ file: "R38.md", number: 31, why: "R38 是 #31 的证据来源，必须回指" },
];

test("FINDINGS 条目号必须唯一且连续（不得出现断号或重号）", () => {
	assert.ok(findingNumbers.size > 0, "FINDINGS.md 没有解析到任何条目标题");
	const sorted = [...findingNumbers].sort((a, b) => a - b);
	for (let index = 0; index < sorted.length; index += 1) {
		assert.equal(
			sorted[index],
			index + 1,
			`FINDINGS 条目号必须从 1 连续编号，实际在 #${sorted[index]} 处断裂（断号会让交叉引用指向错条目）`,
		);
	}
});

test("R{xx}.md 里的 FINDINGS 交叉引用必须指向已存在的条目号", async () => {
	const broken = [];
	for (const file of archiveFiles) {
		const text = await readFile(new URL(file, experimentsDir), "utf8");
		for (const ref of collectFindingRefs(text)) {
			if (!findingNumbers.has(ref.number)) {
				broken.push(`${file} → FINDINGS #${ref.number}（${ref.style}）`);
			}
		}
	}
	assert.equal(broken.length, 0, `以下交叉引用指向不存在的 FINDINGS 条目：\n${broken.join("\n")}`);
});

test("FINDINGS.md / QUEUE.md 里的交叉引用必须指向已存在的条目号", () => {
	for (const [name, text] of [
		["FINDINGS.md", findings],
		["QUEUE.md", queue],
	]) {
		for (const ref of collectFindingRefs(text)) {
			assert.ok(findingNumbers.has(ref.number), `${name} 引用了不存在的 FINDINGS #${ref.number}（${ref.style}）`);
		}
	}
});

test("必备档案必须与指定 FINDINGS 条目互相交叉引用", async () => {
	for (const required of REQUIRED_CROSS_REF_FILES) {
		const text = await readFile(new URL(required.file, experimentsDir), "utf8");
		const refs = collectFindingRefs(text);
		assert.ok(
			refs.some((ref) => ref.number === required.number),
			`${required.file} 必须引用 FINDINGS #${required.number} —— ${required.why}`,
		);
	}
});

test("交叉引用总量不得低于门槛（防守卫空跑成恒真式）", async () => {
	let total = 0;
	for (const file of archiveFiles) {
		const text = await readFile(new URL(file, experimentsDir), "utf8");
		total += collectFindingRefs(text).length;
	}
	assert.ok(
		total >= MIN_EXPECTED_CROSS_REFS,
		`档案里的 FINDINGS 交叉引用只有 ${total} 处，低于门槛 ${MIN_EXPECTED_CROSS_REFS} —— 守卫可能已空跑`,
	);
});

test("FINDINGS / QUEUE 引用的档案文件必须真实存在（不得指向已删档案）", () => {
	const missing = [];
	for (const [name, text] of [
		["FINDINGS.md", findings],
		["QUEUE.md", queue],
	]) {
		for (const match of text.matchAll(/\[(R\d+\.md)\]\(\.\/[^)]*\)/g)) {
			const target = match[1];
			if (!archiveFiles.includes(target)) {
				missing.push(`${name} → ${target}`);
			}
		}
	}
	assert.equal(missing.length, 0, `以下档案链接指向不存在的文件：\n${missing.join("\n")}`);
});

test("每份 R{xx}.md 档案都必须在 FINDINGS 或 QUEUE 中被登记（不得成为孤儿档案）", () => {
	const orphans = archiveFiles.filter((file) => !findings.includes(file) && !queue.includes(file));
	assert.equal(orphans.length, 0, `以下档案既未被 FINDINGS 提及、也未被 QUEUE 登记：\n${orphans.join("\n")}`);
});
