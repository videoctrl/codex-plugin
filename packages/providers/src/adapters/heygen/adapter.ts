import { GenerateCreativeAssetInput, GenerateCreativeAssetResult, ProviderStatus } from "../../types.js";
import { commandExists, run } from "../../process.js";

export async function heygenStatus(): Promise<ProviderStatus> {
  const available = await commandExists("heygen");
  if (!available) {
    return {
      id: "heygen",
      available: false,
      authenticated: false,
      mode: "handoff",
      setup: "Connect the HeyGen app or install the HeyGen CLI, then sign in.",
      capabilities: ["avatar presenter videos", "personalized messages", "founder intros", "talking-head explainers"]
    };
  }

  let authenticated = false;
  try {
    await run("heygen", ["auth", "status"]);
    authenticated = true;
  } catch {
    authenticated = false;
  }

  const version = await run("heygen", ["--version"]).then((result) => result.stdout.trim()).catch(() => undefined);
  return {
    id: "heygen",
    available: true,
    authenticated,
    mode: "cli",
    version,
    setup: authenticated ? undefined : "Run heygen auth login.",
    capabilities: ["avatar presenter videos", "personalized messages", "founder intros", "talking-head explainers"]
  };
}

export async function generateHeygenAsset(input: GenerateCreativeAssetInput): Promise<GenerateCreativeAssetResult> {
  const status = await heygenStatus();
  if (!status.available || !status.authenticated) {
    return {
      provider: "heygen",
      status: "setup_required",
      message: status.setup ?? "HeyGen is not ready."
    };
  }

  const args = ["video-agent", "create", "--prompt", input.prompt, "--json"];
  if (input.wait !== false) args.splice(4, 0, "--wait");
  const result = await run("heygen", args);
  const parsed = safeJson(result.stdout);
  return {
    provider: "heygen",
    status: input.wait === false && !firstString(parsed?.video_url, parsed?.url, parsed?.share_url) ? "submitted" : "completed",
    resultUrl: firstString(parsed?.video_url, parsed?.url, parsed?.share_url),
    providerJobId: firstString(parsed?.id, parsed?.job_id),
    message: "HeyGen returned a video result.",
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
