import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  Brief,
  BriefSchema,
  ContentFormat,
  ContentObject,
  ContentObjectSchema,
  ContentRoute,
  ContentState,
  Provenance
} from "./schema.js";
import { defaultRouteForFormat } from "./routes.js";
import { assertTransitionAllowed } from "./stateMachine.js";

export const requiredRunFiles = [
  "content-object.md",
  "idea.md",
  "brief.md",
  "draft-package.md",
  "verification.md",
  "feedback.md"
] as const;

export type ContentOsPaths = {
  projectDir: string;
  stateDir: string;
  contentOsDir: string;
  strategyDir: string;
  voiceDir: string;
  storesDir: string;
  runsActiveDir: string;
  runsArchiveDir: string;
  modulesDir: string;
  workflowsDir: string;
};

export function contentOsPaths(projectDir: string): ContentOsPaths {
  const resolvedProjectDir = resolve(projectDir);
  const stateDir = join(resolvedProjectDir, ".videocontrol");
  const contentOsDir = join(stateDir, "content-os");
  return {
    projectDir: resolvedProjectDir,
    stateDir,
    contentOsDir,
    strategyDir: join(contentOsDir, "strategy"),
    voiceDir: join(contentOsDir, "voice"),
    storesDir: join(contentOsDir, "stores"),
    runsActiveDir: join(contentOsDir, "runs", "active"),
    runsArchiveDir: join(contentOsDir, "runs", "archive"),
    modulesDir: join(contentOsDir, "modules"),
    workflowsDir: join(contentOsDir, "workflows")
  };
}

export async function createContentOs(projectDir: string) {
  const paths = contentOsPaths(projectDir);
  await Promise.all([
    mkdir(paths.strategyDir, { recursive: true }),
    mkdir(paths.voiceDir, { recursive: true }),
    mkdir(paths.runsActiveDir, { recursive: true }),
    mkdir(paths.runsArchiveDir, { recursive: true }),
    mkdir(paths.modulesDir, { recursive: true }),
    mkdir(paths.workflowsDir, { recursive: true }),
    mkdir(join(paths.storesDir, "ideas"), { recursive: true }),
    mkdir(join(paths.storesDir, "hooks"), { recursive: true }),
    mkdir(join(paths.storesDir, "proof"), { recursive: true }),
    mkdir(join(paths.storesDir, "examples"), { recursive: true }),
    mkdir(join(paths.storesDir, "competitors"), { recursive: true }),
    mkdir(join(paths.storesDir, "feedback"), { recursive: true }),
    mkdir(join(paths.storesDir, "winners"), { recursive: true }),
    mkdir(join(paths.storesDir, "losers"), { recursive: true })
  ]);

  await writeIfMissing(join(paths.strategyDir, "positioning.md"), "# Positioning\n\n");
  await writeIfMissing(join(paths.strategyDir, "audience.md"), "# Audience\n\n");
  await writeIfMissing(join(paths.strategyDir, "pillars.md"), "# Pillars\n\n");
  await writeIfMissing(join(paths.strategyDir, "source-watchlist.md"), "# Source Watchlist\n\n");
  await writeIfMissing(join(paths.strategyDir, "platform-goals.md"), "# Platform Goals\n\n");
  await writeIfMissing(join(paths.voiceDir, "voice-profile.md"), "# Voice Profile\n\n");
  await writeIfMissing(join(paths.voiceDir, "master-avoid-slop.md"), "# Avoid Slop\n\n");
  await writeIfMissing(join(paths.voiceDir, "visual-style-profile.md"), "# Visual Style Profile\n\n");
  await writeIfMissing(join(paths.voiceDir, "brand-language.md"), "# Brand Language\n\n");
  await writeIfMissing(join(paths.storesDir, "inbox.md"), "# Inbox\n\n");
  await writeIfMissing(join(paths.storesDir, "workboard.md"), "# Workboard\n\n");

  const workflows = [
    "idea-to-video-ad",
    "idea-to-social-post",
    "competitor-ad-to-variant",
    "verifier-checklist",
    "platform-packaging",
    "scheduler-handoff",
    "feedback-loop"
  ];
  for (const workflow of workflows) {
    await writeIfMissing(join(paths.workflowsDir, `${workflow}.md`), `# ${titleFromSlug(workflow)}\n\n`);
  }

  return {
    contentOsDir: paths.contentOsDir,
    message: "Created the VideoControl Content OS workspace."
  };
}

