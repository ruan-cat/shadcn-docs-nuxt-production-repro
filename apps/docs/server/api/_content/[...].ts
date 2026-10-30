// F47 第二层修复：未注册的 Content API 路径必须返回真实 404。
//
// 背景：@ztl-uwu/nuxt-content@2.13.9 在生产构建里给 API 路由名追加构建时间戳
// （cache.<buildIntegrity>.json / search-<buildIntegrity>），canonical 路径
// （cache.json / search）根本不是路由，会落到上游 layer 的 catch-all 页面，
// 被渲染成「HTTP 200 + HTML 404 shell」的假阳性。
//
// 本文件注册 /api/_content/** 兜底路由：未注册的 Content API 路径一律返回真实 404。
// Nitro 用 radix3 路由树，静态段优先于参数段优先于通配段，且更深的通配段优先于更浅的，
// 因此 content 模块已注册的
//   /api/_content/query、/api/_content/query/:qid、/api/_content/query/:qid/**:params
//   /api/_content/navigation、/api/_content/navigation/:qid
//   /api/_content/cache.<buildIntegrity>.json、/api/_content/search-<buildIntegrity>
// 仍优先命中，不会被本守卫遮蔽。
export default defineEventHandler((event) => {
	throw createError({
		statusCode: 404,
		statusMessage: "Content API route not found",
		message: `未注册的 Content API 路径：${event.path}`,
	});
});
