import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { appendProvenance, findContentObject } from "@videocontrol/content-os";
import { generateCreativeAsset } from "./registry.js";
import { GenerateCreativeAssetInput, ProviderIdSchema } from "./types.js";
import { rememberGeneratedAsset } from "./preferences.js";

export const CreativeAssetJobSchema = z.object({
  schemaVersion: z.literal("0.2"),
  id: z.string(),
  projectDir: z.string(),
  slug: z.string().optional(),
  provider: ProviderIdSchema,
  kind: z.string(),
  prompt: z.string(),
  status: z.enum(["submitted", "completed", "setup_required", "input_required", "imported"]),
  providerJobId: z.string().optional(),
  assetPath: z.string().optional(),
  resultUrl: z.string().optional(),
  model: z.string().optional(),
  workflow: z.string().optional(),
  message: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  importedAt: z.string().optional()
});

export type CreativeAssetJob = z.infer<typeof CreativeAssetJobSchema>;

export async function submitCreativeAssetJob(input: GenerateCreativeAssetInput & { projectDir: string; slug?: string }) {
  const projectDir = resolve(input.projectDir);
  const result = await generateCreativeAsset({ ...input, wait: false });
  const now = new Date().toISOString();
  const job = CreativeAssetJobSchema.parse({
    schemaVersion: "0.2",
    id: `job_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
    projectDir,
    slug: input.slug,
    provider: input.provider,
    kind: input.kind,
    prompt: input.prompt,
    status: result.status,
    providerJobId: result.providerJobId,
    assetPath: result.assetPath,
    resultUrl: result.resultUrl,
    model: input.model,
    workflow: input.workflow,
    message: result.message,
    createdAt: now,
    updatedAt: now
  });
  await writeCreativeAssetJob(job);
  if (job.status === "completed" && (job.assetPath || job.resultUrl)) {
    await rememberGeneratedAsset({
      provider: job.provider,
      kind: job.kind,
      prompt: job.prompt,
      assetPath: job.assetPath,
      resultUrl: job.resultUrl,
      providerJobId: job.providerJobId
    });
  }
  return {
    job,
    result,
    message: job.status === "completed" ? "Creative asset job completed and was recorded." : "Creative asset job was recorded."
  };
}

export async function readCreativeAssetJob(projectDir: string, jobId: string) {
  const job = CreativeAssetJobSchema.parse(JSON.parse(await readFile(jobPath(projectDir, jobId), "utf8")));
  return {
    job,
    message: statusMessage(job)
  };
}

export async function listCreativeAssetJobs(projectDir: string) {
  const dir = jobsDir(projectDir);
  try {
    const entries = await readdir(dir);
    const jobs = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => CreativeAssetJobSchema.parse(JSON.parse(await readFile(join(dir, entry), "utf8"))))
    );
    return { jobs: jobs.sort((left, right) => right.createdAt.localeCompare(left.createdAt)) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { jobs: [] };
    }
    throw error;
  }
}

export async function importCreativeAssetJob(input: {
  projectDir: string;
  slug: string;
  jobId: string;
  assetPath?: string;
}) {
  const current = (await readCreativeAssetJob(input.projectDir, input.jobId)).job;
  const assetPath = input.assetPath ?? current.assetPath;
  if (!assetPath && !current.resultUrl) {
    throw new Error("Download the provider result or provide --asset before importing this job.");
  }

  const found = await findContentObject(input.projectDir, input.slug);
  const now = new Date().toISOString();
  const assetId = current.providerJobId ?? current.id;
  const provenance = await appendProvenance(found.runDir, {
    assetId,
    sourceType: "generated",
    provider: current.provider,
    providerJobId: current.providerJobId,
    model: current.model,
    prompt: current.prompt,
    inputAssets: [],
    assetPath,
    resultUrl: current.resultUrl,
    createdAt: now,
    rights: {
      commercialUseStatus: "unknown",
      containsLikeness: current.provider === "heygen" || current.provider === "agent-media",
      requiresAttribution: false
    }
  });
  const next = CreativeAssetJobSchema.parse({
    ...current,
    slug: input.slug,
    status: "imported",
    assetPath,
    updatedAt: now,
    importedAt: now
  });
  await writeCreativeAssetJob(next);
  await rememberGeneratedAsset({
    provider: next.provider,
    kind: next.kind,
    prompt: next.prompt,
    assetPath: next.assetPath,
    resultUrl: next.resultUrl,
    providerJobId: next.providerJobId
  });
  return {
    job: next,
    provenance,
    message: "Imported generated asset into the content record."
  };
}

async function writeCreativeAssetJob(job: CreativeAssetJob) {
  const path = jobPath(job.projectDir, job.id);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(job, null, 2)}\n`, "utf8");
}

function jobPath(projectDir: string, jobId: string) {
  return join(jobsDir(projectDir), `${jobId}.json`);
}

function jobsDir(projectDir: string) {
  return join(resolve(projectDir), ".videocontrol", "provider-jobs");
}

function statusMessage(job: CreativeAssetJob) {
  if (job.status === "completed") {
    return "The provider returned a result. Import it into a content record before editing with it.";
  }
  if (job.status === "imported") {
    return "This generated asset is attached to a content record.";
  }
  if (job.status === "submitted") {
    return "The provider job is recorded. Check the provider app or CLI before retrying.";
  }
  return job.message;
}
