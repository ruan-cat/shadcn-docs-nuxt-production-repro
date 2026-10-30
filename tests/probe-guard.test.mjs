import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const probe = await readFile(new URL("../probes/content-smoke.ts", import.meta.url), "utf8");

/**
 * F49 守卫：探针必须保留「端口占用即拒绝」与「应答者身份校验」两道门。
 *
 * 背景（R45 首轮冒烟整轮判废）：探针的 waitForServer 只看 fetch 有没有应答，
 * 端口被上一轮遗留的 standalone 占着时，新 spawn 的子进程根本起不来（EADDRINUSE），
 * 而 fetch 被**旧服务**应答 ⇒ 探针把旧服务的响应当成本次产物的结果 ⇒ 假 PASS / 假 FAIL 双向风险。
 *
 * 期望值在这里**独立硬编码**，不从探针源码派生（避免元守卫退化成恒真式）。
 */
const REQUIRED_PROBE_GUARDS = [
	{
		id: "port-occupied-precheck",
		why: "spawn 前必须检测目标端口是否已被占用，占用即拒绝（不得复用既有服务）",
		patterns: ["isPortOccupied", "端口 ${port} 已被占用，拒绝复用既有服务", "allowPortReuse"],
	},
	{
		id: "responder-identity",
		why: "就绪判据必须来自子进程自己打印的 Listening 行（而非 fetch 有应答），据此确认应答者身份",
		patterns: ["LISTENING_PATTERN", "Listening on", "应答者身份不一致"],
	},
];

/**
 * 关键：不能只检查「函数名/字符串在文件里出现过」——
 * 那样「定义还在、调用点被拆」也会全绿（恒真式）。
 * 下面这组**调用点锚点**必须以「调用形态」出现，拆掉调用点即变红。
 */
const REQUIRED_PROBE_CALL_SITES = [
	{
		id: "port-occupied-precheck-call-site",
		why: "spawn 前的端口预检必须真的被调用",
		pattern: "await isPortOccupied(port)",
	},
	{
		id: "responder-identity-call-site",
		why: "waitForServer 必须真的拿子进程日志做 Listening 匹配",
		pattern: "LISTENING_PATTERN.exec(log)",
	},
	{
		id: "responder-identity-passed-in",
		why: "waitForServer 必须接收到子进程日志回调（否则拿不到 Listening 行）",
		pattern: "await waitForServer(base, child, serverLog)",
	},
];

test("F49 探针必须保留端口占用预检与应答者身份校验两道门", () => {
	for (const guard of REQUIRED_PROBE_GUARDS) {
		for (const pattern of guard.patterns) {
			assert.ok(probe.includes(pattern), `探针缺少 F49 守卫 ${guard.id} 的关键实现「${pattern}」——${guard.why}`);
		}
	}
});

test("F49 守卫的期望值清单本身不得为空（防元守卫退化成恒真式）", () => {
	assert.ok(REQUIRED_PROBE_GUARDS.length >= 2, "F49 守卫期望清单至少要有两道门");
	for (const guard of REQUIRED_PROBE_GUARDS) {
		assert.ok(guard.patterns.length > 0, `F49 守卫 ${guard.id} 的期望 pattern 列表为空`);
		assert.ok(guard.why.length > 0, `F49 守卫 ${guard.id} 缺少判定理由说明`);
	}
});

test("F49 的调用点必须真的被调用（定义还在不算数）", () => {
	for (const site of REQUIRED_PROBE_CALL_SITES) {
		assert.ok(probe.includes(site.pattern), `探针缺少 F49 调用点 ${site.id}：「${site.pattern}」——${site.why}`);
	}
});

test("探针不得只靠 fetch 有应答就判定就绪（那正是 R45 判废的根因）", () => {
	// waitForServer 的就绪返回必须由 Listening 行的匹配驱动。
	// 断言：函数体内出现 LISTENING_PATTERN 匹配，且匹配失败时不会直接 return。
	const fnStart = probe.indexOf("async function waitForServer(");
	assert.ok(fnStart > 0, "探针里找不到 waitForServer");
	const fnBody = probe.slice(fnStart, probe.indexOf("\n}\n", fnStart));
	assert.ok(
		fnBody.includes("LISTENING_PATTERN.exec(log)"),
		"waitForServer 必须用 LISTENING_PATTERN 匹配子进程日志来确认就绪与应答者身份",
	);
});
