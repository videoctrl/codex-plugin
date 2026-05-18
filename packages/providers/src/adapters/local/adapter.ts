import { GenerateCreativeAssetInput, GenerateCreativeAssetResult, ProviderStatus } from "../../types.js";

export async function localStatus(): Promise<ProviderStatus> {
  return {
    id: "local",
    available: true,
    authenticated: true,
    mode: "local",
    capabilities: ["timeline assembly", "imports", "trims", "captions", "previews", "exports", "contact sheets", "provenance"]
  };
}

export async function generateLocalAsset(input: GenerateCreativeAssetInput): Promise<GenerateCreativeAssetResult> {
  return {
    provider: "local",
    status: "setup_required",
    message: `Local VideoControl assembles and renders assets after source media exists. Create or import media for: ${input.prompt}`
  };
}
