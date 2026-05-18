export type PlatformProfile = {
  id: string;
  name: string;
  aspectRatio: string;
  maxDurationSec: number;
  safeZone: string;
};

export const platformProfiles: PlatformProfile[] = [
  { id: "meta-reels", name: "Meta Reels", aspectRatio: "9:16", maxDurationSec: 90, safeZone: "Keep text away from top and bottom controls." },
  { id: "tiktok", name: "TikTok", aspectRatio: "9:16", maxDurationSec: 60, safeZone: "Keep captions centered and high enough for controls." },
  { id: "youtube-shorts", name: "YouTube Shorts", aspectRatio: "9:16", maxDurationSec: 60, safeZone: "Keep CTA readable in the center area." },
  { id: "linkedin", name: "LinkedIn", aspectRatio: "1:1", maxDurationSec: 120, safeZone: "Use readable captions and quiet branding." },
  { id: "x", name: "X", aspectRatio: "16:9", maxDurationSec: 140, safeZone: "Make the first frame understandable in feed." }
];

export function getPlatformProfile(id: string) {
  const profile = platformProfiles.find((candidate) => candidate.id === id);
  if (!profile) {
    throw new Error(`Unknown platform profile: ${id}`);
  }
  return profile;
}
