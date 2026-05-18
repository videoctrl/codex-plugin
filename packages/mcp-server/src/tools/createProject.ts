import { access } from "node:fs/promises";
import { ensureProjectIntent, writeProjectReview } from "@videocontrol/content-os";
import { createInitialTimeline } from "@videocontrol/timeline";
import { UserVisibleError } from "../errors.js";
import { createProjectId, ensureProjectFolders, projectPaths, writeProject, writeTimeline } from "./store.js";

export type CreateProjectInput = {
  projectDir: string;
  name: string;
  width?: number;
  height?: number;
  fps?: number;
};

export async function createProject(input: CreateProjectInput) {
  const paths = projectPaths(input.projectDir);
  if (await exists(paths.projectPath)) {
    throw new UserVisibleError(`A VideoControl project already exists at ${paths.projectDir}.`);
  }

  await ensureProjectFolders(paths);
  const now = new Date().toISOString();
  const projectId = createProjectId(input.name);
  const timeline = createInitialTimeline({
    projectId,
    name: input.name,
    width: input.width,
    height: input.height,
    fps: input.fps,
    now
  });

  await writeProject(paths, {
    projectId,
    name: input.name,
    createdAt: now,
    updatedAt: now,
    timelinePath: paths.timelinePath
  });
  await writeTimeline(paths, timeline);
  await ensureProjectIntent({ projectDir: paths.projectDir, projectId, projectName: input.name });
  await writeProjectReview({ projectDir: paths.projectDir, projectId, projectName: input.name, timeline });

  return {
    projectId,
    projectDir: paths.projectDir,
    timelinePath: paths.timelinePath,
    message: `Created VideoControl project "${input.name}".`
  };
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
