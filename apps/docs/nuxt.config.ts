export default defineNuxtConfig({
	extends: ["shadcn-docs-nuxt"],

	css: ["@repro/ui/styles.css"],

	devtools: { enabled: false },

	// R50 唯一变量：关闭 payload 抽取（experimental.payloadExtraction → 生成 renderer 的
	// NUXT_PAYLOAD_EXTRACTION = false），消除 .nuxt/prerender/chunks/_/renderer.mjs:390 的
	// payloadCache.setItem("/")——nitro 2.13.5 经 unstorage 1.17.6 的 prefixStorage itemKey
	// 校验会把 "/" 归一为空串判非法 ⇒ prerender 500（R46/R49 实证）。SSR 渲染本身不受影响，
	// 仅不再预渲染 / 产出 _payload.json。
	experimental: {
		payloadExtraction: false,
	},

	i18n: {
		defaultLocale: "zh-CN",
		locales: [
			{
				code: "zh-CN",
				name: "简体中文",
			},
		],
	},

	ogImage: {
		enabled: false,
	},

	icon: {
		serverBundle: {
			collections: ["lucide"],
		},
	},

	nitro: {
		prerender: {
			crawlLinks: true,
			// F47 机制：content 模块把带时间戳的 API 变体（cache.<ts>.json / search-<ts>）
			// 注册为 prerender 初始路由，挤掉了默认的 "/" 种子；且这些路由经 h3 HTTP 层时
			// 抛 Invalid URL（h3 v2 与 content h3 v1 预期的世代串味，见 failure-catalog F47/F06）。
			// 显式补 "/" 种子让 crawler 爬页面（页面 SSR 直连 content storage，不经 HTTP 层）；
			// API 路由走前缀 ignore。运行时 API 的行为由 apps/docs/server/api/_content/[...].ts
			// 守卫 + apps/docs/server/middleware/content-query-guard.ts 保证（未注册路径真 404，
			// :qid 路由缺 _params 真 400）。
			// 显式种子：首页为 landing 页无文档链接，侧边栏导航走被 ignore 的
			// /api/_content/navigation（crawler 断链），内容页面须显式列出。
			routes: ["/", "/guide", "/guide/baseline", "/guide/failure-domains"],
			ignore: ["/api/_content/"],
		},
	},

	hooks: {
		// F47 第三层：上游 layer 的 pages/[...slug].vue 在「没有对应文档」时**内联渲染
		// 一段 404 文案但不抛 createError** → 渲染成功即 HTTP 200 + HTML 404 shell，
		// 让「页面不存在」与「页面存在」在状态码上无法区分。
		// 这里把 app 自己的命名中间件挂到 layer 的 catch-all 路由上，把这种情况升级为
		// **真实 404**。命名中间件（非全局）是因为 content 模块的 documentDriven 插件
		// 用 addRouteMiddleware 注册的是全局中间件，负责在路由中间件之前把文档解析到
		// useContentState().pages；Nuxt 的执行顺序是「全局 → 命名」，所以到这里文档已就绪。
		"pages:extend"(pages) {
			const catchAll =
				pages.find((page) => page.path === "/:slug(.*)*") ??
				pages.find((page) => /^\/:[^/]+\(\.\*\)\*$/.test(page.path));
			if (!catchAll) {
				// 找不到 catch-all 就**构建失败**：守卫一旦静默失效，F47 的 200 掩码会
				// 原样回归，而回归时 CI 仍是绿的（200 假阳性）。宁可构建挂掉。
				throw new Error("[F47] 未找到 layer 的 catch-all 路由（期望 /:slug(.*)*）——F47 第三层守卫挂载失败，构建中止。");
			}
			const existing = catchAll.meta?.middleware;
			const list = Array.isArray(existing) ? existing : existing ? [existing] : [];
			catchAll.meta = {
				...catchAll.meta,
				middleware: [...list, "content-page-not-found"],
			};
		},
	},
});
