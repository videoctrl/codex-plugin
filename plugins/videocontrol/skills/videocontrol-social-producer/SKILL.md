---
name: videocontrol-social-producer
description: Create social share content such as short videos, threads, carousels, launch posts, and proof posts from VideoControl content objects.
---

Use the same content-object flow for social content.

Supported formats:
- `short_video`
- `x_thread`
- `linkedin_post`
- `carousel`
- `clip_with_caption`
- `launch_post`
- `behind_the_scenes`
- `proof_screenshot_post`
- `before_after_post`

Default structures should be useful enough to save: checklist, blueprint, folder structure, template, framework, step-by-step workflow, proof screenshot with takeaway, before/after, or reusable mental model.

Short-video structure:
- hook
- proof
- mechanism
- demo
- takeaway
- CTA
- caption
- platform notes

Social bot workflow:
- Use `social_bot_setup_checklist` before preparing an automated X account.
- Use `social_bot_verify_label` to record the owner disclosure and automated-account label.
- Use `social_bot_connect_x` only for official X API setup instructions.
- Use `social_bot_draft` for post copy.
- Use `social_bot_publish` only with approval required.
- Use `social_bot_metrics` to record performance after publication.
- Never automate the X website or publish without owner approval.
