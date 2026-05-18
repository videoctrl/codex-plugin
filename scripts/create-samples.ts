import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { runProcess } from "../packages/media/src/process.js";
import { inspectMedia } from "../packages/media/src/index.js";
import { createProject } from "../packages/mcp-server/src/tools/createProject.js";
import { importAssets } from "../packages/mcp-server/src/tools/importAssets.js";
import { getTimeline } from "../packages/mcp-server/src/tools/getTimeline.js";
import { patchTimeline } from "../packages/mcp-server/src/tools/patchTimeline.js";
import { validateTimeline } from "../packages/mcp-server/src/tools/validateTimeline.js";
import { previewRange } from "../packages/mcp-server/src/tools/previewRange.js";
import { renderExport } from "../packages/mcp-server/src/tools/renderExport.js";
import { openPreview } from "../packages/mcp-server/src/tools/openPreview.js";
import { createPlatformHandoff } from "../packages/creative-ops/src/index.js";
import {
  createContentObject,
  createContentOs,
  createWriterContextPacket,
  routeContentObject,
  updateProjectIntentFromNote
} from "../packages/content-os/src/index.js";
import { applyLocalPluginEnv } from "./local-plugin-env.js";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const samplesRoot = join(repoRoot, "samples");
await applyLocalPluginEnv(repoRoot);

const samples = [
  {
    slug: "product-demo",
    name: "Sample Product Demo",
    title: "Product Demo Ad",
    format: "video_ad" as const,
    route: "original" as const,
    platform: "YouTube Shorts",
    platformId: "youtube-shorts",
    width: 1280,
    height: 720,
    durationSec: 4,
    color: "0x1f7a8c",
    toneHz: 520,
    hook: "See the workflow",
    caption: "A short product walkthrough with one clear benefit.",
    intentNote: "Keep the opening direct and product-led.",
    brief:
      "Show a concise product walkthrough for a founder who wants to understand the workflow before trying it."
  },
  {
    slug: "ugc-ad",
    name: "Sample UGC Ad",
    title: "UGC Style Ad",
    format: "video_ad" as const,
    route: "paid_ad_batch" as const,
    platform: "Meta Reels",
    platformId: "meta-reels",
    width: 1080,
    height: 1920,
    durationSec: 4,
    color: "0xb84a62",
    toneHz: 660,
    hook: "I tried it",
    caption: "A creator-style ad with a fast hook and proof beat.",
    intentNote: "Keep the first line first-person and proof-driven.",
    brief:
      "Create a short creator-style ad that opens with a first-person hook, shows the result, and ends with a simple next step."
  },
  {
    slug: "social-clip",
    name: "Sample Social Clip",
    title: "Social Clip",
    format: "clip" as const,
    route: "social_share" as const,
    platform: "X",
    platformId: "x",
    width: 1080,
    height: 1080,
    durationSec: 3,
    color: "0x386641",
    toneHz: 740,
    hook: "One useful clip",
    caption: "A square social clip packaged for a quick share.",
    intentNote: "Keep the idea useful enough to understand without sound.",
    brief:
      "Turn one useful idea into a square social clip with a direct hook, one proof point, and a clean handoff caption."
  }
];

