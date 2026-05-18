import { describe, expect, it } from "vitest";
import { scoreAdReadiness, scoreBookmarkability, runAvoidSlopCheck, runViralPostmortem } from "./index.js";

describe("creative verification", () => {
  it("scores bookmarkability rows", () => {
    const result = scoreBookmarkability("This saves the reader a future task with proof and a reusable takeaway for operators.");
    expect(result.total).toBeGreaterThanOrEqual(5);
    expect(result.max).toBe(12);
  });

  it("flags avoid-slop terms", () => {
    const result = runAvoidSlopCheck("This is a revolutionary way to unlock growth.");
    expect(result.passed).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it("requires exact lines in the postmortem", () => {
    const result = runViralPostmortem("Hook\nCredibility\nScreenshot\nSave\nReply");
    expect(result.hookMove.line).toBe(1);
    expect(result.replyShareTrigger.line).toBe(5);
  });

  it("scores ad readiness", () => {
    const result = scoreAdReadiness({ text: "hook offer proof CTA brand visual platform", platformValidationPassed: true });
    expect(result.max).toBe(16);
  });
});
