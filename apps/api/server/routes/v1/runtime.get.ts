import { defineEventHandler } from "nitro/h3";

export default defineEventHandler(() => {
  return {
    descriptor: {
      application: "api",
      runtime: "nitro",
      generation: "nitro3-h3v2",
    } as const,
    node: process.version,
    platform: process.platform,
  };
});
