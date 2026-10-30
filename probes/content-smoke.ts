/**
 * F47 第二层：Content API 响应体级 smoke 探针。
 *
 * 旧版只探 /api/_content/cache.json 与 /api/_content/search，断言只有 response.ok。
 * 这两条 URL 是 content v2 的 dev-only 路径，生产构建里根本不是路由，会落到上游 layer
 * 的 catch-all 页面，被渲染成「HTTP 200 + HTML 404 shell」的假阳性——探针因此一直在假绿。
 *
 * 新版行为：
 *   1. 路由来源优先级：--route 显式 > 构建产物路由表扫描 > REPRO_CONTENT_ROUTES；
 *      三者都拿不到就 exit 1 并说明原因，绝不静默通过。
 *   2. 真实注册的 content 路由：HTTP 200 + Content-Type 非 text/html + JSON.parse 成功
 *      + 顶层键与具体文档断言（_path / title / documentIds）。
 *   3. 未注册的 Content API 路径（canonical 的 cache.json / search，以及零段裸前缀
 *      /api/_content 与 /api/_content/）：HTTP 404，且响应体不是 HTML 404 shell。
 *
 * 构建指纹（content v2 的 buildIntegrity = Date.now()）每次 nuxt build 都会变，
 * 因此源码内不写死任何指纹，一律运行时从构建产物读取。
 *
 * 用法：
 *   pnpm probe:content <server-entry>            # 自己 spawn standalone（默认端口 3413）
 *   pnpm probe:content --base <url>               # 打已经在跑的服务
 *   pnpm probe:content <server-entry> --route /api/_content/query   # 显式指定路由（可重复 / 逗号分隔）
 *
 * 注意：--base 模式只消费路由来源 ①（--route）与 ③（REPRO_CONTENT_ROUTES）；
 * 来源 ②（构建产物路由表扫描）绑定在 <server-entry> 上，所以 --base 单独使用必然
 * exit 1（拒绝静默通过）。想用 --base 又不给 --route，就补一个
 * REPRO_CONTENT_ROUTES；或者干脆同时传 <server-entry>，让探针扫产物。
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const DEFAULT_PORT = "3413";
const CONTENT_PREFIX = "/api/_content/";
/**
 * 必须返回「真实 404 + 非 HTML 响应体」的路径。
 * 前两条是 content v2 的 dev-only canonical 路径（生产构建里不是路由）；
 * 后两条是 Content API 的零段裸前缀（`/**` 兜底要求前缀后至少一段，
 * 没有 index 守卫时它们同样会落到页面 catch-all → 200 + HTML 404 shell）。
 */
const MUST_BE_404_PATHS = ["/api/_content/cache.json", "/api/_content/search", "/api/_content", "/api/_content/"];
const EXPECTED_QUERY_PATHS = ["/guide/baseline", "/guide/failure-domains", "/"];
const BASELINE_PATH = "/guide/baseline";
const BASELINE_TITLE = "绿色控制组";
const PREVIEW_CHARS = 500;
const READY_ATTEMPTS = 120;
const READY_INTERVAL_MS = 500;

type RouteKind =
	| "cache"
	| "search"
	| "query"
	| "query-qid"
	| "query-qid-params"
	| "navigation"
	| "navigation-qid"
	| "navigation-qid-params";

interface Target {
	kind: RouteKind;
	template: string;
	url: string;
}

interface Failure {
	url: string;
	status: number | undefined;
	contentType: string | undefined;
	bytes: number | undefined;
	preview: string;
	pathSet: string[] | undefined;
	reasons: string[];
}

// ---------------------------------------------------------------- 参数解析

