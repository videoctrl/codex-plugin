import { z } from "zod";

export const TimelineSchemaVersion = "0.1";

export const TimeSeconds = z.number().nonnegative();

export const AssetKindSchema = z.enum(["video", "audio", "image", "subtitle", "generated"]);

export const AssetSchema = z.object({
  id: z.string().min(1),
  kind: AssetKindSchema,
  path: z.string().min(1),
  sha256: z.string().optional(),
  durationSec: z.number().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fps: z.number().positive().optional(),
  sampleRate: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const EffectSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "crop",
    "scale",
    "position",
    "opacity",
    "blur",
    "color",
    "caption",
    "audio_gain",
    "transition"
  ]),
  params: z.record(z.string(), z.unknown()).default({}),
  startSec: TimeSeconds.optional(),
  durationSec: z.number().positive().optional()
});

export const ClipSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  trackId: z.string().min(1),
  startSec: TimeSeconds,
  durationSec: z.number().positive(),
  sourceInSec: TimeSeconds.default(0),
  sourceOutSec: TimeSeconds.optional(),
  name: z.string().optional(),
  locked: z.boolean().default(false),
  muted: z.boolean().default(false),
  effects: z.array(EffectSchema).default([]),
  notes: z.string().optional()
});

export const TextClipSchema = z.object({
  id: z.string().min(1),
  trackId: z.string().min(1),
  kind: z.literal("text"),
  text: z.string(),
  startSec: TimeSeconds,
  durationSec: z.number().positive(),
  style: z.record(z.string(), z.unknown()).default({})
});

export const TrackSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["video", "audio", "text", "overlay"]),
  name: z.string().min(1),
  order: z.number().int(),
  locked: z.boolean().default(false),
  muted: z.boolean().default(false)
});

export const TimelineSchema = z.object({
  schemaVersion: z.literal(TimelineSchemaVersion),
  projectId: z.string().min(1),
  name: z.string().min(1),
  width: z.number().int().positive().default(1920),
  height: z.number().int().positive().default(1080),
  fps: z.number().positive().default(30),
  durationSec: z.number().nonnegative(),
  assets: z.array(AssetSchema).default([]),
  tracks: z.array(TrackSchema).default([]),
  clips: z.array(ClipSchema).default([]),
  textClips: z.array(TextClipSchema).default([]),
  stylePreset: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.string().regex(/^v\d{4}$/)
});

export const ProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  timelinePath: z.string().min(1)
});

export type AssetKind = z.infer<typeof AssetKindSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type TextClip = z.infer<typeof TextClipSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
export type VideoControlProject = z.infer<typeof ProjectSchema>;
