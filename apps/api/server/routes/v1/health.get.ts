import { defineEventHandler } from "nitro/h3";

export default defineEventHandler(() => {
  return {
    ok: true,
    service: "independent-nitro3-api",
    timestamp: new Date().toISOString(),
  } as const;
});
