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
});
