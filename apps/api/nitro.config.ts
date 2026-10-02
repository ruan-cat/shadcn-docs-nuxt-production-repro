import { defineConfig } from "nitro";

export default defineConfig({
  compatibilityDate: "2024-09-19",
  serverDir: "server",
  routeRules: {
    "/v1/**": {
      cors: true,
    },
  },
  rolldownConfig: {
    output: {
      inlineDynamicImports: true,
    },
  },
  cloudflare: {
    wrangler: {
      name: "shadcn-docs-nuxt-production-repro-api",
      routes: [
        {
          pattern: "shadcn-docs-nuxt-production-repro-api.cf.ruan-cat.com",
          custom_domain: true,
          zone_name: "ruan-cat.com",
        },
      ],
    },
  },
});
