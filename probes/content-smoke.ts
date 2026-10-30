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
 *   4. 期望的文档集合不再写死：运行时扫描内容目录，按 content v2 的 _path 生成规则
 *      推导出「该目录会产出哪些 _path」，锚点文档的 title 也从它的 frontmatter 读出。
 *      内容目录增删文档不再需要手工同步本文件（见「内容目录推导」一节）。
 *   5. F47 第三层守卫：
 *      - 单段 query 路由 /api/_content/query/<qid> 缺 _params 时必须被守卫打成
 *        HTTP 400 + JSON 指引（否则 content v2 会 .find() 返回全部文档，是弱门）；
 *        派生 qid 时因此必须带上同一份 _params。
 *      - 运行时不存在的页面必须返回真实 HTTP 404（上游 layer 的 catch-all 会渲染
 *        「200 + HTML 404 shell」）。页面 404 的响应体就是 Nuxt 的 HTML 错误页，
 *        所以这条只断言状态码，不要求非 HTML。
 *
 * 构建指纹（content v2 的 buildIntegrity = Date.now()）每次 nuxt build 都会变，
 * 因此源码内不写死任何指纹，一律运行时从构建产物读取。
 *
 * 用法：
 *   pnpm probe:content <server-entry>            # 自己 spawn standalone（默认端口 3413）
 *   pnpm probe:content --base <url>               # 打已经在跑的服务
 *   pnpm probe:content <server-entry> --route /api/_content/query   # 显式指定路由（可重复 / 逗号分隔）
 *   pnpm probe:content <server-entry> --content-dir apps/docs/content  # 覆盖内容目录（也可用 REPRO_CONTENT_DIR）
 *
 * 注意：--base 模式只消费路由来源 ①（--route）与 ③（REPRO_CONTENT_ROUTES）；
 * 来源 ②（构建产物路由表扫描）绑定在 <server-entry> 上，所以 --base 单独使用必然
 * exit 1（拒绝静默通过）。想用 --base 又不给 --route，就补一个
 * REPRO_CONTENT_ROUTES；或者干脆同时传 <server-entry>，让探针扫产物。
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = "3413";
const CONTENT_PREFIX = "/api/_content/";
/**
 * 必须返回「真实 404 + 非 HTML 响应体」的路径。
 * 前两条是 content v2 的 dev-only canonical 路径（生产构建里不是路由）；
 * 后两条是 Content API 的零段裸前缀（`/**` 兜底要求前缀后至少一段，
 * 没有 index 守卫时它们同样会落到页面 catch-all → 200 + HTML 404 shell）。
 */
const MUST_BE_404_PATHS = ["/api/_content/cache.json", "/api/_content/search", "/api/_content", "/api/_content/"];
/**
 * 运行时不存在的页面路径。
 * F47 第三层：上游 layer 的 catch-all 会把不存在的页面渲染成「HTTP 200 + HTML 404 shell」，
 * 页面中间件必须把它升级为真实 HTTP 404。
 * 注意语义差异：页面 404 的响应体就是 Nuxt 的 HTML 错误页，
 * 所以这里只断言状态码是 404，**不**要求非 HTML（那是 API 路由的要求）。
 */
const MISSING_PAGE_PATH = "/no-such-page-xyz";
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
let contentDirOption: string | undefined;
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
	} else if (arg === "--content-dir") {
		contentDirOption = argv[++index];
	} else if (arg.startsWith("--content-dir=")) {
		contentDirOption = arg.slice("--content-dir=".length);
	} else if (arg.startsWith("-")) {
		console.error(`未知参数: ${arg}`);
		console.error("用法: pnpm probe:content <server-entry> [--port 3413] [--route <path>] [--content-dir <dir>]...");
		console.error("      pnpm probe:content --base <url> [--route <path>]...");
		process.exit(2);
	} else {
		serverEntry = arg;
	}
}

// ---------------------------------------------------------------- 内容目录推导

