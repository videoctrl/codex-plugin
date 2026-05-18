import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Timeline, TimelineSchema, VideoControlProject, ProjectSchema } from "@videocontrol/timeline";
import { UserVisibleError } from "../errors.js";
import { assertFileExists, assertInsideDirectory, assertSafeInputPath, resolveProjectDir } from "../security/pathGuard.js";

export type ProjectPaths = {
  projectDir: string;
  stateDir: string;
  projectPath: string;
  timelinePath: string;
  assetsPath: string;
  versionsDir: string;
  rendersDir: string;
  thumbnailsDir: string;
  scenesDir: string;
  transcriptsDir: string;
  logsDir: string;
};

export function projectPaths(projectDir: string): ProjectPaths {
  const resolvedProjectDir = resolveProjectDir(projectDir);
  const stateDir = join(resolvedProjectDir, ".videocontrol");
  return {
    projectDir: resolvedProjectDir,
    stateDir,
    projectPath: join(stateDir, "project.json"),
    timelinePath: join(stateDir, "timeline.video.json"),
    assetsPath: join(stateDir, "assets.json"),
    versionsDir: join(stateDir, "versions"),
    rendersDir: join(stateDir, "renders"),
    thumbnailsDir: join(stateDir, "thumbnails"),
    scenesDir: join(stateDir, "scenes"),
    transcriptsDir: join(stateDir, "transcripts"),
    logsDir: join(stateDir, "logs")
  };
}

export async function ensureProjectFolders(paths: ProjectPaths) {
  await mkdir(paths.projectDir, { recursive: true });
  await Promise.all([
    mkdir(paths.stateDir, { recursive: true }),
    mkdir(paths.versionsDir, { recursive: true }),
    mkdir(paths.rendersDir, { recursive: true }),
    mkdir(paths.thumbnailsDir, { recursive: true }),
    mkdir(paths.scenesDir, { recursive: true }),
    mkdir(paths.transcriptsDir, { recursive: true }),
    mkdir(paths.logsDir, { recursive: true })
  ]);
}

export async function assertProjectExists(projectDir: string) {
  const paths = projectPaths(projectDir);
  await assertFileExists(paths.projectPath);
  await assertFileExists(paths.timelinePath);
  return paths;
}

export async function readProject(projectDir: string): Promise<VideoControlProject> {
  const paths = await assertProjectExists(projectDir);
  const parsed = ProjectSchema.safeParse(JSON.parse(await readFile(paths.projectPath, "utf8")));
  if (!parsed.success) {
    throw new UserVisibleError(`Project file is not valid: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function writeProject(paths: ProjectPaths, project: VideoControlProject) {
  await writeJson(paths.projectPath, project);
}

export async function readTimeline(projectDir: string): Promise<Timeline> {
  const paths = await assertProjectExists(projectDir);
  const parsed = TimelineSchema.safeParse(JSON.parse(await readFile(paths.timelinePath, "utf8")));
  if (!parsed.success) {
    throw new UserVisibleError(`Timeline file is not valid: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function writeTimeline(paths: ProjectPaths, timeline: Timeline) {
  await writeJson(paths.timelinePath, timeline);
  await writeJson(join(paths.versionsDir, `${timeline.version}.timeline.video.json`), timeline);
  await writeJson(paths.assetsPath, timeline.assets);
}

export async function listTimelineVersions(projectDir: string) {
  const paths = await assertProjectExists(projectDir);
  const entries = await readdir(paths.versionsDir);
  return entries
    .filter((entry) => /^v\d{4}\.timeline\.video\.json$/.test(entry))
    .sort()
    .map((entry) => ({
      version: entry.slice(0, 5),
      path: join(paths.versionsDir, entry)
    }));
}

export async function readTimelineVersion(projectDir: string, version: string): Promise<Timeline> {
  const paths = await assertProjectExists(projectDir);
  const versionPath = join(paths.versionsDir, `${version}.timeline.video.json`);
  await assertFileExists(versionPath);
  const parsed = TimelineSchema.safeParse(JSON.parse(await readFile(versionPath, "utf8")));
  if (!parsed.success) {
    throw new UserVisibleError(`Timeline version ${version} is not valid: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function resolveImportPath(projectDir: string, inputPath: string) {
  const candidates = isAbsolute(inputPath)
    ? [inputPath]
    : [resolve(process.cwd(), inputPath), resolve(projectDir, inputPath)];

  for (const candidate of candidates) {
    try {
      await assertFileExists(candidate);
      assertSafeInputPath(candidate);
      const info = await stat(candidate);
      if (info.isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  throw new UserVisibleError(`File not found: ${inputPath}`);
}

export function pathForTimeline(projectDir: string, filePath: string) {
  const resolvedProjectDir = resolve(projectDir);
  const resolvedFile = resolve(filePath);
  const rel = relative(resolvedProjectDir, resolvedFile);
  if (!rel.startsWith("..") && rel !== "") {
    return rel;
  }
  return resolvedFile;
}

export async function copyAssetIntoProject(projectDir: string, sourcePath: string) {
  const rawDir = join(projectDir, "raw");
  await mkdir(rawDir, { recursive: true });
  const targetPath = await uniquePath(join(rawDir, basename(sourcePath)));
  assertInsideDirectory(projectDir, targetPath);
  await copyFile(sourcePath, targetPath);
  return targetPath;
}

export function createProjectId(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "video"}-${randomUUID().slice(0, 8)}`;
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function uniquePath(initialPath: string) {
  let candidate = initialPath;
  const dotIndex = basename(initialPath).lastIndexOf(".");
  const baseName = dotIndex > 0 ? basename(initialPath).slice(0, dotIndex) : basename(initialPath);
  const extension = dotIndex > 0 ? basename(initialPath).slice(dotIndex) : "";
  let index = 1;

  while (await exists(candidate)) {
    candidate = join(dirname(initialPath), `${baseName}-${index}${extension}`);
    index += 1;
  }

  return candidate;
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
