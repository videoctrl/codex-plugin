import { z } from "zod";

export const ProviderIdSchema = z.enum(["local", "heygen", "higgsfield", "agent-media", "postiz", "meta", "comfyui"]);

export type ProviderId = z.infer<typeof ProviderIdSchema>;

export type ProviderStatus = {
  id: ProviderId;
  available: boolean;
  authenticated?: boolean;
  mode?: "local" | "app" | "cli" | "mcp" | "handoff";
  version?: string;
  setup?: string;
  capabilities: string[];
};

export type GenerateCreativeAssetInput = {
  provider: ProviderId;
  kind: "avatar_video" | "broll" | "image" | "video" | "marketing_asset" | "score";
  prompt: string;
  model?: string;
  actor?: string;
  style?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  durationSec?: number;
  inputPath?: string;
  referenceUrl?: string;
  workflow?: string;
  outputDir?: string;
  wait?: boolean;
};

export type GenerateCreativeAssetResult = {
  provider: ProviderId;
  status: "completed" | "setup_required" | "input_required" | "submitted";
  assetPath?: string;
  resultUrl?: string;
  providerJobId?: string;
  message: string;
  raw?: unknown;
};