/**
 * 期望的文档集合不再写死成常量：运行时扫描内容目录，按 content v2 的 _path 生成规则
 * 推导出「该目录会产出哪些 _path」，锚点文档的 title 也从它的 frontmatter 读出。
 * 内容目录增删文档时不需要再手工同步本文件。
 *
 * _path 生成规则抄自 @ztl-uwu/nuxt-content@2.13.9 的
 * dist/runtime/transformers/path-meta.js（describeId / generatePath / refineUrlPart）：
 *   1. 相对内容目录的文件路径去掉扩展名得到 _stem（分隔符统一成 /）；
 *   2. _stem 按 / 拆段，每段先过 refineUrlPart：
 *        - 纯 semver 段（1.2 / 1.2.3）原样保留；
 *        - 其它段剥掉一层「数字.」排序前缀（1.guide -> guide）；
 *        - index（可带 .draft）整段清空；
 *        - 结尾的 .draft 去掉；
 *   3. 每段再做 slugify（lower=true），用 / 连接；
 *   4. 去尾斜杠、补首斜杠。
 * 于是 index.md -> "/"、1.guide/1.baseline.md -> "/guide/baseline"。
 *
 * 集合口径与生产查询保持一致：
 *   - draft（_stem 含 .draft，或 frontmatter draft: true）在生产查询里被
 *     `_draft != true` 过滤掉，不计入期望集合；
 *   - partial（_stem 某段以 _ 开头）当前 content v2 的 /api/_content/query 链路
 *     没有 _partial 过滤（只有导航与搜索索引过滤 _partial），所以计入期望集合，
 *     但它不在导航树与搜索索引里，因此不能当锚点。
 */
const DEFAULT_CONTENT_DIR = "apps/docs/content";
const CONTENT_DIR_ENV = "REPRO_CONTENT_DIR";
/** content v2 的 markdown transformer 只认 .md（正则未锚定，.mdc 同样命中）。 */
const MARKDOWN_FILE_PATTERN = /\.(md|mdc)$/i;
/** content v2 refineUrlPart 里的 semver 白名单：这类段名不能被当成排序前缀剥掉。 */
const SEMVER_PATTERN = /^(\d+)(\.\d+)*(\.x)?$/;
/** slugify 的字符白名单（slugify@1.6.9 的 remove 默认值）。 */
const SLUGIFY_KEEP_PATTERN = /[^\w\s$*_+~.()'"!\-:@]+/g;
/** 探针文件所在目录的上一级即仓库根；用它做基准，避免依赖调用方的 cwd。 */
const repoRoot = fileURLToPath(new URL("../", import.meta.url));

interface ContentDoc {
	/** 相对内容目录的路径（POSIX 分隔符，含扩展名） */
	relativePath: string;
	/** 按 content v2 规则推导出的 _path */
	path: string;
	/** frontmatter title（缺失时回落到 content v2 的 generateTitle 规则） */
	title: string;
	/** 是否 draft（生产查询会过滤掉，不计入期望集合） */
	draft: boolean;
	/** 是否 partial（_ 前缀；不出现在导航与搜索索引里，不能当锚点） */
	partial: boolean;
}

interface ContentInventory {
	/** 内容目录绝对路径 */
	dir: string;
	/** 参与断言的 _path 集合（去重 + 排序） */
	paths: string[];
	/** 锚点文档（稳定锚点，用于 title / documentIds / 导航断言） */
	anchor: ContentDoc;
}

function withoutTrailingSlash(value: string): string {
	return value.endsWith("/") ? value.slice(0, -1) : value;
}

function withLeadingSlash(value: string): string {
	if (!value) return "/";
	return value.startsWith("/") ? value : `/${value}`;
}

/** content v2 refineUrlPart 的等价实现。 */
function refineUrlPart(name: string): string {
	const last = name.split(/[/:]/).pop() ?? "";
	if (SEMVER_PATTERN.test(last)) return last;
	return last
		.replace(/(\d+\.)?(.*)/, "$2")
		.replace(/^index(\.draft)?$/, "")
		.replace(/\.draft$/, "");
}

/**
 * slugify@1.6.9（options: { lower: true }）的最小等价实现。
 * 复刻了「字符白名单 -> 去首尾空白 -> 连续空白折叠成 - -> 小写」；
 * 未复刻 slugify 的 Unicode 转写表（charMap），含特殊 Unicode 符号的文件名
 * 可能与 content v2 有偏差（见交付说明的遗留风险）。
 */
function slugifyPart(value: string): string {
	return value.normalize().replace(SLUGIFY_KEEP_PATTERN, "").trim().replace(/\s+/g, "-").toLowerCase();
}

/** content v2 generatePath 的等价实现：_stem -> _path。 */
function deriveContentPath(stem: string): string {
	const parts = stem.split("/").map((part) => slugifyPart(refineUrlPart(part)));
	return withLeadingSlash(withoutTrailingSlash(parts.join("/")));
}

/**
 * content v2 generateTitle 的等价实现（frontmatter 没有 title 时的回落）。
 * scule 的 pascalCase 在这里简化为「首字母大写」，对单段英文名结果一致。
 */
function generateTitle(basename: string): string {
	return refineUrlPart(basename)
		.split(/[\s-]/g)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

/**
 * 最小 frontmatter 读取实现。
 * 仓库根没有 yaml / js-yaml 直依赖，按纪律不新增依赖，
 * 因此这里只解析用得上的顶层标量：title 与 draft。
 * 不支持多行标量、锚点、嵌套结构与 YAML 锚点引用。
 */
function readFrontmatter(source: string): { title?: string; draft: boolean } {
	const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
	if (!block) return { draft: false };
	const body = block[1] ?? "";
	const title = /^title[ \t]*:[ \t]*(.*)$/m.exec(body);
	const draft = /^draft[ \t]*:[ \t]*(.*)$/m.exec(body);
	return {
		title: title ? unquoteScalar(title[1]!) : undefined,
		draft: draft ? /^(true|yes)$/i.test(draft[1]!.trim()) : false,
	};
}

function unquoteScalar(value: string): string {
	const trimmed = value.trim();
	const first = trimmed.charAt(0);
	const last = trimmed.charAt(trimmed.length - 1);
	if (trimmed.length >= 2 && (first === '"' || first === "'") && first === last) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

/** 递归收集内容目录下的 markdown 文件。 */
function collectContentFiles(root: string): string[] {
	const found: string[] = [];
	const stack: string[] = [root];
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
				stack.push(full);
			} else if (entry.isFile() && MARKDOWN_FILE_PATTERN.test(entry.name)) {
				found.push(full);
			}
		}
	}
	return found;
}

