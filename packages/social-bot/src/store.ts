import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  SocialBotConfig,
  SocialBotConfigSchema,
  SocialBotDraft,
  SocialBotDraftSchema,
  SocialBotMetrics,
  SocialBotMetricsSchema
} from "./schema.js";

export function socialBotPaths(projectDir: string) {
  const rootDir = join(projectDir, ".videocontrol", "social-bot");
  return {
    rootDir,
    configPath: join(rootDir, "config.json"),
    checklistPath: join(rootDir, "setup-checklist.md"),
    draftsDir: join(rootDir, "drafts"),
    metricsDir: join(rootDir, "metrics"),
    handoffDir: join(rootDir, "handoff")
  };
}

export function defaultConfig(input: { botHandle?: string; ownerHandle?: string }): SocialBotConfig {
  const now = new Date().toISOString();
  const ownerHandle = normalizeHandle(input.ownerHandle ?? "@owner");
  return {
    schemaVersion: "0.2",
    botHandle: normalizeHandle(input.botHandle ?? "@videocontrol_bot"),
    ownerHandle,
    labelVerified: false,
    developerPortalUrl: "https://developer.x.com/",
    oauthStatus: "not_connected",
    createdAt: now,
    updatedAt: now,
    policy: {
      requiresApproval: true,
      allowReplies: false,
      allowDMs: false,
      allowMentions: false,
      officialApiOnly: true,
      disclosure: `Automated account managed by ${ownerHandle}.`
    }
  };
}

export async function createSocialBotWorkspace(input: { projectDir: string; botHandle?: string; ownerHandle?: string }) {
  const paths = socialBotPaths(input.projectDir);
  await mkdir(paths.draftsDir, { recursive: true });
  await mkdir(paths.metricsDir, { recursive: true });
  await mkdir(paths.handoffDir, { recursive: true });

  let config: SocialBotConfig;
  if (existsSync(paths.configPath)) {
    config = await readConfig(input.projectDir);
    const now = new Date().toISOString();
    config = SocialBotConfigSchema.parse({
      ...config,
      botHandle: input.botHandle ? normalizeHandle(input.botHandle) : config.botHandle,
      ownerHandle: input.ownerHandle ? normalizeHandle(input.ownerHandle) : config.ownerHandle,
      updatedAt: now,
      policy: {
        ...config.policy,
        disclosure: input.ownerHandle ? `Automated account managed by ${normalizeHandle(input.ownerHandle)}.` : config.policy.disclosure
      }
    });
  } else {
    config = defaultConfig(input);
  }

  await writeConfig(input.projectDir, config);
  await writeFile(paths.checklistPath, setupChecklistMarkdown(config), "utf8");

  return {
    config,
    rootDir: paths.rootDir,
    checklistPath: paths.checklistPath,
    message: "Social bot setup checklist is ready."
  };
}

export async function readConfig(projectDir: string): Promise<SocialBotConfig> {
  const paths = socialBotPaths(projectDir);
  return SocialBotConfigSchema.parse(JSON.parse(await readFile(paths.configPath, "utf8")));
}

export async function writeConfig(projectDir: string, config: SocialBotConfig) {
  const paths = socialBotPaths(projectDir);
  await writeJson(paths.configPath, SocialBotConfigSchema.parse(config));
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readDraft(projectDir: string, draftId: string): Promise<SocialBotDraft> {
  const paths = socialBotPaths(projectDir);
  return SocialBotDraftSchema.parse(JSON.parse(await readFile(join(paths.draftsDir, `${draftId}.json`), "utf8")));
}

export async function writeDraft(projectDir: string, draft: SocialBotDraft) {
  const paths = socialBotPaths(projectDir);
  await writeJson(join(paths.draftsDir, `${draft.id}.json`), SocialBotDraftSchema.parse(draft));
}

export async function listDrafts(projectDir: string): Promise<SocialBotDraft[]> {
  const paths = socialBotPaths(projectDir);
  await mkdir(paths.draftsDir, { recursive: true });
  const files = (await readdir(paths.draftsDir)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(files.map((file) => readDraft(projectDir, file.replace(/\.json$/, ""))));
}

export async function writeMetrics(projectDir: string, metrics: SocialBotMetrics) {
  const paths = socialBotPaths(projectDir);
  await writeJson(join(paths.metricsDir, `${metrics.tweetId}.json`), SocialBotMetricsSchema.parse(metrics));
}

export async function listMetrics(projectDir: string): Promise<SocialBotMetrics[]> {
  const paths = socialBotPaths(projectDir);
  await mkdir(paths.metricsDir, { recursive: true });
  const files = (await readdir(paths.metricsDir)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => SocialBotMetricsSchema.parse(JSON.parse(await readFile(join(paths.metricsDir, file), "utf8"))))
  );
}

export function normalizeHandle(handle: string) {
  const trimmed = handle.trim();
  if (trimmed.length === 0) throw new Error("Handle cannot be empty.");
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function setupChecklistMarkdown(config: SocialBotConfig) {
  return `# Social Bot Setup Checklist

Bot account: ${config.botHandle}
Owner account: ${config.ownerHandle}

## Required before publishing

- Create a dedicated X account for the bot.
- Add the automated-account label in X and connect it to ${config.ownerHandle}.
- Put this disclosure in the bot bio: "${config.policy.disclosure}"
- Create an X developer project and app at ${config.developerPortalUrl}
- Connect the bot through OAuth using the official X API.
- Store credentials only in an approved local secret manager.
- Keep human approval on for every post.

## Guardrails

- Do not automate the X website.
- Do not publish replies, DMs, or mention-based posts unless the owner explicitly changes policy.
- Do not publish without approval.
- Keep drafts, handoffs, and metrics in this project folder.
`;
}
