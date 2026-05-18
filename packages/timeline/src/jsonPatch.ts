import jsonPatch, { type Operation } from "fast-json-patch";
import { Timeline } from "./schema.js";
import { validateTimeline, type TimelineValidationResult } from "./validate.js";
import { withNewVersion } from "./versioning.js";

const { applyPatch } = jsonPatch;

export type TimelinePatchOperation = {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
};

export type TimelinePatchResult = {
  accepted: boolean;
  timeline?: Timeline;
  validation: TimelineValidationResult;
};

export function applyTimelinePatch(
  timeline: Timeline,
  patch: TimelinePatchOperation[],
  options: { dryRun?: boolean; now?: string } = {}
): TimelinePatchResult {
  const workingCopy = structuredClone(timeline) as Timeline;
  let patched: Timeline;
  try {
    patched = applyPatch(workingCopy, patch as Operation[], true, false).newDocument as Timeline;
  } catch (error) {
    return {
      accepted: false,
      validation: {
        valid: false,
        errors: [patchErrorMessage(error)]
      }
    };
  }
  const versioned = options.dryRun ? patched : withNewVersion(patched, options.now);
  const validation = validateTimeline(versioned);

  return {
    accepted: validation.valid,
    timeline: validation.valid ? validation.timeline : undefined,
    validation
  };
}

function patchErrorMessage(error: unknown) {
  const index = typeof error === "object" && error !== null && "index" in error ? Number((error as { index?: unknown }).index) : undefined;
  if (index !== undefined && Number.isInteger(index)) {
    return `Timeline patch operation ${index + 1} could not be applied.`;
  }
  return "Timeline patch could not be applied.";
}
