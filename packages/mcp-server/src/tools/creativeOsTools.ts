import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addFeedback,
  addStoreItem,
  appendProvenance,
  archiveContentObject,
  ContentFormatSchema,
  ContentRouteSchema,
  ContentStateSchema,
  createContentObject,
  createContentOs,
  createWriterContextPacket,
  findContentObject,
  getContentObject,
  getContentOsStatus,
  listContentObjects,
  listStoreItems,
  readProjectIntent,
  routeContentObject,
  transitionContentState,
  updateStrategyFile,
  updateVoiceFile,
  writeJson
} from "@videocontrol/content-os";
import {
  createAdBrief as buildAdBrief,
  createPlatformHandoff,
  createScript as buildScript,
  createShotList as buildShotList,
  createSocialPostBrief,
  createStoryboard as buildStoryboard,
  enhanceAssetPrompt,
  generateVariantPlan as buildVariantPlan,
  renderAdBrief,
  renderVariantPlan,
  runAvoidSlopCheck,
  runViralPostmortem,
  scoreAdReadiness as scoreAdReadinessText,
  scoreBookmarkability,
  validateForPlatform
} from "@videocontrol/creative-ops";
import { exportReproBundle, publishToLibrary, pullLibraryTemplate, remixLibraryVideo } from "@videocontrol/library";
import {
  allProviderStatuses,
  getComfyUiWorkflow,
  importComfyUiWorkflow,
  importCreativeAssetJob,
  listComfyUiWorkflows,
  prepareReferenceAsset,
  providerReadinessReminder,
  createProviderSecretTemplate,
  generateCreativeAsset as runProviderGeneration,
  readCreativeAssetJob,
  readCreativePreferences,
  providerAuthStatus,
  providerCapabilities,
  providerStatus,
  submitCreativeAssetJob,
  startProviderOAuth,
  updateCreativePreferences
} from "@videocontrol/providers";
import { defaultExportPath, renderTimeline } from "@videocontrol/renderer";
import { connectX, createDraft, createSocialBotWorkspace, recordOrListMetrics, verifyLabel, publishDraft } from "@videocontrol/social-bot";
import { z } from "zod";
import { readTimeline } from "./store.js";

type ToolResult = (value: unknown) => { content: Array<{ type: "text"; text: string }> };

type McpLikeServer = {
  tool: (name: string, description: string, schema: Record<string, z.ZodType>, handler: (input: any) => Promise<ReturnType<ToolResult>>) => unknown;
};

const projectSchema = { projectDir: z.string() };
const slugSchema = { projectDir: z.string(), slug: z.string() };
const providerSchema = z.enum(["local", "heygen", "higgsfield", "agent-media", "comfyui", "postiz", "meta"]);

