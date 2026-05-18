# VideoControl Agent Guide

## Done Means

Before replying to a user, decide what done means for their request. Use that as a checklist. When possible, run the relevant command, inspect the output, and fix anything obvious before reporting back.

For docs-only work, done usually means the copy is updated, the files are readable, and any setup claims match the current commands.

## How To Work In This Repo

- Report back in plain English. Explain what changed and what happened without low-level implementation detail.
- Never read `.env` files. Reading `.env.example` is fine.
- For user-facing copy, avoid builder language. Do not mention how the product is built.
- When changing CLI or API behavior, update the contract YAML first.
- For frontend text, use `GeistPixel-Circle.woff2` for titles and `GeistPixel-Square.woff2` for normal text. Copy them from `/Users/sean/Documents/regent/regent-brand/geist-font/GeistPixel/webfonts` into the app's public assets.
- For Python work, use `uv`.
- For CLI work, use the `rich-terminal-output` skill.
- Keep the current shape simple. Do not add compatibility branches, aliases, old-shape handling, or tests for legacy shapes.
- Prefer deleting dead code and stale comments over preserving old paths.
- Git commits after testing are okay. Do not push unless the user asks.

## Product Promise

VideoControl helps Codex create, review, package, and learn from video ads and social content.

Keep the workflow local-first, approval-aware, and honest about what is connected on the machine.

## Default Workflow

1. Check the project and provider status.
2. Create or open a VideoControl project.
3. Read or create `.videocontrol/intent/project-intent.md` and `.videocontrol/review.json`.
4. Create or open a content object.
5. Choose the route: original, repurpose, rewrite, research_ideate, competitor_ad_variant, paid_ad_batch, or social_share.
6. Write the brief, script, shot list, and asset plan.
7. Check provider readiness before requesting generated assets.
8. Prepare reference assets and improve prompts before live provider generation.
9. Submit long-running provider work as recorded jobs, then import finished assets into the content object.
10. Assemble the timeline or variants.
11. Validate before rendering.
12. Render a preview before a final export.
13. Run verification checks.
14. Write the platform handoff.
15. Record feedback and promote winners when results are known.

## First-Time Installer Guidance

Tell new users:

- VideoControl does not need them to run a backend server for the plugin itself.
- Codex starts the local VideoControl tool process when the plugin is used.
- FFmpeg and ffprobe are required for previews, contact sheets, and renders.
- External providers are optional. Missing providers should not block local editing.
- Codex is the primary workspace. Hermes or other MCP hosts are optional experiments and should still keep Codex project intent, review files, and content objects as the record of the work.
- Local plugin installs are cached, so repo changes require `pnpm plugin:local` and a Codex restart.
- The easiest first-run command is `pnpm videocontrol setup`.
- The clearest readiness check is `pnpm videocontrol doctor`.

## First-Time Reviewer Checklist

When reviewing a VideoControl run, check that it:

- creates or opens a content object before serious creative work
- reads project intent before follow-up creative work
- inspects media before editing
- does not overwrite source media
- validates after timeline changes
- previews before final export
- keeps the brief, timeline, render, source record, verification, handoff, and feedback together
- imports generated provider results before using them in a timeline
- never claims a missing provider generated an asset
- stops before publishing, scheduling, or launching ads unless the user approved it

## Hard Rules

- Inspect media before editing it.
- Never overwrite source media.
- Keep each ad, post, campaign, or variant in a content object.
- Create a new timeline version for edits.
- Validate after timeline changes.
- Preview before final export.
- Do not mark work approved without a verification record.
- Do not publish or schedule without clear user approval.
- Do not fake provider output.
- Do not put secrets in project files, content objects, handoffs, provenance, or library bundles.
- Use official provider sign-in and official APIs. Do not automate the X website.

## Provider Routing

