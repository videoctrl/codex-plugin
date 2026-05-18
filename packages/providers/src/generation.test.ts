import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importComfyUiWorkflow, listComfyUiWorkflows } from "./adapters/comfyui/workflow.js";
import { prepareReferenceAsset } from "./referenceAssets.js";
import { submitCreativeAssetJob, readCreativeAssetJob } from "./jobs.js";
import { updateCreativePreferences } from "./preferences.js";
import { assertSafeRemoteReferenceUrl } from "./urlSafety.js";

describe("generation helpers", () => {
  it("updates saved creative preferences", async () => {
    const dir = await mkdtemp(join(tmpdir(), "videocontrol-preferences-"));
    const result = await updateCreativePreferences({
      path: join(dir, "preferences.json"),
      preferredProvider: "higgsfield",
      aspectRatio: "9:16",
      platformTargets: ["meta-reels"],
      styleNotes: ["proof-led product visuals"]
    });

    expect(result.preferences.preferredProvider).toBe("higgsfield");
    expect(result.preferences.platformTargets).toContain("meta-reels");
    expect(result.preferences.styleNotes).toContain("proof-led product visuals");
  });

  it("prepares a local reference image", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "videocontrol-reference-"));
    const imagePath = join(projectDir, "pixel.png");
    await writeFile(imagePath, tinyPng());

    const result = await prepareReferenceAsset({ projectDir, input: imagePath });

    expect(result.asset.kind).toBe("image");
    expect(result.asset.preparedPath).toBeDefined();
    await stat(result.asset.preparedPath ?? "");
    expect(JSON.parse(await readFile(join(projectDir, ".videocontrol", "reference-assets", "manifest.json"), "utf8")).assets).toHaveLength(1);
  });

  it("blocks unsafe remote reference URLs", () => {
    expect(() => assertSafeRemoteReferenceUrl("http://127.0.0.1/image.png")).toThrow(/private|local/);
    expect(assertSafeRemoteReferenceUrl("https://example.com/image.png")).toBe("https://example.com/image.png");
  });

  it("records provider jobs without claiming missing local generation completed", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "videocontrol-job-"));
    const result = await submitCreativeAssetJob({
      projectDir,
      provider: "local",
      kind: "image",
      prompt: "Product hero"
    });

    expect(result.job.status).toBe("setup_required");
    expect((await readCreativeAssetJob(projectDir, result.job.id)).job.prompt).toBe("Product hero");
  });

  it("registers ComfyUI workflows", async () => {
    const dir = await mkdtemp(join(tmpdir(), "videocontrol-comfyui-"));
    const workflowPath = join(dir, "workflow.json");
    await writeFile(
      workflowPath,
      JSON.stringify({
        "1": { class_type: "CLIPTextEncode", inputs: { text: "old prompt" } },
        "2": { class_type: "LoadImage", inputs: { image: "old.png" } }
      }),
      "utf8"
    );

    const result = await importComfyUiWorkflow({ name: "product hero", workflowPath, workflowDir: dir });
    const list = await listComfyUiWorkflows(dir);

    expect(result.workflow.promptNodeIds).toEqual(["1"]);
    expect(result.workflow.referenceNodeIds).toEqual(["2"]);
    expect(list.workflows.map((workflow) => workflow.name)).toEqual(["product hero"]);
  });
});

function tinyPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lM9G2QAAAABJRU5ErkJggg==",
    "base64"
  );
}
