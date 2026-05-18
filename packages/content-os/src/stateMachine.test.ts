import { describe, expect, it } from "vitest";
import { assertTransitionAllowed } from "./stateMachine.js";

describe("state machine", () => {
  it("allows defined forward movement", () => {
    expect(() => assertTransitionAllowed("captured", "idea_review")).not.toThrow();
  });

  it("rejects undefined jumps", () => {
    expect(() => assertTransitionAllowed("captured", "approved")).toThrow();
  });
});
