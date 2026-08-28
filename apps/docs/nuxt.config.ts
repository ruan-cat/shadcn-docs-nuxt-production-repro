export default defineNuxtConfig({
  extends: ["shadcn-docs-nuxt"],

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
    externals: {
      inline: [/.*/],
    },
    prerender: {
      crawlLinks: true,
    },
  },
});
