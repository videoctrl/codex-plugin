import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { archiveContentObject, createContentObject, createContentOs, createWriterContextPacket, listContentObjects, transitionContentState, validateRunFolder } from "./index.js";

describe("Content OS", () => {
  it("creates a valid run folder with required files", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "vc-content-"));
    await createContentOs(projectDir);
    const created = await createContentObject({ projectDir, title: "Agent Paid Ads Video", format: "video_ad" });
    const validation = await validateRunFolder(created.runDir);
    expect(validation.valid).toBe(true);
    expect(created.contentObject.route).toBe("paid_ad_batch");
  });

  it("rejects duplicate content object slugs", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "vc-content-duplicate-"));
    await createContentObject({ projectDir, title: "Same Title", format: "short_video" });
    await expect(createContentObject({ projectDir, title: "Same Title", format: "short_video" })).rejects.toThrow(
      "Content object already exists: same-title"
    );
  });

  it("rejects invalid state transitions", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "vc-state-"));
    await createContentOs(projectDir);
    await createContentObject({ projectDir, title: "State Test", format: "short_video", slug: "state-test" });
    await expect(transitionContentState(projectDir, "state-test", "published")).rejects.toThrow("cannot move");
  });

  it("archives completed content objects", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "vc-archive-"));
    await createContentObject({ projectDir, title: "Archive Test", format: "short_video", slug: "archive-test" });
    await archiveContentObject(projectDir, "archive-test");
    const active = await listContentObjects(projectDir, "active");
    const archive = await listContentObjects(projectDir, "archive");
    expect(active).toHaveLength(0);
    expect(archive).toHaveLength(1);
  });

  it("creates a brief from slices instead of copying full files", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "vc-brief-"));
    await createContentObject({ projectDir, title: "Brief Test", format: "short_video", slug: "brief-test" });
    const longStrategy = Array.from({ length: 50 }, (_, index) => `strategy line ${index}`).join("\n");
    await import("./strategy.js").then((mod) => mod.updateStrategyFile(projectDir, "positioning.md", longStrategy));
    const packet = await createWriterContextPacket({ projectDir, slug: "brief-test" });
    const briefMd = await readFile(join(packet.runDir, "brief.md"), "utf8");
    expect(briefMd).toContain("strategy line");
    expect(briefMd).not.toContain("strategy line 49");
  });
});
