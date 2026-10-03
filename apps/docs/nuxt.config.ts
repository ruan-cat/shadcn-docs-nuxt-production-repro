export default defineNuxtConfig({
  extends: ["shadcn-docs-nuxt"],

  css: ["@repro/ui/styles.css"],

  devtools: { enabled: false },

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
      // API 路由走前缀 ignore。运行时 API 的 200+404shell 行为不变。
      // 显式种子：首页为 landing 页无文档链接，侧边栏导航走被 ignore 的
      // /api/_content/navigation（crawler 断链），内容页面须显式列出。
      routes: ["/", "/guide/baseline", "/guide/failure-domains"],
      ignore: ["/api/_content/"],
    },
  },
});
