import { createContactSheet, defaultContactSheetPath, defaultPreviewPath, renderTimeline } from "@videocontrol/renderer";
import { validateTimeline as validateTimelineData } from "@videocontrol/timeline";
import { UserVisibleError } from "../errors.js";
import { loadConfig } from "../config.js";
import { assertProjectExists, readTimeline } from "./store.js";
import { writeCurrentProjectReview } from "./projectReview.js";

export type PreviewRangeInput = {
  projectDir: string;
  startSec: number;
  endSec: number;
  quality?: "draft" | "standard";
};

export async function previewRange(input: PreviewRangeInput) {
  if (input.endSec <= input.startSec) {
    throw new UserVisibleError("Preview end time must be after the start time.");
  }

  const paths = await assertProjectExists(input.projectDir);
  const timeline = await readTimeline(paths.projectDir);
  const validation = validateTimelineData(timeline);
  if (!validation.valid) {
    throw new UserVisibleError(`Timeline is not ready to preview: ${validation.errors.join(" ")}`);
  }

  const previewMp4Path = defaultPreviewPath(paths.projectDir, timeline.version, input.startSec, input.endSec);
  const contactSheetPath = defaultContactSheetPath(previewMp4Path);
  const rendered = await renderTimeline({
    projectDir: paths.projectDir,
    timeline,
    outputPath: previewMp4Path,
    startSec: input.startSec,
    endSec: input.endSec,
    preset: input.quality === "draft" ? "720p" : "1080p"
  });
  await createContactSheet({ videoPath: previewMp4Path, outputPath: contactSheetPath });
  const review = await writeCurrentProjectReview({ projectDir: paths.projectDir, previewPath: previewMp4Path, contactSheetPath });
  const config = loadConfig();

  return {
    previewMp4Path,
    contactSheetPath,
    reviewJsonPath: review.reviewJsonPath,
    previewUrl: previewUrl(config.previewPort, review.reviewJsonPath),
    renderTimeMs: rendered.renderTimeMs,
    message: `Rendered preview for ${input.startSec}s to ${input.endSec}s.`
  };
}

function previewUrl(port: number, reviewJsonPath: string) {
  const params = new URLSearchParams({
    review: reviewJsonPath
  });
  return `http://localhost:${port}/?${params.toString()}`;
}
