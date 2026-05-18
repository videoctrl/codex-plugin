import { GenerateCreativeAssetInput, GenerateCreativeAssetResult, ProviderStatus } from "../../types.js";
import { commandExists, run } from "../../process.js";

export async function agentMediaStatus(): Promise<ProviderStatus> {
  const available = await commandExists("agent-media");
  if (!available) {
    return {
      id: "agent-media",
      available: false,
      authenticated: false,
      mode: "handoff",
      setup: "Install with npm install -g agent-media-cli, then run agent-media login.",
      capabilities: [
        "UGC video generation",
        "SaaS review videos",
        "talking-head actor videos",
        "subtitle generation",
        "actor library",
        "job download"
      ]
    };
  }

  let authenticated = false;
  try {
    await run("agent-media", ["--json", "whoami"]);
    authenticated = true;
  } catch {
    authenticated = false;
  }

  const version = await run("agent-media", ["--version"]).then((result) => result.stdout.trim()).catch(() => undefined);
  return {
    id: "agent-media",
    available: true,
    authenticated,
    mode: "cli",
    version,
    setup: authenticated ? undefined : "Run agent-media login, or set AGENT_MEDIA_API_KEY in your local secrets manager.",
    capabilities: [
      "UGC video generation",
      "SaaS review videos",
      "talking-head actor videos",
      "subtitle generation",
      "actor library",
      "job download"
    ]
  };
}

export async function generateAgentMediaAsset(input: GenerateCreativeAssetInput): Promise<GenerateCreativeAssetResult> {
  const status = await agentMediaStatus();
  if (!status.available || !status.authenticated) {
    return {
      provider: "agent-media",
      status: "setup_required",
      message: status.setup ?? "agent-media is not ready."
    };
  }

  if (input.kind === "score") {
    return {
      provider: "agent-media",
      status: "input_required",
      message: "agent-media is for generation and subtitles, not finished-video scoring. Use Higgsfield for scoring."
    };
  }

  if (input.kind === "image" || input.kind === "broll") {
    return {
      provider: "agent-media",
      status: "input_required",
      message: "agent-media's reviewed CLI surface is best for UGC videos, SaaS reviews, and subtitles. Use Higgsfield for standalone image or b-roll generation."
    };
  }

  if (!input.actor && !input.inputPath) {
    return {
      provider: "agent-media",
      status: "input_required",
      message: "Choose an actor before generating an agent-media UGC video. Run: agent-media actor list"
    };
  }

  const args = input.inputPath
    ? subtitleArgs(input)
    : ugcArgs(input);
  const result = await run("agent-media", args);
  const parsed = safeJson(result.stdout);

  return {
    provider: "agent-media",
    status: parsed?.status === "completed" || parsed?.output_url ? "completed" : "submitted",
    resultUrl: firstString(parsed?.output_url, parsed?.output_media_url, parsed?.url),
    providerJobId: firstString(parsed?.job_id, parsed?.id),
    message: input.inputPath ? "agent-media submitted a subtitle job." : "agent-media submitted a UGC video job.",
    raw: parsed ?? result.stdout
  };
}

function ugcArgs(input: GenerateCreativeAssetInput) {
  const args = ["--json", "ugc", input.prompt];
  if (input.wait !== false) args.push("--sync");
  if (input.actor) args.push("--actor", input.actor);
  if (input.style) args.push("--style", input.style);
  if (input.aspectRatio) args.push("--aspect", input.aspectRatio);
  if (input.durationSec) args.push("--duration", String(input.durationSec));
  if (input.model) args.push("--model", input.model);
  return args;
}

function subtitleArgs(input: GenerateCreativeAssetInput) {
  const args = ["--json", "subtitle", input.inputPath ?? ""];
  if (input.wait !== false) args.push("--sync");
  if (input.style) args.push("--style", input.style);
  return args;
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
