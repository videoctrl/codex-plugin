import { SocialBotMetricsSchema } from "./schema.js";
import { createSocialBotWorkspace, listMetrics, writeMetrics } from "./store.js";

export type MetricsInput = {
  projectDir: string;
  tweetId?: string;
  impressions?: number;
  likes?: number;
  reposts?: number;
  replies?: number;
  bookmarks?: number;
  clicks?: number;
  notes?: string;
};

export async function recordOrListMetrics(input: MetricsInput) {
  await createSocialBotWorkspace({ projectDir: input.projectDir });
  if (!input.tweetId) {
    return {
      metrics: await listMetrics(input.projectDir),
      message: "Social bot metrics loaded."
    };
  }

  const metrics = SocialBotMetricsSchema.parse({
    schemaVersion: "0.2",
    tweetId: input.tweetId,
    capturedAt: new Date().toISOString(),
    impressions: input.impressions ?? 0,
    likes: input.likes ?? 0,
    reposts: input.reposts ?? 0,
    replies: input.replies ?? 0,
    bookmarks: input.bookmarks ?? 0,
    clicks: input.clicks ?? 0,
    notes: input.notes
  });
  await writeMetrics(input.projectDir, metrics);
  return {
    metrics,
    message: "Social bot metrics recorded."
  };
}
