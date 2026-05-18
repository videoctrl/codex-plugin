import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

const checks: Array<{ name: string; run: () => Promise<void> }> = [
  { name: "Node.js", run: () => command("node", ["--version"]) },
  { name: "pnpm", run: () => command("pnpm", ["--version"]) },
  { name: "FFmpeg", run: async () => command("ffmpeg", ["-version"], await localPluginEnv()) },
  { name: "ffprobe", run: async () => command("ffprobe", ["-version"], await localPluginEnv()) },
  {
    name: "Plugin manifest",
    run: async () => {
      const manifestPath = resolve(repoRoot, "plugins/videocontrol/.codex-plugin/plugin.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { name?: string; skills?: string; mcpServers?: string };
      if (manifest.name !== "videocontrol") {
        throw new Error("Plugin manifest name must be videocontrol.");
      }
      if (manifest.skills !== "./skills/" || manifest.mcpServers !== "./.mcp.json") {
        throw new Error("Plugin manifest paths are not correct.");
      }
      await access(resolve(repoRoot, "plugins/videocontrol/skills/videocontrol/SKILL.md"));
    }
  },
  {
    name: "Marketplace",
    run: async () => {
      const marketplacePath = resolve(repoRoot, ".agents/plugins/marketplace.json");
      const marketplace = JSON.parse(await readFile(marketplacePath, "utf8")) as {
        plugins?: Array<{ name?: string; source?: { path?: string } }>;
      };
      const entry = marketplace.plugins?.find((plugin) => plugin.name === "videocontrol");
      if (entry?.source?.path !== "./plugins/videocontrol") {
        throw new Error("Marketplace must point at ./plugins/videocontrol.");
      }
    }
  },
  {
    name: "Codex marketplace visibility",
    run: async () => {
      const configPath = resolve(process.env.HOME ?? "", ".codex/config.toml");
      const cachePath = resolve(process.env.HOME ?? "", ".codex/plugins/cache/videocontrol-local/videocontrol/local/.codex-plugin/plugin.json");
      let registered = false;
      try {
        const config = await readFile(configPath, "utf8");
        registered = config.includes("[marketplaces.videocontrol-local]") || config.includes(`source = "${repoRoot}"`);
      } catch {
        registered = false;
      }

      let cached = false;
      try {
        await access(cachePath);
        cached = true;
      } catch {
        cached = false;
      }

      if (!registered && !cached) {
        console.log(`INFO Register the local marketplace with: codex plugin marketplace add ${repoRoot}`);
      }
    }
  }
];

let failed = false;
for (const check of checks) {
  try {
    await check.run();
    console.log(`OK ${check.name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) {
  process.exit(1);
}

async function localPluginEnv() {
  for (const file of [".mcp.json", ".mcp.local.template.json"]) {
    try {
      const config = JSON.parse(await readFile(resolve(repoRoot, "plugins/videocontrol", file), "utf8")) as {
        videocontrol?: { env?: Record<string, string> };
      };
      return {
        ...process.env,
        ...(config.videocontrol?.env ?? {})
      };
    } catch {
      continue;
    }
  }
  return process.env;
}

function command(cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(cmd, args, { env, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${cmd} exited with ${code}. ${stderr}`));
      }
    });
  });
}
