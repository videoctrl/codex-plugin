import { ContentFormat, ContentRoute } from "./schema.js";

export const contentRoutes: ContentRoute[] = [
  "original",
  "repurpose",
  "rewrite",
  "research_ideate",
  "competitor_ad_variant",
  "paid_ad_batch",
  "social_share"
];

export function defaultRouteForFormat(format: ContentFormat): ContentRoute {
  if (format === "video_ad" || format === "campaign") {
    return "paid_ad_batch";
  }
  return "social_share";
}