export async function getContentOsStatus(projectDir: string) {
  const paths = contentOsPaths(projectDir);
  const active = await listContentObjects(projectDir, "active");
  const archived = await listContentObjects(projectDir, "archive");
  return {
    contentOsDir: paths.contentOsDir,
    activeCount: active.length,
    archivedCount: archived.length,
    hasContentOs: await exists(paths.contentOsDir)
  };
}

export async function createContentObject(input: {
  projectDir: string;
  title: string;
  format: ContentFormat;
  route?: ContentRoute;
  slug?: string;
  platformProfiles?: string[];
  pillar?: string;
}) {
  await createContentOs(input.projectDir);
  const paths = contentOsPaths(input.projectDir);
  const now = new Date().toISOString();
  const slug = input.slug ?? slugify(input.title);
  const runDir = join(paths.runsActiveDir, `${datePrefix()}-${slug}`);
  await mkdir(join(runDir, "variants", "v001"), { recursive: true });
  await mkdir(join(runDir, "renders"), { recursive: true });

  const contentObject: ContentObject = {
    schemaVersion: "0.2",
    id: `co_${randomUUID().slice(0, 12)}`,
    slug,
    title: input.title,
    route: input.route ?? defaultRouteForFormat(input.format),
    state: "captured",
    format: input.format,
    pillar: input.pillar,
    platformProfiles: input.platformProfiles ?? [],
    runDir,
    createdAt: now,
    updatedAt: now
  };

  await writeContentObject(runDir, contentObject);
  await writeIfMissing(join(runDir, "idea.md"), templateIdea(contentObject));
  await writeIfMissing(join(runDir, "brief.md"), templateBrief(contentObject));
  await writeIfMissing(join(runDir, "draft-package.md"), templateDraftPackage(contentObject));
  await writeIfMissing(join(runDir, "verification.md"), templateVerification(contentObject));
  await writeIfMissing(join(runDir, "feedback.md"), templateFeedback(contentObject));
  await writeIfMissing(join(runDir, "storyboard.md"), "# Storyboard\n\n");
  await writeIfMissing(join(runDir, "script.md"), "# Script\n\n");
  await writeIfMissing(join(runDir, "shot-list.md"), "# Shot List\n\n");
  await writeJson(join(runDir, "assets.manifest.json"), { schemaVersion: "0.2", assets: [] });
  await writeJson(join(runDir, "provenance.json"), { schemaVersion: "0.2", entries: [] });

  return {
    contentObject,
    runDir,
    message: `Created content object "${input.title}".`
  };
}

export async function findContentObject(projectDir: string, slug: string) {
  for (const area of ["active", "archive"] as const) {
    const objects = await listContentObjects(projectDir, area);
    const found = objects.find((entry) => entry.contentObject.slug === slug);
    if (found) {
      return found;
    }
  }
  throw new Error(`Content object not found: ${slug}`);
}

export async function getContentObject(projectDir: string, slug: string) {
  return findContentObject(projectDir, slug);
}

export async function listContentObjects(projectDir: string, area: "active" | "archive" | "all" = "active") {
  const paths = contentOsPaths(projectDir);
  const dirs = area === "all" ? [paths.runsActiveDir, paths.runsArchiveDir] : [area === "active" ? paths.runsActiveDir : paths.runsArchiveDir];
  const results: Array<{ contentObject: ContentObject; runDir: string; area: "active" | "archive" }> = [];

  for (const dir of dirs) {
    if (!(await exists(dir))) {
      continue;
    }
    for (const entry of await readdir(dir)) {
      const runDir = join(dir, entry);
      const info = await stat(runDir);
      if (!info.isDirectory()) {
        continue;
      }
      const objectPath = join(runDir, "content-object.json");
      if (!(await exists(objectPath))) {
        continue;
      }
      const parsed = ContentObjectSchema.parse(JSON.parse(await readFile(objectPath, "utf8")));
      results.push({
        contentObject: parsed,
        runDir,
        area: dir === paths.runsActiveDir ? "active" : "archive"
      });
    }
  }

  return results.sort((left, right) => left.contentObject.createdAt.localeCompare(right.contentObject.createdAt));
}

export async function routeContentObject(projectDir: string, slug: string, route: ContentRoute) {
  const found = await findContentObject(projectDir, slug);
  const updated = { ...found.contentObject, route, updatedAt: new Date().toISOString() };
  await writeContentObject(found.runDir, updated);
  return { contentObject: updated, message: `Routed "${slug}" as ${route}.` };
}

