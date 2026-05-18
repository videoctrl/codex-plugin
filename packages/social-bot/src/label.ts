import { SocialBotConfigSchema } from "./schema.js";
import { createSocialBotWorkspace, normalizeHandle, readConfig, writeConfig } from "./store.js";

export type VerifyLabelInput = {
  projectDir: string;
  botHandle?: string;
  ownerHandle?: string;
  bio?: string;
  labelText?: string;
};

export async function verifyLabel(input: VerifyLabelInput) {
  await createSocialBotWorkspace(input);
  const config = await readConfig(input.projectDir);
  const botHandle = input.botHandle ? normalizeHandle(input.botHandle) : config.botHandle;
  const ownerHandle = input.ownerHandle ? normalizeHandle(input.ownerHandle) : config.ownerHandle;
  const text = `${input.bio ?? ""}\n${input.labelText ?? ""}`.toLowerCase();
  const hasProfileText = text.trim().length > 0;
  const ownerMentioned = hasProfileText && text.includes(ownerHandle.toLowerCase());
  const automationDisclosed = hasProfileText && /\b(automated|automation|bot|auto-post|managed by)\b/i.test(text);
  const verified = hasProfileText ? ownerMentioned && automationDisclosed : config.labelVerified;
  const nextConfig = SocialBotConfigSchema.parse({
    ...config,
    botHandle,
    ownerHandle,
    labelVerified: verified,
    labelVerifiedAt: verified ? new Date().toISOString() : config.labelVerifiedAt,
    updatedAt: new Date().toISOString(),
    policy: {
      ...config.policy,
      disclosure: `Automated account managed by ${ownerHandle}.`
    }
  });
  await writeConfig(input.projectDir, nextConfig);

  return {
    verified,
    checks: {
      ownerMentioned,
      automationDisclosed,
      officialApiOnly: nextConfig.policy.officialApiOnly,
      requiresApproval: nextConfig.policy.requiresApproval
    },
    config: nextConfig,
    message: verified
      ? "The bot label and owner disclosure are recorded as verified."
      : "The bot is not ready to publish. Add the automated-account label and owner disclosure, then verify again."
  };
}
