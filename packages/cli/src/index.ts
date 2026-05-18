#!/usr/bin/env node

import {
  archiveContentObject,
  createContentObject,
  createContentOs,
  getContentOsStatus,
  readProjectIntent,
  routeContentObject,
  transitionContentState,
  updateProjectIntentFromNote
} from "@videocontrol/content-os";
import { createWriterContextPacket } from "@videocontrol/content-os";
import { createAdBrief, enhanceAssetPrompt, generateVariantPlan, renderAdBrief, renderVariantPlan, runAvoidSlopCheck, runViralPostmortem, scoreAdReadiness, scoreBookmarkability } from "@videocontrol/creative-ops";
import { publishToLibrary, remixLibraryVideo, exportReproBundle } from "@videocontrol/library";
import {
  allProviderStatuses,
  createProviderSecretTemplate,
  generateCreativeAsset,
  getComfyUiWorkflow,
  importComfyUiWorkflow,
  importCreativeAssetJob,
  listComfyUiWorkflows,
  prepareReferenceAsset,
  providerAuthStatus,
  providerReadinessReminder,
  ProviderId,
  ProviderIdSchema,
  providerStatus,
  readCreativeAssetJob,
  readCreativePreferences,
  startProviderOAuth,
  submitCreativeAssetJob,
  updateCreativePreferences
} from "@videocontrol/providers";
import { approveDraft, connectX, createDraft, createSocialBotWorkspace, recordOrListMetrics, verifyLabel, publishDraft } from "@videocontrol/social-bot";
import { doctorCommand, setupCommand } from "./doctor.js";

const args = process.argv.slice(2);
const [group, command, ...rest] = args;

const valueFlags = new Set([
  "--actor",
  "--app",
  "--aspect",
  "--asset",
  "--bio",
  "--bookmarks",
  "--bot",
  "--callback-url",
  "--caption-style",
  "--clicks",
  "--count",
  "--customer",
  "--duration",
  "--favorite-prompt",
  "--format",
  "--impressions",
  "--input",
  "--job",
  "--kind",
  "--label",
  "--likes",
  "--media",
  "--model",
  "--name",
  "--note",
  "--notes",
  "--offer",
  "--owner",
  "--path",
  "--pacing",
  "--platform",
  "--project",
  "--prompt",
  "--provider",
  "--reference-url",
  "--replies",
  "--reposts",
  "--route",
  "--safe-zone",
  "--selection",
  "--slug",
  "--source",
  "--state",
  "--style",
  "--style-note",
  "--text",
  "--thesis",
  "--title",
  "--tweet-id",
  "--visibility",
  "--workflow"
]);

