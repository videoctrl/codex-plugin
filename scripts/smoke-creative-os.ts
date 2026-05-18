import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createSyntheticVideo, inspectMedia } from "../packages/media/src/index.js";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { applyLocalPluginEnv } from "./local-plugin-env.js";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
await run("pnpm", ["build"]);
await applyLocalPluginEnv(repoRoot);

const tempRoot = await mkdtemp(join(tmpdir(), "videocontrol-creative-smoke-"));
const mediaPath = join(tempRoot, "source.mp4");
const projectDir = join(tempRoot, "project");
await createSyntheticVideo(mediaPath, 3);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(repoRoot, "packages/mcp-server/dist/index.js"), "--stdio"]
});
const client = new Client({ name: "videocontrol-creative-smoke", version: "0.2.0" });
await client.connect(transport);

try {
  await callTool("create_project", { projectDir, name: "Creative Smoke", width: 1280, height: 720, fps: 30 });
  const imported = await callTool("import_assets", { projectDir, paths: [mediaPath] });
  const assetId = imported.assets[0].id;
  const loaded = await callTool("get_timeline", { projectDir });
  await callTool("patch_timeline", {
    projectDir,
    baseVersion: loaded.timeline.version,
    rationale: "Create a short creative smoke-test cut.",
    patch: [
      { op: "add", path: "/clips/-", value: { id: "c_creative", assetId, trackId: "v1", startSec: 0, durationSec: 2, sourceInSec: 0, sourceOutSec: 2 } },
      { op: "replace", path: "/durationSec", value: 2 }
    ]
  });
  await callTool("create_content_os", { projectDir });
  await callTool("create_content_object", { projectDir, title: "Agent paid ads video", slug: "agent-paid-ads-video", format: "video_ad", route: "paid_ad_batch", platformProfiles: ["meta-reels"] });
  await callTool("route_content_object", { projectDir, slug: "agent-paid-ads-video", route: "paid_ad_batch" });
  await callTool("create_writer_context_packet", { projectDir, slug: "agent-paid-ads-video", thesis: "Run paid ads with an agent", reader: "founders", angle: "workflow proof" });
  await callTool("update_project_intent", { projectDir, note: "Keep the opening direct and founder-focused.", selectionId: "clip:c_creative", source: "smoke" });
  await callTool("provider_readiness_reminder", {});
  await callTool("prepare_reference_asset", { projectDir, input: mediaPath });
  await callTool("enhance_asset_prompt", { projectDir, prompt: "Founder-led product proof shot", kind: "image", platform: "meta-reels", selectionId: "clip:c_creative" });
  const providerJob = await callTool("submit_creative_asset_job", { projectDir, slug: "agent-paid-ads-video", provider: "local", kind: "image", prompt: "Founder-led product proof shot" });
  await callTool("get_creative_asset_job", { projectDir, jobId: providerJob.job.id });
  await callTool("create_ad_brief", { projectDir, slug: "agent-paid-ads-video", campaignThesis: "Run paid ads with an agent", targetCustomer: "founders", offer: "creative workflow", platform: "meta-reels" });
  await callTool("generate_variant_plan", { projectDir, slug: "agent-paid-ads-video", count: 2, offer: "creative workflow", platform: "meta-reels" });
  await callTool("assemble_ad_variant", { projectDir, slug: "agent-paid-ads-video", variantId: "v001" });
  const rendered = await callTool("render_ad_variants", { projectDir, slug: "agent-paid-ads-video", variantId: "v001", preset: "720p" });
  await assertReadableMedia(rendered.outputPath);
  await callTool("score_bookmarkability", { text: "This saves founders a future task with proof and a reusable workflow." });
  await callTool("validate_for_platform", { projectDir, slug: "agent-paid-ads-video", platform: "meta-reels", durationSec: 30, aspectRatio: "9:16" });
  await callTool("package_for_platform", { projectDir, slug: "agent-paid-ads-video", platform: "meta-reels", renderPath: rendered.outputPath, caption: "Run paid ads with an agent." });
  const review = await callTool("get_project_review", { projectDir });
  await stat(review.reviewJsonPath);
  await callTool("provider_status", {});
  await callTool("export_repro_bundle", { projectDir, slug: "agent-paid-ads-video" });
  await callTool("archive_content_object", { projectDir, slug: "agent-paid-ads-video" });
} finally {
  await client.close();
}

console.log(`Creative OS smoke test passed in ${tempRoot}.`);

async function callTool(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content.find((item) => item.type === "text")?.text;
  if (!text) throw new Error(`Tool ${name} returned no text content.`);
  return JSON.parse(text);
}

async function assertReadableMedia(path: string) {
  await stat(path);
  await inspectMedia(path);
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd: repoRoot, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolvePromise() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
  });
}
