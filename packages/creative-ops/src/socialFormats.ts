export const socialFormats = [
  "short_video",
  "x_thread",
  "linkedin_post",
  "carousel",
  "clip_with_caption",
  "launch_post",
  "behind_the_scenes",
  "proof_screenshot_post",
  "before_after_post"
] as const;

export function createSocialPostBrief(input: { thesis: string; reader: string; proof?: string; angle?: string; format?: string }) {
  return `# Social Post Brief

thesis: ${input.thesis}
reader: ${input.reader}
proof: ${input.proof ?? ""}
angle: ${input.angle ?? "bookmarkable walkthrough"}
format: ${input.format ?? "short_video"}
voice anchors:
constraints:
visual:
risk:
open loops:
`;
}
