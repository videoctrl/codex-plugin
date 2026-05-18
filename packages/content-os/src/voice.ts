import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { contentOsPaths } from "./runFolder.js";
import { safeMarkdownName } from "./strategy.js";

export async function updateVoiceFile(projectDir: string, file: string, content: string) {
  const paths = contentOsPaths(projectDir);
  const target = join(paths.voiceDir, safeMarkdownName(file));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
  return { path: target };
}
