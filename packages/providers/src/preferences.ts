import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import { ProviderIdSchema } from "./types.js";

export const CreativePreferencesSchemaVersion = "0.2";

export const CreativePreferencesSchema = z.object({
  schemaVersion: z.literal(CreativePreferencesSchemaVersion),
  preferredProvider: ProviderIdSchema.optional(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  platformTargets: z.array(z.string()).default([]),
  captionStyle: z.string().optional(),
  pacing: z.string().optional(),
  styleNotes: z.array(z.string()).default([]),
  safeZoneRules: z.array(z.string()).default([]),
  favoritePrompts: z.array(z.string()).default([]),
  recentGeneratedAssets: z
    .array(
      z.object({
        provider: ProviderIdSchema,
        kind: z.string(),
        prompt: z.string(),
        assetPath: z.string().optional(),
        resultUrl: z.string().optional(),
        providerJobId: z.string().optional(),
        createdAt: z.string()
      })
    )
    .default([]),
  updatedAt: z.string()
});

export type CreativePreferences = z.infer<typeof CreativePreferencesSchema>;

export type CreativePreferencesUpdate = {
  path?: string;
  preferredProvider?: CreativePreferences["preferredProvider"];
  aspectRatio?: CreativePreferences["aspectRatio"];
  platformTargets?: string[];
  captionStyle?: string;
  pacing?: string;
  styleNotes?: string[];
  safeZoneRules?: string[];
  favoritePrompts?: string[];
};

export function defaultCreativePreferencesPath() {
  return process.env.VIDEOCONTROL_PREFERENCES ?? join(homedir(), ".videocontrol", "preferences.json");
}

export async function readCreativePreferences(path = defaultCreativePreferencesPath()) {
  try {
    return CreativePreferencesSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultCreativePreferences();
    }
    throw error;
  }
}

export async function updateCreativePreferences(update: CreativePreferencesUpdate = {}) {
  const path = update.path ?? defaultCreativePreferencesPath();
  const current = await readCreativePreferences(path);
  const next = CreativePreferencesSchema.parse({
    ...current,
    preferredProvider: update.preferredProvider ?? current.preferredProvider,
    aspectRatio: update.aspectRatio ?? current.aspectRatio,
    platformTargets: update.platformTargets ? unique([...current.platformTargets, ...update.platformTargets]) : current.platformTargets,
    captionStyle: update.captionStyle ?? current.captionStyle,
    pacing: update.pacing ?? current.pacing,
    styleNotes: update.styleNotes ? unique([...current.styleNotes, ...update.styleNotes]) : current.styleNotes,
    safeZoneRules: update.safeZoneRules ? unique([...current.safeZoneRules, ...update.safeZoneRules]) : current.safeZoneRules,
    favoritePrompts: update.favoritePrompts ? unique([...current.favoritePrompts, ...update.favoritePrompts]) : current.favoritePrompts,
    updatedAt: new Date().toISOString()
  });
  await writeCreativePreferences(next, path);
  return {
    preferences: next,
    path,
    message: "Updated creative preferences."
  };
}

export async function rememberGeneratedAsset(input: {
  provider: CreativePreferences["recentGeneratedAssets"][number]["provider"];
  kind: string;
  prompt: string;
  assetPath?: string;
  resultUrl?: string;
  providerJobId?: string;
}) {
  const path = defaultCreativePreferencesPath();
  const current = await readCreativePreferences(path);
  const next = CreativePreferencesSchema.parse({
    ...current,
    recentGeneratedAssets: [
      {
        ...input,
        createdAt: new Date().toISOString()
      },
      ...current.recentGeneratedAssets
    ].slice(0, 20),
    updatedAt: new Date().toISOString()
  });
  await writeCreativePreferences(next, path);
  return next;
}

async function writeCreativePreferences(preferences: CreativePreferences, path: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(preferences, null, 2)}\n`, "utf8");
}

function defaultCreativePreferences(): CreativePreferences {
  return {
    schemaVersion: CreativePreferencesSchemaVersion,
    platformTargets: [],
    styleNotes: [],
    safeZoneRules: [],
    favoritePrompts: [],
    recentGeneratedAssets: [],
    updatedAt: new Date().toISOString()
  };
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}