export async function transitionContentState(projectDir: string, slug: string, state: ContentState) {
  const found = await findContentObject(projectDir, slug);
  assertTransitionAllowed(found.contentObject.state, state);
  const updated = { ...found.contentObject, state, updatedAt: new Date().toISOString() };
  await writeContentObject(found.runDir, updated);
  return { contentObject: updated, message: `Moved "${slug}" to ${state}.` };
}

export async function archiveContentObject(projectDir: string, slug: string) {
  const found = await findContentObject(projectDir, slug);
  const paths = contentOsPaths(projectDir);
  const targetDir = join(paths.runsArchiveDir, basename(found.runDir));
  const archived = { ...found.contentObject, state: "archived" as const, runDir: targetDir, updatedAt: new Date().toISOString() };
  await writeContentObject(found.runDir, archived);
  await mkdir(paths.runsArchiveDir, { recursive: true });
  if (found.runDir !== targetDir) {
    await rename(found.runDir, targetDir);
  }
  await writeContentObject(targetDir, archived);
  return { contentObject: archived, runDir: targetDir, message: `Archived "${slug}".` };
}

export async function validateRunFolder(runDir: string) {
  const missing: string[] = [];
  for (const file of requiredRunFiles) {
    if (!(await exists(join(runDir, file)))) {
      missing.push(file);
    }
  }
  return { valid: missing.length === 0, missing };
}

export async function writeBrief(runDir: string, brief: Brief) {
  const parsed = BriefSchema.parse(brief);
  await writeJson(join(runDir, "brief.json"), parsed);
  await writeFile(join(runDir, "brief.md"), renderBrief(parsed), "utf8");
  return parsed;
}

export async function appendProvenance(runDir: string, provenance: Provenance) {
  const provenancePath = join(runDir, "provenance.json");
  const current = (await exists(provenancePath))
    ? (JSON.parse(await readFile(provenancePath, "utf8")) as { schemaVersion: "0.2"; entries: Provenance[] })
    : { schemaVersion: "0.2" as const, entries: [] };
  current.entries.push(provenance);
  await writeJson(provenancePath, current);
  return current;
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function relativeToProject(projectDir: string, filePath: string) {
  return relative(resolve(projectDir), resolve(filePath));
}

function writeContentObject(runDir: string, contentObject: ContentObject) {
  return Promise.all([
    writeJson(join(runDir, "content-object.json"), contentObject),
    writeFile(join(runDir, "content-object.md"), renderContentObject(contentObject), "utf8")
  ]);
}

async function writeIfMissing(path: string, content: string) {
  if (await exists(path)) {
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "content"
  );
}

function datePrefix() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function renderContentObject(contentObject: ContentObject) {
  return `# ${contentObject.title}

schemaVersion: ${contentObject.schemaVersion}
id: ${contentObject.id}
slug: ${contentObject.slug}
route: ${contentObject.route}
state: ${contentObject.state}
format: ${contentObject.format}
platformProfiles: ${contentObject.platformProfiles.join(", ")}
createdAt: ${contentObject.createdAt}
updatedAt: ${contentObject.updatedAt}
`;
}

function templateIdea(contentObject: ContentObject) {
  return `# Idea

title: ${contentObject.title}
route: ${contentObject.route}

## Source

## Why Now

## Promise

`;
}

function templateBrief(contentObject: ContentObject) {
  return `# Brief

thesis:
reader:
proof:
angle:
constraints:
voice anchors:
risks:
open loops:

## Content Object

${contentObject.slug}
`;
}

function templateDraftPackage(contentObject: ContentObject) {
  return `# Draft Package

content: ${contentObject.title}

## Assets

## Timeline Notes

## Copy

`;
}

function templateVerification(contentObject: ContentObject) {
  return `# Verification

content: ${contentObject.title}

## Bookmarkability

## Ad Readiness

## Avoid-Slop Findings

## Viral Postmortem

`;
}

function templateFeedback(contentObject: ContentObject) {
  return `# Feedback

content: ${contentObject.title}

## 24h

## 72h

## Learned

`;
}

function renderBrief(brief: Brief) {
  return `# Brief

## Thesis
${brief.thesis}

## Reader
${brief.reader}

## Proof
${brief.proof.map((item) => `- ${item}`).join("\n")}

## Angle
${brief.angle}

## Constraints
${brief.constraints.map((item) => `- ${item}`).join("\n")}

## Voice Anchors
${brief.voiceAnchors.map((item) => `- ${item}`).join("\n")}

## Risks
${brief.risks.map((item) => `- ${item}`).join("\n")}

## Open Loops
${brief.openLoops.map((item) => `- ${item}`).join("\n")}
`;
}