function splitRoutes(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

const argv = process.argv.slice(2);
let serverEntry: string | undefined;
let baseUrl: string | undefined;
let port = DEFAULT_PORT;
const explicitRoutes: string[] = [];

for (let index = 0; index < argv.length; index += 1) {
	const arg = argv[index]!;
	if (arg === "--base") {
		baseUrl = argv[++index];
	} else if (arg.startsWith("--base=")) {
		baseUrl = arg.slice("--base=".length);
	} else if (arg === "--route") {
		explicitRoutes.push(...splitRoutes(argv[++index] ?? ""));
	} else if (arg.startsWith("--route=")) {
		explicitRoutes.push(...splitRoutes(arg.slice("--route=".length)));
	} else if (arg === "--port") {
		port = argv[++index] ?? DEFAULT_PORT;
	} else if (arg.startsWith("--port=")) {
		port = arg.slice("--port=".length);
	} else if (arg.startsWith("-")) {
		console.error(`未知参数: ${arg}`);
		console.error("用法: pnpm probe:content <server-entry> [--port 3413] [--route <path>]...");
		console.error("      pnpm probe:content --base <url> [--route <path>]...");
		process.exit(2);
	} else {
		serverEntry = arg;
	}
}

// ---------------------------------------------------------------- 产物扫描

function collectMjsFiles(dir: string): string[] {
	const found: string[] = [];
	const stack: string[] = [dir];
	while (stack.length > 0) {
		const current = stack.pop()!;
		let entries;
		try {
			entries = readdirSync(current, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			const full = join(current, entry.name);
			if (entry.isDirectory()) {
				// 路由表由 Nitro 产物生成在 chunks/ 下；node_modules 只是运行时依赖，无需扫描。
				if (entry.name === "node_modules") continue;
				stack.push(full);
			} else if (entry.isFile() && entry.name.endsWith(".mjs")) {
				found.push(full);
			}
		}
	}
	return found;
}

interface ArtifactScan {
	routes: string[];
	integrity: string | undefined;
}

function scanArtifact(serverEntryPath: string): ArtifactScan {
	const dir = dirname(resolve(serverEntryPath));
	const routes = new Set<string>();
	let integrity: string | undefined;

	for (const file of collectMjsFiles(dir)) {
		let source: string;
		try {
			source = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		for (const match of source.matchAll(/route:\s*['"]([^'"]+)['"]/g)) {
			const route = match[1]!;
			if (route.startsWith(CONTENT_PREFIX)) routes.add(route);
		}
		if (!integrity) {
			const match = source.match(/["']integrity["']\s*:\s*["']?(\d{10,})["']?/);
			if (match) integrity = match[1];
		}
	}

	return { routes: [...routes], integrity };
}

/**
 * 依据 runtimeConfig.public.content.integrity 反推带指纹的真实路由。
 * 路由表扫描拿不到时的兜底来源；指纹同样只在运行时读取，不写死在源码里。
 */
function routesFromIntegrity(integrity: string): string[] {
	return [`${CONTENT_PREFIX}cache.${integrity}.json`, `${CONTENT_PREFIX}search-${integrity}`];
}

// ---------------------------------------------------------------- 路由分类

/**
 * 路由形态识别。产物路由表里的模板（:qid / **:params）与用户显式给的
 * 具体 URL（/api/_content/query/index.md）映射到同一个 kind。
 */
function classify(template: string): RouteKind | undefined {
	if (/^\/api\/_content\/cache\.\d+\.json$/.test(template)) return "cache";
	if (/^\/api\/_content\/search-\d+$/.test(template)) return "search";
	if (template === "/api/_content/query") return "query";
	if (template === "/api/_content/navigation") return "navigation";
	if (/^\/api\/_content\/query\/[^/]+$/.test(template)) return "query-qid";
	if (/^\/api\/_content\/query\/[^/]+\/[^/]+$/.test(template)) {
		return "query-qid-params";
	}
	if (/^\/api\/_content\/navigation\/[^/]+$/.test(template)) return "navigation-qid";
	if (/^\/api\/_content\/navigation\/[^/]+\/[^/]+$/.test(template)) {
		return "navigation-qid-params";
	}
	return undefined;
}

function encodeQueryParams(value: unknown): string {
	return Buffer.from(JSON.stringify(value))
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

// ---------------------------------------------------------------- HTTP 辅助

interface Fetched {
	status: number;
	contentType: string | undefined;
	text: string;
	bytes: number;
}

async function fetchText(url: string): Promise<Fetched> {
	const response = await fetch(url);
	const text = await response.text();
	return {
		status: response.status,
		contentType: response.headers.get("content-type") ?? undefined,
		text,
		bytes: Buffer.byteLength(text),
	};
}

function isHtmlShell(contentType: string | undefined, text: string): boolean {
	if (contentType?.toLowerCase().includes("text/html")) return true;
	return /<!doctype html/i.test(text) || /<html[\s>]/i.test(text);
}

function collectPathSet(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const paths: string[] = [];
	for (const item of value) {
		if (item && typeof item === "object" && "_path" in item) {
			paths.push(String((item as { _path: unknown })._path));
		}
	}
	return paths;
}

function sameSet(actual: string[], expected: string[]): boolean {
	if (actual.length !== expected.length) return false;
	const left = [...actual].sort();
	const right = [...expected].sort();
	return left.every((item, index) => item === right[index]);
}

function findDoc(value: unknown, path: string): Record<string, unknown> | undefined {
	if (!Array.isArray(value)) return undefined;
	for (const item of value) {
		if (item && typeof item === "object" && (item as { _path?: unknown })._path === path) {
			return item as Record<string, unknown>;
		}
	}
	return undefined;
}

function findNavPath(value: unknown, path: string): boolean {
	if (!Array.isArray(value)) return false;
	for (const item of value) {
		if (!item || typeof item !== "object") continue;
		const node = item as { _path?: unknown; children?: unknown };
		if (node._path === path) return true;
		if (node.children && findNavPath(node.children, path)) return true;
	}
	return false;
}

// ---------------------------------------------------------------- 断言

function assertTarget(target: Target, fetched: Fetched): Failure | undefined {
	const reasons: string[] = [];
	const contentType = fetched.contentType ?? "";
	const parsed = (() => {
		try {
			return { ok: true as const, value: JSON.parse(fetched.text) };
		} catch (error) {
			return {
				ok: false as const,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	})();

	if (fetched.status !== 200) {
		reasons.push(`期望 HTTP 200，实际 ${fetched.status}`);
	}
	if (contentType.toLowerCase().includes("text/html")) {
		reasons.push(`期望 Content-Type 不是 text/html，实际 ${contentType}`);
	}
	if (!parsed.ok) {
		reasons.push(`响应体 JSON.parse 失败：${parsed.error}`);
	}

	let pathSet: string[] | undefined;

	if (parsed.ok) {
		const value = parsed.value;
		switch (target.kind) {
			case "cache": {
				const cache = value as { contents?: unknown };
				if (!cache || typeof cache !== "object" || !("contents" in cache)) {
					reasons.push("顶层缺少 contents 键");
				} else {
					const contents = cache.contents;
					if (!Array.isArray(contents)) {
						reasons.push("contents 不是数组");
					} else {
						pathSet = collectPathSet(contents);
						if (contents.length < 3) {
							reasons.push(`contents 长度期望 >= 3，实际 ${contents.length}`);
						}
						const doc = findDoc(contents, BASELINE_PATH);
						if (!doc) {
							reasons.push(`contents 中缺少 _path === ${BASELINE_PATH} 的文档`);
						} else if (doc.title !== BASELINE_TITLE) {
							reasons.push(`${BASELINE_PATH} 的 title 期望 ${BASELINE_TITLE}，实际 ${String(doc.title)}`);
						}
					}
				}
				break;
			}
			case "search": {
				const search = value as { documentIds?: unknown };
				if (!search || typeof search !== "object" || !("documentIds" in search)) {
					reasons.push("顶层缺少 documentIds 键");
				} else {
					const ids = search.documentIds;
					const values = ids && typeof ids === "object" ? Object.values(ids as Record<string, unknown>) : [];
					if (!values.includes(BASELINE_PATH)) {
						reasons.push(`documentIds 的值里没有 ${BASELINE_PATH}`);
					}
				}
				if (!fetched.text.includes(BASELINE_TITLE)) {
					reasons.push(`响应体不包含「${BASELINE_TITLE}」`);
				}
				break;
			}
			case "query":
			case "query-qid": {
				if (!Array.isArray(value)) {
					reasons.push("响应体不是数组");
				} else {
					pathSet = collectPathSet(value);
					if (!pathSet || !sameSet(pathSet, EXPECTED_QUERY_PATHS)) {
						reasons.push(`_path 集合期望 ${JSON.stringify(EXPECTED_QUERY_PATHS)}，实际 ${JSON.stringify(pathSet)}`);
					}
					const doc = findDoc(value, BASELINE_PATH);
					if (!doc) {
						reasons.push(`数组中缺少 _path === ${BASELINE_PATH} 的文档`);
					} else if (doc.title !== BASELINE_TITLE) {
						reasons.push(`${BASELINE_PATH} 的 title 期望 ${BASELINE_TITLE}，实际 ${String(doc.title)}`);
					}
				}
				break;
			}
			case "query-qid-params": {
				if (!Array.isArray(value)) {
					reasons.push("响应体不是数组");
				} else {
					pathSet = collectPathSet(value);
					if (!pathSet || !sameSet(pathSet, [BASELINE_PATH])) {
						reasons.push(`过滤后 _path 集合期望 ${JSON.stringify([BASELINE_PATH])}，实际 ${JSON.stringify(pathSet)}`);
					}
					const doc = findDoc(value, BASELINE_PATH);
					if (doc && doc.title !== BASELINE_TITLE) {
						reasons.push(`${BASELINE_PATH} 的 title 期望 ${BASELINE_TITLE}，实际 ${String(doc.title)}`);
					}
				}
				break;
			}
			case "navigation":
			case "navigation-qid":
			case "navigation-qid-params": {
				if (!Array.isArray(value)) {
					reasons.push("响应体不是数组");
				} else if (!findNavPath(value, BASELINE_PATH)) {
					reasons.push(`导航树中找不到 _path === ${BASELINE_PATH} 的条目`);
				}
				break;
			}
		}
	}

	if (reasons.length === 0) return undefined;
	return {
		url: target.url,
		status: fetched.status,
		contentType: fetched.contentType,
		bytes: fetched.bytes,
		preview: fetched.text.slice(0, PREVIEW_CHARS),
		pathSet,
		reasons,
	};
}

function assertCanonical(path: string, fetched: Fetched): Failure | undefined {
	const reasons: string[] = [];
	if (fetched.status !== 404) {
		reasons.push(`期望 HTTP 404，实际 ${fetched.status}（200 + HTML 404 shell 就是 F47 假阳性）`);
	}
	if (isHtmlShell(fetched.contentType, fetched.text)) {
		reasons.push(`响应体是 HTML 404 shell（Content-Type=${fetched.contentType ?? "无"}），必须返回真实 404`);
	}
	if (reasons.length === 0) return undefined;
	return {
		url: path,
		status: fetched.status,
		contentType: fetched.contentType,
		bytes: fetched.bytes,
		preview: fetched.text.slice(0, PREVIEW_CHARS),
		pathSet: undefined,
		reasons,
	};
}

// ---------------------------------------------------------------- 运行时 qid

/**
 * 从运行时文档的 _id（content:<相对路径>）派生一个可用的 qid。
 * 全程运行时取值，不写死任何内容标识。
 */
async function deriveQid(base: string): Promise<string | undefined> {
	let docs: unknown;
	try {
		const response = await fetch(new URL("/api/_content/query", base));
		if (!response.ok) return undefined;
		docs = await response.json();
	} catch {
		return undefined;
	}
	if (!Array.isArray(docs)) return undefined;

	const candidates: string[] = [];
	for (const doc of docs) {
		const id = (doc as { _id?: unknown })?._id;
		if (typeof id !== "string" || !id.startsWith("content:")) continue;
		candidates.push(id.slice("content:".length).replace(/:/g, "/"));
	}

	for (const candidate of candidates) {
		try {
			const fetched = await fetchText(new URL(`${CONTENT_PREFIX}query/${candidate}`, base).toString());
			if (fetched.status !== 200) continue;
			if (isHtmlShell(fetched.contentType, fetched.text)) continue;
			JSON.parse(fetched.text);
			return candidate;
		} catch {
			continue;
		}
	}
	return undefined;
}

// ---------------------------------------------------------------- standalone

async function waitForServer(base: string, child: { exitCode: number | null }): Promise<void> {
	for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
		if (child.exitCode !== null) {
			throw new Error(`standalone 在就绪前退出，exit=${child.exitCode}`);
		}
		try {
			await fetch(base, { redirect: "manual" });
			return;
		} catch {
			await new Promise((r) => setTimeout(r, READY_INTERVAL_MS));
		}
	}
	throw new Error(`standalone 在 ${READY_ATTEMPTS * READY_INTERVAL_MS}ms 内没有响应`);
}

// ---------------------------------------------------------------- 主流程

async function main(): Promise<number> {
	// --- 路由来源优先级：显式 > 产物扫描 > 环境变量
	let templates: string[] = [];
	let source = "";
	if (explicitRoutes.length > 0) {
		templates = explicitRoutes;
		source = "explicit(--route)";
	} else if (serverEntry) {
		if (!existsSync(resolve(serverEntry))) {
			console.error(`产物入口不存在: ${resolve(serverEntry)}`);
			return 2;
		}
		const scan = scanArtifact(serverEntry);
		const fromTable = scan.routes.filter((route) => classify(route) !== undefined);
		if (fromTable.length > 0) {
			templates = fromTable;
			source = "artifact(route-table)";
		} else if (scan.integrity) {
			templates = routesFromIntegrity(scan.integrity);
			source = "artifact(runtimeConfig.integrity)";
		}
	}
	if (templates.length === 0) {
		const envRoutes = splitRoutes(process.env.REPRO_CONTENT_ROUTES ?? "");
		if (envRoutes.length > 0) {
			templates = envRoutes;
			source = "env(REPRO_CONTENT_ROUTES)";
		}
	}
	if (templates.length === 0) {
		console.error("没有可用的 Content API 路由来源：--route 未给、构建产物路由表未扫到、REPRO_CONTENT_ROUTES 为空。");
		console.error("拒绝静默通过：请用 --route 显式指定，或提供 <server-entry> 让探针扫描产物。");
		return 1;
	}

	// --- 起服务
	let child: ReturnType<typeof spawn> | undefined;
	let base: string;
	if (baseUrl) {
		base = baseUrl.replace(/\/$/, "");
	} else {
		if (!serverEntry) {
			console.error("缺少 <server-entry>，或用 --base <url> 打已经在跑的服务。");
			return 2;
		}
		const entry = resolve(serverEntry);
		base = `http://127.0.0.1:${port}`;
		child = spawn(process.execPath, [entry], {
			cwd: dirname(entry),
			env: {
				...process.env,
				HOST: "127.0.0.1",
				PORT: port,
				NITRO_HOST: "127.0.0.1",
				NITRO_PORT: port,
			},
			stdio: ["ignore", "pipe", "pipe"],
		});
		child.stdout?.on("data", (chunk) => process.stdout.write(`[server] ${chunk}`));
		child.stderr?.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));
	}

	console.log(`# Nuxt Content 响应体级探针: ${base}`);
	console.log(`# 路由来源: ${source}`);
	console.log(`# 路由模板: ${templates.join(", ")}`);

	const failures: Failure[] = [];

	try {
		if (child) await waitForServer(base, child);

		// --- 模板 -> 具体 URL
		const needsQid = templates.some((template) => template.includes(":qid"));
		const qid = needsQid ? await deriveQid(base) : undefined;
		if (needsQid && !qid) {
			failures.push({
				url: "(qid 派生)",
				status: undefined,
				contentType: undefined,
				bytes: undefined,
				preview: "",
				pathSet: undefined,
				reasons: ["无法从运行时内容派生可用的 qid，:qid 路由无法取证"],
			});
		}
		const encodedParams = encodeQueryParams({
			where: [{ _path: BASELINE_PATH }],
		});

		const targets: Target[] = [];
		for (const template of templates) {
			// 「必须真 404」的路径由独立断言覆盖，不能再按 200 断言一次。
			if (MUST_BE_404_PATHS.includes(template)) continue;

			const kind = classify(template);
			if (!kind) {
				failures.push({
					url: template,
					status: undefined,
					contentType: undefined,
					bytes: undefined,
					preview: "",
					pathSet: undefined,
					reasons: [`无法识别的 Content API 路由形态：${template}`],
				});
				continue;
			}
			let url = template;
			if (url.includes("/**:params")) {
				url = url.replace("/**:params", `/${encodedParams}`);
			}
			if (url.includes(":qid")) {
				if (!qid) {
					failures.push({
						url: template,
						status: undefined,
						contentType: undefined,
						bytes: undefined,
						preview: "",
						pathSet: undefined,
						reasons: ["无法派生 qid，无法实例化 :qid 路由"],
					});
					continue;
				}
				url = url.replace(":qid", qid);
			}
			targets.push({ kind, template, url });
		}

		// --- 真实路由断言
		for (const target of targets) {
			const fetched = await fetchText(new URL(target.url, base).toString());
			const failure = assertTarget(target, fetched);
			if (failure) {
				failures.push(failure);
				console.error(`FAIL ${target.url}`);
				console.error(`  状态码=${failure.status} Content-Type=${failure.contentType} bytes=${failure.bytes}`);
				for (const reason of failure.reasons) console.error(`  - ${reason}`);
				if (failure.pathSet) {
					console.error(`  实际 _path 集合: ${JSON.stringify(failure.pathSet)}`);
				}
				console.error(`  响应体前 ${PREVIEW_CHARS} 字符: ${failure.preview}`);
			} else {
				console.log(
					`PASS ${target.url} (${target.kind}) ${fetched.status} ${fetched.contentType} bytes=${fetched.bytes}`,
				);
			}
		}

		// --- 未注册路径必须是真实 404
		for (const path of MUST_BE_404_PATHS) {
			const fetched = await fetchText(new URL(path, base).toString());
			const failure = assertCanonical(path, fetched);
			if (failure) {
				failures.push(failure);
				console.error(`FAIL ${path}`);
				console.error(`  状态码=${failure.status} Content-Type=${failure.contentType} bytes=${failure.bytes}`);
				for (const reason of failure.reasons) console.error(`  - ${reason}`);
				console.error(`  响应体前 ${PREVIEW_CHARS} 字符: ${failure.preview}`);
			} else {
				console.log(`PASS ${path} (must-404) ${fetched.status} ${fetched.contentType} bytes=${fetched.bytes}`);
			}
		}
	} finally {
		if (child && child.exitCode === null) {
			child.kill("SIGTERM");
			await new Promise((r) => setTimeout(r, 300));
			if (child.exitCode === null) child.kill("SIGKILL");
		}
	}

	if (failures.length > 0) {
		console.error(`# 失败 ${failures.length} 项`);
		return 1;
	}
	console.log("# 全部通过");
	return 0;
}

process.exitCode = await main();
