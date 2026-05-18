import { describe, expect, it } from "vitest";
import { heygenStatus } from "./adapter.js";

describe("HeyGen provider", () => {
  it("reports availability without exposing raw transport details", async () => {
    const status = await heygenStatus();
    expect(status.id).toBe("heygen");
    expect(status.capabilities.length).toBeGreaterThan(0);
    expect(JSON.stringify(status)).not.toContain("api.heygen.com");
  });
});
