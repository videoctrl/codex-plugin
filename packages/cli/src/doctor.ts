import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { allProviderStatuses } from "@videocontrol/providers";

type Status = "ready" | "needs setup" | "not running" | "missing";

type CheckRow = {
  name: string;
  status: Status;
  detail: string;
};

type SetupStep = {
  name: string;
  status: Status;
  detail: string;
};

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const pluginRoot = resolve(repoRoot, "plugins/videocontrol");
const marketplacePath = resolve(repoRoot, ".agents/plugins/marketplace.json");
const localMcpPath = resolve(pluginRoot, ".mcp.json");
const firstPrompt = "@videocontrol check provider status, create a test video project, render a tiny preview, and tell me what is ready.";

export async function doctorCommand() {
  const checks = await collectDoctorChecks();
  const providers = await safeProviderStatuses();
  const nextAction = nextActionFor(checks);

  return renderDoctorReport(checks, providers, nextAction);
}

export async function setupCommand() {
  const steps: SetupStep[] = [];

  const build = await commandStatus("pnpm", ["build"], repoRoot);
  steps.push({
    name: "Build local tools",
    status: build.ok ? "ready" : "needs setup",
    detail: build.ok ? "Build completed." : build.detail
  });

  try {
    await writeLocalMcpConfig();
    steps.push({ name: "Local plugin config", status: "ready", detail: `Wrote ${localMcpPath}.` });
  } catch (error) {
    steps.push({ name: "Local plugin config", status: "needs setup", detail: messageFrom(error) });
  }

  try {
    await writeLocalMarketplace();
    steps.push({ name: "Local marketplace", status: "ready", detail: `Wrote ${marketplacePath}.` });
  } catch (error) {
    steps.push({ name: "Local marketplace", status: "needs setup", detail: messageFrom(error) });
  }

  const codexRegistration = await commandStatus("codex", ["plugin", "marketplace", "add", repoRoot], repoRoot);
  steps.push({
    name: "Codex marketplace registration",
    status: codexRegistration.ok ? "ready" : "needs setup",
    detail: codexRegistration.ok ? "Registered with Codex." : `Run manually: codex plugin marketplace add ${repoRoot}`
  });

  const checks = await collectDoctorChecks();
  const providers = await safeProviderStatuses();

  return `${renderSetupReport(steps)}\n\n${renderDoctorReport(checks, providers, nextActionFor(checks))}\n\nFirst prompt to try:\n${firstPrompt}`;
}

async function collectDoctorChecks() {
  const checks: CheckRow[] = [];
  const pluginManifestPath = resolve(pluginRoot, ".codex-plugin/plugin.json");
  const mcpServerPath = resolve(repoRoot, "packages/mcp-server/dist/index.js");

  checks.push(await commandCheck("Node.js", "node", ["--version"]));
  checks.push(await commandCheck("pnpm", "pnpm", ["--version"]));
  checks.push(await commandCheck("FFmpeg", "ffmpeg", ["-version"]));
  checks.push(await commandCheck("ffprobe", "ffprobe", ["-version"]));

  checks.push({
    name: "Plugin files",
    status: (await fileExists(pluginManifestPath)) ? "ready" : "missing",
    detail: (await fileExists(pluginManifestPath)) ? "Plugin manifest found." : "Plugin manifest is missing."
  });

  checks.push({
    name: "Local tools build",
    status: (await fileExists(mcpServerPath)) ? "ready" : "needs setup",
    detail: (await fileExists(mcpServerPath)) ? "Local tools are built." : "Run pnpm build."
  });

  checks.push({
    name: "Local plugin config",
    status: (await fileExists(localMcpPath)) ? "ready" : "needs setup",
    detail: (await fileExists(localMcpPath)) ? ".mcp.json found." : "Run pnpm plugin:local or pnpm videocontrol setup."
  });

  checks.push(await marketplaceCheck());
  checks.push(await codexVisibilityCheck());
  checks.push(await previewAppCheck());

  return checks;
}

async function commandCheck(name: string, command: string, args: string[]): Promise<CheckRow> {
  const result = await commandStatus(command, args, repoRoot, await localPluginEnv());
  return {
    name,
    status: result.ok ? "ready" : "missing",
    detail: result.ok ? result.detail : `${command} is not available.`
  };
}

async function commandStatus(command: string, args: string[], cwd = repoRoot, env: NodeJS.ProcessEnv = process.env) {
  return new Promise<{ ok: boolean; detail: string }>((resolvePromise) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolvePromise({ ok: false, detail: error.message });
    });
    child.on("close", (code) => {
      const detail = firstLine(stdout) || firstLine(stderr) || `${command} exited with ${code}.`;
      resolvePromise({ ok: code === 0, detail });
    });
  });
}

