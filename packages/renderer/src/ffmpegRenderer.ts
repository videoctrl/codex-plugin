import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { ffmpeg } from "@videocontrol/media";
import { Timeline } from "@videocontrol/timeline";
import { createRenderSegments } from "./renderPlan.js";
import { ExportPreset, renderSizeForPreset } from "./exportPresets.js";

export type RenderTimelineInput = {
  projectDir: string;
  timeline: Timeline;
  outputPath: string;
  startSec?: number;
  endSec?: number;
  preset?: ExportPreset;
};

export type RenderTimelineOutput = {
  outputPath: string;
  renderTimeMs: number;
};

export async function renderTimeline(input: RenderTimelineInput): Promise<RenderTimelineOutput> {
  const startedAt = Date.now();
  const startSec = input.startSec ?? 0;
  const endSec = input.endSec ?? input.timeline.durationSec;
  const preset = input.preset ?? "1080p";
  const size = renderSizeForPreset(preset);
  const segments = createRenderSegments({
    projectDir: input.projectDir,
    timeline: input.timeline,
    startSec,
    endSec
  });

  if (segments.length === 0) {
    throw new Error("The timeline has no video clips in the requested range.");
  }

  await mkdir(dirname(input.outputPath), { recursive: true });
  const tempDir = await mkdtemp(join(tmpdir(), "videocontrol-render-"));

  try {
    const segmentPaths: string[] = [];
    for (const [index, segment] of segments.entries()) {
      const segmentPath = join(tempDir, `segment-${index.toString().padStart(4, "0")}.mp4`);
      await ffmpeg([
        "-ss",
        String(segment.sourceStartSec),
        "-i",
        segment.inputPath,
        "-t",
        String(segment.durationSec),
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-vf",
        `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2,fps=${input.timeline.fps}`,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        segmentPath
      ]);
      segmentPaths.push(segmentPath);
    }

    if (segmentPaths.length === 1) {
      await ffmpeg(["-i", segmentPaths[0], "-c", "copy", input.outputPath]);
    } else {
      const listPath = join(tempDir, "segments.txt");
      await writeFile(listPath, segmentPaths.map((path) => `file '${escapeConcatPath(path)}'`).join("\n"), "utf8");
      await ffmpeg(["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", input.outputPath]);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  return {
    outputPath: input.outputPath,
    renderTimeMs: Date.now() - startedAt
  };
}

export async function createContactSheet(input: { videoPath: string; outputPath: string }) {
  await mkdir(dirname(input.outputPath), { recursive: true });
  await ffmpeg([
    "-i",
    input.videoPath,
    "-vf",
    "fps=1,scale=320:-1,tile=3x2",
    "-frames:v",
    "1",
    input.outputPath
  ]);
  return input.outputPath;
}

export function defaultPreviewPath(projectDir: string, version: string, startSec: number, endSec: number) {
  const label = `${padSeconds(startSec)}-${padSeconds(endSec)}`;
  return join(projectDir, ".videocontrol", "renders", `preview-${version}-${label}.mp4`);
}

export function defaultContactSheetPath(previewPath: string) {
  return join(dirname(previewPath), `${basename(previewPath, ".mp4")}.jpg`);
}

export function defaultExportPath(projectDir: string, version: string, preset: ExportPreset) {
  return join(projectDir, ".videocontrol", "renders", `final-${version}-${preset}.mp4`);
}

function padSeconds(value: number) {
  return Math.round(value * 1000).toString().padStart(6, "0");
}

function escapeConcatPath(path: string) {
  return path.replaceAll("'", "'\\''");
}
