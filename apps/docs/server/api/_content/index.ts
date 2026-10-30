// F47 第二层修复（补齐）：Content API 的「裸前缀」也必须返回真实 404。
//
// `[...].ts` 注册的是 `/api/_content/**`，Nitro 路由树要求前缀后至少有一段，
// 因此 `/api/_content` 与 `/api/_content/` 这两个零段前缀不会命中该兜底路由，
// 会继续落到上游 layer 的 catch-all → 又一次「HTTP 200 + HTML 404 shell」。
// 本文件把零段前缀映射到 `/api/_content`，与 `[...].ts` 构成完整覆盖。
export default defineEventHandler((event) => {
	throw createError({
		statusCode: 404,
		statusMessage: "Content API route not found",
		message: `未注册的 Content API 路径：${event.path}`,
	});
});
