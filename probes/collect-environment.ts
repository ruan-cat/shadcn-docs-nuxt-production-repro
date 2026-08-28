import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

function command(name: string, args: string[]) {
  try {
    return execFileSync(name, args, {
      encoding: "utf8",
      shell: process.platform === "win32",
    }).trim();
  } catch {
    return "<unavailable>";
  }
}

const lockfile = "pnpm-lock.yaml";
const lockHash = existsSync(lockfile)
  ? createHash("sha256").update(readFileSync(lockfile)).digest("hex")
  : "<no-lockfile>";

console.log(
  JSON.stringify(
    {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pnpm: command("pnpm", ["--version"]),
      git: command("git", ["rev-parse", "HEAD"]),
      lockfileSha256: lockHash,
      nodeOptions: process.env.NODE_OPTIONS ?? "",
    },
    null,
    2,
  ),
);
