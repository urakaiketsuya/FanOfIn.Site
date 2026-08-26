import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/game-submission-v1.json";
import type { GameSubmissionV1 } from "../src/schema";

const testEnv = env as unknown as {
  MATCH_DB: D1Database;
};
const worker = (exports as unknown as { default: Fetcher }).default;

function submissionRequest(payload: unknown, secret = "worker-test-key"): Request {
  return new Request("https://worker.test/v1/grand-archive/games", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

describe("match ingestion Worker", () => {
  it("retains raw JSON, indexes, deduplicates, and rejects conflicting content", async () => {
    const created = await worker.fetch(submissionRequest(fixture));
    expect(created.status).toBe(201);
    expect((await created.json()) as { outcome: string }).toMatchObject({ outcome: "created" });

    const indexed = await testEnv.MATCH_DB.prepare(
      "SELECT checksum_sha256, raw_payload_json, raw_payload_expires_at FROM game_submissions WHERE submission_id = ?",
    ).bind(fixture.submissionId).first<{
      checksum_sha256: string;
      raw_payload_json: string;
      raw_payload_expires_at: string;
    }>();
    expect(indexed?.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.parse(indexed!.raw_payload_json)).toMatchObject({ submissionId: fixture.submissionId });
    expect(Date.parse(indexed!.raw_payload_expires_at) - Date.now()).toBeGreaterThan(29 * 24 * 60 * 60 * 1_000);

    const duplicate = await worker.fetch(submissionRequest(fixture));
    expect(duplicate.status).toBe(200);
    expect((await duplicate.json()) as { outcome: string }).toMatchObject({ outcome: "duplicate" });

    const changed = structuredClone(fixture);
    changed.players["1"].endHp--;
    const conflict = await worker.fetch(submissionRequest(changed));
    expect(conflict.status).toBe(409);

    const summary = await worker.fetch("https://worker.test/v1/grand-archive/analytics/summary");
    expect(summary.status).toBe(200);
    expect(await summary.json()).toMatchObject({
      schemaVersion: 1,
      source: "GrandArchiveSim",
      games: 1,
      firstPlayer: { games: 1, wins: 0, winRate: 0 },
    });
  });

  it("rejects invalid credentials before processing the payload", async () => {
    const before = await testEnv.MATCH_DB.prepare("SELECT COUNT(*) AS count FROM game_submissions").first<{ count: number }>();
    const response = await worker.fetch(submissionRequest(fixture, "wrong-key"));
    expect(response.status).toBe(401);
    const after = await testEnv.MATCH_DB.prepare("SELECT COUNT(*) AS count FROM game_submissions").first<{ count: number }>();
    expect(after?.count).toBe(before?.count);
  });

  it("normalizes cardStats, turnStats, and combatEvents into their own tables — including an empty cardStats object", async () => {
    const submission = structuredClone(fixture);
    submission.matchId = "match-fixture-normalization";
    submission.submissionId = "match-fixture-normalization:1";

    const created = await worker.fetch(submissionRequest(submission));
    expect(created.status).toBe(201);

    // Player 1's one cardStats entry (the fixture's "card-one").
    const cardRows = await testEnv.MATCH_DB.prepare(
      "SELECT seat, card_id, drawn, materialized, activated FROM game_card_stats WHERE submission_id = ? ORDER BY seat",
    ).bind(submission.submissionId).all<{ seat: number; card_id: string; drawn: number; materialized: number; activated: number }>();
    expect(cardRows.results).toEqual([{ seat: 1, card_id: "card-one", drawn: 2, materialized: 1, activated: 1 }]);

    // Player 2's cardStats is `{}` in the fixture — zero rows, not an error, not a crash.
    const seat2Cards = await testEnv.MATCH_DB.prepare(
      "SELECT COUNT(*) AS count FROM game_card_stats WHERE submission_id = ? AND seat = 2",
    ).bind(submission.submissionId).first<{ count: number }>();
    expect(seat2Cards?.count).toBe(0);

    // One turnStats entry per seat in the fixture.
    const turnRows = await testEnv.MATCH_DB.prepare(
      "SELECT seat, turn_index, turn, damage_dealt, damage_taken FROM game_turn_stats WHERE submission_id = ? ORDER BY seat",
    ).bind(submission.submissionId).all<{ seat: number; turn_index: number; turn: number; damage_dealt: number; damage_taken: number }>();
    expect(turnRows.results).toEqual([
      { seat: 1, turn_index: 0, turn: 2, damage_dealt: 3, damage_taken: 0 },
      { seat: 2, turn_index: 0, turn: 1, damage_dealt: 0, damage_taken: 3 },
    ]);

    // Both combatEvents from the fixture, with type-specific columns populated/NULL correctly.
    const eventRows = await testEnv.MATCH_DB.prepare(
      "SELECT event_index, event_type, source_card_id, target_card_id, weapon_card_id, cleave, amount, lethal FROM game_combat_events WHERE submission_id = ? ORDER BY event_index",
    ).bind(submission.submissionId).all<{
      event_index: number;
      event_type: string;
      source_card_id: string;
      target_card_id: string;
      weapon_card_id: string | null;
      cleave: number | null;
      amount: number | null;
      lethal: number | null;
    }>();
    expect(eventRows.results).toEqual([
      {
        event_index: 0,
        event_type: "attack_initiated",
        source_card_id: "card-one",
        target_card_id: "champion-two",
        weapon_card_id: null,
        cleave: 0,
        amount: null,
        lethal: null,
      },
      {
        event_index: 1,
        event_type: "damage_resolved",
        source_card_id: "card-one",
        target_card_id: "champion-two",
        weapon_card_id: null,
        cleave: null,
        amount: 3,
        lethal: 1,
      },
    ]);
  });

  it("accepts a submission at every field's maximum size in one D1 batch", async () => {
    // Cast to the real schema type — the JSON-inferred type of `fixture` is a narrow literal
    // (e.g. cardStats requires exactly `{"card-one": ...}`), too specific to reassign a generated
    // Record<string, CardStats> of a different size onto.
    const submission = structuredClone(fixture) as unknown as GameSubmissionV1;
    submission.matchId = "match-fixture-max-size";
    submission.submissionId = "match-fixture-max-size:1";

    const cardStats = (prefix: string) =>
      Object.fromEntries(
        Array.from({ length: 500 }, (_, i) => [
          `${prefix}-card-${i}`,
          { drawn: 1, drawnToMemory: 0, materialized: 1, reserved: 0, discarded: 0, activated: 1 },
        ]),
      );
    const turnStats = () =>
      Array.from({ length: 500 }, (_, i) => ({
        turn: i + 1,
        cardsPlayed: 1,
        memorySpent: 1,
        reserveSpent: 0,
        damageDealt: 1,
        damageTaken: 1,
        healed: 0,
        level: 1,
        hp: 10,
      }));
    submission.players["1"].cardStats = cardStats("p1");
    submission.players["1"].turnStats = turnStats();
    submission.players["2"].cardStats = cardStats("p2");
    submission.players["2"].turnStats = turnStats();
    // The schema's own per-field max (combatEvents.max(5_000)) is unreachable in practice: at
    // 500+500 cardStats and 500+500 turnStats already present, 5,000 combatEvents pushes the
    // serialized body past index.ts's MAX_BODY_BYTES (1 MiB) — confirmed empirically, that
    // combination gets rejected with 413 before ingestSubmission ever runs. 4,500 is the largest
    // combatEvents count (at this cardStats/turnStats size) that stays under the body cap, so it's
    // the real worst case this test needs to prove D1's batch() can handle, not the schema's max.
    submission.combatEvents = Array.from({ length: 4_500 }, (_, i) =>
      i % 2 === 0
        ? {
            type: "attack_initiated" as const,
            turn: (i % 500) + 1,
            attackerSeat: 1 as const,
            attackerCardId: "p1-card-0",
            targetSeat: 2 as const,
            targetCardId: "champion-two",
            weaponCardId: null,
            cleave: false,
          }
        : {
            type: "damage_resolved" as const,
            turn: (i % 500) + 1,
            sourceSeat: 1 as const,
            sourceCardId: "p1-card-0",
            targetSeat: 2 as const,
            targetCardId: "champion-two",
            amount: 1,
            isCombat: true,
            lethal: false,
          },
    );

    // This is the actual production worst case for statement count in the one D1 batch()
    // ingestSubmission sends per request: 500+500 cardStats + 500+500 turnStats + 4,500
    // combatEvents + 4 base rows (game_submissions, games, 2x game_players) = 6,504 statements.
    // Confirms that volume doesn't hit a D1 batch-size limit before it ever reaches production.
    const created = await worker.fetch(submissionRequest(submission));
    expect(created.status).toBe(201);

    const counts = await Promise.all([
      testEnv.MATCH_DB.prepare("SELECT COUNT(*) AS count FROM game_card_stats WHERE submission_id = ?").bind(submission.submissionId).first<{ count: number }>(),
      testEnv.MATCH_DB.prepare("SELECT COUNT(*) AS count FROM game_turn_stats WHERE submission_id = ?").bind(submission.submissionId).first<{ count: number }>(),
      testEnv.MATCH_DB.prepare("SELECT COUNT(*) AS count FROM game_combat_events WHERE submission_id = ?").bind(submission.submissionId).first<{ count: number }>(),
    ]);
    expect(counts.map((c) => c?.count)).toEqual([1_000, 1_000, 4_500]);
  });

  it("only surfaces per-card/per-turn aggregates once they clear the minimum sample size", async () => {
    const CARD_ID = "aggregate-test-card";
    // Outside the preceding "max-size" test's turn range (1-500) — that test's synthetic games
    // are still in the shared D1 state (tests in this file don't reset between `it` blocks), so a
    // turn number in that range would already have a pre-existing game and cross the sample-size
    // threshold one submission earlier than this test expects.
    const TURN = 10_000;
    // 3 wins, 2 losses -> winRate should come out to 0.6; damage amounts sum to 20 across 5 games -> avg 4.
    const outcomes: Array<{ winner: 1 | 2; amount: number }> = [
      { winner: 1, amount: 4 },
      { winner: 1, amount: 6 },
      { winner: 1, amount: 5 },
      { winner: 2, amount: 3 },
      { winner: 2, amount: 2 },
    ];

    async function fetchSummary() {
      const response = await worker.fetch("https://worker.test/v1/grand-archive/analytics/summary");
      return (await response.json()) as {
        cardStats: Array<{
          cardId: string;
          games: number;
          avgDrawn: number;
          avgDrawnToMemory: number;
          avgMaterialized: number;
          avgReserved: number;
          avgDiscarded: number;
          avgActivated: number;
          winRate: number | null;
          attackEvents: number;
          avgDamageDealt: number;
        }>;
        turnStats: Array<{
          turn: number;
          games: number;
          avgCardsPlayed: number;
          avgMemorySpent: number;
          avgReserveSpent: number;
          avgDamageDealt: number;
          avgDamageTaken: number;
          avgHealed: number;
          avgLevel: number;
          avgHp: number;
        }>;
      };
    }

    for (const [i, { winner, amount }] of outcomes.entries()) {
      const submission = structuredClone(fixture) as unknown as GameSubmissionV1;
      submission.matchId = `match-fixture-aggregate-${i}`;
      submission.submissionId = `match-fixture-aggregate-${i}:1`;
      submission.winner = winner;
      submission.matchWinner = winner;
      submission.players["1"].cardStats = {
        [CARD_ID]: { drawn: 3, drawnToMemory: 1, materialized: 2, reserved: 0, discarded: 1, activated: 2 },
      };
      submission.players["1"].turnStats = [
        { turn: TURN, cardsPlayed: 2, memorySpent: 3, reserveSpent: 1, damageDealt: 5, damageTaken: 2, healed: 0, level: 3, hp: 15 },
      ];
      submission.combatEvents = [
        {
          type: "damage_resolved",
          turn: TURN,
          sourceSeat: 1,
          sourceCardId: CARD_ID,
          targetSeat: 2,
          targetCardId: "champion-two",
          amount,
          isCombat: true,
          lethal: false,
        },
      ];

      const created = await worker.fetch(submissionRequest(submission));
      expect(created.status).toBe(201);

      // Below MIN_SAMPLE_GAMES (5), neither aggregate should be visible yet — showing them earlier
      // would just be replaying these specific games' exact card/turn usage, not aggregating.
      if (i < 4) {
        const summary = await fetchSummary();
        expect(summary.cardStats.some((c) => c.cardId === CARD_ID)).toBe(false);
        expect(summary.turnStats.some((t) => t.turn === TURN)).toBe(false);
      }
    }

    const summary = await fetchSummary();
    const card = summary.cardStats.find((c) => c.cardId === CARD_ID);
    expect(card).toMatchObject({
      cardId: CARD_ID,
      games: 5,
      avgDrawn: 3,
      avgDrawnToMemory: 1,
      avgMaterialized: 2,
      avgReserved: 0,
      avgDiscarded: 1,
      avgActivated: 2,
      winRate: 0.6,
      attackEvents: 5,
      avgDamageDealt: 4,
    });

    const turn = summary.turnStats.find((t) => t.turn === TURN);
    expect(turn).toMatchObject({
      turn: TURN,
      games: 5,
      avgCardsPlayed: 2,
      avgMemorySpent: 3,
      avgReserveSpent: 1,
      avgDamageDealt: 5,
      avgDamageTaken: 2,
      avgHealed: 0,
      avgLevel: 3,
      avgHp: 15,
    });
  });
});
