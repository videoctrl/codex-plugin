import { Timeline, TimelineSchema } from "./schema.js";

export type TimelineValidationResult = {
  valid: boolean;
  errors: string[];
  timeline?: Timeline;
};

export function validateTimeline(input: unknown): TimelineValidationResult {
  const parsed = TimelineSchema.safeParse(input);

  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "timeline";
        return `${path}: ${issue.message}`;
      })
    };
  }

  const timeline = parsed.data;
  const errors: string[] = [];
  const assetIds = new Set(timeline.assets.map((asset) => asset.id));
  const trackIds = new Set(timeline.tracks.map((track) => track.id));
  const trackById = new Map(timeline.tracks.map((track) => [track.id, track]));

  addDuplicateErrors("asset", timeline.assets.map((asset) => asset.id), errors);
  addDuplicateErrors("track", timeline.tracks.map((track) => track.id), errors);
  addDuplicateErrors("clip", timeline.clips.map((clip) => clip.id), errors);
  addDuplicateErrors("text clip", timeline.textClips.map((clip) => clip.id), errors);

  for (const clip of timeline.clips) {
    const asset = timeline.assets.find((candidate) => candidate.id === clip.assetId);
    if (!assetIds.has(clip.assetId)) {
      errors.push(`Clip ${clip.id} references missing asset ${clip.assetId}.`);
    }

    if (!trackIds.has(clip.trackId)) {
      errors.push(`Clip ${clip.id} references missing track ${clip.trackId}.`);
    }

    const track = trackById.get(clip.trackId);
    if (track?.kind === "text") {
      errors.push(`Clip ${clip.id} is on text track ${clip.trackId}.`);
    }

    if (clip.sourceOutSec !== undefined && clip.sourceOutSec <= clip.sourceInSec) {
      errors.push(`Clip ${clip.id} has a source end before its source start.`);
    }

    if (asset?.durationSec !== undefined && clip.sourceOutSec !== undefined && clip.sourceOutSec > asset.durationSec + 0.001) {
      errors.push(`Clip ${clip.id} ends past the duration of asset ${asset.id}.`);
    }
  }

  for (const textClip of timeline.textClips) {
    const track = trackById.get(textClip.trackId);
    if (!track) {
      errors.push(`Text clip ${textClip.id} references missing track ${textClip.trackId}.`);
    } else if (track.kind !== "text" && track.kind !== "overlay") {
      errors.push(`Text clip ${textClip.id} is on non-text track ${textClip.trackId}.`);
    }
  }

  for (const [trackId, clips] of clipsByTrack(timeline)) {
    const ordered = clips.sort((a, b) => a.startSec - b.startSec);
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (previous.startSec + previous.durationSec > current.startSec + 0.001) {
        errors.push(`Track ${trackId} has overlapping clips ${previous.id} and ${current.id}.`);
      }
    }
  }

  const latestEndSec = Math.max(
    0,
    ...timeline.clips.map((clip) => clip.startSec + clip.durationSec),
    ...timeline.textClips.map((clip) => clip.startSec + clip.durationSec)
  );
  if (timeline.durationSec + 0.001 < latestEndSec) {
    errors.push(`Timeline duration is shorter than its latest clip ending at ${roundSeconds(latestEndSec)}s.`);
  }

  return { valid: errors.length === 0, errors, timeline };
}

function addDuplicateErrors(label: string, ids: string[], errors: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  for (const id of duplicates) {
    errors.push(`Duplicate ${label} id ${id}.`);
  }
}

function clipsByTrack(timeline: Timeline) {
  const byTrack = new Map<string, Array<{ id: string; startSec: number; durationSec: number }>>();
  for (const clip of [...timeline.clips, ...timeline.textClips]) {
    const clips = byTrack.get(clip.trackId) ?? [];
    clips.push({ id: clip.id, startSec: clip.startSec, durationSec: clip.durationSec });
    byTrack.set(clip.trackId, clips);
  }
  return byTrack;
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000;
}
