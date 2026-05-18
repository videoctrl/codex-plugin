import { listTimelineVersions } from "./store.js";

export type ListVersionsInput = {
  projectDir: string;
};

export async function listVersions(input: ListVersionsInput) {
  const versions = await listTimelineVersions(input.projectDir);
  return {
    versions,
    message: `Found ${versions.length} timeline version${versions.length === 1 ? "" : "s"}.`
  };
}
