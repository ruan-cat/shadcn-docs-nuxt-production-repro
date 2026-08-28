import { createRuntimeDescriptor } from "@repro/shared-core";

export default defineEventHandler(() => {
  return {
    descriptor: createRuntimeDescriptor("api", "nitro", "nitro3-h3v2"),
    node: process.version,
    platform: process.platform,
  };
});