for (const sample of samples) {
  const projectDir = join(samplesRoot, sample.slug);
  await rm(projectDir, { recursive: true, force: true });
  await mkdir(join(projectDir, "media"), { recursive: true });

  const mediaPath = join(projectDir, "media", "source.mp4");
  await createTinyVideo({
    outputPath: mediaPath,
    width: sample.width,
    height: sample.height,
    durationSec: sample.durationSec,
    color: sample.color,
    toneHz: sample.toneHz
  });
  await inspectMedia(mediaPath);

  await createProject({
    projectDir,
    name: sample.name,
    width: sample.width,
    height: sample.height,
    fps: 30
  });
  const imported = await importAssets({
    projectDir,
    paths: [mediaPath],
    copyIntoProject: false
  });
  const timeline = (await getTimeline({ projectDir })).timeline;
  await patchTimeline({
    projectDir,
    baseVersion: timeline.version,
    rationale: `Create the ${sample.title} sample timeline.`,
    patch: [
      {
        op: "add",
        path: "/clips/-",
        value: {
          id: "c_source",
          assetId: imported.assets[0].id,
          trackId: "v1",
          startSec: 0,
          durationSec: sample.durationSec,
          sourceInSec: 0,
          sourceOutSec: sample.durationSec,
          name: sample.title
        }
      },
      {
        op: "add",
        path: "/textClips/-",
        value: {
          id: "txt_hook",
          kind: "text",
          trackId: "t1",
          text: sample.hook,
          startSec: 0.2,
          durationSec: Math.min(2, sample.durationSec),
          style: {
            preset: "sample-hook"
          }
        }
      },
      {
        op: "replace",
        path: "/durationSec",
        value: sample.durationSec
      }
    ]
  });

  const validation = await validateTimeline({ projectDir });
  if (!validation.valid) {
    throw new Error(`${sample.slug} timeline did not validate: ${validation.errors.join(", ")}`);
  }

  const preview = await previewRange({
    projectDir,
    startSec: 0,
    endSec: sample.durationSec,
    quality: "draft"
  });
  await inspectMedia(preview.previewMp4Path);

  const exportResult = await renderExport({
    projectDir,
    preset: "720p"
  });
  await inspectMedia(exportResult.outputPath);

  await createContentOs(projectDir);
  const content = await createContentObject({
    projectDir,
    slug: sample.slug,
    title: sample.title,
    format: sample.format,
    route: sample.route,
    platformProfiles: [sample.platform]
  });
  await writeFile(
    join(content.runDir, `${sample.platformId}-handoff.md`),
    createPlatformHandoff({
      platform: sample.platformId,
      title: sample.title,
      renderPath: exportResult.outputPath,
      caption: sample.caption
    }),
    "utf8"
  );
  await routeContentObject(projectDir, sample.slug, sample.route);
  await createWriterContextPacket({
    projectDir,
    slug: sample.slug,
    thesis: sample.brief,
    reader: "first-time reviewer",
    angle: sample.caption
  });
  await updateProjectIntentFromNote({
    projectDir,
    note: sample.intentNote,
    selectionId: "clip:c_source",
    source: "sample"
  });
  const review = await openPreview({ projectDir });
  await writeSampleReadme(projectDir, sample, preview.previewMp4Path, preview.contactSheetPath, exportResult.outputPath, review.reviewJsonPath);
  console.log(`Created samples/${sample.slug}`);
}

async function createTinyVideo(input: {
  outputPath: string;
  width: number;
  height: number;
  durationSec: number;
  color: string;
  toneHz: number;
}) {
  await runProcess("ffmpeg", [
    "-hide_banner",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${input.color}:s=${input.width}x${input.height}:r=30:d=${input.durationSec}`,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${input.toneHz}:duration=${input.durationSec}`,
    "-shortest",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    input.outputPath
  ]);
}

async function writeSampleReadme(projectDir: string, sample: (typeof samples)[number], previewPath: string, contactSheetPath: string, exportPath: string, reviewPath: string) {
  await writeFile(
    join(projectDir, "README.md"),
    `# ${sample.title}

${sample.brief}

## What This Sample Shows

- Format: ${sample.format.replace("_", " ")}
- Route: ${sample.route.replaceAll("_", " ")}
- Platform: ${sample.platform}
- Source media: media/source.mp4
- Preview: ${relativeFromProject(projectDir, previewPath)}
- Contact sheet: ${relativeFromProject(projectDir, contactSheetPath)}
- Local export: ${relativeFromProject(projectDir, exportPath)}
- Review file: ${relativeFromProject(projectDir, reviewPath)}

## Try It

\`\`\`bash
pnpm dev:preview
\`\`\`

Then ask Codex:

\`\`\`text
@videocontrol open ${sample.slug}, inspect the media, validate the timeline, and tell me what is ready to review.
\`\`\`
`,
    "utf8"
  );
}

function relativeFromProject(projectDir: string, path: string) {
  return path.startsWith(projectDir) ? path.slice(projectDir.length + 1) : path;
}
