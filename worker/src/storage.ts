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
  }

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
