import { isAbsolute, resolve } from "node:path";
import { inspectMedia } from "@videocontrol/media";
import { UserVisibleError } from "../errors.js";
import { assertProjectExists, readTimeline } from "./store.js";

export type InspectAssetInput = {
  projectDir: string;
  assetId: string;
};

export async function inspectAsset(input: InspectAssetInput) {
  const paths = await assertProjectExists(input.projectDir);
  const timeline = await readTimeline(paths.projectDir);
  const asset = timeline.assets.find((candidate) => candidate.id === input.assetId);
  if (!asset) {
    throw new UserVisibleError(`Asset not found: ${input.assetId}`);
  }

  const mediaPath = isAbsolute(asset.path) ? asset.path : resolve(paths.projectDir, asset.path);
  const metadata = await inspectMedia(mediaPath);
  return {
    asset,
    metadata,
    message: `Inspected ${asset.id}.`
  };
}
