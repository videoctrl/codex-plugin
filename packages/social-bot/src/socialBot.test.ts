import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { connectX, createDraft, createSocialBotWorkspace, publishDraft, recordOrListMetrics, verifyLabel } from "./index.js";

async function withProject<T>(fn: (projectDir: string) => Promise<T>) {
  const projectDir = await mkdtemp(join(tmpdir(), "videocontrol-social-bot-"));
  try {
    return await fn(projectDir);
  } finally {
    await rm(projectDir, { recursive: true, force: true });
  }
}

describe("social bot", () => {
  it("creates the owner-safe setup checklist", async () => {
    await withProject(async (projectDir) => {
      const result = await createSocialBotWorkspace({ projectDir, botHandle: "@vc_bot", ownerHandle: "@owner" });
      expect(result.config.botHandle).toBe("@vc_bot");
      expect(result.config.ownerHandle).toBe("@owner");
      expect(result.config.policy.requiresApproval).toBe(true);
      expect(result.config.policy.officialApiOnly).toBe(true);
      expect(result.checklistPath).toContain(".videocontrol/social-bot/setup-checklist.md");
    });
  });

  it("verifies the automated label from profile text", async () => {
    await withProject(async (projectDir) => {
      const result = await verifyLabel({
        projectDir,
        botHandle: "vc_bot",
        ownerHandle: "owner",
        bio: "Automated account managed by @owner.",
        labelText: "@vc_bot is automated"
      });
      expect(result.verified).toBe(true);
      expect(result.checks.ownerMentioned).toBe(true);
      expect(result.checks.automationDisclosed).toBe(true);
    });
  });

  it("does not publish a draft before approval", async () => {
    await withProject(async (projectDir) => {
      const draft = await createDraft({ projectDir, text: "A useful launch note for the owner-approved bot." });
      const result = await publishDraft({ projectDir, draftId: draft.draft.id, requiresApproval: true });
      expect(result.status).toBe("approval_required");
      expect(result.message).toContain("not published");
    });
  });

  it("writes official X setup handoff instead of automating the website", async () => {
    await withProject(async (projectDir) => {
      const result = await connectX({ projectDir, appName: "VideoControl Social Bot" });
      expect(result.status).toBe("setup_required");
      expect(result.handoffPath).toContain("x-oauth-setup.md");
      expect(result.message).toContain("official X OAuth setup");
    });
  });

  it("records and lists metrics", async () => {
    await withProject(async (projectDir) => {
      await recordOrListMetrics({ projectDir, tweetId: "123", impressions: 100, likes: 8, reposts: 2 });
      const result = await recordOrListMetrics({ projectDir });
      expect(Array.isArray(result.metrics)).toBe(true);
      if (!Array.isArray(result.metrics)) throw new Error("Expected metrics list.");
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0]?.tweetId).toBe("123");
      expect(result.metrics[0]?.likes).toBe(8);
    });
  });
});
