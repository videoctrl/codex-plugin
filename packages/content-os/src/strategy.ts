import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { contentOsPaths } from "./runFolder.js";

export async function updateStrategyFile(projectDir: string, file: string, content: string) {
  const paths = contentOsPaths(projectDir);
  const target = join(paths.strategyDir, safeMarkdownName(file));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
  return { path: target };
}

export async function readStrategySlice(projectDir: string, file: string, maxLines = 12) {
  const paths = contentOsPaths(projectDir);
  const target = join(paths.strategyDir, safeMarkdownName(file));
  const content = await readFile(target, "utf8");
  return content.split(/\r?\n/).filter(Boolean).slice(0, maxLines).join("\n");
}

export function safeMarkdownName(file: string) {
  const clean = file.replace(/[^a-zA-Z0-9_.-]/g, "-");
  return clean.endsWith(".md") ? clean : `${clean}.md`;
}
