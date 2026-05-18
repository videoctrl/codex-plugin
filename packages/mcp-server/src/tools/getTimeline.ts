import { assertProjectExists, readTimeline } from "./store.js";

export type GetTimelineInput = {
  projectDir: string;
};

export async function getTimeline(input: GetTimelineInput) {
  const paths = await assertProjectExists(input.projectDir);
  const timeline = await readTimeline(paths.projectDir);
  return {
    timeline,
    timelinePath: paths.timelinePath,
    message: `Loaded timeline ${timeline.version}.`
  };
}
