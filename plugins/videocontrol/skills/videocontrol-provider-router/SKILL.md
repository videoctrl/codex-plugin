---
name: videocontrol-provider-router
description: Route creative work to VideoControl, HeyGen, Higgsfield, scheduler, and ads providers without exposing provider setup details to the user.
---

Choose the provider by creative need.

HeyGen:
- avatar videos
- presenter videos
- founder intros
- talking-head explainers
- personalized outreach

Higgsfield:
- cinematic b-roll
- product shots
- marketing assets
- image-to-video
- model-based creative generation
- finished-video scoring

Agent Media:
- UGC-style actor videos
- SaaS review videos
- talking-head ad variants
- animated subtitles
- actor browsing
- job download

ComfyUI:
- local image generation
- registered workflow runs
- reference-image workflows
- product shots when the user wants local generation

Local VideoControl:
- timeline assembly
- imports
- trims
- captions
- previews
- exports
- contact sheets
- provenance
- platform packages

Meta, TikTok, or ads MCP:
- launch
- performance readback
- scaling

Postiz or scheduler:
- scheduling approved social posts
- uploading approved media for platform-safe URLs
- integration discovery
- post and platform analytics

Never call raw HeyGen HTTP endpoints. Use the installed app surface or CLI. If a provider is not installed or signed in, return setup guidance and write the handoff/provenance record.

Use Agent Media when the user wants creator-style UGC, actor-led SaaS reviews, or generated talking-head ad variants. Require an actor for UGC generation; if the user has not picked one, ask them to choose from `agent-media actor list` or return setup guidance.

Provider connection behavior:
- Start with `provider_readiness_reminder` so the user knows what Codex can do now.
- Prefer OAuth or the provider's official browser/app sign-in flow.
- Use `provider_auth_status` before asking the user for setup work.
- Use `provider_oauth_start` to prepare the official provider sign-in page.
- If the Codex browser is available, you may open the provider's official OAuth or sign-in page for the user and guide them through the setup.
- The user must enter credentials and approve consent in the provider page. Do not ask the user to paste passwords into chat.
- If OAuth is not available, use `provider_secret_template` to create a local secrets file at `~/.videocontrol/secrets/providers.local.json`.
- Never write provider secrets into a VideoControl project, run folder, content object, provenance file, handoff file, or library bundle.
- Never print secrets. Report only whether a provider is connected or setup is still required.

Generated media workflow:
- Use `update_creative_preferences` when the user gives reusable provider, platform, aspect ratio, caption, pacing, visual style, or safe-zone direction.
- Use `prepare_reference_asset` before sending product screenshots, logos, founder photos, previous ads, or other references to a provider.
- Use `enhance_asset_prompt` before calling a generator unless the user has already provided a provider-ready prompt.
- Use `submit_creative_asset_job` for slow image or video generation. Do not retry a timed-out job blindly; read the recorded job and check the provider surface.
- Use `import_creative_asset_job` after the generated asset is ready or downloaded. Then refresh `get_project_review` so the asset has a review selection id.
- For ComfyUI, register workflows with `import_comfyui_workflow`, then generate with provider `comfyui` and a workflow name.

Codex is the default workspace. Hermes or another MCP host may be used only as an optional experiment; still keep Codex project intent, review selections, and content objects as the record of the work.
