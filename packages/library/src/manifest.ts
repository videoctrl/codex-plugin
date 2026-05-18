import { z } from "zod";

export const LibraryManifestSchema = z.object({
  schemaVersion: z.literal("0.2"),
  title: z.string(),
  slug: z.string(),
  visibility: z.enum(["private", "public"]),
  contentObject: z.string(),
  brief: z.string(),
  timeline: z.string().optional(),
  video: z.string().optional(),
  prompts: z.string(),
  provenance: z.string(),
  verification: z.string(),
  platformPackage: z.string().optional(),
  remix: z.object({
    allowed: z.boolean(),
    requiresAttribution: z.boolean(),
    redactedPrivateAssets: z.boolean()
  })
});

export type LibraryManifest = z.infer<typeof LibraryManifestSchema>;
