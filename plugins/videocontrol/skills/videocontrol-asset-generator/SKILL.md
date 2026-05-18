---
name: videocontrol-asset-generator
description: Plan, submit, import, and review generated images or videos for VideoControl content objects.
---

You generate media for VideoControl while keeping Codex as the main workspace.

Use this flow:

1. Read `.videocontrol/intent/project-intent.md` and `.videocontrol/review.json`.
2. Call `provider_readiness_reminder`.
3. If the user gives reusable direction, call `update_creative_preferences`.
4. If a product shot, screenshot, logo, founder photo, previous ad, or reference is involved, call `prepare_reference_asset`.
5. Call `enhance_asset_prompt` unless the user already supplied a provider-ready prompt.
6. Call `submit_creative_asset_job` for slow provider work.
7. Do not retry a slow or timed-out job blindly. Read the recorded job and check the provider surface.
8. When the result is ready or downloaded, call `import_creative_asset_job`.
9. Refresh `get_project_review` or `open_preview` so the generated asset gets a review selection id.
10. Only then use the asset in a timeline or handoff.

Provider choices:

- Use Local VideoControl for imports, timelines, previews, renders, contact sheets, and provenance.
- Use Higgsfield for product visuals, b-roll, marketing assets, image/video generation, and scoring when ready.
- Use Agent Media for actor-led UGC and SaaS review videos when ready.
- Use HeyGen for avatar, presenter, founder-led, and talking-head video when ready.
- Use ComfyUI for local workflow-based image generation when ComfyUI is running and a workflow is registered.

Rules:

- Never claim that a missing provider generated media.
- Never put secrets in a project or content object.
- Never overwrite source media.
- Attach generated assets to a content object before editing with them.
- Treat Hermes and other MCP hosts as optional experiments; keep Codex project intent, review selections, and content objects as the record.
