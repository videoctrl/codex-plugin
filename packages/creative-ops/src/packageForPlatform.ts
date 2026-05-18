import { getPlatformProfile } from "./platformProfiles.js";

export function validateForPlatform(input: { platform: string; durationSec: number; aspectRatio: string }) {
  const profile = getPlatformProfile(input.platform);
  const errors: string[] = [];
  if (input.durationSec > profile.maxDurationSec) {
    errors.push(`Duration exceeds ${profile.name} target.`);
  }
  if (input.aspectRatio !== profile.aspectRatio) {
    errors.push(`Aspect ratio should be ${profile.aspectRatio}.`);
  }
  return {
    valid: errors.length === 0,
    errors,
    profile
  };
}

export function createPlatformHandoff(input: { platform: string; title: string; renderPath?: string; caption?: string }) {
  const profile = getPlatformProfile(input.platform);
  return `# ${profile.name} Handoff

title: ${input.title}
render: ${input.renderPath ?? ""}
caption: ${input.caption ?? ""}
aspect ratio: ${profile.aspectRatio}
safe zone: ${profile.safeZone}

## Approval

status: needs human review
`;
}
