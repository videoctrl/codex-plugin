import { z } from "zod";

export const AssetPromptPlanSchema = z.object({
  kind: z.string(),
  platform: z.string().optional(),
  selectionId: z.string().optional(),
  sourcePrompt: z.string(),
  enhancedPrompt: z.string(),
  visualDirections: z.array(z.string()),
  captionDirections: z.array(z.string()),
  safeZoneDirections: z.array(z.string()),
  avoid: z.array(z.string()),
  reviewChecklist: z.array(z.string())
});

export type AssetPromptPlan = z.infer<typeof AssetPromptPlanSchema>;

export function enhanceAssetPrompt(input: {
  prompt: string;
  kind?: string;
  platform?: string;
  selectionId?: string;
  projectIntent?: {
    summary?: string;
    visualStyle?: string[];
    captionRules?: string[];
    safeZoneRules?: string[];
    avoid?: string[];
    platformTargets?: string[];
  };
  preferences?: {
    aspectRatio?: string;
    captionStyle?: string;
    pacing?: string;
    styleNotes?: string[];
    safeZoneRules?: string[];
    favoritePrompts?: string[];
  };
}) {
  const sourcePrompt = input.prompt.trim();
  if (!sourcePrompt) {
    throw new Error("Prompt is required.");
  }

  const platform = input.platform ?? input.projectIntent?.platformTargets?.[0];
  const visualDirections = unique([
    ...(input.projectIntent?.visualStyle ?? []),
    ...(input.preferences?.styleNotes ?? [])
  ]);
  const captionDirections = unique([
    ...(input.projectIntent?.captionRules ?? []),
    ...(input.preferences?.captionStyle ? [input.preferences.captionStyle] : [])
  ]);
  const safeZoneDirections = unique([
    ...(input.projectIntent?.safeZoneRules ?? []),
    ...(input.preferences?.safeZoneRules ?? [])
  ]);
  const avoid = unique(input.projectIntent?.avoid ?? []);
  const kind = input.kind ?? "image";

  const parts = [
    sentence(`Create ${articleFor(kind)} ${kind} for ${platform ?? "the current campaign"}`),
    sentence(`Core request: ${sourcePrompt}`),
    input.projectIntent?.summary && input.projectIntent.summary !== "Not set yet." ? sentence(`Project direction: ${input.projectIntent.summary}`) : undefined,
    input.preferences?.aspectRatio ? sentence(`Frame for ${input.preferences.aspectRatio}`) : undefined,
    input.preferences?.pacing ? sentence(`Pacing: ${input.preferences.pacing}`) : undefined,
    visualDirections.length ? sentence(`Visual style: ${visualDirections.join("; ")}`) : undefined,
    captionDirections.length ? sentence(`Caption direction: ${captionDirections.join("; ")}`) : undefined,
    safeZoneDirections.length ? sentence(`Safe zones: ${safeZoneDirections.join("; ")}`) : undefined,
    avoid.length ? sentence(`Avoid: ${avoid.join("; ")}`) : undefined,
    input.selectionId ? sentence(`Anchor this to review item ${input.selectionId}`) : undefined
  ].filter(Boolean);

  return AssetPromptPlanSchema.parse({
    kind,
    platform,
    selectionId: input.selectionId,
    sourcePrompt,
    enhancedPrompt: parts.join(" "),
    visualDirections,
    captionDirections,
    safeZoneDirections,
    avoid,
    reviewChecklist: [
      "Confirm it matches the project intent.",
      "Check framing and safe zones before timeline use.",
      "Import the asset into the content record before editing.",
      "Add a review note if the result changes the creative direction."
    ]
  });
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function articleFor(value: string) {
  return /^[aeiou]/i.test(value) ? "an" : "a";
}

function sentence(value: string) {
  const trimmed = value.trim().replace(/[.?!]+$/, "");
  return `${trimmed}.`;
}
