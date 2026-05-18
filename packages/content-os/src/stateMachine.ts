import { ContentState } from "./schema.js";

export const orderedStates: ContentState[] = [
  "captured",
  "idea_review",
  "brief_ready",
  "asset_generation",
  "timeline_assembly",
  "drafting",
  "verification",
  "human_review",
  "approved",
  "scheduler_ready",
  "scheduled",
  "published",
  "feedback_24h",
  "feedback_72h",
  "learned",
  "archived"
];

const allowedTransitions = new Map<ContentState, ContentState[]>([
  ["captured", ["idea_review", "archived"]],
  ["idea_review", ["brief_ready", "archived"]],
  ["brief_ready", ["asset_generation", "drafting", "archived"]],
  ["asset_generation", ["timeline_assembly", "archived"]],
  ["timeline_assembly", ["drafting", "verification", "archived"]],
  ["drafting", ["verification", "archived"]],
  ["verification", ["human_review", "drafting", "archived"]],
  ["human_review", ["approved", "drafting", "archived"]],
  ["approved", ["scheduler_ready", "archived"]],
  ["scheduler_ready", ["scheduled", "published", "archived"]],
  ["scheduled", ["published", "archived"]],
  ["published", ["feedback_24h", "archived"]],
  ["feedback_24h", ["feedback_72h", "archived"]],
  ["feedback_72h", ["learned", "archived"]],
  ["learned", ["archived"]],
  ["archived", []]
]);

export function assertTransitionAllowed(from: ContentState, to: ContentState) {
  if (from === to) {
    return;
  }

  const allowed = allowedTransitions.get(from) ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Content cannot move from ${from} to ${to}.`);
  }
}
