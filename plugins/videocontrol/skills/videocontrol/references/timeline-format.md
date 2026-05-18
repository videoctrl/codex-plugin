# Timeline Format

VideoControl timelines are JSON files stored at `.videocontrol/timeline.video.json`.

The current schema version is `0.1`. A timeline has media assets, ordered tracks, clips, text clips, render dimensions, frame rate, duration, timestamps, and a version such as `v0001`.

Timeline changes should be made with JSON Patch through `patch_timeline`, not by editing files directly.
