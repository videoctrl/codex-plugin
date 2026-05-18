# VideoControl for Codex

VideoControl helps Codex create local video projects, inspect media, build timelines, preview sections, render variants, verify creative output, and package video ads or social content for handoff.

## Install as a Local Codex Plugin

Until Codex has a self-publishing path for this plugin, install it from a cloned repo:

```bash
git clone https://github.com/videoctrl/codex-plugin.git videocontrol
cd videocontrol
corepack enable
pnpm install
pnpm build
pnpm plugin:local
pnpm check:prereqs
```

If you are working from a fork, use your fork URL instead.

If Codex still cannot see the local marketplace, run this from inside the cloned repo:

```bash
codex plugin marketplace add "$(pwd)"
```

Then restart Codex, open Plugins, choose **VideoControl Local**, install **VideoControl for Codex**, and start a new thread with `@videocontrol`.

Try this first:

```text
@videocontrol check provider readiness, create a test video project, render a tiny preview, and tell me what is ready.
```

VideoControl does not need you to run a backend server for the plugin itself. Codex starts the local VideoControl tool process when the plugin is used. FFmpeg and ffprobe are required for previews, contact sheets, and renders.

VideoControl works locally without API keys. Optional provider keys should stay out of project files. Use browser sign-in when available, or create the private provider secrets file with:

```bash
pnpm exec videocontrol provider auth secret-template
```

That file lives at `~/.videocontrol/secrets/providers.local.json`. The repo also includes `.env.example` for local shell settings such as preview port, ComfyUI URL, Agent Media key, or Postiz key. Copy it to `.env` only for your own machine, and never commit `.env`.

VideoControl stores project direction in `.videocontrol/intent/` and writes `.videocontrol/review.json` for the preview console. Agents should read those files before later edits so clips, captions, generated assets, variants, and handoffs keep the same direction.

To check readiness later, run:

```bash
pnpm videocontrol doctor
```

To record a new direction from review:

```bash
pnpm exec videocontrol intent update --project ./project --selection clip:c_intro --note "Keep the opening direct and product-led."
```

After pulling repo changes, run `pnpm install`, `pnpm build`, and `pnpm plugin:local`, then restart Codex so the installed local plugin copy is refreshed.

## Generated Media in Codex

Use Codex as the main workspace. Before generation, check `provider_readiness_reminder`, prepare reference media with `prepare_reference_asset`, improve rough prompts with `enhance_asset_prompt`, and submit slow provider work with `submit_creative_asset_job`. When the provider result is ready or downloaded, use `import_creative_asset_job` so the asset appears in `.videocontrol/review.json`.

Saved creative preferences live outside project files and can remember provider, platform, aspect ratio, caption style, pacing, style notes, safe-zone notes, and favorite prompts.

ComfyUI is optional. If it is running locally, register a workflow with:

```bash
pnpm exec videocontrol provider comfyui import --name product-hero --workflow ./workflow.json
```

Hermes or another MCP host may be used for experiments, but the normal flow should keep Codex, project intent, review selections, and content objects as the record of the work.

## Provider Roles

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
