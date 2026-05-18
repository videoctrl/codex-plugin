import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createSyntheticVideo, inspectMedia } from "../packages/media/src/index.js";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { applyLocalPluginEnv } from "./local-plugin-env.js";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

await run("pnpm", ["plugin:local"]);
await applyLocalPluginEnv(repoRoot);

const tempRoot = await mkdtemp(join(tmpdir(), "videocontrol-smoke-"));
const mediaPath = join(tempRoot, "source.mp4");
const projectDir = join(tempRoot, "project");
await createSyntheticVideo(mediaPath, 3);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(repoRoot, "packages/mcp-server/dist/index.js"), "--stdio"]
});
const client = new Client({ name: "videocontrol-smoke", version: "0.1.0" });
await client.connect(transport);

try {
  await callTool("create_project", {
    projectDir,
    name: "Smoke Project",
    width: 1280,
    height: 720,
    fps: 30
  });

  const imported = await callTool("import_assets", {
    projectDir,
    paths: [mediaPath]
  });
  const assetId = imported.assets[0].id;

  await callTool("inspect_asset", { projectDir, assetId });

  const loaded = await callTool("get_timeline", { projectDir });
  const baseVersion = loaded.timeline.version;
  await callTool("patch_timeline", {
    projectDir,
    baseVersion,
    rationale: "Create a short smoke-test cut.",
    patch: [
      {
        op: "add",
        path: "/clips/-",
        value: {
          id: "c_smoke",
          assetId,
          trackId: "v1",
          startSec: 0,
          durationSec: 2,
          sourceInSec: 0,
          sourceOutSec: 2
        }
      },
      {
        op: "replace",
        path: "/durationSec",
        value: 2
      }
    ]
  });

  const validation = await callTool("validate_timeline", { projectDir });
  if (!validation.valid) {
    throw new Error(`Timeline validation failed: ${validation.errors.join(", ")}`);
  }

  const preview = await callTool("preview_range", {
    projectDir,
    startSec: 0,
    endSec: 2,
    quality: "draft"
  });
  await assertReadableMedia(preview.previewMp4Path);
  await stat(preview.contactSheetPath);

  const rendered = await callTool("render_export", {
    projectDir,
    preset: "720p"
  });
  await assertReadableMedia(rendered.outputPath);

  const versions = await callTool("list_versions", { projectDir });
  if (versions.versions.length < 3) {
    throw new Error("Expected at least three timeline versions.");
  }
  await callTool("compare_versions", {
    projectDir,
    fromVersion: "v0001",
    toVersion: versions.versions.at(-1).version
  });
} finally {
  await client.close();
}

console.log(`Smoke test passed in ${tempRoot}.`);

async function callTool(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error(`Tool ${name} returned no text content.`);
  }
  return JSON.parse(text);
}

async function assertReadableMedia(path: string) {
  await stat(path);
  await inspectMedia(path);
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd: repoRoot,
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}
