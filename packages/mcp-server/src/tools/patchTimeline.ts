import { applyTimelinePatch, type TimelinePatchOperation } from "@videocontrol/timeline";
import { UserVisibleError } from "../errors.js";
import { assertProjectExists, readTimeline, writeTimeline } from "./store.js";

export type PatchTimelineInput = {
  projectDir: string;
  baseVersion: string;
  rationale: string;
  patch: TimelinePatchOperation[];
  dryRun?: boolean;
};

export async function patchTimeline(input: PatchTimelineInput) {
  const paths = await assertProjectExists(input.projectDir);
  const timeline = await readTimeline(paths.projectDir);
  if (timeline.version !== input.baseVersion) {
    throw new UserVisibleError(`Timeline is ${timeline.version}, but the patch was based on ${input.baseVersion}.`);
  }

  const result = applyTimelinePatch(timeline, input.patch, { dryRun: input.dryRun });
  if (!result.accepted || !result.timeline) {
    return {
      accepted: false,
      previousVersion: timeline.version,
      validationErrors: result.validation.errors,
      message: "The timeline change was not applied because validation failed."
    };
  }

  if (!input.dryRun) {
    await writeTimeline(paths, result.timeline);
  }

  return {
    accepted: true,
    previousVersion: timeline.version,
    newVersion: result.timeline.version,
    validationErrors: [],
    timelinePath: input.dryRun ? undefined : paths.timelinePath,
    rationale: input.rationale,
    message: input.dryRun ? "The timeline change is valid." : `Applied timeline change as ${result.timeline.version}.`
  };
}
