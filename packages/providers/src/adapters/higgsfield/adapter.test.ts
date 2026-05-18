import { describe, expect, it } from "vitest";
import { higgsfieldStatus } from "./adapter.js";

describe("Higgsfield provider", () => {
  it("reports availability and setup guidance", async () => {
    const status = await higgsfieldStatus();
    expect(status.id).toBe("higgsfield");
    expect(status.capabilities).toContain("cinematic b-roll");
  });
});
