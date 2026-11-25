import { canonicalMatch, type MatchSubmissionV1, type PartialMatch } from "./match-schema";
import { sha256Hex, type Env, type IngestResult } from "./storage";

interface StoredMatch {
  submission_id: string;
  checksum_sha256: string;
  partial: number;
}

function findMatches(env: Env, sourceId: string, submissionId: string, matchId: string | null) {
  return env.MATCH_DB.prepare(`SELECT submission_id, checksum_sha256, 0 AS partial FROM submitted_matches
    WHERE source_id = ? AND (submission_id = ? OR source_match_id = ?)
    UNION ALL
    SELECT submission_id, checksum_sha256, 1 AS partial FROM partial_match_submissions
    WHERE source_id = ? AND (submission_id = ? OR source_match_id = ?)`)
    .bind(sourceId, submissionId, matchId, sourceId, submissionId, matchId).all<StoredMatch>();
}

function classifyMatch(rows: StoredMatch[], submissionId: string, checksum: string, partial: boolean): IngestResult {
  const [row] = rows;
  const duplicate = rows.length === 1 && row.submission_id === submissionId
    && row.checksum_sha256 === checksum && Boolean(row.partial) === partial;
  return { outcome: duplicate ? "duplicate" : "conflict" };
}

export async function ingestPartialMatch(env: Env, sourceId: string, input: PartialMatch) {
  const { source, ...fields } = input;
  const { id: _sourceAssertion, ...sourceFields } = source ?? {};
  const payload = {
    ...fields,
    ...(Object.keys(sourceFields).length ? { source: sourceFields } : {}),
  };
  const payloadJson = JSON.stringify(payload);
  const checksum = await sha256Hex(payloadJson);
  const matchId = sourceFields.matchId ?? null;
  const submissionId = input.submissionId ?? matchId ?? `partial-${checksum}`;
  try {
    await env.MATCH_DB.prepare(`INSERT INTO partial_match_submissions
      (source_id, submission_id, source_match_id, received_at, checksum_sha256, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)`).bind(sourceId, submissionId, matchId, new Date().toISOString(), checksum, payloadJson).run();
    return { submissionId, outcome: "created" as const };
  } catch (error) {
    const existing = await findMatches(env, sourceId, submissionId, matchId);
    if (!existing.results.length) throw error;
    return { submissionId, ...classifyMatch(existing.results, submissionId, checksum, true) };
  }
}

export async function ingestMatch(env: Env, sourceId: string, input: MatchSubmissionV1): Promise<IngestResult> {
  const m = canonicalMatch(input);
  // Source identity is already scoped by the credential; the optional assertion
  // must not change retry identity for existing clients that omit it.
  const { id: _sourceAssertion, ...source } = m.source;
  const checksum = await sha256Hex(JSON.stringify({ ...m, source }));
  const lookup = () => findMatches(env, sourceId, m.submissionId, m.source.matchId);
  const classify = (rows: StoredMatch[]) => classifyMatch(rows, m.submissionId, checksum, false);
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
