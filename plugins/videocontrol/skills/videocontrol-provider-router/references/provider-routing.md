# Provider Routing

Use Codex as the main workspace. Use HeyGen for presenters, Higgsfield for generated visual assets, Agent Media for UGC, ComfyUI for local workflow image generation, local VideoControl for assembly and rendering, ads providers for launch and reporting, and schedulers for approved post scheduling.

| Provider | Current role |
| --- | --- |
| Local VideoControl | Working now: timeline, imports, FFmpeg previews, renders, contact sheets, provenance |
| HeyGen | Avatar/presenter/talking-head video generation when HeyGen app or CLI is available |
| Higgsfield | Generated visuals, b-roll, marketing assets, image/video generation, scoring when CLI/MCP is available |
| Agent Media | UGC-style actor videos, SaaS review videos, subtitles, actor browsing, and job downloads when `agent-media` is available |
| ComfyUI | Local workflow-based image generation when ComfyUI is running and a workflow is registered |
| Postiz | Approved social scheduling, media upload, integration discovery, and analytics when the Postiz CLI is available |
| Meta MCP | Handoff target for ad launch, performance readback, winner scaling |
| X / Twitter | Social-bot setup, owner-label verification, drafts, approval handoff, metrics; official API only |

## Agent Media Routing

Use Agent Media for creator-style UGC videos, actor-led SaaS reviews, generated talking-head ad variants, subtitles, and downloads from completed jobs.

Install:

```bash
npm install -g agent-media-cli
agent-media login
```

Rules:
- Prefer Agent Media for UGC-style creator ads.
- Require an actor for UGC generation.
- Use Higgsfield for standalone b-roll, image generation, and finished-video scoring.
- Use Postiz after rendering or generation when the user wants scheduling, upload, integration discovery, or analytics.

## Generated Media Flow

1. Run `provider_readiness_reminder`.
2. Save reusable direction with `update_creative_preferences`.
3. Register product shots, screenshots, logos, founder photos, previous ads, or references with `prepare_reference_asset`.
4. Improve rough prompts with `enhance_asset_prompt`.
5. Submit slow provider work with `submit_creative_asset_job`.
6. Read the recorded job instead of retrying blindly.
7. Import the result with `import_creative_asset_job`.
8. Refresh `get_project_review` so the asset appears as a selectable review item.

For ComfyUI, register workflows with `import_comfyui_workflow`, list them with `list_comfyui_workflows`, and submit jobs with provider `comfyui` plus a workflow name.

## Provider Connection

OAuth is preferred. The agent may open the provider's official OAuth or sign-in page in the Codex browser and guide the user through setup. The user completes login and consent on the provider page.

Local secrets files are also supported for providers that need manual credentials. Create the template with `provider_secret_template`. The default path is `~/.videocontrol/secrets/providers.local.json`.

Rules:
- Do not ask for passwords in chat.
- Do not write secrets into project files.
- Do not include secrets in provenance, handoff files, library bundles, or feedback logs.
- Do not print secrets back to the user.
- Report connection state as connected, setup required, or handoff only.
