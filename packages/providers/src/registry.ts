import { GenerateCreativeAssetInput, ProviderId } from "./types.js";
import { localStatus, generateLocalAsset } from "./adapters/local/adapter.js";
import { heygenStatus, generateHeygenAsset } from "./adapters/heygen/adapter.js";
import { higgsfieldStatus, generateHiggsfieldAsset } from "./adapters/higgsfield/adapter.js";
import { agentMediaStatus, generateAgentMediaAsset } from "./adapters/agentMedia/adapter.js";
import { postizStatus } from "./adapters/postiz/adapter.js";
import { metaStatus } from "./adapters/meta/handoff.js";
import { comfyUiStatus, generateComfyUiAsset } from "./adapters/comfyui/adapter.js";
import { assertSafeRemoteReferenceUrl, isRemoteReference } from "./urlSafety.js";
import { ProviderIdSchema } from "./types.js";

export async function providerStatus(provider: ProviderId) {
  const parsedProvider = ProviderIdSchema.parse(provider);
  switch (parsedProvider) {
    case "local":
      return localStatus();
    case "heygen":
      return heygenStatus();
    case "higgsfield":
      return higgsfieldStatus();
    case "agent-media":
      return agentMediaStatus();
    case "postiz":
      return postizStatus();
    case "meta":
      return metaStatus();
    case "comfyui":
      return comfyUiStatus();
  }
}

export async function providerCapabilities(provider: ProviderId) {
  return providerStatus(provider);
}

export async function generateCreativeAsset(input: GenerateCreativeAssetInput) {
  if (input.referenceUrl) {
    assertSafeRemoteReferenceUrl(input.referenceUrl);
  }
  if (input.inputPath && isRemoteReference(input.inputPath)) {
    assertSafeRemoteReferenceUrl(input.inputPath);
  }

  switch (input.provider) {
    case "local":
      return generateLocalAsset(input);
    case "heygen":
      return generateHeygenAsset(input);
    case "higgsfield":
      return generateHiggsfieldAsset(input);
    case "agent-media":
      return generateAgentMediaAsset(input);
    case "comfyui":
      return generateComfyUiAsset(input);
    case "postiz":
    case "meta":
      return {
        provider: input.provider,
        status: "setup_required" as const,
        message: `${input.provider} is used for handoff in v0.2, not creative generation.`
      };
  }
}

export async function allProviderStatuses() {
  return Promise.all((["local", "heygen", "higgsfield", "agent-media", "comfyui", "postiz", "meta"] as ProviderId[]).map((provider) => providerStatus(provider)));
}

export async function providerReadinessReminder() {
  const providers = await allProviderStatuses();
  const ready = providers.filter((provider) => provider.available && provider.authenticated !== false);
  const needsSetup = providers.filter((provider) => !provider.available || provider.authenticated === false);
  return {
    providers,
    ready: ready.map((provider) => provider.id),
    needsSetup: needsSetup.map((provider) => ({
      id: provider.id,
      setup: provider.setup ?? "Connect this provider before live generation."
    })),
    localWorkAvailable: providers.some((provider) => provider.id === "local" && provider.available),
    message:
      ready.some((provider) => provider.id !== "local")
        ? "Codex can use the ready providers now. Keep generated assets attached to content records and review them before export."
        : "Codex can still plan, import media, edit timelines, preview, render, package handoffs, and record intent locally. Connect a provider only when live generation is needed."
  };
}
