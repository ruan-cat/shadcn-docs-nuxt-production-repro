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
      // F47 构建期形态：/api/_content/*（含时间戳变体 cache.<ts>.json / search-<ts>）
      // 在 cloudflare_module preset 的构建环境 prerender 时 500（node-server preset 正常）。
      // nitro 的 ignore 是 startsWith 前缀匹配（matchesIgnorePattern），写前缀而非 glob。
      // 仅解除构建阻塞，不修复运行时行为（CF/Vercel 目标下该 API 仍为 200+404shell）。
      ignore: ["/api/_content/"],
    },
  },
});
