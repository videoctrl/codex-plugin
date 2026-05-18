import { ProviderStatus } from "../../types.js";
import { commandExists, run } from "../../process.js";

export async function postizStatus(): Promise<ProviderStatus> {
  const available = await commandExists("postiz");
  if (!available) {
    return {
      id: "postiz",
      available: false,
      authenticated: false,
      mode: "handoff",
      setup: "Install Postiz with npm install -g postiz, then run postiz auth:login.",
      capabilities: ["approved post scheduling", "media upload", "integration discovery", "post analytics"]
    };
  }

  let authenticated = false;
  try {
    await run("postiz", ["auth:status"]);
    authenticated = true;
  } catch {
    authenticated = false;
  }

  const version = await run("postiz", ["--version"]).then((result) => result.stdout.trim()).catch(() => undefined);
  return {
    id: "postiz",
    available: true,
    authenticated,
    mode: "cli",
    version,
    setup: authenticated ? undefined : "Run postiz auth:login, or configure POSTIZ_API_KEY in your local shell/secrets manager.",
    capabilities: ["approved post scheduling", "media upload", "integration discovery", "post analytics"]
  };
}
