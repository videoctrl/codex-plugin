import { ProviderStatus } from "../../types.js";

export async function metaStatus(): Promise<ProviderStatus> {
  return {
    id: "meta",
    available: false,
    authenticated: false,
    mode: "handoff",
    setup: "Connect an ads MCP before launching or reading campaign performance.",
    capabilities: ["campaign launch handoff", "performance readback", "winner scaling"]
  };
}
