import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import { ProviderId } from "./types.js";

export const ProviderSecretFileSchema = z.object({
  schemaVersion: z.literal("0.2"),
  updatedAt: z.string(),
  providers: z.record(z.string(), z.record(z.string(), z.string())).default({})
});

export type ProviderAuthStartInput = {
  provider: ProviderId;
  projectDir?: string;
  callbackUrl?: string;
};

export type ProviderSecretTemplateInput = {
  provider?: ProviderId;
  path?: string;
};

export function defaultProviderSecretsPath() {
  return process.env.VIDEOCONTROL_PROVIDER_SECRETS ?? join(homedir(), ".videocontrol", "secrets", "providers.local.json");
}

export async function providerAuthStatus(provider?: ProviderId, path = defaultProviderSecretsPath()) {
  const exists = existsSync(path);
  const secrets = exists ? ProviderSecretFileSchema.parse(JSON.parse(await readFile(path, "utf8"))) : undefined;
  const providers = provider ? [provider] : (["local", "heygen", "higgsfield", "agent-media", "comfyui", "postiz", "meta"] as ProviderId[]);
  return {
    secretsPath: path,
    secretsFileExists: exists,
    providers: providers.map((id) => {
      const storedKeys = Object.keys(secrets?.providers[id] ?? {});
      return {
        id,
        preferredMethod: preferredAuthMethod(id),
        localSecretFileSupported: id !== "local" && id !== "comfyui",
        hasLocalSecrets: storedKeys.length > 0,
        storedKeys,
        oauth: oauthGuidance(id)
      };
    }),
    message: "OAuth is preferred. Local secrets files are supported for providers that need manually supplied credentials."
  };
}

export async function createProviderSecretTemplate(input: ProviderSecretTemplateInput = {}) {
  const path = input.path ?? defaultProviderSecretsPath();
  const now = new Date().toISOString();
  const providers = input.provider ? [input.provider] : (["heygen", "higgsfield", "agent-media", "postiz", "meta"] as ProviderId[]);
  const file = ProviderSecretFileSchema.parse({
    schemaVersion: "0.2",
    updatedAt: now,
    providers: Object.fromEntries(providers.map((provider) => [provider, secretTemplateFor(provider)]))
  });
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(path, 0o600);
  return {
    path,
    providers,
    message: "Local provider secrets template created. Fill it in manually and keep it private."
  };
}

export async function startProviderOAuth(input: ProviderAuthStartInput) {
  const guidance = oauthGuidance(input.provider, input.callbackUrl);
  return {
    provider: input.provider,
    method: "oauth",
    preferred: true,
    browserAutomationAllowed: true,
    authUrl: guidance.authUrl,
    setup: guidance.setup,
    callbackUrl: input.callbackUrl,
    message: "Open the provider's official sign-in page in the browser. The user should complete login and consent there; do not collect passwords in chat."
  };
}

function preferredAuthMethod(provider: ProviderId) {
  if (provider === "local" || provider === "comfyui") return "none";
  return "oauth";
}

function secretTemplateFor(provider: ProviderId) {
  switch (provider) {
    case "heygen":
      return { apiKey: "" };
    case "higgsfield":
      return { apiKey: "" };
    case "agent-media":
      return { apiKey: "" };
    case "postiz":
      return { apiUrl: "", apiKey: "" };
    case "meta":
      return { appId: "", appSecret: "", accessToken: "" };
    case "local":
    case "comfyui":
      return {};
  }
}

function oauthGuidance(provider: ProviderId, callbackUrl?: string) {
  switch (provider) {
    case "heygen":
      return {
        authUrl: "https://app.heygen.com/",
        setup: "Sign in to HeyGen in the browser or app, then connect the HeyGen CLI/app surface when available."
      };
    case "higgsfield":
      return {
        authUrl: "https://higgsfield.ai/",
        setup: "Sign in to Higgsfield in the browser, or install the CLI and run higgsfield auth login."
      };
    case "agent-media":
      return {
        authUrl: "https://agent-media.ai/",
        setup: "Sign in to Agent Media in the browser, or install the CLI and run agent-media login."
      };
    case "postiz":
      return {
        authUrl: "https://postiz.com/",
        setup: "Sign in to Postiz, connect the social accounts, and use VideoControl handoff files for approved scheduling."
      };
    case "meta":
      return {
        authUrl: "https://developers.facebook.com/apps/",
        setup: `Create or choose a Meta app, complete OAuth, and connect the ads MCP.${callbackUrl ? ` Callback URL: ${callbackUrl}` : ""}`
      };
    case "local":
      return {
        authUrl: undefined,
        setup: "Local VideoControl does not need provider OAuth."
      };
    case "comfyui":
      return {
        authUrl: undefined,
        setup: "ComfyUI runs locally. Start ComfyUI and set COMFYUI_URL only if it is not running at http://127.0.0.1:8188."
      };
  }
}
