import { describe, it, expect } from "vitest";
import { validateIncomingMessage } from "../src/bridge/messageValidator";

describe("messageValidator", () => {
  it("accepts a valid ready message", () => {
    const result = validateIncomingMessage({ type: "app.ready", id: "r1", payload: { version: "0.1.0" } });
    expect(result.ok).toBe(true);
  });

  it("rejects unknown message types", () => {
    const result = validateIncomingMessage({ type: "evil.command", id: "r2" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Invalid message envelope/);
  });

  it("rejects invalid route in navigate", () => {
    const result = validateIncomingMessage({ type: "app.navigate", id: "r3", payload: { route: "../escape" } });
    expect(result.ok).toBe(false);
  });

  it("accepts valid route in navigate", () => {
    const result = validateIncomingMessage({ type: "app.navigate", id: "r4", payload: { route: "skills-studio" } });
    expect(result.ok).toBe(true);
  });

  it("rejects malformed settings.update", () => {
    const result = validateIncomingMessage({ type: "settings.update", id: "r5", payload: { settings: "not-an-object" } });
    expect(result.ok).toBe(false);
  });

  it("rejects missing id", () => {
    const result = validateIncomingMessage({ type: "app.ready" });
    expect(result.ok).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = validateIncomingMessage("not-a-message");
    expect(result.ok).toBe(false);
  });

  it("accepts skills.validate with skill payload", () => {
    const result = validateIncomingMessage({ type: "skills.validate", id: "r6", payload: { skill: { id: "x" } } });
    expect(result.ok).toBe(true);
  });

  it("rejects skills.validate without a skill object", () => {
    const result = validateIncomingMessage({ type: "skills.validate", id: "r7", payload: { skill: "nope" } });
    expect(result.ok).toBe(false);
  });

  it("accepts skills.history with an id", () => {
    const result = validateIncomingMessage({ type: "skills.history", id: "r8", payload: { id: "skill-a" } });
    expect(result.ok).toBe(true);
  });

  it("accepts skills.diff with id and skill", () => {
    const result = validateIncomingMessage({ type: "skills.diff", id: "r9", payload: { id: "skill-a", skill: { id: "skill-a" } } });
    expect(result.ok).toBe(true);
  });

  it("rejects skills.diff with missing skill", () => {
    const result = validateIncomingMessage({ type: "skills.diff", id: "r10", payload: { id: "skill-a" } });
    expect(result.ok).toBe(false);
  });
});
