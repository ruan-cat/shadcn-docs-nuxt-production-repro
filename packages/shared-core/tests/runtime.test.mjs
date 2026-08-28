import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeDescriptor, formatRuntimeDescriptor } from "../dist/index.js";

test("能够稳定格式化运行时描述", () => {
  const descriptor = createRuntimeDescriptor("api", "nitro", "nitro3-h3v2");
  assert.equal(formatRuntimeDescriptor(descriptor), "api:nitro:nitro3-h3v2");
});
