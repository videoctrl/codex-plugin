import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createProviderSecretTemplate, providerAuthStatus, startProviderOAuth } from "./auth.js";

async function withTempFile<T>(fn: (path: string) => Promise<T>) {
  const dir = await mkdtemp(join(tmpdir(), "videocontrol-provider-auth-"));
  try {
    return await fn(join(dir, "providers.local.json"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("provider auth", () => {
  it("creates a local secrets template outside project state", async () => {
    await withTempFile(async (path) => {
      const created = await createProviderSecretTemplate({ provider: "heygen", path });
      expect(created.path).toBe(path);
      const status = await providerAuthStatus("heygen", path);
      expect(status.secretsFileExists).toBe(true);
      expect(status.providers[0]?.hasLocalSecrets).toBe(true);
      expect(status.providers[0]?.storedKeys).toEqual(["apiKey"]);
    });
  });

  it("prefers browser OAuth guidance", async () => {
    const result = await startProviderOAuth({ provider: "higgsfield" });
    expect(result.method).toBe("oauth");
    expect(result.preferred).toBe(true);
    expect(result.browserAutomationAllowed).toBe(true);
    expect(result.authUrl).toContain("higgsfield");
  });
});
