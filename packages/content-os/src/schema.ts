import { z } from "zod";

export const ContentObjectSchemaVersion = "0.2";

export const ContentRouteSchema = z.enum([
  "original",
  "repurpose",
  "rewrite",
  "research_ideate",
  "competitor_ad_variant",
  "paid_ad_batch",
  "social_share"
]);

export const ContentStateSchema = z.enum([
  "captured",
  "idea_review",
  "brief_ready",
  "asset_generation",
  "timeline_assembly",
  "drafting",
  "verification",
  "human_review",
  "approved",
  "scheduler_ready",
  "scheduled",
  "published",
  "feedback_24h",
  "feedback_72h",
  "learned",
  "archived"
]);

export const ContentFormatSchema = z.enum([
  "video_ad",
  "short_video",
  "x_thread",
  "linkedin_post",
  "carousel",
  "launch_post",
  "clip",
  "campaign"
]);

export const ContentObjectSchema = z.object({
  schemaVersion: z.literal(ContentObjectSchemaVersion),
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  route: ContentRouteSchema,
  state: ContentStateSchema,
  format: ContentFormatSchema,
  pillar: z.string().optional(),
  platformProfiles: z.array(z.string()).default([]),
  runDir: z.string(),
  currentTimelineVersion: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const BriefSchema = z.object({
  thesis: z.string(),
  reader: z.string(),
  proof: z.array(z.string()).default([]),
  angle: z.string(),
  constraints: z.array(z.string()).default([]),
  voiceAnchors: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  openLoops: z.array(z.string()).default([])
});

export const ProvenanceSchema = z.object({
  assetId: z.string(),
  sourceType: z.enum(["local", "generated", "imported", "remote"]),
  provider: z.string().optional(),
  providerJobId: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  inputAssets: z.array(z.string()).default([]),
  assetPath: z.string().optional(),
  resultUrl: z.string().optional(),
  createdAt: z.string(),
  rights: z.object({
    commercialUseStatus: z.enum(["allowed", "unknown", "restricted"]),
    containsLikeness: z.boolean().default(false),
    requiresAttribution: z.boolean().default(false)
  })
});

export type ContentRoute = z.infer<typeof ContentRouteSchema>;
export type ContentState = z.infer<typeof ContentStateSchema>;
export type ContentFormat = z.infer<typeof ContentFormatSchema>;
export type ContentObject = z.infer<typeof ContentObjectSchema>;
export type Brief = z.infer<typeof BriefSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
