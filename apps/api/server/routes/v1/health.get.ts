import { defineEventHandler } from "nitro/h3";
import { createHealthPayload } from "@repro/shared-core";

export default defineEventHandler(() => {
  return createHealthPayload("independent-nitro3-api");
});