try {
  const result = await dispatch(group, command, rest);
  printResult(result);
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

async function dispatch(group?: string, command?: string, rest: string[] = []) {
  if (!group || group === "help" || group === "--help") {
    return help();
  }

  if (group === "doctor") {
    return doctorCommand();
  }

  if (group === "setup") {
    return setupCommand();
  }

  if (group === "content-os") {
    const projectDir = rest[0] ?? ".";
    if (command === "init") return createContentOs(projectDir);
    if (command === "status") return getContentOsStatus(projectDir);
    if (command === "route") return routeContentObject(projectDir, readFlag(rest, "--slug"), readFlag(rest, "--route") as any);
  }

  if (group === "content") {
    if (command === "create") {
      return createContentObject({
        projectDir: readFlag(rest, "--project", "."),
        title: readFlag(rest, "--title"),
        format: readFlag(rest, "--format", "video_ad") as any
      });
    }
    if (command === "route") return routeContentObject(readFlag(rest, "--project", "."), readPositional(rest, "slug"), readFlag(rest, "--route") as any);
    if (command === "transition") return transitionContentState(readFlag(rest, "--project", "."), readPositional(rest, "slug"), readFlag(rest, "--state") as any);
    if (command === "archive") return archiveContentObject(readFlag(rest, "--project", "."), readPositional(rest, "slug"));
  }

  if (group === "brief" && command === "create") {
    return createWriterContextPacket({ projectDir: readFlag(rest, "--project", "."), slug: readPositional(rest, "slug") });
  }

  if (group === "intent") {
    if (command === "update") {
      return updateProjectIntentFromNote({
        projectDir: readFlag(rest, "--project", "."),
        note: readFlag(rest, "--note"),
        selectionId: optionalFlag(rest, "--selection"),
        source: optionalFlag(rest, "--source")
      });
    }
  }

  if (group === "preferences") {
    if (command === "show") return readCreativePreferences();
    if (command === "update") {
      return updateCreativePreferences({
        preferredProvider: optionalFlag(rest, "--provider") as any,
        aspectRatio: optionalFlag(rest, "--aspect") as any,
        platformTargets: readRepeatedFlag(rest, "--platform"),
        captionStyle: optionalFlag(rest, "--caption-style"),
        pacing: optionalFlag(rest, "--pacing"),
        styleNotes: readRepeatedFlag(rest, "--style-note"),
        safeZoneRules: readRepeatedFlag(rest, "--safe-zone"),
        favoritePrompts: readRepeatedFlag(rest, "--favorite-prompt")
      });
    }
  }

  if (group === "reference" && command === "prepare") {
    return prepareReferenceAsset({
      projectDir: readFlag(rest, "--project", "."),
      input: readFlag(rest, "--input"),
      copyIntoProject: !rest.includes("--no-copy")
    });
  }

  if (group === "prompt" && command === "enhance") {
    const projectDir = readFlag(rest, "--project", ".");
    return enhanceAssetPrompt({
      prompt: readFlag(rest, "--prompt"),
      kind: optionalFlag(rest, "--kind") ?? "image",
      platform: optionalFlag(rest, "--platform"),
      selectionId: optionalFlag(rest, "--selection"),
      projectIntent: await readProjectIntent(projectDir),
      preferences: await readCreativePreferences()
    });
  }

  if (group === "verify") {
    const text = readFlag(rest, "--text", rest.join(" "));
    if (command === "bookmarkability") return scoreBookmarkability(text);
    if (command === "avoid-slop") return runAvoidSlopCheck(text);
    if (command === "postmortem") return runViralPostmortem(text);
    if (command === "ad-readiness") return scoreAdReadiness({ text });
  }

  if (group === "ad") {
    if (command === "brief") {
      const brief = createAdBrief({
        campaignThesis: readFlag(rest, "--thesis", "Campaign thesis"),
        targetCustomer: readFlag(rest, "--customer", "Target customer"),
        offer: readFlag(rest, "--offer", "Offer"),
        platform: readFlag(rest, "--platform", "meta-reels")
      });
      return { brief, markdown: renderAdBrief(brief) };
    }
    if (command === "variants") {
      const variants = generateVariantPlan({ count: Number(readFlag(rest, "--count", "6")), offer: readFlag(rest, "--offer", "Offer"), platform: readFlag(rest, "--platform", "meta-reels") });
      return { variants, markdown: renderVariantPlan(variants) };
    }
  }

  if (group === "provider") {
    if (command === "readiness") return providerReadinessReminder();
    if (command === "list") return { providers: await allProviderStatuses() };
    if (command === "status") {
      const provider = optionalPositional(rest);
      return provider ? providerStatus(parseProvider(provider)) : { providers: await allProviderStatuses() };
    }
    if (command === "auth") {
      const action = rest[0];
      if (action === "status") return providerAuthStatus(optionalProviderFlag(rest, "--provider"), optionalFlag(rest, "--path"));
      if (action === "oauth") {
        return startProviderOAuth({
          provider: readProviderFlag(rest, "--provider"),
          callbackUrl: optionalFlag(rest, "--callback-url")
        });
      }
      if (action === "secret-template") {
        return createProviderSecretTemplate({
          provider: optionalProviderFlag(rest, "--provider"),
          path: optionalFlag(rest, "--path")
        });
      }
    }
    if (command === "generate") {
      return generateCreativeAsset({
        provider: readProviderFlag(rest, "--provider", "higgsfield"),
        kind: readFlag(rest, "--kind", "video") as any,
        prompt: readFlag(rest, "--prompt"),
        model: optionalFlag(rest, "--model"),
        actor: optionalFlag(rest, "--actor"),
        style: optionalFlag(rest, "--style"),
        aspectRatio: optionalFlag(rest, "--aspect") as any,
        durationSec: optionalNumberFlag(rest, "--duration"),
        inputPath: optionalFlag(rest, "--input"),
        referenceUrl: optionalFlag(rest, "--reference-url"),
        workflow: optionalFlag(rest, "--workflow")
      });
    }
    if (command === "submit") {
      return submitCreativeAssetJob({
        projectDir: readFlag(rest, "--project", "."),
        slug: optionalFlag(rest, "--slug"),
        provider: readProviderFlag(rest, "--provider"),
        kind: readFlag(rest, "--kind", "video") as any,
        prompt: readFlag(rest, "--prompt"),
        model: optionalFlag(rest, "--model"),
        actor: optionalFlag(rest, "--actor"),
        style: optionalFlag(rest, "--style"),
        aspectRatio: optionalFlag(rest, "--aspect") as any,
        durationSec: optionalNumberFlag(rest, "--duration"),
        inputPath: optionalFlag(rest, "--input"),
        referenceUrl: optionalFlag(rest, "--reference-url"),
        workflow: optionalFlag(rest, "--workflow")
      });
    }
    if (command === "job") return readCreativeAssetJob(readFlag(rest, "--project", "."), readFlag(rest, "--job"));
    if (command === "import-job") {
      return importCreativeAssetJob({
        projectDir: readFlag(rest, "--project", "."),
        slug: readFlag(rest, "--slug"),
        jobId: readFlag(rest, "--job"),
        assetPath: optionalFlag(rest, "--asset")
      });
    }
    if (command === "comfyui") {
      const action = rest[0];
      const comfyRest = rest.slice(1);
      if (action === "import") return importComfyUiWorkflow({ name: readFlag(comfyRest, "--name"), workflowPath: readFlag(comfyRest, "--workflow") });
      if (action === "list") return listComfyUiWorkflows();
      if (action === "view") return getComfyUiWorkflow(readFlag(comfyRest, "--name"));
    }
  }

  if (group === "library") {
    if (command === "export") return exportReproBundle({ projectDir: readFlag(rest, "--project", "."), slug: readPositional(rest, "slug") });
    if (command === "publish") return publishToLibrary({ projectDir: readFlag(rest, "--project", "."), slug: readPositional(rest, "slug"), visibility: readFlag(rest, "--visibility", "private") as any, redact: rest.includes("--redact") });
    if (command === "remix") return remixLibraryVideo(readPositional(rest, "library id"));
  }

  if (group === "social-bot") {
    const projectDir = readFlag(rest, "--project", ".");
    if (command === "setup-checklist") {
      return createSocialBotWorkspace({
        projectDir,
        botHandle: optionalFlag(rest, "--bot"),
        ownerHandle: optionalFlag(rest, "--owner")
      });
    }
    if (command === "verify-label") {
      return verifyLabel({
        projectDir,
        botHandle: optionalFlag(rest, "--bot"),
        ownerHandle: optionalFlag(rest, "--owner"),
        bio: optionalFlag(rest, "--bio"),
        labelText: optionalFlag(rest, "--label")
      });
    }
    if (command === "connect-x") {
      return connectX({
        projectDir,
        botHandle: optionalFlag(rest, "--bot"),
        ownerHandle: optionalFlag(rest, "--owner"),
        appName: optionalFlag(rest, "--app"),
        callbackUrl: optionalFlag(rest, "--callback-url")
      });
    }
    if (command === "draft") {
      return createDraft({
        projectDir,
        text: readFlag(rest, "--text"),
        media: readRepeatedFlag(rest, "--media"),
        notes: optionalFlag(rest, "--notes")
      });
    }
    if (command === "approve") {
      return approveDraft(projectDir, readPositional(rest, "draft id"));
    }
    if (command === "publish") {
      return publishDraft({
        projectDir,
        draftId: optionalPositional(rest),
        requiresApproval: rest.includes("--requires-approval"),
        approve: rest.includes("--approve")
      });
    }
    if (command === "metrics") {
      return recordOrListMetrics({
        projectDir,
        tweetId: optionalFlag(rest, "--tweet-id"),
        impressions: optionalNumberFlag(rest, "--impressions"),
        likes: optionalNumberFlag(rest, "--likes"),
        reposts: optionalNumberFlag(rest, "--reposts"),
        replies: optionalNumberFlag(rest, "--replies"),
        bookmarks: optionalNumberFlag(rest, "--bookmarks"),
        clicks: optionalNumberFlag(rest, "--clicks"),
        notes: optionalFlag(rest, "--notes")
      });
    }
  }

  throw new Error(`Unknown command: ${[group, command, ...rest].filter(Boolean).join(" ")}`);
}

function readFlag(args: string[], name: string, fallback?: string) {
  const index = args.indexOf(name);
  if (index === -1) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing ${name}.`);
  }
  const value = args[index + 1];
  if (!value) throw new Error(`Missing value for ${name}.`);
  return value;
}

function readProviderFlag(args: string[], name: string, fallback?: string): ProviderId {
  return parseProvider(readFlag(args, name, fallback));
}

function optionalProviderFlag(args: string[], name: string): ProviderId | undefined {
  const value = optionalFlag(args, name);
  return value ? parseProvider(value) : undefined;
}

function parseProvider(value: string): ProviderId {
  const parsed = ProviderIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Unknown provider: ${value}. Use one of: ${ProviderIdSchema.options.join(", ")}.`);
  }
  return parsed.data;
}

