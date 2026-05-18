import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../config.js";
import { assertProjectExists, readTimeline } from "./store.js";
import { writeCurrentProjectReview } from "./projectReview.js";

export type OpenPreviewInput = {
  projectDir: string;
};

export async function openPreview(input: OpenPreviewInput) {
  const paths = await assertProjectExists(input.projectDir);
  const timeline = await readTimeline(paths.projectDir);
  const latestRenderPath = await latestMp4(paths.rendersDir);
  const latestContactSheetPath = await latestJpg(paths.rendersDir);
  const review = await writeCurrentProjectReview({
    projectDir: paths.projectDir,
    previewPath: latestRenderPath,
    contactSheetPath: latestContactSheetPath
  });
  const config = loadConfig();

  return {
    previewUrl: previewUrl(config.previewPort, review.reviewJsonPath),
    projectDir: paths.projectDir,
    timelineVersion: timeline.version,
    latestRenderPath,
    latestContactSheetPath,
    reviewJsonPath: review.reviewJsonPath,
    message: "Open the preview app with this local URL when the preview server is running."
  };
}

function previewUrl(port: number, reviewJsonPath: string) {
  const params = new URLSearchParams({
    review: reviewJsonPath
  });
  return `http://localhost:${port}/?${params.toString()}`;
}

async function latestMp4(rendersDir: string) {
  const entries = await readdir(rendersDir);
  const mp4s = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".mp4"))
      .map(async (entry) => {
        const path = join(rendersDir, entry);
        const info = await stat(path);
        return { path, mtimeMs: info.mtimeMs };
      })
  );
  mp4s.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return mp4s[0]?.path;
}

async function latestJpg(rendersDir: string) {
  const entries = await readdir(rendersDir);
  const jpgs = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".jpg"))
      .map(async (entry) => {
        const path = join(rendersDir, entry);
        const info = await stat(path);
        return { path, mtimeMs: info.mtimeMs };
      })
  );
  jpgs.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return jpgs[0]?.path;
}
