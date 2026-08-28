import { fileURLToPath } from "node:url";

const uiSourceEntry = fileURLToPath(
  new URL("../../packages/ui/src/index.ts", import.meta.url),
);

export default defineNuxtConfig({
  extends: ["shadcn-docs-nuxt"],

  alias: {
    "@repro/ui": uiSourceEntry,
  },

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
    },
  },
});
