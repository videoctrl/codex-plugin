import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { contentOsPaths } from "./runFolder.js";

export type StoreKind = "ideas" | "hooks" | "proof" | "competitors" | "feedback" | "winners" | "losers" | "examples";

export async function addStoreItem(projectDir: string, kind: StoreKind, title: string, content: string) {
  const paths = contentOsPaths(projectDir);
  const slug = slugify(title);
  const target = join(paths.storesDir, kind, `${slug}.md`);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, `# ${title}\n\n${content}\n`, "utf8");
  return { path: target, kind, title };
}

export async function listStoreItems(projectDir: string, kind: StoreKind) {
  const paths = contentOsPaths(projectDir);
  const dir = join(paths.storesDir, kind);
  try {
    return (await readdir(dir)).filter((item) => item.endsWith(".md")).map((item) => ({ kind, file: item, path: join(dir, item) }));
  } catch {
    return [];
  }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "item";
}
