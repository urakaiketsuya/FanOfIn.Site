import { canonicalMatch, type MatchSubmissionV1 } from "./match-schema";
import { sha256Hex, type Env, type IngestResult } from "./storage";

export async function ingestMatch(env: Env, sourceId: string, input: MatchSubmissionV1): Promise<IngestResult> {
  const m = canonicalMatch(input);
  const checksum = await sha256Hex(JSON.stringify(m));
  const lookup = () => env.MATCH_DB.prepare(`SELECT submission_id, checksum_sha256 FROM submitted_matches
    WHERE source_id = ? AND (submission_id = ? OR source_match_id = ?)`).bind(sourceId, m.submissionId, m.source.matchId)
    .all<{ submission_id: string; checksum_sha256: string }>();
  const classify = (rows: { submission_id: string; checksum_sha256: string }[]): IngestResult => ({
    outcome: rows.length === 1 && rows[0].submission_id === m.submissionId && rows[0].checksum_sha256 === checksum ? "duplicate" : "conflict",
  });
  const existing = await lookup();
  if (existing.results.length) return classify(existing.results);
  const db = env.MATCH_DB;
  const statements = [db.prepare(`INSERT INTO submitted_matches
    (source_id, submission_id, source_match_id, source_version, received_at, started_at, completed_at,
     format, match_type, best_of, outcome, winner_seat, seat_1_wins, seat_2_wins, checksum_sha256)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(sourceId, m.submissionId, m.source.matchId,
    m.source.version ?? null, new Date().toISOString(), m.startedAt ?? null, m.completedAt ?? null,
    m.format, m.matchType, m.bestOf, m.result.outcome, m.result.winnerSeat, m.result.wins["1"], m.result.wins["2"], checksum)];
  const matchId = "(SELECT id FROM submitted_matches WHERE source_id = ? AND submission_id = ?)";
  for (const p of m.players) {
    const identity = await sha256Hex(JSON.stringify({ main: p.deck.sections.main, material: p.deck.sections.material }));
    statements.push(db.prepare(`INSERT INTO submitted_match_decks
      (match_id, seat, participant_type, source_deck_id, deck_url, deck_name, identity_sha256, sections_json)
      VALUES (${matchId}, ?, ?, ?, ?, ?, ?, ?)`).bind(sourceId, m.submissionId, p.seat, p.participantType,
      p.deck.sourceDeckId ?? null, p.deck.url ?? null, p.deck.name ?? null, identity, JSON.stringify(p.deck.sections)));
  }
  for (const g of m.games) statements.push(db.prepare(`INSERT INTO submitted_match_games
    (match_id, game_number, source_game_id, outcome, winner_seat, end_reason, first_player_seat, turns)
    VALUES (${matchId}, ?, ?, ?, ?, ?, ?, ?)`).bind(sourceId, m.submissionId, g.gameNumber,
    g.sourceGameId ?? null, g.outcome, g.winnerSeat, g.endReason, g.firstPlayerSeat ?? null, g.turns ?? null));
  try {
    await db.batch(statements);
    return { outcome: "created" };
  } catch (error) {
    const raced = await lookup();
    if (raced.results.length) return classify(raced.results);
    throw error;
  }
}
