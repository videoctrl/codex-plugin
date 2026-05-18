import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";

export const ProjectIntentSchemaVersion = "0.1";
export const ProjectReviewSchemaVersion = "0.1";

export const IntentNoteSchema = z.object({
  id: z.string(),
  note: z.string(),
  selectionId: z.string().optional(),
  source: z.string().optional(),
  createdAt: z.string()
});

export const ProjectIntentSchema = z.object({
  schemaVersion: z.literal(ProjectIntentSchemaVersion),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  summary: z.string(),
  brandFeel: z.array(z.string()).default([]),
  visualStyle: z.array(z.string()).default([]),
  captionRules: z.array(z.string()).default([]),
  safeZoneRules: z.array(z.string()).default([]),
  platformTargets: z.array(z.string()).default([]),
  motionStyle: z.array(z.string()).default([]),
  approvalNotes: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  winningPatterns: z.array(z.string()).default([]),
  reviewNotes: z.array(IntentNoteSchema).default([]),
  updatedAt: z.string()
});

export const ReviewSelectionKindSchema = z.enum(["clip", "caption", "variant", "handoff", "asset"]);

export const ReviewSelectionSchema = z.object({
  id: z.string(),
  kind: ReviewSelectionKindSchema,
  label: z.string(),
  targetId: z.string(),
  sourcePath: z.string().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
  detail: z.record(z.string(), z.unknown()).default({})
});

export const ProjectReviewSchema = z.object({
  schemaVersion: z.literal(ProjectReviewSchemaVersion),
  project: z.object({
    projectDir: z.string(),
    projectId: z.string().optional(),
    name: z.string().optional()
  }),
  timeline: z.object({
    version: z.string().optional(),
    durationSec: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    fps: z.number().optional()
  }),
  media: z.object({
    previewPath: z.string().optional(),
    contactSheetPath: z.string().optional()
  }),
  intent: ProjectIntentSchema,
  selections: z.array(ReviewSelectionSchema),
  updatedAt: z.string()
});

export type ProjectIntent = z.infer<typeof ProjectIntentSchema>;
export type IntentNote = z.infer<typeof IntentNoteSchema>;
export type ReviewSelection = z.infer<typeof ReviewSelectionSchema>;
export type ProjectReview = z.infer<typeof ProjectReviewSchema>;

export type ReviewTimeline = {
  version?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  clips?: Array<{
    id: string;
    name?: string;
    trackId: string;
    startSec: number;
    durationSec: number;
    assetId: string;
  }>;
  textClips?: Array<{
    id: string;
    text: string;
    trackId: string;
    startSec: number;
    durationSec: number;
  }>;
};

export type ReviewContentObject = {
  contentObject: {
    slug: string;
    title: string;
    route: string;
    state: string;
    platformProfiles: string[];
  };
  runDir: string;
};

export function intentPaths(projectDir: string) {
  const resolvedProjectDir = resolve(projectDir);
  const stateDir = join(resolvedProjectDir, ".videocontrol");
  const intentDir = join(stateDir, "intent");
  return {
    projectDir: resolvedProjectDir,
    stateDir,
    intentDir,
    intentJsonPath: join(intentDir, "project-intent.json"),
    intentMarkdownPath: join(intentDir, "project-intent.md"),
    reviewJsonPath: join(stateDir, "review.json")
  };
}

export async function ensureProjectIntent(input: { projectDir: string; projectId?: string; projectName?: string }) {
  const paths = intentPaths(input.projectDir);
  await mkdir(paths.intentDir, { recursive: true });

  const existing = await readProjectIntentIfPresent(input.projectDir);
  const intent = existing ?? defaultProjectIntent(input);
  const updated = {
    ...intent,
    projectId: intent.projectId ?? input.projectId,
    projectName: intent.projectName ?? input.projectName
  };

  await writeProjectIntent(input.projectDir, updated);
  await updateExistingReviewIntent(input.projectDir, updated);
  return {
    intent: updated,
    intentJsonPath: paths.intentJsonPath,
    intentMarkdownPath: paths.intentMarkdownPath
  };
}

