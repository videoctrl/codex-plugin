import jsonPatch from "fast-json-patch";
import { readTimelineVersion } from "./store.js";

const { compare } = jsonPatch;

export type CompareVersionsInput = {
  projectDir: string;
  fromVersion: string;
  toVersion: string;
};

export async function compareVersions(input: CompareVersionsInput) {
  const fromTimeline = await readTimelineVersion(input.projectDir, input.fromVersion);
  const toTimeline = await readTimelineVersion(input.projectDir, input.toVersion);
  const patch = compare(fromTimeline, toTimeline);
  return {
    fromVersion: input.fromVersion,
    toVersion: input.toVersion,
    changes: patch,
    message: `Compared ${input.fromVersion} with ${input.toVersion}.`
  };
}