| Provider | Use for |
| --- | --- |
| Local VideoControl | Timelines, imports, previews, renders, contact sheets, provenance, and review console. |
| HeyGen | Avatar, presenter, founder-led, sales, and talking-head videos when the app or CLI is available. |
| Higgsfield | Visual generation, b-roll, product shots, marketing assets, image/video generation, and finished-video scoring when available. |
| Agent Media | UGC-style actor videos, SaaS review videos, subtitles, actor browsing, and downloads when available. |
| ComfyUI | Local workflow-based image generation when ComfyUI is running and a workflow is registered. |
| Postiz | Scheduling handoff, media upload, integration discovery, and analytics when available. |
| Meta MCP | Ad launch handoff, performance readback, and winner scaling. |
| X / Twitter | Social bot setup, owner-label checks, approval-gated drafts, and metrics through the official API path. |

When a provider is missing or not signed in, say that plainly. Still prepare the brief, asset plan, timeline, handoff, or provenance file if useful. Stop before claiming that an external asset was generated.

Suggested wording:

```text
Higgsfield is not connected on this machine yet. I can still prepare the brief, shot list, timeline, and handoff now. To run generation live, install and sign in to the Higgsfield CLI, then rerun provider status.
```

## Provider Setup

Browser sign-in is preferred. Open the provider's official sign-in page in the Codex browser when that makes the user's setup easier.

Local secrets files are allowed only in the private VideoControl secrets location:

```text
~/.videocontrol/secrets/providers.local.json
```

Useful commands:

```bash
pnpm exec videocontrol doctor
pnpm exec videocontrol setup
pnpm exec videocontrol provider auth status
pnpm exec videocontrol provider auth oauth --provider higgsfield
pnpm exec videocontrol provider auth secret-template --provider heygen
pnpm exec videocontrol provider list
pnpm exec videocontrol provider readiness
pnpm exec videocontrol provider status higgsfield
pnpm exec videocontrol preferences update --provider higgsfield --platform meta-reels --aspect 9:16
pnpm exec videocontrol reference prepare --project ./project --input ./product-shot.png
pnpm exec videocontrol prompt enhance --project ./project --platform meta-reels --prompt "Product hero image"
pnpm exec videocontrol provider submit --project ./project --slug demo --provider higgsfield --kind image --prompt "Proof-led product hero"
pnpm exec videocontrol provider job --project ./project --job job_123
pnpm exec videocontrol provider import-job --project ./project --slug demo --job job_123 --asset ./generated.png
pnpm exec videocontrol provider comfyui import --name product-hero --workflow ./workflow.json
```

## Social Bot Rules

VideoControl can help create an owner-approved X social bot flow. It must use the official API path and require approval before publishing.

Use:

```bash
pnpm exec videocontrol social-bot setup-checklist --bot @my_bot --owner @me
pnpm exec videocontrol social-bot verify-label --bio "Automated account managed by @me." --label "@my_bot is automated"
pnpm exec videocontrol social-bot connect-x --app "VideoControl Social Bot"
pnpm exec videocontrol social-bot draft --text "Post copy"
pnpm exec videocontrol social-bot approve <draft-id>
pnpm exec videocontrol social-bot publish <draft-id> --requires-approval
pnpm exec videocontrol social-bot metrics --tweet-id 123 --impressions 1000 --likes 25
```

## Good First Prompts

```text
@videocontrol check provider status, create a test video project, render a tiny preview, and tell me what is ready.
```

```text
@videocontrol create a content object for a 30-second product demo ad, write the brief, make a script, assemble a preview cut, and verify it.
```

```text
@videocontrol turn this brief into three short video variants with hooks, captions, and platform handoff files.
```

## Useful Local Commands

```bash
pnpm build
pnpm test
pnpm check:prereqs
pnpm videocontrol doctor
pnpm videocontrol setup
pnpm plugin:local
pnpm smoke
pnpm smoke:creative-os
pnpm smoke:social-bot
pnpm dev:preview
pnpm mcp
pnpm exec videocontrol help
pnpm exec videocontrol intent update --note "Keep this direction."
pnpm exec videocontrol provider readiness
pnpm exec videocontrol preferences show
pnpm exec videocontrol reference prepare --project ./project --input ./product-shot.png
pnpm exec videocontrol prompt enhance --project ./project --prompt "Product hero image"
```

Run `pnpm plugin:local` after plugin changes, then restart Codex. Codex uses an installed copy of the plugin, so the Plugins UI will not always reflect repo edits until the local plugin is refreshed.
