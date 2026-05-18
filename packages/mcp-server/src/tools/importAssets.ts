import { inspectMedia, sha256File } from "@videocontrol/media";
import { Asset, withNewVersion } from "@videocontrol/timeline";
import { UserVisibleError } from "../errors.js";
import {
  assertProjectExists,
  copyAssetIntoProject,
  pathForTimeline,
  readTimeline,
  resolveImportPath,
  writeTimeline
} from "./store.js";

export type ImportAssetsInput = {
  projectDir: string;
  paths: string[];
  copyIntoProject?: boolean;
};

export async function importAssets(input: ImportAssetsInput) {
  const paths = await assertProjectExists(input.projectDir);
  const timeline = await readTimeline(paths.projectDir);
  const assets: Asset[] = [];
  let changed = false;

  for (const requestedPath of input.paths) {
    const sourcePath = await resolveImportPath(paths.projectDir, requestedPath);
    const mediaPath = input.copyIntoProject ? await copyAssetIntoProject(paths.projectDir, sourcePath) : sourcePath;
    const timelinePath = pathForTimeline(paths.projectDir, mediaPath);
    const existing = timeline.assets.find((asset) => asset.path === timelinePath);
    if (existing) {
      assets.push(existing);
      continue;
    }

    const metadata = await inspectMedia(mediaPath);
    const sha256 = await sha256File(mediaPath);
    const asset: Asset = {
      id: uniqueAssetId(timeline.assets, metadata.kind, sha256),
      kind: metadata.kind,
      path: timelinePath,
      sha256,
      durationSec: metadata.durationSec,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
      sampleRate: metadata.sampleRate,
      metadata: {
        codec: metadata.codec,
        format: metadata.format,
        bitRate: metadata.bitRate
      }
    };
    timeline.assets.push(asset);
    assets.push(asset);
    changed = true;
  }

  if (changed) {
    const durationSec = Math.max(timeline.durationSec, ...timeline.assets.map((asset) => asset.durationSec ?? 0));
    await writeTimeline(paths, withNewVersion({ ...timeline, durationSec }));
  }

  return {
    assets,
    timelinePath: paths.timelinePath,
    message: changed ? `Imported ${assets.length} asset${assets.length === 1 ? "" : "s"}.` : "Assets were already imported."
  };
}

function uniqueAssetId(existingAssets: Asset[], kind: string, sha256: string) {
  const base = `a_${kind}_${sha256.slice(0, 8)}`;
  let candidate = base;
  let index = 1;
  const existingIds = new Set(existingAssets.map((asset) => asset.id));
  while (existingIds.has(candidate)) {
    candidate = `${base}_${index}`;
    index += 1;
    if (index > 1000) {
      throw new UserVisibleError("Could not create a unique asset id.");
    }
  }
  return candidate;
}
