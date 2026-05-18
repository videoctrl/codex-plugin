import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SocialBotConfigSchema } from "./schema.js";
import { createSocialBotWorkspace, readConfig, socialBotPaths, writeConfig } from "./store.js";

export type ConnectXInput = {
  projectDir: string;
  botHandle?: string;
  ownerHandle?: string;
  appName?: string;
  callbackUrl?: string;
};

export async function connectX(input: ConnectXInput) {
  await createSocialBotWorkspace(input);
  const paths = socialBotPaths(input.projectDir);
  const config = await readConfig(input.projectDir);
  const nextConfig = SocialBotConfigSchema.parse({
    ...config,
    appName: input.appName ?? config.appName ?? "VideoControl Social Bot",
    oauthStatus: "configured",
    updatedAt: new Date().toISOString()
  });
  await writeConfig(input.projectDir, nextConfig);

  const handoffPath = join(paths.handoffDir, "x-oauth-setup.md");
  await writeFile(handoffPath, oauthHandoffMarkdown(nextConfig, input.callbackUrl), "utf8");

  return {
    status: "setup_required",
    config: nextConfig,
    handoffPath,
    message: "X connection instructions are ready. A human still needs to complete the official X OAuth setup."
  };
}

function oauthHandoffMarkdown(config: { botHandle: string; ownerHandle: string; appName?: string; developerPortalUrl: string }, callbackUrl?: string) {
  return `# X Connection Handoff

Bot account: ${config.botHandle}
Owner account: ${config.ownerHandle}
App name: ${config.appName ?? "VideoControl Social Bot"}

## Setup

- Open ${config.developerPortalUrl}
- Create or choose the app for this bot.
- Enable OAuth for the bot account.
- Use the official X API for publishing and metrics.
- Store OAuth credentials in an approved local secret manager.

${callbackUrl ? `Callback URL: ${callbackUrl}\n` : ""}
## Not allowed

- Do not automate the X website.
- Do not store secrets in the project folder.
- Do not publish until the owner has approved the draft.
`;
}
