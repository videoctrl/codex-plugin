import { z } from "zod";

export const SocialBotPolicySchema = z.object({
  requiresApproval: z.boolean().default(true),
  allowReplies: z.boolean().default(false),
  allowDMs: z.boolean().default(false),
  allowMentions: z.boolean().default(false),
  officialApiOnly: z.literal(true).default(true),
  disclosure: z.string()
});

export const SocialBotConfigSchema = z.object({
  schemaVersion: z.literal("0.2"),
  botHandle: z.string(),
  ownerHandle: z.string(),
  labelVerified: z.boolean().default(false),
  labelVerifiedAt: z.string().optional(),
  appName: z.string().optional(),
  developerPortalUrl: z.literal("https://developer.x.com/").default("https://developer.x.com/"),
  oauthStatus: z.enum(["not_connected", "configured", "connected"]).default("not_connected"),
  createdAt: z.string(),
  updatedAt: z.string(),
  policy: SocialBotPolicySchema
});

export const SocialBotDraftSchema = z.object({
  schemaVersion: z.literal("0.2"),
  id: z.string(),
  status: z.enum(["draft", "approved", "published", "rejected"]),
  text: z.string().min(1).max(280),
  media: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  tweetId: z.string().optional(),
  notes: z.string().optional()
});

export const SocialBotMetricsSchema = z.object({
  schemaVersion: z.literal("0.2"),
  tweetId: z.string(),
  capturedAt: z.string(),
  impressions: z.number().int().nonnegative().default(0),
  likes: z.number().int().nonnegative().default(0),
  reposts: z.number().int().nonnegative().default(0),
  replies: z.number().int().nonnegative().default(0),
  bookmarks: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  notes: z.string().optional()
});

export type SocialBotConfig = z.infer<typeof SocialBotConfigSchema>;
export type SocialBotDraft = z.infer<typeof SocialBotDraftSchema>;
export type SocialBotMetrics = z.infer<typeof SocialBotMetricsSchema>;
