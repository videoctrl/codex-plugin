import { GenerateCreativeAssetInput, GenerateCreativeAssetResult, ProviderStatus } from "../../types.js";
import { run } from "../../process.js";

export async function higgsfieldStatus(): Promise<ProviderStatus> {
  const versionResult = await run("higgsfield", ["version"]).catch(() => undefined);
  const available = Boolean(versionResult);
  if (!available) {
    return {
      id: "higgsfield",
      available: false,
      authenticated: false,
      mode: "handoff",
      setup: "Install the Higgsfield CLI, then run higgsfield auth login.",
      capabilities: ["cinematic b-roll", "product visuals", "marketing assets", "image-to-video", "virality scoring"]
    };
  }

  const version = versionResult?.stdout.trim();
  let authenticated = false;
  try {
    await run("higgsfield", ["account", "status", "--json"]);
    authenticated = true;
  } catch {
    try {
      await run("higgsfield", ["account", "credits", "--json"]);
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  return {
    id: "higgsfield",
    available: true,
    authenticated,
    mode: "cli",
    version,
    setup: authenticated ? undefined : "Run higgsfield auth login.",
    capabilities: ["cinematic b-roll", "product visuals", "marketing assets", "image-to-video", "virality scoring"]
  };
}

export async function generateHiggsfieldAsset(input: GenerateCreativeAssetInput): Promise<GenerateCreativeAssetResult> {
  const status = await higgsfieldStatus();
  if (!status.available || !status.authenticated) {
    return {
      provider: "higgsfield",
      status: "setup_required",
      message: status.setup ?? "Higgsfield is not ready."
    };
  }

  const model = input.model ?? (input.kind === "score" ? "brain_activity" : input.kind === "image" ? "nano_banana_2" : "seedance_2_0");
  const args = ["generate", "create", model, "--prompt", input.prompt, "--json"];
  if (input.wait !== false) args.splice(5, 0, "--wait");
  if (input.inputPath && input.kind === "score") {
    const promptIndex = args.indexOf("--prompt");
    args.splice(promptIndex, 2, "--video", input.inputPath);
  }
  const result = await run("higgsfield", args);
  const parsed = safeJson(result.stdout);
  return {
    provider: "higgsfield",
    status: input.wait === false && !firstString(parsed?.result_url, parsed?.url) ? "submitted" : "completed",
    resultUrl: firstString(parsed?.result_url, parsed?.url),
    providerJobId: firstString(parsed?.id, parsed?.job_id),
    message: "Higgsfield returned a creative result.",
    raw: parsed ?? result.stdout
  };
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string");
}

function safeJson(value: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
