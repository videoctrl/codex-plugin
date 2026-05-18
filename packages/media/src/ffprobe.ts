import { extname } from "node:path";
import { runProcess } from "./process.js";

export type ProbeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  sample_rate?: string;
  duration?: string;
};

export type ProbeOutput = {
  streams?: ProbeStream[];
  format?: {
    duration?: string;
    format_name?: string;
    bit_rate?: string;
  };
};

export type MediaKind = "video" | "audio" | "image";

export type MediaMetadata = {
  kind: MediaKind;
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  sampleRate?: number;
  codec?: string;
  format?: string;
  bitRate?: number;
};

const imageExtensions = new Set([".apng", ".avif", ".gif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"]);

export async function ffprobe(filePath: string): Promise<ProbeOutput> {
  const { stdout } = await runProcess("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath
  ]);
  return JSON.parse(stdout) as ProbeOutput;
}

export async function inspectMedia(filePath: string): Promise<MediaMetadata> {
  const probe = await ffprobe(filePath);
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const audio = probe.streams?.find((stream) => stream.codec_type === "audio");
  const extension = extname(filePath).toLowerCase();
  const kind: MediaKind = imageExtensions.has(extension) ? "image" : video ? "video" : "audio";

  return {
    kind,
    durationSec: parseOptionalNumber(video?.duration) ?? parseOptionalNumber(audio?.duration) ?? parseOptionalNumber(probe.format?.duration),
    width: video?.width,
    height: video?.height,
    fps: parseFrameRate(video?.avg_frame_rate ?? video?.r_frame_rate),
    sampleRate: parseOptionalInteger(audio?.sample_rate),
    codec: video?.codec_name ?? audio?.codec_name,
    format: probe.format?.format_name,
    bitRate: parseOptionalInteger(probe.format?.bit_rate)
  };
}

function parseOptionalNumber(value?: string) {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalInteger(value?: string) {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFrameRate(value?: string) {
  if (!value || value === "0/0") {
    return undefined;
  }

  if (value.includes("/")) {
    const [rawNumerator, rawDenominator] = value.split("/");
    const numerator = Number.parseFloat(rawNumerator);
    const denominator = Number.parseFloat(rawDenominator);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
