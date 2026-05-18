import { runProcess } from "./process.js";

export async function ffmpeg(args: string[]) {
  return runProcess("ffmpeg", ["-hide_banner", "-y", ...args]);
}

export async function createSyntheticVideo(outputPath: string, durationSec = 4) {
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `testsrc=size=640x360:rate=30:duration=${durationSec}`,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=880:duration=${durationSec}`,
    "-shortest",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    outputPath
  ]);
}