/**
 * 从内容目录推导期望的文档集合与锚点文档。
 *
 * 锚点规则：取 _path 字典序最小的「非根、非 partial、非 draft」文档；
 * 这样锚点既在导航树里、也在搜索索引里，且不随无关文档增删而漂移。
 * 若内容目录里只有根文档，则退回根文档。
 */
function buildContentInventory(dir: string): ContentInventory {
	const docs: ContentDoc[] = [];
	for (const file of collectContentFiles(dir)) {
		const relativePath = relative(dir, file).split(/[\\/]/).join("/");
		const stem = relativePath.replace(MARKDOWN_FILE_PATTERN, "");
		const basename = stem.split("/").pop() ?? stem;
		let source = "";
		try {
			source = readFileSync(file, "utf8");
		} catch {
			source = "";
		}
		const frontmatter = readFrontmatter(source);
		docs.push({
			relativePath,
			path: deriveContentPath(stem),
			title: frontmatter.title ?? generateTitle(basename),
			draft: /\.draft(\/|$)/.test(stem) || frontmatter.draft,
			partial: stem.split("/").some((part) => part.startsWith("_")),
		});
	}

	const published = docs.filter((doc) => !doc.draft);
	const paths = [...new Set(published.map((doc) => doc.path))].sort();
	const anchorCandidates = published.filter((doc) => !doc.partial);
	const nested = anchorCandidates
		.filter((doc) => doc.path !== "/")
		.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
	const anchor = nested[0] ?? anchorCandidates[0] ?? published[0];
	if (!anchor) {
		throw new Error(`内容目录里没有可用的 markdown 文档: ${dir}`);
	}
	return { dir, paths, anchor };
}