async function marketplaceCheck(): Promise<CheckRow> {
  try {
    const marketplace = JSON.parse(await readFile(marketplacePath, "utf8")) as {
      plugins?: Array<{ name?: string; source?: { path?: string }; policy?: { installation?: string; authentication?: string }; category?: string }>;
    };
    const entry = marketplace.plugins?.find((plugin) => plugin.name === "videocontrol");
    const ready =
      entry?.source?.path === "./plugins/videocontrol" &&
      entry.policy?.installation === "AVAILABLE" &&
      entry.policy?.authentication === "ON_INSTALL" &&
      typeof entry.category === "string";

    return {
      name: "Local marketplace",
      status: ready ? "ready" : "needs setup",
      detail: ready ? "Marketplace points at ./plugins/videocontrol." : "Run pnpm plugin:local or pnpm videocontrol setup."
    };
  } catch (error) {
    return { name: "Local marketplace", status: "needs setup", detail: messageFrom(error) };
  }
}

async function codexVisibilityCheck(): Promise<CheckRow> {
  const configPath = resolve(homedir(), ".codex/config.toml");
  const cachePath = resolve(homedir(), ".codex/plugins/cache/videocontrol-local/videocontrol/local/.codex-plugin/plugin.json");
  const config = await readTextIfExists(configPath);
  const registered = config.includes("[marketplaces.videocontrol-local]") || config.includes(`source = "${repoRoot}"`);
  const cached = await fileExists(cachePath);

  if (registered && cached) {
    return { name: "Codex visibility", status: "ready", detail: "Marketplace is registered and a cached plugin copy exists." };
  }
  if (registered) {
    return { name: "Codex visibility", status: "ready", detail: "Marketplace is registered. Install or refresh VideoControl in Codex." };
  }
  if (cached) {
    return { name: "Codex visibility", status: "ready", detail: "A cached plugin copy exists." };
  }
  return {
    name: "Codex visibility",
    status: "needs setup",
    detail: `Run codex plugin marketplace add ${repoRoot}`
  };
}

async function previewAppCheck(): Promise<CheckRow> {
  const port = process.env.VIDEOCONTROL_PREVIEW_PORT ?? "48731";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 750);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, { signal: controller.signal });
    return {
      name: "Preview app",
      status: response.ok ? "ready" : "not running",
      detail: response.ok ? `Running at http://127.0.0.1:${port}` : "Start it with pnpm dev:preview."
    };
  } catch {
    return { name: "Preview app", status: "not running", detail: "Start it with pnpm dev:preview when you want the review console." };
  } finally {
    clearTimeout(timeout);
  }
}

async function safeProviderStatuses() {
  try {
    return await allProviderStatuses();
  } catch (error) {
    return [
      {
        id: "local",
        available: false,
        setup: messageFrom(error),
        capabilities: []
      }
    ];
  }
}

async function writeLocalMcpConfig() {
  const templatePath = resolve(pluginRoot, ".mcp.local.template.json");
  const template = await readFile(templatePath, "utf8");
  await writeFile(localMcpPath, template.replaceAll("__ABS_REPO_ROOT__", repoRoot), "utf8");
}

async function writeLocalMarketplace() {
  const marketplace = {
    name: "videocontrol-local",
    interface: {
      displayName: "VideoControl Local"
    },
    plugins: [
      {
        name: "videocontrol",
        source: {
          source: "local",
          path: "./plugins/videocontrol"
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL"
        },
        category: "Design"
      }
    ]
  };

  await mkdir(dirname(marketplacePath), { recursive: true });
  await writeFile(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
}

async function localPluginEnv() {
  for (const file of [".mcp.json", ".mcp.local.template.json"]) {
    try {
      const config = JSON.parse(await readFile(resolve(pluginRoot, file), "utf8")) as {
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

function renderSetupReport(steps: SetupStep[]) {
  return ["VideoControl setup", "", renderRows(steps)].join("\n");
}

function renderDoctorReport(checks: CheckRow[], providers: Awaited<ReturnType<typeof safeProviderStatuses>>, nextAction: string) {
  return [
    "VideoControl doctor",
    "",
    renderRows(checks),
    "",
    "Providers",
    renderRows(
      providers.map((provider) => ({
        name: provider.id,
        status: provider.available ? "ready" : "needs setup",
        detail: provider.available ? provider.capabilities.join(", ") : provider.setup ?? "Connect this provider before live use."
      }))
    ),
    "",
    `Next action: ${nextAction}`
  ].join("\n");
}

function renderRows(rows: Array<{ name: string; status: string; detail: string }>) {
  const nameWidth = Math.max(...rows.map((row) => row.name.length), 4);
  const statusWidth = Math.max(...rows.map((row) => row.status.length), 6);
  return rows.map((row) => `${row.name.padEnd(nameWidth)}  ${row.status.padEnd(statusWidth)}  ${row.detail}`).join("\n");
}

function nextActionFor(checks: CheckRow[]) {
  const missing = checks.find((check) => check.status === "missing" || check.status === "needs setup");
  if (missing) {
    return missing.detail;
  }
  const preview = checks.find((check) => check.name === "Preview app");
  if (preview?.status === "not running") {
    return "Start the review console with pnpm dev:preview when you want to inspect previews in the browser.";
  }
  return `Try: ${firstPrompt}`;
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(path: string) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

function firstLine(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
