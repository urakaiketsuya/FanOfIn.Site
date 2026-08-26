import type { GameSubmissionV1 } from "./schema";

export interface Env {
  INGESTION_API_KEY: string;
  MATCH_DB: D1Database;
}

export interface StoredSubmission {
  checksum_sha256: string;
}

export type IngestResult = { outcome: "created" | "duplicate" | "conflict" };

export const RAW_PAYLOAD_RETENTION_DAYS = 30;

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function findSubmission(db: D1Database, submissionId: string): Promise<StoredSubmission | null> {
  return db.prepare(
    "SELECT checksum_sha256 FROM game_submissions WHERE submission_id = ? LIMIT 1",
  ).bind(submissionId).first<StoredSubmission>();
}

export async function purgeExpiredRawPayloads(db: D1Database, now = new Date().toISOString()): Promise<number> {
  const result = await db.prepare(
    `UPDATE game_submissions
     SET raw_payload_json = NULL, raw_payload_expires_at = NULL
     WHERE raw_payload_json IS NOT NULL AND raw_payload_expires_at <= ?`,
  ).bind(now).run();
  return result.meta.changes;
}

export async function ingestSubmission(
  env: Env,
  submission: GameSubmissionV1,
  canonicalJson: string,
  receivedAt: string,
): Promise<IngestResult> {
  const checksum = await sha256Hex(canonicalJson);
  const existing = await findSubmission(env.MATCH_DB, submission.submissionId);

  if (existing) {
    return existing.checksum_sha256 === checksum
      ? { outcome: "duplicate" }
      : { outcome: "conflict" };
  }

  const rawPayloadExpiresAt = new Date(
    new Date(receivedAt).getTime() + RAW_PAYLOAD_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
  ).toISOString();

  const statements: D1PreparedStatement[] = [
    env.MATCH_DB.prepare(
      `INSERT INTO game_submissions
       (submission_id, schema_version, match_id, game_number, received_at, submitted_at,
        source_version, checksum_sha256, r2_object_key, processing_status,
        raw_payload_json, raw_payload_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 'complete', ?, ?)`,
    ).bind(
      submission.submissionId,
      submission.schemaVersion,
      submission.matchId,
      submission.gameNumber,
      receivedAt,
      submission.submittedAt,
      submission.source.version,
      checksum,
      canonicalJson,
      rawPayloadExpiresAt,
    ),
    env.MATCH_DB.prepare(
      `INSERT INTO games
       (submission_id, game_name, format, best_of, winner, first_player, turns, match_winner,
        player_1_match_wins, player_2_match_wins)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      submission.submissionId,
      submission.gameName,
      submission.format,
      submission.bestOf,
      submission.winner,
      submission.firstPlayer,
      submission.turns,
      submission.matchWinner,
      submission.matchWins["1"],
      submission.matchWins["2"],
    ),
  ];

  for (const seat of [1, 2] as const) {
    const player = submission.players[String(seat) as "1" | "2"];
    statements.push(env.MATCH_DB.prepare(
      `INSERT INTO game_players
       (submission_id, seat, deck_link, champion_id, element, classes_json, end_level, end_hp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      submission.submissionId,
      seat,
      player.deckLink,
      player.championId,
      player.element,
      JSON.stringify(player.classes),
      player.endLevel,
      player.endHp,
    ));

    for (const [cardId, stats] of Object.entries(player.cardStats)) {
      statements.push(env.MATCH_DB.prepare(
        `INSERT INTO game_card_stats
         (submission_id, seat, card_id, drawn, drawn_to_memory, materialized, reserved, discarded, activated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        submission.submissionId,
        seat,
        cardId,
        stats.drawn,
        stats.drawnToMemory,
        stats.materialized,
        stats.reserved,
        stats.discarded,
        stats.activated,
      ));
    }

    player.turnStats.forEach((turnStat, turnIndex) => {
      statements.push(env.MATCH_DB.prepare(
        `INSERT INTO game_turn_stats
         (submission_id, seat, turn_index, turn, cards_played, memory_spent, reserve_spent, damage_dealt, damage_taken, healed, level, hp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        submission.submissionId,
        seat,
        turnIndex,
        turnStat.turn,
        turnStat.cardsPlayed,
        turnStat.memorySpent,
        turnStat.reserveSpent,
        turnStat.damageDealt,
        turnStat.damageTaken,
        turnStat.healed,
        turnStat.level,
        turnStat.hp,
      ));
    });
  }

  submission.combatEvents.forEach((event, eventIndex) => {
    // attack_initiated's attacker*/damage_resolved's source* both mean "the seat/card causing this
    // event" — unified into source_seat/source_card_id so a query doesn't need to branch on type.
    // See the migration's doc comment for which columns are type-specific and NULL on the other type.
    const isAttack = event.type === "attack_initiated";
    statements.push(env.MATCH_DB.prepare(
      `INSERT INTO game_combat_events
       (submission_id, event_index, event_type, turn, source_seat, source_card_id, target_seat, target_card_id,
        weapon_card_id, cleave, amount, is_combat, lethal, domain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      submission.submissionId,
      eventIndex,
      event.type,
      event.turn,
      isAttack ? event.attackerSeat : event.sourceSeat,
      isAttack ? event.attackerCardId : event.sourceCardId,
      event.targetSeat,
      event.targetCardId,
      isAttack ? event.weaponCardId : null,
      isAttack ? Number(event.cleave) : null,
      isAttack ? null : event.amount,
      isAttack ? null : Number(event.isCombat),
      isAttack ? null : Number(event.lethal),
      isAttack ? null : event.domain === true ? 1 : null,
    ));
  });

  try {
    await env.MATCH_DB.batch(statements);
    return { outcome: "created" };
  } catch (error) {
    // A simultaneous identical request may have won the unique-key race after our first read.
    const raced = await findSubmission(env.MATCH_DB, submission.submissionId);
    if (raced) {
      return raced.checksum_sha256 === checksum
        ? { outcome: "duplicate" }
        : { outcome: "conflict" };
    }
    throw error;
  }
}
