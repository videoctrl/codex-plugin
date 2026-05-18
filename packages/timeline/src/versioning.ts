import { Timeline } from "./schema.js";

const VERSION_PATTERN = /^v(\d{4})$/;

export function nextVersion(version: string) {
  const match = VERSION_PATTERN.exec(version);
  if (!match) {
    throw new Error(`Invalid timeline version: ${version}`);
  }

  const next = Number.parseInt(match[1], 10) + 1;
  return `v${next.toString().padStart(4, "0")}`;
}

export function createInitialTimeline(input: {
  projectId: string;
  name: string;
  width?: number;
  height?: number;
  fps?: number;
  now?: string;
}): Timeline {
  const now = input.now ?? new Date().toISOString();
  return {
    schemaVersion: "0.1",
    projectId: input.projectId,
    name: input.name,
    width: input.width ?? 1920,
    height: input.height ?? 1080,
    fps: input.fps ?? 30,
    durationSec: 0,
    assets: [],
    tracks: [
      { id: "v1", kind: "video", name: "Main Video", order: 1, locked: false, muted: false },
      { id: "a1", kind: "audio", name: "Main Audio", order: 2, locked: false, muted: false },
      { id: "t1", kind: "text", name: "Text", order: 3, locked: false, muted: false }
    ],
    clips: [],
    textClips: [],
    createdAt: now,
    updatedAt: now,
    version: "v0001"
  };
}

export function withNewVersion(timeline: Timeline, now = new Date().toISOString()): Timeline {
  return {
    ...timeline,
    updatedAt: now,
    version: nextVersion(timeline.version)
  };
}
