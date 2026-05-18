import { basename, isAbsolute, relative, resolve } from "node:path";
import { access } from "node:fs/promises";
import { UserVisibleError } from "../errors.js";

export function resolveProjectDir(projectDir: string) {
  return resolve(projectDir);
}

export function assertSafeInputPath(filePath: string) {
  const name = basename(filePath);
  if (name === ".env" || name.startsWith(".env.")) {
    throw new UserVisibleError("VideoControl will not read environment files.");
  }
}

export async function assertFileExists(filePath: string) {
  try {
    await access(filePath);
  } catch {
    throw new UserVisibleError(`File not found: ${filePath}`);
  }
}

export function assertInsideDirectory(parentDir: string, childPath: string) {
  const parent = resolve(parentDir);
  const child = resolve(childPath);
  const rel = relative(parent, child);
  if (rel && !rel.startsWith("..") && !isAbsolute(rel)) {
    return;
  }
  if (child !== parent) {
    throw new UserVisibleError(`Path must stay inside ${parent}.`);
  }
}
