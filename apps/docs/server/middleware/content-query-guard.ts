// F47 第三层修复：Content API 的 `:qid` 路由在缺少 `_params` 时必须显式报错，
// 不能静默返回「全部文档」。
//
// 语义依据（`@ztl-uwu/nuxt-content@2.13.9` 的 `dist/runtime/utils/query.js`）：
//   const qid = event.context.params?.qid?.replace(/.json$/, "");
//   if (qid && query._params) { memory[qid] = parse(...); return memory[qid]; }
//   if (qid && memory[qid]) { return memory[qid]; }
//   ...
//   return query;                       ← qid 从不参与过滤
// `qid` 只是 `_params` 的**缓存键**（客户端先查后取的单文档协议），它本身
// **从不进入 where 条件**。因此 `/api/_content/query/index.md`（不带 `_params`）
// 会走 `query.first === false` → `.find()` → 返回**全部文档**——一个声称按 id
// 取单文档的端点，却返回全集，这就是那个「弱门」。
//
// 本守卫把这类请求显式拒绝（400 + 可执行指引），让端点不再说谎：
//   - 带 `_params`（客户端真实用法：`/query/<qid>.<integrity>.json?_params=...`）
//     → 放行，交给 content 模块处理；
//   - 带路径参数变体（`/query/<qid>/<base64url>`，即 `**:params` 路由）
//     → 放行，参数在路径里，不在 query string 里；
//   - 裸 `/api/_content/query`（无 qid）→ 放行，那是合法的「按条件查」端点。
export default defineEventHandler((event) => {
	const path = event.path.split("?")[0] ?? "";
	// 只拦「恰好一段」的 :qid 形态；`/query/:qid/**:params` 是两段，不匹配。
	const match = /^\/api\/_content\/query\/[^/]+$/.exec(path);
	if (!match) {
		return;
	}
	const query = getQuery(event);
	if (query._params) {
		return;
	}
	throw createError({
		statusCode: 400,
		statusMessage: "Content query requires _params",
		message:
			"Content API 的 /query/:qid 路由必须携带 _params 查询参数（qid 只是 _params 的缓存键，本身不参与过滤；不带 _params 时 content 模块会返回全部文档）。" +
			"客户端正确用法：/api/_content/query/<qid>.<integrity>.json?_params=<base64url(JSON)>，或使用 /api/_content/query/<qid>/<base64url(JSON)> 形态。",
	});
});
