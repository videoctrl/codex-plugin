import { validateTimeline as validateTimelineData } from "@videocontrol/timeline";
import { assertProjectExists, readTimeline } from "./store.js";

export type ValidateTimelineInput = {
  projectDir: string;
};

export async function validateTimeline(input: ValidateTimelineInput) {
  const paths = await assertProjectExists(input.projectDir);
  const timeline = await readTimeline(paths.projectDir);
  const validation = validateTimelineData(timeline);
  return {
    valid: validation.valid,
    errors: validation.errors,
    timelinePath: paths.timelinePath,
    version: timeline.version,
    message: validation.valid ? `Timeline ${timeline.version} is valid.` : `Timeline ${timeline.version} needs attention.`
  };
}