function optionalFlag(args: string[], name: string) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value) throw new Error(`Missing value for ${name}.`);
  return value;
}

function optionalNumberFlag(args: string[], name: string) {
  const value = optionalFlag(args, name);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid number for ${name}.`);
  return number;
}

function readRepeatedFlag(args: string[], name: string) {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name) {
      const value = args[index + 1];
      if (!value) throw new Error(`Missing value for ${name}.`);
      values.push(value);
    }
  }
  return values;
}

function readPositional(args: string[], name: string) {
  const value = optionalPositional(args);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function optionalPositional(args: string[]) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      if (valueFlags.has(arg)) index += 1;
      continue;
    }
    return arg;
  }
  return undefined;
}

function printResult(value: unknown) {
  if (typeof value === "string") {
    console.log(value);
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

function help() {
  return `VideoControl CLI

Commands:
  videocontrol doctor
  videocontrol setup
  videocontrol content-os init ./project
  videocontrol content-os status ./project
  videocontrol content create --title "Agent paid ads video" --format video_ad
  videocontrol content route <slug> --route paid_ad_batch
  videocontrol content transition <slug> --state brief_ready
  videocontrol content archive <slug>
  videocontrol intent update --note "Keep this direction" --selection clip:c_intro
  videocontrol preferences show
  videocontrol preferences update --provider higgsfield --platform meta-reels --aspect 9:16
  videocontrol reference prepare --project ./project --input ./product-shot.png
  videocontrol prompt enhance --project ./project --platform meta-reels --prompt "Product hero image"
  videocontrol brief create <slug>
  videocontrol verify bookmarkability --text "..."
  videocontrol verify avoid-slop --text "..."
  videocontrol verify postmortem --text "..."
  videocontrol verify ad-readiness --text "..."
  videocontrol ad brief --thesis "..." --customer "..." --offer "..."
  videocontrol ad variants --offer "..." --count 6
  videocontrol provider list
  videocontrol provider readiness
  videocontrol provider status higgsfield
  videocontrol provider auth status --provider higgsfield
  videocontrol provider auth oauth --provider higgsfield
  videocontrol provider auth secret-template --provider heygen
  videocontrol provider generate --provider higgsfield --kind broll --prompt "..."
  videocontrol provider submit --project ./project --slug demo --provider higgsfield --kind image --prompt "..."
  videocontrol provider job --project ./project --job job_123
  videocontrol provider import-job --project ./project --slug demo --job job_123 --asset ./generated.png
  videocontrol provider comfyui import --name product-hero --workflow ./workflow.json
  videocontrol provider comfyui list
  videocontrol provider generate --provider agent-media --kind video --actor sofia --prompt "..."
  videocontrol library export <slug>
  videocontrol library publish <slug> --visibility private
  videocontrol library remix <library-id>
  videocontrol social-bot setup-checklist --bot @my_bot --owner @me
  videocontrol social-bot verify-label --bio "Automated account managed by @me" --label "@my_bot is automated"
  videocontrol social-bot connect-x --app "VideoControl Social Bot"
  videocontrol social-bot draft --text "New approved post idea"
  videocontrol social-bot approve <draft-id>
  videocontrol social-bot publish <draft-id> --requires-approval
  videocontrol social-bot metrics --tweet-id 123 --impressions 1000 --likes 25`;
}
