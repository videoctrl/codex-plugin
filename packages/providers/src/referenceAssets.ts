import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { z } from "zod";
import { assertSafeRemoteReferenceUrl, isRemoteReference } from "./urlSafety.js";

export const PreparedReferenceAssetSchema = z.object({
  schemaVersion: z.literal("0.2"),
  assetId: z.string(),
  kind: z.enum(["image", "video", "audio", "remote"]),
  mimeType: z.string().optional(),
  sourcePath: z.string().optional(),
  sourceUrl: z.string().optional(),
  preparedPath: z.string().optional(),
  bytes: z.number().int().nonnegative().optional(),
  sha256: z.string().optional(),
  createdAt: z.string()
});

export type PreparedReferenceAsset = z.infer<typeof PreparedReferenceAssetSchema>;

export async function prepareReferenceAsset(input: {
  projectDir: string;
  input: string;
  copyIntoProject?: boolean;
}) {
  const createdAt = new Date().toISOString();
  if (isRemoteReference(input.input)) {
    const sourceUrl = assertSafeRemoteReferenceUrl(input.input);
    const asset = PreparedReferenceAssetSchema.parse({
      schemaVersion: "0.2",
      assetId: referenceId(sourceUrl),
      kind: "remote",
      sourceUrl,
      createdAt
    });
    await appendReferenceManifest(input.projectDir, asset);
    return {
      asset,
      message: "Registered remote reference asset."
    };
  }

  const sourcePath = resolve(input.projectDir, input.input);
  const data = await readFile(sourcePath);
  const info = await stat(sourcePath);
  const detected = detectMedia(data, sourcePath);
  const digest = sha256(data);
  const assetId = `ref_${digest.slice(0, 16)}`;
  const targetDir = join(resolve(input.projectDir), ".videocontrol", "reference-assets");
  const preparedPath = input.copyIntoProject === false ? undefined : join(targetDir, `${assetId}${extname(sourcePath)}`);
  if (preparedPath) {
    await mkdir(dirname(preparedPath), { recursive: true });
    await copyFile(sourcePath, preparedPath);
  }

  const asset = PreparedReferenceAssetSchema.parse({
    schemaVersion: "0.2",
    assetId,
    kind: detected.kind,
    mimeType: detected.mimeType,
    sourcePath,
    preparedPath,
    bytes: info.size,
    sha256: digest,
    createdAt
  });
  await appendReferenceManifest(input.projectDir, asset);
  return {
    asset,
    message: `Prepared ${detected.kind} reference asset.`
  };
}

async function appendReferenceManifest(projectDir: string, asset: PreparedReferenceAsset) {
  const manifestPath = join(resolve(projectDir), ".videocontrol", "reference-assets", "manifest.json");
  const current = await readManifest(manifestPath);
  const assets = [asset, ...current.assets.filter((item) => item.assetId !== asset.assetId)];
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify({ schemaVersion: "0.2", assets }, null, 2)}\n`, "utf8");
}

async function readManifest(path: string): Promise<{ schemaVersion: "0.2"; assets: PreparedReferenceAsset[] }> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as { schemaVersion: "0.2"; assets: unknown[] };
    return {
      schemaVersion: "0.2",
      assets: parsed.assets.map((asset) => PreparedReferenceAssetSchema.parse(asset))
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: "0.2", assets: [] };
    }
    throw error;
  }
}

function detectMedia(data: Buffer, path: string): { kind: PreparedReferenceAsset["kind"]; mimeType: string } {
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: "image", mimeType: "image/png" };
  }
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { kind: "image", mimeType: "image/jpeg" };
  }
  if (data.subarray(0, 6).toString("ascii") === "GIF87a" || data.subarray(0, 6).toString("ascii") === "GIF89a") {
    return { kind: "image", mimeType: "image/gif" };
  }
  if (data.subarray(8, 12).toString("ascii") === "WEBP") {
    return { kind: "image", mimeType: "image/webp" };
  }
  if (data.subarray(4, 8).toString("ascii") === "ftyp") {
    return { kind: "video", mimeType: "video/mp4" };
  }
  if (data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WAVE") {
    return { kind: "audio", mimeType: "audio/wav" };
  }

  throw new Error(`Unsupported reference asset type: ${basename(path)}.`);
}

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function referenceId(value: string) {
  return `ref_${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}
