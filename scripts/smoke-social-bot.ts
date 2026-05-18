import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { applyLocalPluginEnv } from "./local-plugin-env.js";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const projectDir = await mkdtemp(join(tmpdir(), "videocontrol-social-bot-smoke-"));

await run("pnpm", ["build"]);
await applyLocalPluginEnv(repoRoot);
await run("pnpm", ["exec", "videocontrol", "social-bot", "setup-checklist", "--project", projectDir, "--bot", "@vc_bot", "--owner", "@owner"]);
await run("pnpm", [
  "exec",
  "videocontrol",
  "social-bot",
  "verify-label",
  "--project",
  projectDir,
  "--bot",
  "@vc_bot",
  "--owner",
  "@owner",
  "--bio",
  "Automated account managed by @owner.",
  "--label",
  "@vc_bot is automated"
]);
await run("pnpm", ["exec", "videocontrol", "social-bot", "connect-x", "--project", projectDir, "--app", "VideoControl Social Bot"]);
await run("pnpm", ["exec", "videocontrol", "social-bot", "draft", "--project", projectDir, "--text", "Owner-approved test post from VideoControl."]);
await run("pnpm", ["exec", "videocontrol", "social-bot", "publish", "--project", projectDir, "--requires-approval"]);
await run("pnpm", [
  "exec",
  "videocontrol",
  "social-bot",
  "metrics",
  "--project",
  projectDir,
  "--tweet-id",
  "123",
  "--impressions",
  "100",
  "--likes",
  "7"
]);

await stat(join(projectDir, ".videocontrol", "social-bot", "setup-checklist.md"));
console.log(`Social bot smoke test passed in ${projectDir}.`);

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd: repoRoot, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolvePromise() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
  });
}
