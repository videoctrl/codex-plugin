export type PreviewQuery = {
  project?: string;
  video?: string;
  contactSheet?: string;
  review?: string;
  timelineVersion?: string;
  content?: string;
  route?: string;
  state?: string;
  next?: string;
  platform?: string;
  brief?: string;
  variants?: string;
  verification?: string;
  provenance?: string;
  handoff?: string;
};

export function readPreviewQuery(): PreviewQuery {
  const params = new URLSearchParams(window.location.search);
  return {
    project: value(params, "project"),
    video: value(params, "video"),
    contactSheet: value(params, "contactSheet"),
    review: value(params, "review"),
    timelineVersion: value(params, "timelineVersion"),
    content: value(params, "content"),
    route: value(params, "route"),
    state: value(params, "state"),
    next: value(params, "next"),
    platform: value(params, "platform"),
    brief: value(params, "brief"),
    variants: value(params, "variants"),
    verification: value(params, "verification"),
    provenance: value(params, "provenance"),
    handoff: value(params, "handoff")
  };
}

export type ProjectIntent = {
  summary: string;
  brandFeel: string[];
  visualStyle: string[];
  captionRules: string[];
  safeZoneRules: string[];
  platformTargets: string[];
  motionStyle: string[];
  approvalNotes: string[];
  avoid: string[];
  winningPatterns: string[];
  reviewNotes: Array<{ id: string; note: string; selectionId?: string; source?: string; createdAt: string }>;
};

export type ReviewSelection = {
  id: string;
  kind: "clip" | "caption" | "variant" | "handoff" | "asset";
  label: string;
  targetId: string;
  sourcePath?: string;
  status?: string;
  note?: string;
  detail: Record<string, unknown>;
};

export type ProjectReview = {
  project: {
    projectDir: string;
    projectId?: string;
    name?: string;
  };
  timeline: {
    version?: string;
    durationSec?: number;
    width?: number;
    height?: number;
    fps?: number;
  };
  media: {
    previewPath?: string;
    contactSheetPath?: string;
  };
  intent: ProjectIntent;
  selections: ReviewSelection[];
  updatedAt: string;
};

export function viteFileUrl(path?: string) {
  if (!path) {
    return undefined;
  }
  if (path.startsWith("/")) {
    return `/@fs${path}`;
  }
  return path;
}

function value(params: URLSearchParams, key: string) {
  return params.get(key) ?? undefined;
}
