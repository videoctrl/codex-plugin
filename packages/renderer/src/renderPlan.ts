import { resolve, isAbsolute } from "node:path";
import { Timeline } from "@videocontrol/timeline";

export type RenderSegment = {
  clipId: string;
  assetId: string;
  inputPath: string;
  sourceStartSec: number;
  durationSec: number;
};

export function createRenderSegments(input: {
  projectDir: string;
  timeline: Timeline;
  startSec: number;
  endSec: number;
}): RenderSegment[] {
  const { projectDir, timeline, startSec, endSec } = input;
  const assetsById = new Map(timeline.assets.map((asset) => [asset.id, asset]));
  const tracksById = new Map(timeline.tracks.map((track) => [track.id, track]));

  return timeline.clips
    .filter((clip) => {
      const asset = assetsById.get(clip.assetId);
      const track = tracksById.get(clip.trackId);
      const clipEnd = clip.startSec + clip.durationSec;
      return Boolean(
        asset?.kind === "video" &&
          track &&
          !track.muted &&
          !clip.muted &&
          clip.startSec < endSec &&
          clipEnd > startSec
      );
    })
    .sort((left, right) => left.startSec - right.startSec)
    .map((clip) => {
      const asset = assetsById.get(clip.assetId);
      if (!asset) {
        throw new Error(`Clip ${clip.id} references missing asset ${clip.assetId}.`);
      }
      const segmentStartSec = Math.max(clip.startSec, startSec);
      const segmentEndSec = Math.min(clip.startSec + clip.durationSec, endSec);
      return {
        clipId: clip.id,
        assetId: asset.id,
        inputPath: isAbsolute(asset.path) ? asset.path : resolve(projectDir, asset.path),
        sourceStartSec: clip.sourceInSec + (segmentStartSec - clip.startSec),
        durationSec: segmentEndSec - segmentStartSec
      };
    })
    .filter((segment) => segment.durationSec > 0.001);
}
