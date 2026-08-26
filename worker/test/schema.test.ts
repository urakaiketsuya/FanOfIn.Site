import { describe, expect, it } from "vitest";
import fixture from "./fixtures/game-submission-v1.json";
import { gameSubmissionV1Schema } from "../src/schema";

function cloneFixture(): Record<string, unknown> {
  return structuredClone(fixture) as Record<string, unknown>;
}

describe("Grand Archive game submission v1", () => {
  it("accepts the contract fixture", () => {
    expect(gameSubmissionV1Schema.safeParse(cloneFixture()).success).toBe(true);
  });

  it("accepts a pasted Clarent decklist in the legacy deckLink field", () => {
    const payload = cloneFixture();
    const players = payload.players as Record<string, Record<string, unknown>>;
    players["1"].deckLink = "# Material Deck\n1 Lorraine, Wandering Warrior\n\n# Main Deck\n4 Fireball";
    expect(gameSubmissionV1Schema.safeParse(payload).success).toBe(true);
  });

  it("rejects an oversized pasted decklist", () => {
    const payload = cloneFixture();
    const players = payload.players as Record<string, Record<string, unknown>>;
    players["1"].deckLink = "x".repeat(32_769);
    expect(gameSubmissionV1Schema.safeParse(payload).success).toBe(false);
  });

  it("rejects an identity that does not match matchId:gameNumber", () => {
    const payload = cloneFixture();
    payload.submissionId = "different:1";
    const result = gameSubmissionV1Schema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === "submissionId")).toBe(true);
  });

  it("rejects unknown top-level fields", () => {
    const payload = cloneFixture();
    payload.apiKey = "must-not-be-archived";
    expect(gameSubmissionV1Schema.safeParse(payload).success).toBe(false);
  });

  it("rejects a game number outside the match size", () => {
    const payload = cloneFixture();
    payload.bestOf = 1;
    payload.gameNumber = 2;
    payload.submissionId = `${payload.matchId}:2`;
    expect(gameSubmissionV1Schema.safeParse(payload).success).toBe(false);
  });
});
