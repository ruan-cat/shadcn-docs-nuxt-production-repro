import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readOptionalJson = async (path) => {
  try {
    return JSON.parse(await readFile(new URL(path, root), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
};

const config = await readFile(new URL("../apps/docs/nuxt.config.ts", import.meta.url), "utf8");
const workspace = await readFile(new URL("../pnpm-workspace.yaml", import.meta.url), "utf8");
const experiment = await readOptionalJson("experiment.json");

const policies = {
  nuxtConfig: {
    text: config,
    forbidden: [
      "trace: false",
      "routes.clear()",
      "noExternal",
      "externals.inline",
      "inline: [/.*/]",
      "traceAlias",
    ],
  },
  pnpmWorkspace: {
    text: workspace,
    forbidden: ["nodeLinker: hoisted", "publicHoistPattern"],
  },
};

function allowedPatterns(group) {
  return experiment?.allowedSafetyPatterns?.[group] ?? [];
}

for (const [group, policy] of Object.entries(policies)) {
  test(`${group} 的危险 workaround 必须由配置型实验显式声明`, () => {
    const allowed = allowedPatterns(group);
    assert.ok(Array.isArray(allowed), `${group} allowedSafetyPatterns 必须是数组`);

    for (const pattern of allowed) {
      assert.ok(
        policy.forbidden.includes(pattern),
        `${group} 不允许声明未知安全 pattern: ${pattern}`,
      );
      assert.equal(
        policy.text.includes(pattern),
        true,
        `${group} 声明了 ${pattern}，但目标文件没有实际出现该实验变量`,
      );
    }

    for (const pattern of policy.forbidden) {
      const present = policy.text.includes(pattern);
      const declared = allowed.includes(pattern);
      assert.equal(
        present && !declared,
        false,
        `控制组不应包含未声明的危险配置 ${pattern}`,
      );
    }
  });
}
