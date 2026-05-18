import { resolve } from "node:path";
import { defaultExportPath, renderTimeline, type ExportPreset } from "@videocontrol/renderer";
import { validateTimeline as validateTimelineData } from "@videocontrol/timeline";
import { UserVisibleError } from "../errors.js";
import { assertInsideDirectory } from "../security/pathGuard.js";
import { assertProjectExists, readTimeline } from "./store.js";
import { writeCurrentProjectReview } from "./projectReview.js";

export type RenderExportInput = {
  projectDir: string;
  preset?: ExportPreset;
  outputPath?: string;
};

export async function renderExport(input: RenderExportInput) {
  const paths = await assertProjectExists(input.projectDir);
  const timeline = await readTimeline(paths.projectDir);
  const validation = validateTimelineData(timeline);
  if (!validation.valid) {
    throw new UserVisibleError(`Timeline is not ready to render: ${validation.errors.join(" ")}`);
  }

  const preset = input.preset ?? "1080p";
  const outputPath = input.outputPath ? resolve(paths.projectDir, input.outputPath) : defaultExportPath(paths.projectDir, timeline.version, preset);
  assertInsideDirectory(paths.projectDir, outputPath);

  const rendered = await renderTimeline({
    projectDir: paths.projectDir,
    timeline,
    outputPath,
    preset
  });
  const review = await writeCurrentProjectReview({ projectDir: paths.projectDir, previewPath: outputPath });

  return {
    outputPath,
    preset,
    reviewJsonPath: review.reviewJsonPath,
    renderTimeMs: rendered.renderTimeMs,
    message: `Rendered ${preset} export.`
  };
}
