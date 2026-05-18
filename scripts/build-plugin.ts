import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const mode = parseMode(process.argv);
const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const pluginRoot = resolve(repoRoot, "plugins/videocontrol");
const templatePath = resolve(pluginRoot, mode === "local" ? ".mcp.local.template.json" : ".mcp.publish.template.json");
const outputPath = resolve(pluginRoot, ".mcp.json");

const template = await readFile(templatePath, "utf8");
const rendered = template.replaceAll("__ABS_REPO_ROOT__", repoRoot);
await writeFile(outputPath, rendered, "utf8");

console.log(`Wrote ${outputPath} for ${mode} use.`);

function parseMode(args: string[]) {
  const index = args.indexOf("--mode");
  const value = index >= 0 ? args[index + 1] : "local";
  if (value !== "local" && value !== "publish") {
    throw new Error("Use --mode local or --mode publish.");
  }
  return value;
}
