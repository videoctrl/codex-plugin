import { z } from "zod";

export const AdBriefSchema = z.object({
  campaignThesis: z.string(),
  targetCustomer: z.string(),
  jobToBeDone: z.string(),
  offer: z.string(),
  proof: z.array(z.string()).default([]),
  competitorSignal: z.string().optional(),
  creativeRoute: z.string(),
  hookFamily: z.string(),
  visualMetaphor: z.string(),
  requiredAssets: z.array(z.string()).default([]),
  voiceAndTone: z.string(),
  platform: z.string(),
  duration: z.number().positive(),
  aspectRatio: z.string(),
  cta: z.string(),
  risk: z.string().optional(),
  openLoops: z.array(z.string()).default([])
});

export type AdBrief = z.infer<typeof AdBriefSchema>;

export function createAdBrief(input: Partial<AdBrief> & Pick<AdBrief, "campaignThesis" | "targetCustomer" | "offer" | "platform">): AdBrief {
  return AdBriefSchema.parse({
    campaignThesis: input.campaignThesis,
    targetCustomer: input.targetCustomer,
    jobToBeDone: input.jobToBeDone ?? "Understand the product promise quickly.",
    offer: input.offer,
    proof: input.proof ?? [],
    competitorSignal: input.competitorSignal,
    creativeRoute: input.creativeRoute ?? "product proof",
    hookFamily: input.hookFamily ?? "problem-solution",
    visualMetaphor: input.visualMetaphor ?? "before and after",
    requiredAssets: input.requiredAssets ?? [],
    voiceAndTone: input.voiceAndTone ?? "clear, direct, specific",
    platform: input.platform,
    duration: input.duration ?? 30,
    aspectRatio: input.aspectRatio ?? "9:16",
    cta: input.cta ?? "Learn more",
    risk: input.risk,
    openLoops: input.openLoops ?? []
  });
}

export function renderAdBrief(brief: AdBrief) {
  return `# Ad Brief

campaign thesis: ${brief.campaignThesis}
target customer: ${brief.targetCustomer}
job-to-be-done: ${brief.jobToBeDone}
offer: ${brief.offer}
proof:
${brief.proof.map((item) => `- ${item}`).join("\n")}
competitor signal: ${brief.competitorSignal ?? ""}
creative route: ${brief.creativeRoute}
hook family: ${brief.hookFamily}
visual metaphor: ${brief.visualMetaphor}
required assets:
${brief.requiredAssets.map((item) => `- ${item}`).join("\n")}
voice and tone: ${brief.voiceAndTone}
platform: ${brief.platform}
duration: ${brief.duration}
aspect ratio: ${brief.aspectRatio}
CTA: ${brief.cta}
risk: ${brief.risk ?? ""}
open loops:
${brief.openLoops.map((item) => `- ${item}`).join("\n")}
`;
}
