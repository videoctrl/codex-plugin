import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ensureProjectIntent, updateProjectIntentFromNote, writeProjectReview } from "./intent.js";

describe("project intent", () => {
  it("creates intent files and records review notes", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "videocontrol-intent-"));
    const created = await ensureProjectIntent({ projectDir, projectId: "project-1", projectName: "Project One" });
    const review = await writeProjectReview({ projectDir, projectId: "project-1", projectName: "Project One" });

    await stat(created.intentJsonPath);
    await stat(created.intentMarkdownPath);

    const updated = await updateProjectIntentFromNote({
      projectDir,
      note: "Keep the first beat direct and product-led.",
      selectionId: "clip:c_intro",
      source: "review"
    });

    expect(updated.intent.reviewNotes).toHaveLength(1);
    expect(updated.intent.approvalNotes).toContain("Keep the first beat direct and product-led.");
    expect(JSON.parse(await readFile(review.reviewJsonPath, "utf8")).intent.reviewNotes).toHaveLength(1);
  });

  it("writes review selections for timeline clips, captions, variants, and handoffs", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "videocontrol-review-"));
    await mkdir(join(projectDir, "variants", "v001"), { recursive: true });
    await writeFile(join(projectDir, "meta-handoff.md"), "# Meta handoff\n", "utf8");
    const result = await writeProjectReview({
      projectDir,
      projectId: "project-2",
      projectName: "Project Two",
      timeline: {
        version: "v0002",
        durationSec: 4,
        width: 1080,
        height: 1920,
        fps: 30,
        clips: [{ id: "c_intro", trackId: "v1", startSec: 0, durationSec: 2, assetId: "a_source" }],
        textClips: [{ id: "txt_hook", trackId: "t1", text: "Open with proof", startSec: 0.2, durationSec: 1.8 }]
      },
      contentObjects: [
        {
          contentObject: {
            slug: "sample",
            title: "Sample",
            route: "paid_ad_batch",
            state: "human_review",
            platformProfiles: ["meta-reels"]
          },
          runDir: projectDir
        }
      ]
    });

    expect(result.review.selections.map((selection) => selection.id)).toEqual([
      "clip:c_intro",
      "caption:txt_hook",
      "variant:sample:v001",
      "handoff:sample:meta-handoff"
    ]);
    await stat(result.reviewJsonPath);
  });

  it("writes review selections for generated assets", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "videocontrol-review-assets-"));
    const runDir = join(projectDir, "run");
    await mkdir(join(projectDir, ".videocontrol", "provider-jobs"), { recursive: true });
    await mkdir(runDir, { recursive: true });
    await writeFile(
      join(projectDir, ".videocontrol", "provider-jobs", "job_123.json"),
      JSON.stringify(
        {
          schemaVersion: "0.2",
          id: "job_123",
          projectDir,
          slug: "sample",
          provider: "higgsfield",
          kind: "image",
          prompt: "Product hero",
          status: "completed",
          providerJobId: "remote_123",
          resultUrl: "https://cdn.example.com/asset.png",
          message: "Done",
          createdAt: "2026-05-18T00:00:00.000Z",
          updatedAt: "2026-05-18T00:00:00.000Z"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(runDir, "provenance.json"),
      JSON.stringify(
        {
          schemaVersion: "0.2",
          entries: [
            {
              assetId: "remote_123",
              sourceType: "generated",
              provider: "higgsfield",
              providerJobId: "remote_123",
              prompt: "Product hero",
              inputAssets: [],
              resultUrl: "https://cdn.example.com/asset.png",
              createdAt: "2026-05-18T00:00:00.000Z",
              rights: {
                commercialUseStatus: "unknown",
                containsLikeness: false,
                requiresAttribution: false
              }
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const result = await writeProjectReview({
      projectDir,
      contentObjects: [
        {
          contentObject: {
            slug: "sample",
            title: "Sample",
            route: "paid_ad_batch",
            state: "asset_generation",
            platformProfiles: ["meta-reels"]
          },
          runDir
        }
      ]
    });

    expect(result.review.selections.map((selection) => selection.id)).toContain("asset:job_123");
    expect(result.review.selections.map((selection) => selection.id)).toContain("asset:sample:remote_123");
  });
});
