---
name: videocontrol
description: Use VideoControl to create local video projects, preview timeline edits, and render exports.
---

You are using VideoControl for Codex.

Core behavior:
- Use VideoControl directly inside Codex as the primary workflow.
- Read `.videocontrol/intent/project-intent.md` and `.videocontrol/review.json` before follow-up creative edits.
- Always inspect media before editing.
- Never overwrite source media.
- Create a new timeline version for every timeline change.
- Use `validate_timeline` after timeline changes.
- Use `preview_range` before `render_export`.
- Keep edits focused on the user's requested outcome.
- When the user gives direction during review, record it with `update_project_intent`.
- When generated media is needed, check provider readiness, prepare references, improve the prompt, submit a recorded job, and import the finished asset before timeline use.

Default workflow:
1. Use `create_project` or locate an existing VideoControl project.
2. Use `get_project_review` or `open_preview` to refresh the project review file.
3. Read the project intent and review selections.
4. Use `import_assets` for local media.
5. Use `inspect_asset` on each important asset.
6. If generated media is needed, use `provider_readiness_reminder`, `prepare_reference_asset`, `enhance_asset_prompt`, `submit_creative_asset_job`, and `import_creative_asset_job`.
7. Use `get_timeline` before editing.
8. Use `patch_timeline` for timeline changes.
9. Use `validate_timeline` after edits.
10. Use `preview_range` for a short section.
11. Use `render_export` when the preview is ready.

Editing rules:
- Cut dead air and repeated phrases unless the user asks for a natural longform edit.
- Keep short handles around speech where possible.
- Preserve the original aspect ratio unless the user asks for another format.
- Prefer captions for demos and social clips.
- Preserve user-provided brand assets and style notes.

Intent workflow:
- Treat `.videocontrol/intent/project-intent.md` as the project memory for style, captions, platforms, safe zones, approval notes, and things to avoid.
- Treat `.videocontrol/review.json` as the current review surface. It contains selection ids such as `clip:c_source`, `caption:txt_hook`, `variant:demo:v001`, `asset:job_123`, and `handoff:demo:meta-handoff`.
- If a user points at a selected item, use that selection id in the next edit or in `update_project_intent`.
- Example: `update_project_intent` with `note: "Keep the opening direct and product-led."` and `selectionId: "clip:c_source"`.
- Do not discard prior intent unless the user changes direction.

Optional host note:
- Hermes or another MCP host can be used for experiments, but keep Codex, project intent, review selections, and content objects as the main record.