async function updateExistingReviewIntent(projectDir: string, intent: ProjectIntent) {
  const paths = intentPaths(projectDir);
  try {
    const parsed = ProjectReviewSchema.parse(JSON.parse(await readFile(paths.reviewJsonPath, "utf8")));
    await writeJson(paths.reviewJsonPath, {
      ...parsed,
      intent,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export async function readProjectIntent(projectDir: string) {
  const existing = await readProjectIntentIfPresent(projectDir);
  if (existing) {
    return existing;
  }
  return (await ensureProjectIntent({ projectDir })).intent;
}

export async function updateProjectIntentFromNote(input: {
  projectDir: string;
  note: string;
  selectionId?: string;
  source?: string;
}) {
  const note = input.note.trim();
  if (!note) {
    throw new Error("Review note is required.");
  }

  const intent = await readProjectIntent(input.projectDir);
  const now = new Date().toISOString();
  const reviewNote: IntentNote = {
    id: `intent-note-${now.replace(/[^0-9]/g, "").slice(0, 14)}`,
    note,
    selectionId: input.selectionId,
    source: input.source,
    createdAt: now
  };
  const updated: ProjectIntent = {
    ...intent,
    summary: intent.summary === "Not set yet." ? note : intent.summary,
    approvalNotes: unique([...intent.approvalNotes, note]),
    reviewNotes: [...intent.reviewNotes, reviewNote],
    updatedAt: now
  };

  await writeProjectIntent(input.projectDir, updated);
  await updateExistingReviewIntent(input.projectDir, updated);
  return {
    intent: updated,
    note: reviewNote,
    intentJsonPath: intentPaths(input.projectDir).intentJsonPath,
    intentMarkdownPath: intentPaths(input.projectDir).intentMarkdownPath,
    message: "Updated project intent."
  };
}

export async function writeProjectReview(input: {
  projectDir: string;
  projectId?: string;
  projectName?: string;
  timeline?: ReviewTimeline;
  contentObjects?: ReviewContentObject[];
  previewPath?: string;
  contactSheetPath?: string;
}) {
  const paths = intentPaths(input.projectDir);
  const { intent } = await ensureProjectIntent({
    projectDir: input.projectDir,
    projectId: input.projectId,
    projectName: input.projectName
  });
  const selections = [
    ...timelineSelections(input.timeline),
    ...(await contentSelections(input.contentObjects ?? [])),
    ...(await assetSelections(paths.projectDir, input.contentObjects ?? []))
  ];
  const review: ProjectReview = {
    schemaVersion: ProjectReviewSchemaVersion,
    project: {
      projectDir: paths.projectDir,
      projectId: input.projectId,
      name: input.projectName
    },
    timeline: {
      version: input.timeline?.version,
      durationSec: input.timeline?.durationSec,
      width: input.timeline?.width,
      height: input.timeline?.height,
      fps: input.timeline?.fps
    },
    media: {
      previewPath: input.previewPath,
      contactSheetPath: input.contactSheetPath
    },
    intent,
    selections,
    updatedAt: new Date().toISOString()
  };

  await writeJson(paths.reviewJsonPath, ProjectReviewSchema.parse(review));
  return {
    review,
    reviewJsonPath: paths.reviewJsonPath,
    message: "Updated project review."
  };
}

async function readProjectIntentIfPresent(projectDir: string) {
  const paths = intentPaths(projectDir);
  try {
    const parsed = ProjectIntentSchema.safeParse(JSON.parse(await readFile(paths.intentJsonPath, "utf8")));
    if (!parsed.success) {
      throw new Error(`Project intent is not valid: ${parsed.error.message}`);
    }
    return parsed.data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function writeProjectIntent(projectDir: string, intent: ProjectIntent) {
  const paths = intentPaths(projectDir);
  await writeJson(paths.intentJsonPath, ProjectIntentSchema.parse(intent));
  await writeFile(paths.intentMarkdownPath, renderProjectIntentMarkdown(intent), "utf8");
}

function defaultProjectIntent(input: { projectId?: string; projectName?: string }): ProjectIntent {
  return {
    schemaVersion: ProjectIntentSchemaVersion,
    projectId: input.projectId,
    projectName: input.projectName,
    summary: "Not set yet.",
    brandFeel: [],
    visualStyle: [],
    captionRules: [],
    safeZoneRules: [],
    platformTargets: [],
    motionStyle: [],
    approvalNotes: [],
    avoid: [],
    winningPatterns: [],
    reviewNotes: [],
    updatedAt: new Date().toISOString()
  };
}

function timelineSelections(timeline?: ReviewTimeline): ReviewSelection[] {
  const clips = (timeline?.clips ?? []).map((clip): ReviewSelection => ({
    id: `clip:${clip.id}`,
    kind: "clip",
    label: clip.name ?? clip.id,
    targetId: clip.id,
    status: `${clip.startSec}s to ${clip.startSec + clip.durationSec}s`,
    detail: {
      trackId: clip.trackId,
      assetId: clip.assetId,
      startSec: clip.startSec,
      durationSec: clip.durationSec
    }
  }));
  const captions = (timeline?.textClips ?? []).map((caption): ReviewSelection => ({
    id: `caption:${caption.id}`,
    kind: "caption",
    label: caption.text,
    targetId: caption.id,
    status: `${caption.startSec}s to ${caption.startSec + caption.durationSec}s`,
    detail: {
      trackId: caption.trackId,
      text: caption.text,
      startSec: caption.startSec,
      durationSec: caption.durationSec
    }
  }));
  return [...clips, ...captions];
}

async function contentSelections(contentObjects: ReviewContentObject[]) {
  const selections: ReviewSelection[] = [];
  for (const entry of contentObjects) {
    for (const variant of await directoryEntries(join(entry.runDir, "variants"))) {
      if (!variant.isDirectory) {
        continue;
      }
      selections.push({
        id: `variant:${entry.contentObject.slug}:${variant.name}`,
        kind: "variant",
        label: `${entry.contentObject.title} ${variant.name}`,
        targetId: variant.name,
        sourcePath: join(entry.runDir, "variants", variant.name),
        status: entry.contentObject.state,
        detail: {
          slug: entry.contentObject.slug,
          route: entry.contentObject.route,
          platformProfiles: entry.contentObject.platformProfiles
        }
      });
    }

    for (const handoff of await directoryEntries(entry.runDir)) {
      if (handoff.isDirectory || !handoff.name.endsWith("handoff.md")) {
        continue;
      }
      selections.push({
        id: `handoff:${entry.contentObject.slug}:${basename(handoff.name, ".md")}`,
        kind: "handoff",
        label: `${entry.contentObject.title} ${handoff.name.replace(".md", "")}`,
        targetId: handoff.name,
        sourcePath: join(entry.runDir, handoff.name),
        status: entry.contentObject.state,
        detail: {
          slug: entry.contentObject.slug,
          route: entry.contentObject.route,
          platformProfiles: entry.contentObject.platformProfiles
        }
      });
    }
  }
  return selections;
}

async function assetSelections(projectDir: string, contentObjects: ReviewContentObject[]) {
  const selections: ReviewSelection[] = [];
  const seen = new Set<string>();

  for (const job of await providerJobs(projectDir)) {
    const id = `asset:${job.id}`;
    seen.add(id);
    selections.push({
      id,
      kind: "asset",
      label: `${job.provider} ${job.kind}`,
      targetId: job.id,
      sourcePath: job.assetPath,
      status: job.status,
      note: job.message,
      detail: {
        provider: job.provider,
        providerJobId: job.providerJobId,
        resultUrl: job.resultUrl,
        slug: job.slug,
        prompt: job.prompt
      }
    });
  }

  for (const entry of contentObjects) {
    const provenance = await readJsonIfPresent(join(entry.runDir, "provenance.json"));
    const provenanceRecord = provenance && typeof provenance === "object" ? (provenance as Record<string, unknown>) : undefined;
    const provenanceEntries = Array.isArray(provenanceRecord?.entries) ? provenanceRecord.entries : [];
    for (const asset of provenanceEntries) {
      if (!asset || typeof asset !== "object") {
        continue;
      }
      const record = asset as Record<string, unknown>;
      if (record.sourceType !== "generated" && record.sourceType !== "remote") {
        continue;
      }
      const assetId = typeof record.assetId === "string" ? record.assetId : undefined;
      if (!assetId) {
        continue;
      }
      const id = `asset:${entry.contentObject.slug}:${assetId}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      selections.push({
        id,
        kind: "asset",
        label: `${entry.contentObject.title} generated asset`,
        targetId: assetId,
        sourcePath: typeof record.assetPath === "string" ? record.assetPath : undefined,
        status: typeof record.provider === "string" ? record.provider : entry.contentObject.state,
        note: typeof record.prompt === "string" ? record.prompt : undefined,
        detail: {
          slug: entry.contentObject.slug,
          provider: record.provider,
          providerJobId: record.providerJobId,
          resultUrl: record.resultUrl
        }
      });
    }
  }

  return selections;
}

async function providerJobs(projectDir: string) {
  const jobsDir = join(projectDir, ".videocontrol", "provider-jobs");
  const jobs: Array<Record<string, unknown>> = [];
  for (const entry of await directoryEntries(jobsDir)) {
    if (entry.isDirectory || !entry.name.endsWith(".json")) {
      continue;
    }
    const parsed = await readJsonIfPresent(join(jobsDir, entry.name));
    if (parsed && typeof parsed === "object") {
      jobs.push(parsed as Record<string, unknown>);
    }
  }
  return jobs.filter((job) => typeof job.id === "string" && typeof job.provider === "string" && typeof job.kind === "string").map((job) => ({
    id: String(job.id),
    provider: String(job.provider),
    kind: String(job.kind),
    status: typeof job.status === "string" ? job.status : "submitted",
    providerJobId: typeof job.providerJobId === "string" ? job.providerJobId : undefined,
    assetPath: typeof job.assetPath === "string" ? job.assetPath : undefined,
    resultUrl: typeof job.resultUrl === "string" ? job.resultUrl : undefined,
    slug: typeof job.slug === "string" ? job.slug : undefined,
    prompt: typeof job.prompt === "string" ? job.prompt : undefined,
    message: typeof job.message === "string" ? job.message : undefined
  }));
}

async function readJsonIfPresent(path: string) {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function directoryEntries(path: string) {
  try {
    return await Promise.all(
      (await readdir(path)).map(async (name) => ({
        name,
        isDirectory: (await stat(join(path, name))).isDirectory()
      }))
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function renderProjectIntentMarkdown(intent: ProjectIntent) {
  return `# Project Intent

Read this before planning, editing, previewing, rendering, or packaging work in this project.

## Current Direction

${intent.summary}

## Brand Feel

${renderList(intent.brandFeel)}

## Visual Style

${renderList(intent.visualStyle)}

## Captions

${renderList(intent.captionRules)}

## Safe Zones

${renderList(intent.safeZoneRules)}

## Platforms

${renderList(intent.platformTargets)}

## Motion

${renderList(intent.motionStyle)}

## Approval Notes

${renderList(intent.approvalNotes)}

## Avoid

${renderList(intent.avoid)}

## Winning Patterns

${renderList(intent.winningPatterns)}

## Review Notes

${intent.reviewNotes.length === 0 ? "- None yet." : intent.reviewNotes.map((note) => `- ${note.note}${note.selectionId ? ` (${note.selectionId})` : ""}`).join("\n")}

## How Agents Should Use This

- Read this file before changing the brief, script, timeline, captions, preview, export, or handoff.
- Use \`.videocontrol/review.json\` to target specific clips, captions, variants, and handoffs.
- When a user gives new direction, record it with \`update_project_intent\` or \`pnpm exec videocontrol intent update\`.
- Keep later changes aligned with the current direction unless the user changes it.

updatedAt: ${intent.updatedAt}
`;
}

function renderList(items: string[]) {
  return items.length === 0 ? "- Not set yet." : items.map((item) => `- ${item}`).join("\n");
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
