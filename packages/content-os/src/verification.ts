import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { findContentObject } from "./runFolder.js";

export async function writeVerification(projectDir: string, slug: string, section: string, content: string) {
  const found = await findContentObject(projectDir, slug);
  const target = join(found.runDir, "verification.md");
  await writeFile(target, `# Verification\n\n## ${section}\n\n${content}\n`, "utf8");
  return { path: target };
}
