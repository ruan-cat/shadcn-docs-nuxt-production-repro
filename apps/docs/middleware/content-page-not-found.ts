// F47 第三层修复：页面 catch-all 的「200 掩码」必须变成真实 404。
//
// 机制：上游 layer `shadcn-docs-nuxt@1.1.9` 的 `pages/[...slug].vue` 在
// `!page?.body` 时**内联渲染一段 404 文案但不抛 `createError`** → 渲染成功即
// HTTP 200 + HTML 404 shell。这是 layer 的设计（友好 404 页），不是运行时故障，
// 但它让「页面不存在」与「页面存在」在 HTTP 状态码上无法区分——正是 F47 假阳性的
// 根源：探针只看 200 就判通过。
//
// 本文件是**命名中间件**（不是全局中间件），通过 `nuxt.config.ts` 的
// `pages:extend` 挂到 layer 的 catch-all 路由 `/:slug(.*)*` 上。顺序很关键：
//   1. content 模块的 documentDriven 插件用 `addRouteMiddleware(async fn)` 注册
//      **全局**中间件（Nuxt 源码：名字非字符串即视为 global），它负责按当前路径
//      把文档查出来并写入 `useContentState().pages`；
//   2. Nuxt 的执行顺序是「全局中间件 → 命名中间件」
//      （`nuxt/dist/pages/runtime/plugins/router.js`：同一个 Set，先塞 global
//      再塞 route meta 的命名中间件，按插入序执行）→ 所以跑到本中间件时，
//      文档**已经解析完毕**，可以直接读状态。
// 若写成全局中间件，它会跑在 documentDriven 之前，state 还是空的 → 会把
// 所有页面误判成 404。这个顺序约束是本方案成立的前提。
//
// 为什么**不用** `useContent()`：它的 `page` 是按 `useRoute().path` 派生的
// ComputedRef，而 Nuxt 明确警告「在 middleware 里调用 `useRoute()` 会给出误导性
// 结果」（`nuxt/dist/app/composables/router.js`：应改用 `(to, from)` 参数）。
// 中间件执行发生在路由确认之前，`useRoute()` 可能仍是**旧**路由。这里直接按
// `to.path` 读 `useContentState().pages`，与 documentDriven 写入时用的键完全一致。
//
// 判定条件与 layer 页面本身**逐字一致**（`!page?.body`），因此不会改变
// 「哪些页面算存在」的语义，只把「渲染友好 404 页」升级为「返回真实 404」。
export default defineNuxtRouteMiddleware((to) => {
	const { pages } = useContentState();
	// 与 content 模块的 `withoutTrailingSlash(to.path)` 等价：去掉尾部斜杠，
	// 根路径 "/" 保持为 "/"。
	const _path = to.path.replace(/\/+$/, "") || "/";
	const page = pages.value[_path];
	if (page?.body) {
		return;
	}
	throw createError({
		statusCode: 404,
		statusMessage: "Page Not Found",
		fatal: true,
	});
});
