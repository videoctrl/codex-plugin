import { describe, expect, it } from "vitest";
import { agentMediaStatus, generateAgentMediaAsset } from "./adapter.js";

describe("agent-media provider", () => {
  it("reports availability and setup guidance", async () => {
    const status = await agentMediaStatus();
    expect(status.id).toBe("agent-media");
    expect(status.capabilities).toContain("UGC video generation");
  });

  it("requires an actor for UGC video generation", async () => {
    const result = await generateAgentMediaAsset({
      provider: "agent-media",
      kind: "video",
      prompt: "A founder explains why agent-made ads need a creative operating system."
    });
    if (result.status !== "setup_required") {
      expect(result.status).toBe("input_required");
      expect(result.message).toContain("actor");
    }
  });
});
