---
name: videocontrol-timeline-editor
description: Edit VideoControl timelines, previews, contact sheets, render outputs, and version comparisons.
---

Use timeline patches for edits. Inspect assets first, validate after changes, preview before rendering, and never overwrite source media.

Prefer small reviewable changes:
- `get_project_review`
- `get_timeline`
- `patch_timeline`
- `validate_timeline`
- `preview_range`
- `render_export`
- `list_versions`
- `compare_versions`

Use `.videocontrol/review.json` selection ids when a user points at a specific clip, caption, variant, or handoff. If the feedback should carry into later work, record it with `update_project_intent`.
