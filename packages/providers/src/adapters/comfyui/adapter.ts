import { GenerateCreativeAssetInput, GenerateCreativeAssetResult, ProviderStatus } from "../../types.js";
import { buildComfyUiPrompt } from "./workflow.js";

export function comfyUiBaseUrl() {
  return (process.env.COMFYUI_URL ?? "http://127.0.0.1:8188").replace(/\/$/, "");
}

export async function comfyUiStatus(): Promise<ProviderStatus> {
  const baseUrl = comfyUiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 750);
  try {
    const response = await fetch(`${baseUrl}/system_stats`, { signal: controller.signal });
    return {
      id: "comfyui",
      available: response.ok,
      authenticated: response.ok,
      mode: "local",
      setup: response.ok ? undefined : `Start ComfyUI at ${baseUrl}.`,
      capabilities: ["local image generation", "workflow-based generation", "reference-image workflows"]
    };
  } catch {
    return {
      id: "comfyui",
      available: false,
      authenticated: false,
      mode: "local",
      setup: `Start ComfyUI at ${baseUrl}, then import a workflow.`,
      capabilities: ["local image generation", "workflow-based generation", "reference-image workflows"]
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateComfyUiAsset(input: GenerateCreativeAssetInput): Promise<GenerateCreativeAssetResult> {
  if (!input.workflow) {
    return {
      provider: "comfyui",
      status: "input_required",
      message: "Choose a registered ComfyUI workflow before submitting local generation."
    };
  }

  const status = await comfyUiStatus();
  if (!status.available) {
    return {
      provider: "comfyui",
      status: "setup_required",
      message: status.setup ?? "ComfyUI is not ready."
    };
  }

  const { prompt } = await buildComfyUiPrompt({
    workflowName: input.workflow,
    prompt: input.prompt,
    referencePath: input.inputPath
  });
  const response = await fetch(`${comfyUiBaseUrl()}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  if (!response.ok) {
    throw new Error(`ComfyUI rejected the workflow: ${response.status} ${response.statusText}`);
  }
  const parsed = (await response.json()) as Record<string, unknown>;
  return {
    provider: "comfyui",
    status: "submitted",
    providerJobId: firstString(parsed.prompt_id, parsed.id),
    message: "ComfyUI accepted the workflow. Check ComfyUI for progress, then import the finished asset.",
    raw: parsed
  };
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string");
}