export function registerCreativeOsTools(server: McpLikeServer, asToolResult: ToolResult) {
  server.tool("create_content_os", "Create the Content OS workspace for a project.", projectSchema, async (input) =>
    asToolResult(await createContentOs(input.projectDir))
  );

  server.tool("get_content_os_status", "Read Content OS status for a project.", projectSchema, async (input) =>
    asToolResult(await getContentOsStatus(input.projectDir))
  );

  server.tool(
    "create_content_object",
    "Create a run folder for an ad, video, post, or campaign.",
    {
      projectDir: z.string(),
      title: z.string(),
      format: ContentFormatSchema,
      route: ContentRouteSchema.optional(),
      slug: z.string().optional(),
      platformProfiles: z.array(z.string()).optional(),
      pillar: z.string().optional()
    },
    async (input) => asToolResult(await createContentObject(input))
  );

  server.tool("route_content_object", "Set the route for a content object.", { ...slugSchema, route: ContentRouteSchema }, async (input) =>
    asToolResult(await routeContentObject(input.projectDir, input.slug, input.route))
  );

  server.tool("transition_content_state", "Move a content object to an allowed state.", { ...slugSchema, state: ContentStateSchema }, async (input) =>
    asToolResult(await transitionContentState(input.projectDir, input.slug, input.state))
  );

  server.tool("get_content_object", "Read a content object and its run folder.", slugSchema, async (input) =>
    asToolResult(await getContentObject(input.projectDir, input.slug))
  );

  server.tool("list_content_objects", "List content objects.", { projectDir: z.string(), area: z.enum(["active", "archive", "all"]).optional() }, async (input) =>
    asToolResult({ objects: await listContentObjects(input.projectDir, input.area ?? "active") })
  );

  server.tool("archive_content_object", "Archive a content object.", slugSchema, async (input) =>
    asToolResult(await archiveContentObject(input.projectDir, input.slug))
  );

  server.tool("init_strategy", "Initialize Content OS strategy files.", projectSchema, async (input) =>
    asToolResult(await createContentOs(input.projectDir))
  );

  server.tool("update_strategy_file", "Update a strategy file.", { projectDir: z.string(), file: z.string(), content: z.string() }, async (input) =>
    asToolResult(await updateStrategyFile(input.projectDir, input.file, input.content))
  );

  server.tool("read_strategy_slice", "Read a short slice from a strategy file.", { projectDir: z.string(), file: z.string(), maxLines: z.number().int().positive().optional() }, async (input) => {
    const { readStrategySlice } = await import("@videocontrol/content-os");
    return asToolResult({ slice: await readStrategySlice(input.projectDir, input.file, input.maxLines) });
  });

  server.tool("update_voice_profile", "Update the voice profile.", { projectDir: z.string(), content: z.string() }, async (input) =>
    asToolResult(await updateVoiceFile(input.projectDir, "voice-profile.md", input.content))
  );

  server.tool("update_avoid_slop", "Update the avoid-slop guide.", { projectDir: z.string(), content: z.string() }, async (input) =>
    asToolResult(await updateVoiceFile(input.projectDir, "master-avoid-slop.md", input.content))
  );

  for (const [toolName, kind] of [
    ["add_proof", "proof"],
    ["add_hook", "hooks"],
    ["add_idea", "ideas"],
    ["add_competitor_signal", "competitors"],
    ["add_feedback", "feedback"]
  ] as const) {
    server.tool(toolName, `Add an item to the ${kind} store.`, { projectDir: z.string(), title: z.string(), content: z.string() }, async (input) =>
      asToolResult(toolName === "add_feedback" ? await addFeedback(input.projectDir, input.title, input.content) : await addStoreItem(input.projectDir, kind, input.title, input.content))
    );
  }

  server.tool("list_store_items", "List Content OS store items.", { projectDir: z.string(), kind: z.enum(["ideas", "hooks", "proof", "competitors", "feedback", "winners", "losers", "examples"]) }, async (input) =>
    asToolResult({ items: await listStoreItems(input.projectDir, input.kind) })
  );

  server.tool("create_writer_context_packet", "Create a focused brief from selected project knowledge.", { ...slugSchema, thesis: z.string().optional(), reader: z.string().optional(), angle: z.string().optional() }, async (input) =>
    asToolResult(await createWriterContextPacket(input))
  );

  server.tool("score_bookmarkability", "Score a draft for bookmarkability.", { text: z.string() }, async (input) =>
    asToolResult(scoreBookmarkability(input.text))
  );

  server.tool("run_avoid_slop_check", "Find generic or inflated draft patterns.", { text: z.string() }, async (input) =>
    asToolResult(runAvoidSlopCheck(input.text))
  );

  server.tool("run_viral_postmortem", "Identify concrete mechanics in a draft.", { text: z.string() }, async (input) =>
    asToolResult(runViralPostmortem(input.text))
  );

  server.tool("create_draft_package", "Write a draft package into a run folder.", { ...slugSchema, content: z.string() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const path = join(found.runDir, "draft-package.md");
    await writeFile(path, input.content, "utf8");
    return asToolResult({ path, message: "Created draft package." });
  });

  server.tool("create_scheduler_handoff", "Write a scheduler handoff file.", { ...slugSchema, platform: z.string(), caption: z.string().optional(), renderPath: z.string().optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const content = createPlatformHandoff({ platform: input.platform, title: found.contentObject.title, renderPath: input.renderPath, caption: input.caption });
    const path = join(found.runDir, "scheduler-handoff.md");
    await writeFile(path, content, "utf8");
    return asToolResult({ path, message: "Created scheduler handoff." });
  });

  server.tool("create_ad_brief", "Create an ad brief for a content object.", { ...slugSchema, campaignThesis: z.string(), targetCustomer: z.string(), offer: z.string(), platform: z.string() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const brief = buildAdBrief(input);
    const path = join(found.runDir, "ad-brief.md");
    await writeFile(path, renderAdBrief(brief), "utf8");
    return asToolResult({ brief, path, message: "Created ad brief." });
  });

  server.tool("generate_variant_plan", "Create an ad variant plan.", { ...slugSchema, count: z.number().int().positive().default(6), offer: z.string(), platform: z.string().optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const variants = buildVariantPlan(input);
    const path = join(found.runDir, "ad-variant-plan.md");
    await writeFile(path, renderVariantPlan(variants), "utf8");
    return asToolResult({ variants, path, message: "Created variant plan." });
  });

  server.tool("create_script", "Create a short-video script.", { ...slugSchema, hook: z.string(), proof: z.string().optional(), mechanism: z.string().optional(), demo: z.string().optional(), takeaway: z.string().optional(), cta: z.string().optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const path = join(found.runDir, "script.md");
    await writeFile(path, buildScript(input), "utf8");
    return asToolResult({ path, message: "Created script." });
  });

  server.tool("create_storyboard", "Create a storyboard.", { ...slugSchema, beats: z.array(z.string()).optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const path = join(found.runDir, "storyboard.md");
    await writeFile(path, buildStoryboard({ title: found.contentObject.title, beats: input.beats }), "utf8");
    return asToolResult({ path, message: "Created storyboard." });
  });

  server.tool("create_shot_list", "Create a shot list.", { ...slugSchema, shots: z.array(z.string()).optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const path = join(found.runDir, "shot-list.md");
    await writeFile(path, buildShotList({ shots: input.shots }), "utf8");
    return asToolResult({ path, message: "Created shot list." });
  });

  server.tool("assemble_ad_variant", "Copy the current timeline into a content-object variant.", { ...slugSchema, variantId: z.string().default("v001") }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const timeline = await readTimeline(input.projectDir);
    const variantDir = join(found.runDir, "variants", input.variantId);
    await mkdir(variantDir, { recursive: true });
    await writeJson(join(variantDir, "timeline.video.json"), timeline);
    await writeJson(join(found.runDir, "timeline.video.json"), timeline);
    return asToolResult({ variantDir, timelineVersion: timeline.version, message: "Assembled ad variant." });
  });

  server.tool("render_ad_variants", "Render the current timeline as an ad variant.", { ...slugSchema, variantId: z.string().default("v001"), preset: z.enum(["720p", "1080p", "4k"]).optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const timeline = await readTimeline(input.projectDir);
    const outputPath = join(found.runDir, "renders", `preview-${input.variantId}.mp4`);
    const rendered = await renderTimeline({ projectDir: input.projectDir, timeline, outputPath, preset: input.preset ?? "720p" });
    await writeJson(join(found.runDir, "variants", input.variantId, "render-manifest.json"), { outputPath, renderedAt: new Date().toISOString(), timelineVersion: timeline.version });
    return asToolResult({ ...rendered, message: "Rendered ad variant." });
  });

  server.tool("validate_for_platform", "Validate a variant against a platform profile.", { ...slugSchema, platform: z.string(), durationSec: z.number(), aspectRatio: z.string() }, async (input) => {
    const result = validateForPlatform(input);
    const found = await findContentObject(input.projectDir, input.slug);
    await writeJson(join(found.runDir, "platform-validation.json"), result);
    return asToolResult(result);
  });

  server.tool("package_for_platform", "Create a platform package handoff.", { ...slugSchema, platform: z.string(), caption: z.string().optional(), renderPath: z.string().optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const content = createPlatformHandoff({ platform: input.platform, title: found.contentObject.title, renderPath: input.renderPath, caption: input.caption });
    const fileName = `${input.platform}-handoff.md`;
    const path = join(found.runDir, fileName);
    await writeFile(path, content, "utf8");
    return asToolResult({ path, message: "Created platform handoff." });
  });

  server.tool("score_ad_readiness", "Score ad readiness.", { text: z.string(), platformValidationPassed: z.boolean().optional() }, async (input) =>
    asToolResult(scoreAdReadinessText(input))
  );

  server.tool("provider_status", "Read provider status.", { provider: providerSchema.optional() }, async (input) =>
    asToolResult(input.provider ? await providerStatus(input.provider) : { providers: await allProviderStatuses() })
  );

  server.tool("provider_capabilities", "Read provider capabilities.", { provider: providerSchema }, async (input) =>
    asToolResult(await providerCapabilities(input.provider))
  );

  server.tool("provider_readiness_reminder", "Show ready providers and the local Codex work that can proceed without provider setup.", {}, async () =>
    asToolResult(await providerReadinessReminder())
  );

  server.tool("provider_auth_status", "Read provider OAuth and local secrets setup status.", { provider: providerSchema.optional(), path: z.string().optional() }, async (input) =>
    asToolResult(await providerAuthStatus(input.provider, input.path))
  );

  server.tool("provider_oauth_start", "Start provider OAuth guidance. The agent may open the official page in the browser for the user.", { provider: providerSchema, callbackUrl: z.string().optional() }, async (input) =>
    asToolResult(await startProviderOAuth(input))
  );

  server.tool("provider_secret_template", "Create a local provider secrets template outside project files.", { provider: providerSchema.optional(), path: z.string().optional() }, async (input) =>
    asToolResult(await createProviderSecretTemplate(input))
  );

  server.tool("get_creative_preferences", "Read saved creative preferences.", {}, async () =>
    asToolResult(await readCreativePreferences())
  );

  server.tool(
    "update_creative_preferences",
    "Update saved creative preferences.",
    {
      preferredProvider: providerSchema.optional(),
      aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
      platformTargets: z.array(z.string()).optional(),
      captionStyle: z.string().optional(),
      pacing: z.string().optional(),
      styleNotes: z.array(z.string()).optional(),
      safeZoneRules: z.array(z.string()).optional(),
      favoritePrompts: z.array(z.string()).optional()
    },
    async (input) => asToolResult(await updateCreativePreferences(input))
  );

  server.tool(
    "prepare_reference_asset",
    "Inspect and register a local or safe remote reference asset before provider generation.",
    { projectDir: z.string(), input: z.string(), copyIntoProject: z.boolean().optional() },
    async (input) => asToolResult(await prepareReferenceAsset(input))
  );

  server.tool(
    "enhance_asset_prompt",
    "Turn project intent, saved preferences, platform, and a rough note into a provider-ready creative prompt.",
    {
      projectDir: z.string(),
      prompt: z.string(),
      kind: z.string().optional(),
      platform: z.string().optional(),
      selectionId: z.string().optional()
    },
    async (input) =>
      asToolResult(
        enhanceAssetPrompt({
          ...input,
          projectIntent: await readProjectIntent(input.projectDir),
          preferences: await readCreativePreferences()
        })
      )
  );

  server.tool("generate_creative_asset", "Generate a creative asset through an available provider.", { projectDir: z.string().optional(), slug: z.string().optional(), provider: providerSchema, kind: z.enum(["avatar_video", "broll", "image", "video", "marketing_asset", "score"]), prompt: z.string(), model: z.string().optional(), actor: z.string().optional(), style: z.string().optional(), aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(), durationSec: z.number().int().positive().optional(), inputPath: z.string().optional(), referenceUrl: z.string().optional(), workflow: z.string().optional() }, async (input) => {
    const result = await runProviderGeneration(input);
    if (input.projectDir && input.slug) {
      const found = await findContentObject(input.projectDir, input.slug);
      await appendProvenance(found.runDir, {
        assetId: result.providerJobId ?? `provider_${Date.now()}`,
        sourceType: result.status === "completed" ? "generated" : "remote",
        provider: input.provider,
        providerJobId: result.providerJobId,
        model: input.model,
        prompt: input.prompt,
        inputAssets: input.inputPath ? [input.inputPath] : [],
        createdAt: new Date().toISOString(),
        rights: {
          commercialUseStatus: "unknown",
          containsLikeness: input.provider === "heygen",
          requiresAttribution: false
        }
      });
    }
    return asToolResult(result);
  });

  server.tool(
    "submit_creative_asset_job",
    "Submit a provider generation job and record it for later check or import.",
    { projectDir: z.string(), slug: z.string().optional(), provider: providerSchema, kind: z.enum(["avatar_video", "broll", "image", "video", "marketing_asset", "score"]), prompt: z.string(), model: z.string().optional(), actor: z.string().optional(), style: z.string().optional(), aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(), durationSec: z.number().int().positive().optional(), inputPath: z.string().optional(), referenceUrl: z.string().optional(), workflow: z.string().optional() },
    async (input) => asToolResult(await submitCreativeAssetJob(input))
  );

  server.tool(
    "get_creative_asset_job",
    "Read a recorded provider generation job.",
    { projectDir: z.string(), jobId: z.string() },
    async (input) => asToolResult(await readCreativeAssetJob(input.projectDir, input.jobId))
  );

  server.tool(
    "import_creative_asset_job",
    "Import a completed or manually downloaded provider job into a content object.",
    { projectDir: z.string(), slug: z.string(), jobId: z.string(), assetPath: z.string().optional() },
    async (input) => asToolResult(await importCreativeAssetJob(input))
  );

  server.tool(
    "import_comfyui_workflow",
    "Register a ComfyUI workflow for local generation.",
    { name: z.string(), workflowPath: z.string() },
    async (input) => asToolResult(await importComfyUiWorkflow(input))
  );

  server.tool("list_comfyui_workflows", "List registered ComfyUI workflows.", {}, async () =>
    asToolResult(await listComfyUiWorkflows())
  );

  server.tool("get_comfyui_workflow", "Read a registered ComfyUI workflow.", { name: z.string() }, async (input) =>
    asToolResult(await getComfyUiWorkflow(input.name))
  );

  server.tool("import_generated_asset", "Record a generated asset in a content object.", { ...slugSchema, assetId: z.string(), provider: z.string(), assetPath: z.string().optional(), resultUrl: z.string().optional(), prompt: z.string().optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const provenance = await appendProvenance(found.runDir, {
      assetId: input.assetId,
      sourceType: "generated",
      provider: input.provider,
      prompt: input.prompt,
      inputAssets: [],
      assetPath: input.assetPath,
      resultUrl: input.resultUrl,
      createdAt: new Date().toISOString(),
      rights: { commercialUseStatus: "unknown", containsLikeness: false, requiresAttribution: false }
    });
    return asToolResult({ provenance, message: "Recorded generated asset." });
  });

  server.tool("score_finished_video", "Ask a provider to score a finished video.", { provider: providerSchema.default("higgsfield"), videoPath: z.string(), prompt: z.string().optional() }, async (input) =>
    asToolResult(await runProviderGeneration({ provider: input.provider, kind: "score", prompt: input.prompt ?? "Analyze hook strength, attention, retention, and viral potential.", inputPath: input.videoPath }))
  );

  server.tool("get_asset_provenance", "Read provenance for a content object.", slugSchema, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const path = join(found.runDir, "provenance.json");
    return asToolResult({ path, provenance: JSON.parse(await readFile(path, "utf8")) });
  });

  server.tool("export_repro_bundle", "Export a reproducible library bundle.", { ...slugSchema, visibility: z.enum(["private", "public"]).optional(), redact: z.boolean().optional() }, async (input) =>
    asToolResult(await exportReproBundle(input))
  );

  server.tool("publish_to_library", "Prepare a content object for the library.", { ...slugSchema, visibility: z.enum(["private", "public"]).optional(), redact: z.boolean().optional() }, async (input) =>
    asToolResult(await publishToLibrary(input))
  );

  server.tool("pull_library_template", "Prepare a library template pull.", { libraryId: z.string() }, async (input) =>
    asToolResult(pullLibraryTemplate(input.libraryId))
  );

  server.tool("remix_library_video", "Prepare remix instructions from a library video.", { libraryId: z.string() }, async (input) =>
    asToolResult(remixLibraryVideo(input.libraryId))
  );

  server.tool("import_performance_feedback", "Import performance feedback.", { projectDir: z.string(), slug: z.string(), title: z.string(), content: z.string() }, async (input) =>
    asToolResult(await addFeedback(input.projectDir, input.title || input.slug, input.content))
  );

  server.tool("rank_winners", "List winner candidates from feedback store.", { projectDir: z.string() }, async (input) =>
    asToolResult({ winners: await listStoreItems(input.projectDir, "winners"), feedback: await listStoreItems(input.projectDir, "feedback") })
  );

  server.tool("promote_winner_to_store", "Promote a content object to winners.", { ...slugSchema, note: z.string().optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    return asToolResult(await addStoreItem(input.projectDir, "winners", found.contentObject.title, input.note ?? `Winner: ${found.contentObject.slug}`));
  });

  server.tool("create_social_post_brief", "Create a social post brief.", { ...slugSchema, thesis: z.string(), reader: z.string(), proof: z.string().optional(), angle: z.string().optional(), format: z.string().optional() }, async (input) => {
    const found = await findContentObject(input.projectDir, input.slug);
    const path = join(found.runDir, "social-post-brief.md");
    await writeFile(path, createSocialPostBrief(input), "utf8");
    return asToolResult({ path, message: "Created social post brief." });
  });

  server.tool(
    "social_bot_setup_checklist",
    "Create the owner-safe setup checklist for an automated X account.",
    { projectDir: z.string(), botHandle: z.string().optional(), ownerHandle: z.string().optional() },
    async (input) => asToolResult(await createSocialBotWorkspace(input))
  );

  server.tool(
    "social_bot_verify_label",
    "Record whether the bot account has an owner disclosure and automated-account label.",
    {
      projectDir: z.string(),
      botHandle: z.string().optional(),
      ownerHandle: z.string().optional(),
      bio: z.string().optional(),
      labelText: z.string().optional()
    },
    async (input) => asToolResult(await verifyLabel(input))
  );

  server.tool(
    "social_bot_connect_x",
    "Prepare official X API connection instructions without automating the X website.",
    {
      projectDir: z.string(),
      botHandle: z.string().optional(),
      ownerHandle: z.string().optional(),
      appName: z.string().optional(),
      callbackUrl: z.string().optional()
    },
    async (input) => asToolResult(await connectX(input))
  );

  server.tool(
    "social_bot_draft",
    "Create an approval-gated social bot draft.",
    { projectDir: z.string(), text: z.string(), media: z.array(z.string()).optional(), notes: z.string().optional() },
    async (input) => asToolResult(await createDraft(input))
  );

  server.tool(
    "social_bot_publish",
    "Prepare or publish an approved social bot draft through official X API only.",
    { projectDir: z.string(), draftId: z.string().optional(), requiresApproval: z.boolean(), approve: z.boolean().optional() },
    async (input) => asToolResult(await publishDraft(input))
  );

  server.tool(
    "social_bot_metrics",
    "Record or list social bot performance metrics.",
    {
      projectDir: z.string(),
      tweetId: z.string().optional(),
      impressions: z.number().int().nonnegative().optional(),
      likes: z.number().int().nonnegative().optional(),
      reposts: z.number().int().nonnegative().optional(),
      replies: z.number().int().nonnegative().optional(),
      bookmarks: z.number().int().nonnegative().optional(),
      clicks: z.number().int().nonnegative().optional(),
      notes: z.string().optional()
    },
    async (input) => asToolResult(await recordOrListMetrics(input))
  );
}
