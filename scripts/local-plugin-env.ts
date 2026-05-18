import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function applyLocalPluginEnv(repoRoot: string) {
  for (const file of [".mcp.json", ".mcp.local.template.json"]) {
    try {
      const config = JSON.parse(await readFile(resolve(repoRoot, "plugins/videocontrol", file), "utf8")) as {
        videocontrol?: { env?: Record<string, string> };
      };
      Object.assign(process.env, config.videocontrol?.env ?? {});
      return;
    } catch {
      continue;
    }
  }
}