/** 解析内容目录位置：--content-dir > REPRO_CONTENT_DIR > 默认值（相对仓库根）。 */
function resolveContentDir(): string {
	const option = contentDirOption ?? process.env[CONTENT_DIR_ENV] ?? DEFAULT_CONTENT_DIR;
	return isAbsolute(option) ? option : resolve(repoRoot, option);
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

/**
 * `_params` **查询字符串**形态的编码：URL 编码后的原始 JSON。
 *
 * 与路径形态（`**:params` 段）不同：content v2 的 `getContentQuery` 对
 * `event.context.params.params` 走 `decodeQueryParams`（base64url 解码），
 * 而对 query string 里的 `_params` 走 `parseJSONQueryParams`（直接 JSON.parse）。
 * 实测：base64url 形态的 `_params` 会被服务端打成 400「Invalid _params query」，
 * 只有 URL 编码的原始 JSON 才被接受（200 + 过滤结果）。
 */
function encodeQueryParamsInline(value: unknown): string {
	return encodeURIComponent(JSON.stringify(value));
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

function assertTarget(target: Target, fetched: Fetched, inventory: ContentInventory): Failure | undefined {
	const reasons: string[] = [];
	const anchorPath = inventory.anchor.path;
	const anchorTitle = inventory.anchor.title;
	const expectedPaths = inventory.paths;
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

	// F47 第三层：单段 query 路由（/api/_content/query/<qid>）缺 _params 时，
	// content v2 会走 .find() 返回全部文档（弱门），必须被守卫打成 400 + JSON 指引。
	// 这条独立断言：不依赖 JSON.parse 成功，状态码与响应体形态都要单独看。
	if (target.kind === "query-qid") {
		if (fetched.status !== 400) {
			reasons.push(`期望 HTTP 400（缺 _params 的单段 query 路由必须被守卫拒绝），实际 ${fetched.status}`);
		}
		if (isHtmlShell(fetched.contentType, fetched.text)) {
			reasons.push(`响应体是 HTML shell（Content-Type=${fetched.contentType ?? "无"}），必须返回 JSON 指引`);
		}
		if (!fetched.text.includes("_params")) {
			reasons.push(`响应体不包含「_params」，无法证明这是 _params 缺失的指引而不是泛化错误`);
		}
		if (reasons.length === 0) return undefined;
		return {
			url: target.url,
			status: fetched.status,
			contentType: fetched.contentType,
			bytes: fetched.bytes,
			preview: fetched.text.slice(0, PREVIEW_CHARS),
			pathSet: undefined,
			reasons,
		};
	}

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
						const doc = findDoc(contents, anchorPath);
						if (!doc) {
							reasons.push(`contents 中缺少 _path === ${anchorPath} 的文档`);
						} else if (doc.title !== anchorTitle) {
							reasons.push(`${anchorPath} 的 title 期望 ${anchorTitle}，实际 ${String(doc.title)}`);
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
					if (!values.includes(anchorPath)) {
						reasons.push(`documentIds 的值里没有 ${anchorPath}`);
					}
				}
				if (!fetched.text.includes(anchorTitle)) {
					reasons.push(`响应体不包含「${anchorTitle}」`);
				}
				break;
			}
			case "query": {
				if (!Array.isArray(value)) {
					reasons.push("响应体不是数组");
				} else {
					pathSet = collectPathSet(value);
					if (!pathSet || !sameSet(pathSet, expectedPaths)) {
						reasons.push(
							`_path 集合期望（内容目录推导）${JSON.stringify(expectedPaths)}，实际 ${JSON.stringify(pathSet)}`,
						);
					}
					const doc = findDoc(value, anchorPath);
					if (!doc) {
						reasons.push(`数组中缺少 _path === ${anchorPath} 的文档`);
					} else if (doc.title !== anchorTitle) {
						reasons.push(`${anchorPath} 的 title 期望 ${anchorTitle}，实际 ${String(doc.title)}`);
					}
				}
				break;
			}
			case "query-qid-params": {
				if (!Array.isArray(value)) {
					reasons.push("响应体不是数组");
				} else {
					pathSet = collectPathSet(value);
					if (!pathSet || !sameSet(pathSet, [anchorPath])) {
						reasons.push(`过滤后 _path 集合期望 ${JSON.stringify([anchorPath])}，实际 ${JSON.stringify(pathSet)}`);
					}
					const doc = findDoc(value, anchorPath);
					if (doc && doc.title !== anchorTitle) {
						reasons.push(`${anchorPath} 的 title 期望 ${anchorTitle}，实际 ${String(doc.title)}`);
					}
				}
				break;
			}
			case "navigation":
			case "navigation-qid":
			case "navigation-qid-params": {
				if (!Array.isArray(value)) {
					reasons.push("响应体不是数组");
				} else if (!findNavPath(value, anchorPath)) {
					reasons.push(`导航树中找不到 _path === ${anchorPath} 的条目`);
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

/**
 * 页面 catch-all 断言：运行时不存在的页面必须返回真实 HTTP 404。
 * 与 API 路由不同，页面 404 的响应体就是 Nuxt 的 HTML 错误页，
 * 因此这里只判状态码，不判「非 HTML」。
 */
function assertMissingPage(fetched: Fetched): Failure | undefined {
	const reasons: string[] = [];
	if (fetched.status !== 404) {
		reasons.push(`期望 HTTP 404，实际 ${fetched.status}（200 + HTML 404 shell 就是 F47 假阳性）`);
	}
	if (reasons.length === 0) return undefined;
	return {
		url: MISSING_PAGE_PATH,
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
 *
 * F47 第三层：单段 query 路由 `/api/_content/query/<qid>` 缺 `_params` 时会被守卫打成 400，
 * 所以这里必须带上同一份 `_params`（服务端只认 `_params`，qid 本身只是缓存键，
 * 任意 candidate 字符串都能用），否则所有候选都会被判失败、qid 永远派生不出来。
 *
 * 注意 `_params` 的编码形态：查询字符串形态要 URL 编码的原始 JSON
 * （`encodeQueryParamsInline`），不是 base64url —— 见该函数的注释。
 */
async function deriveQid(base: string, inlineParams: string): Promise<string | undefined> {
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
			const url = new URL(`${CONTENT_PREFIX}query/${candidate}`, base);
			url.searchParams.set("_params", inlineParams);
			const fetched = await fetchText(url.toString());
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

	// --- 期望集合：运行时从内容目录推导（不再写死常量）
	const contentDir = resolveContentDir();
	if (!existsSync(contentDir)) {
		console.error(`内容目录不存在: ${contentDir}`);
		console.error("拒绝静默通过：请用 --content-dir 或 REPRO_CONTENT_DIR 指向正确的内容目录。");
		return 1;
	}
	let inventory: ContentInventory;
	try {
		inventory = buildContentInventory(contentDir);
	} catch (error) {
		console.error(`内容目录推导失败: ${error instanceof Error ? error.message : String(error)}`);
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
	console.log(`# 内容目录: ${inventory.dir}`);
	console.log(`# 推导出的 _path 集合 (${inventory.paths.length}): ${JSON.stringify(inventory.paths)}`);
	console.log(
		`# 锚点文档: ${inventory.anchor.path} (${inventory.anchor.relativePath}) title=${inventory.anchor.title}`,
	);

	const failures: Failure[] = [];

	try {
		if (child) await waitForServer(base, child);

		// --- 模板 -> 具体 URL
		// F47 第三层：单段 query 路由缺 _params 会被守卫打成 400，
		// 所以派生 qid 时要带上同一份 _params（服务端只认 _params，qid 只是缓存键）。
		// 两种 _params 编码形态不同：查询字符串形态用 URL 编码 JSON，
		// 路径两段形态（**:params）用 base64url。
		const whereClause = { where: [{ _path: inventory.anchor.path }] };
		const encodedParams = encodeQueryParams(whereClause);
		const inlineParams = encodeQueryParamsInline(whereClause);
		const needsQid = templates.some((template) => template.includes(":qid"));
		const qid = needsQid ? await deriveQid(base, inlineParams) : undefined;
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
			const failure = assertTarget(target, fetched, inventory);
			if (failure) {
				failures.push(failure);
				console.error(`FAIL ${target.url}`);
				console.error(`  状态码=${failure.status} Content-Type=${failure.contentType} bytes=${failure.bytes}`);
				for (const reason of failure.reasons) console.error(`  - ${reason}`);
				console.error(`  推导出的期望 _path 集合: ${JSON.stringify(inventory.paths)}`);
				if (failure.pathSet) {
					console.error(`  实际 _path 集合: ${JSON.stringify(failure.pathSet)}`);
					const missing = inventory.paths.filter((item) => !failure.pathSet!.includes(item));
					const extra = failure.pathSet.filter((item) => !inventory.paths.includes(item));
					if (missing.length > 0) {
						console.error(`  产物缺少的文档: ${JSON.stringify(missing)}（产物可能落后于内容目录，需要重新构建）`);
					}
					if (extra.length > 0) {
						console.error(`  产物多出的文档: ${JSON.stringify(extra)}（内容目录里没有这些文档）`);
					}
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

		// --- 页面 catch-all：不存在的页面必须是真实 404（响应体是 HTML 错误页，只判状态码）
		const missingPage = await fetchText(new URL(MISSING_PAGE_PATH, base).toString());
		const missingPageFailure = assertMissingPage(missingPage);
		if (missingPageFailure) {
			failures.push(missingPageFailure);
			console.error(`FAIL ${MISSING_PAGE_PATH}`);
			console.error(
				`  状态码=${missingPageFailure.status} Content-Type=${missingPageFailure.contentType} bytes=${missingPageFailure.bytes}`,
			);
			for (const reason of missingPageFailure.reasons) console.error(`  - ${reason}`);
			console.error(`  响应体前 ${PREVIEW_CHARS} 字符: ${missingPageFailure.preview}`);
		} else {
			console.log(
				`PASS ${MISSING_PAGE_PATH} (missing-page) ${missingPage.status} ${missingPage.contentType} bytes=${missingPage.bytes}`,
			);
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
