import { listContentObjects, writeProjectReview } from "@videocontrol/content-os";
import { readProject, readTimeline } from "./store.js";

export async function writeCurrentProjectReview(input: {
  projectDir: string;
  previewPath?: string;
  contactSheetPath?: string;
}) {
  const [project, timeline, contentObjects] = await Promise.all([
    readProject(input.projectDir),
    readTimeline(input.projectDir),
    safeListContentObjects(input.projectDir)
  ]);

  return writeProjectReview({
    projectDir: input.projectDir,
    projectId: project.projectId,
    projectName: project.name,
    timeline,
    contentObjects,
    previewPath: input.previewPath,
    contactSheetPath: input.contactSheetPath
  });
}

async function safeListContentObjects(projectDir: string) {
  try {
    return await listContentObjects(projectDir, "active");
  } catch {
    return [];
  }
}
