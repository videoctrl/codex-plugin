import { describe, expect, it } from "vitest";
import { applyTimelinePatch } from "./jsonPatch.js";
import { Timeline } from "./schema.js";
import { createInitialTimeline, nextVersion } from "./versioning.js";
import { validateTimeline } from "./validate.js";

function sampleTimeline(): Timeline {
  return {
    ...createInitialTimeline({
      projectId: "test-project",
      name: "Test Project",
      now: "2026-05-13T00:00:00.000Z"
    }),
    durationSec: 5,
    assets: [
      {
        id: "a_video",
        kind: "video",
        path: "raw/test.mp4",
        durationSec: 5,
        width: 1280,
        height: 720,
        fps: 30,
        metadata: {}
      }
    ],
    clips: [
      {
        id: "c1",
        assetId: "a_video",
        trackId: "v1",
        startSec: 0,
        durationSec: 2,
        sourceInSec: 0,
        sourceOutSec: 2,
        locked: false,
        muted: false,
        effects: []
      }
    ]
  };
}

describe("timeline validation", () => {
  it("accepts a valid timeline", () => {
    const result = validateTimeline(sampleTimeline());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("catches missing asset references", () => {
    const timeline = sampleTimeline();
    timeline.clips[0].assetId = "missing";
    const result = validateTimeline(timeline);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("missing asset");
  });

  it("catches same-track overlaps", () => {
    const timeline = sampleTimeline();
    timeline.clips.push({
      id: "c2",
      assetId: "a_video",
      trackId: "v1",
      startSec: 1,
      durationSec: 2,
      sourceInSec: 2,
      sourceOutSec: 4,
      locked: false,
      muted: false,
      effects: []
    });
    const result = validateTimeline(timeline);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("overlapping clips");
  });
});

describe("timeline versioning", () => {
  it("increments version labels", () => {
    expect(nextVersion("v0001")).toBe("v0002");
    expect(nextVersion("v0099")).toBe("v0100");
  });

  it("dry runs patch validation without advancing the version", () => {
    const timeline = sampleTimeline();
    const result = applyTimelinePatch(timeline, [{ op: "replace", path: "/name", value: "Dry Run" }], { dryRun: true });
    expect(result.accepted).toBe(true);
    expect(result.timeline?.version).toBe("v0001");
  });

  it("accepted patches create one new version", () => {
    const timeline = sampleTimeline();
    const result = applyTimelinePatch(timeline, [{ op: "replace", path: "/name", value: "Updated" }], {
      now: "2026-05-13T00:01:00.000Z"
    });
    expect(result.accepted).toBe(true);
    expect(result.timeline?.version).toBe("v0002");
    expect(result.timeline?.updatedAt).toBe("2026-05-13T00:01:00.000Z");
  });
});
