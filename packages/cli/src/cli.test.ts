import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = new URL("../../..", import.meta.url).pathname;
const cliArgs = ["exec", "tsx", "packages/cli/src/index.ts"];

async function runCli(args: string[]) {
  return execFileAsync("pnpm", [...cliArgs, ...args], { cwd: repoRoot });
}

async function runCliFailure(args: string[]) {
  try {
    await runCli(args);
  } catch (error) {
    return error as { stdout: string; stderr: string; code: number };
  }
  throw new Error("Expected command to fail.");
}

describe("VideoControl CLI", () => {
  it("accepts --project before content slug", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "vc-cli-content-"));
    await runCli(["content", "create", "--project", projectDir, "--title", "Flag Order Test", "--format", "short_video"]);

    const { stdout } = await runCli(["content", "route", "--project", projectDir, "flag-order-test", "--route", "social_share"]);

    expect(JSON.parse(stdout).contentObject.route).toBe("social_share");
  });

  it("accepts --project before social bot draft id", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "vc-cli-social-"));
    const created = await runCli(["social-bot", "draft", "--project", projectDir, "--text", "Test post"]);
    const draftId = JSON.parse(created.stdout).draft.id as string;

    const { stdout } = await runCli(["social-bot", "approve", "--project", projectDir, draftId]);

    expect(JSON.parse(stdout).draft.status).toBe("approved");
  });

  it("requires provider submit to name a provider", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "vc-cli-provider-"));
    const error = await runCliFailure(["provider", "submit", "--project", projectDir, "--kind", "image", "--prompt", "test prompt"]);

    expect(error.code).toBe(1);
    expect(error.stderr).toContain("Missing --provider");
  });

  it("returns provider statuses and rejects unknown providers", async () => {
    const all = await runCli(["provider", "status"]);
    expect(Array.isArray(JSON.parse(all.stdout).providers)).toBe(true);

    const error = await runCliFailure(["provider", "status", "not-a-provider"]);
    expect(error.code).toBe(1);
    expect(error.stderr).toContain("Unknown provider: not-a-provider");
  });
});
