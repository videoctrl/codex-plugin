import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SocialBotDraft, SocialBotDraftSchema } from "./schema.js";
import {
  createSocialBotWorkspace,
  listDrafts,
  readConfig,
  readDraft,
  socialBotPaths,
  writeDraft
} from "./store.js";

export type DraftInput = {
  projectDir: string;
  text: string;
  media?: string[];
  notes?: string;
};

export type PublishInput = {
  projectDir: string;
  draftId?: string;
  requiresApproval?: boolean;
  approve?: boolean;
};

export async function createDraft(input: DraftInput) {
  await createSocialBotWorkspace({ projectDir: input.projectDir });
  const now = new Date().toISOString();
  const draft = SocialBotDraftSchema.parse({
    schemaVersion: "0.2",
    id: `draft_${Date.now()}`,
    status: "draft",
    text: input.text,
    media: input.media ?? [],
    createdAt: now,
    updatedAt: now,
    notes: input.notes
  });
  await writeDraft(input.projectDir, draft);
  return {
    draft,
    message: "Draft created. Review and approve it before publishing."
  };
}

export async function approveDraft(projectDir: string, draftId: string) {
  const draft = await readDraft(projectDir, draftId);
  const now = new Date().toISOString();
  const approved = SocialBotDraftSchema.parse({
    ...draft,
    status: "approved",
    approvedAt: now,
    updatedAt: now
  });
  await writeDraft(projectDir, approved);
  return {
    draft: approved,
    message: "Draft approved."
  };
}

export async function publishDraft(input: PublishInput) {
  await createSocialBotWorkspace({ projectDir: input.projectDir });
  const config = await readConfig(input.projectDir);
  const draft = input.draftId ? await readDraft(input.projectDir, input.draftId) : await latestDraft(input.projectDir);

  if (config.policy.requiresApproval && !input.requiresApproval) {
    throw new Error("Publishing requires --requires-approval.");
  }

  let selectedDraft: SocialBotDraft = draft;
  if (input.approve) {
    selectedDraft = (await approveDraft(input.projectDir, draft.id)).draft;
  }

  if (selectedDraft.status !== "approved") {
    const handoffPath = await writePublishHandoff(input.projectDir, selectedDraft, "approval_required");
    return {
      status: "approval_required",
      draft: selectedDraft,
      handoffPath,
      message: "Draft is ready for owner approval. It was not published."
    };
  }

  const handoffPath = await writePublishHandoff(input.projectDir, selectedDraft, "setup_required");
  if (!config.labelVerified) {
    return {
      status: "setup_required",
      draft: selectedDraft,
      handoffPath,
      message: "The automated-account label must be verified before publishing."
    };
  }

  if (config.oauthStatus !== "connected") {
    return {
      status: "setup_required",
      draft: selectedDraft,
      handoffPath,
      message: "Official X API access is not connected. The approved post was written to a handoff file."
    };
  }

  return {
    status: "setup_required",
    draft: selectedDraft,
    handoffPath,
    message: "Publishing needs an installed official X API client. No website automation was attempted."
  };
}

export { listDrafts, readDraft };

async function latestDraft(projectDir: string) {
  const drafts = await listDrafts(projectDir);
  const draft = drafts.at(-1);
  if (!draft) throw new Error("No social bot drafts exist yet.");
  return draft;
}

async function writePublishHandoff(projectDir: string, draft: SocialBotDraft, status: string) {
  const paths = socialBotPaths(projectDir);
  const handoffPath = join(paths.handoffDir, `publish-${draft.id}.md`);
  const media = draft.media.length > 0 ? draft.media.map((item) => `- ${item}`).join("\n") : "- No media attached";
  await writeFile(
    handoffPath,
    `# Social Bot Publish Handoff

Status: ${status}
Draft: ${draft.id}

## Post

${draft.text}

## Media

${media}

## Required

- Owner approval
- Verified automated-account label
- Official X API connection
`,
    "utf8"
  );
  return handoffPath;
}
