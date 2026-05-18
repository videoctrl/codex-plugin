import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Brief } from "./schema.js";
import { contentOsPaths, findContentObject, writeBrief } from "./runFolder.js";

export async function createWriterContextPacket(input: {
  projectDir: string;
  slug: string;
  thesis?: string;
  reader?: string;
  angle?: string;
}) {
  const found = await findContentObject(input.projectDir, input.slug);
  const paths = contentOsPaths(input.projectDir);
  const proof = await readSlice(join(paths.storesDir, "proof"), 4);
  const voiceAnchors = await readSlice(paths.voiceDir, 4);
  const constraints = await readSlice(paths.strategyDir, 4);
  const brief: Brief = {
    thesis: input.thesis ?? found.contentObject.title,
    reader: input.reader ?? "The audience defined for this content object.",
    proof,
    angle: input.angle ?? found.contentObject.route,
    constraints,
    voiceAnchors,
    risks: ["Avoid unsupported claims.", "Keep platform fit visible."],
    openLoops: ["Confirm final approval before scheduling."]
  };
  await writeBrief(found.runDir, brief);
  return { brief, runDir: found.runDir, message: "Created writer context packet." };
}

async function readSlice(dir: string, maxItems: number) {
  const { readdir } = await import("node:fs/promises");
  try {
    const files = (await readdir(dir)).filter((file) => file.endsWith(".md")).slice(0, maxItems);
    const lines: string[] = [];
    for (const file of files) {
      const content = await readFile(join(dir, file), "utf8");
      const firstLines = content.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("#")).slice(0, 2);
      lines.push(...firstLines);
    }
    return lines.slice(0, maxItems);
  } catch {
    return [];
  }
}
