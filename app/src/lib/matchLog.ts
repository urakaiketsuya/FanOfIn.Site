export type MatchResult = "win" | "loss" | "draw";
export type MatchOrder = "first" | "second" | "unknown";

export type MatchProvenance =
  | { kind: "manual"; enteredAt: string }
  | { kind: "clarent"; schemaVersion: 1; submissionId: string; matchId: string; gameNumber: number; importedAt: string; sourceVersion: string; playerSeat: 1 | 2; playerChampionId: string; opponentChampionId: string; cardIds: string[] };

export interface MatchLogRecord {
  version: 1;
  id: string;
  playedAt: string;
  result: MatchResult;
  order: MatchOrder;
  turns: number | null;
  mulligans: number | null;
  opponent: string;
  deckLabel: string;
  sideboardPlan: string;
  gamePlanTurn: number | null;
  notableCards: string[];
  bottlenecks: string[];
  notes: string;
  provenance: MatchProvenance;
}

export interface ClarentImportPreview {
  record: MatchLogRecord;
  duplicate: boolean;
  unresolvedCardIds: string[];
}

const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const integer = (value: unknown): number | null => Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;

export function loadMatchLog(raw: string | null): MatchLogRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is MatchLogRecord => Boolean(item && typeof item === "object" && (item as MatchLogRecord).version === 1 && typeof (item as MatchLogRecord).id === "string" && ["win", "loss", "draw"].includes((item as MatchLogRecord).result) && (item as MatchLogRecord).provenance && ["manual", "clarent"].includes((item as MatchLogRecord).provenance.kind)));
  } catch { return []; }
}

export function clarentRecordId(submissionId: string, playerSeat: 1 | 2): string {
  return `clarent:${submissionId}:seat${playerSeat}`;
}

/** Parses the Worker's documented Clarent v1 ingestion contract. This is a file/text import,
 * not a live Clarent connection. Unknown fields are retained only through explicit source IDs. */
export function previewClarentImport(raw: string, playerSeat: 1 | 2, existing: readonly MatchLogRecord[], knownCardIds: ReadonlySet<string> = new Set()): { previews: ClarentImportPreview[]; errors: string[] } {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { previews: [], errors: ["The import is not valid JSON."] }; }
  const rows = Array.isArray(value) ? value : [value];
  const previews: ClarentImportPreview[] = [];
  const errors: string[] = [];
  const existingIds = new Set(existing.map((record) => record.id));
  rows.forEach((row, index) => {
    const source = row && typeof row === "object" ? row as Record<string, unknown> : null;
    const players = source?.players && typeof source.players === "object" ? source.players as Record<string, unknown> : null;
    const own = players?.[String(playerSeat)] && typeof players[String(playerSeat)] === "object" ? players[String(playerSeat)] as Record<string, unknown> : null;
    const opponentSeat = playerSeat === 1 ? 2 : 1;
    const opponent = players?.[String(opponentSeat)] && typeof players[String(opponentSeat)] === "object" ? players[String(opponentSeat)] as Record<string, unknown> : null;
    const sourceMeta = source?.source && typeof source.source === "object" ? source.source as Record<string, unknown> : null;
    const submissionId = text(source?.submissionId); const matchId = text(source?.matchId);
    const gameNumber = integer(source?.gameNumber); const winner = integer(source?.winner); const firstPlayer = integer(source?.firstPlayer);
    const turns = integer(source?.turns); const submittedAt = text(source?.submittedAt);
    const ownChampionId = text(own?.championId); const opponentChampionId = text(opponent?.championId);
    if (source?.schemaVersion !== 1 || sourceMeta?.application !== "TCGEngine" || sourceMeta?.game !== "GrandArchiveSim" || !submissionId || !matchId || gameNumber === null || submissionId !== `${matchId}:${gameNumber}` || !submittedAt || Number.isNaN(Date.parse(submittedAt)) || !own || !opponent || !ownChampionId || !opponentChampionId || (winner !== 1 && winner !== 2) || (firstPlayer !== 1 && firstPlayer !== 2)) {
      errors.push(`Game ${index + 1} does not match the Clarent v1 submission format.`); return;
    }
    const cardStats = own.cardStats && typeof own.cardStats === "object" ? own.cardStats as Record<string, unknown> : {};
    const cardIds = Object.keys(cardStats).sort();
    const id = clarentRecordId(submissionId, playerSeat);
    const importedAt = new Date().toISOString();
    const record: MatchLogRecord = {
      version: 1, id, playedAt: submittedAt, result: winner === playerSeat ? "win" : "loss",
      order: firstPlayer === playerSeat ? "first" : "second", turns, mulligans: null,
      opponent: text(opponent.championName) ?? opponentChampionId, deckLabel: text(own.championName) ?? ownChampionId,
      sideboardPlan: "", gamePlanTurn: null, notableCards: [], bottlenecks: [], notes: "",
      provenance: { kind: "clarent", schemaVersion: 1, submissionId, matchId, gameNumber, importedAt, sourceVersion: text(sourceMeta.version) ?? "unknown", playerSeat, playerChampionId: ownChampionId, opponentChampionId, cardIds },
    };
    previews.push({ record, duplicate: existingIds.has(id) || previews.some((entry) => entry.record.id === id), unresolvedCardIds: cardIds.filter((cardId) => !knownCardIds.has(cardId)) });
  });
  return { previews, errors };
}

export function addImportedMatches(existing: readonly MatchLogRecord[], previews: readonly ClarentImportPreview[]): MatchLogRecord[] {
  const ids = new Set(existing.map((record) => record.id));
  return [...previews.filter((entry) => !entry.duplicate && !ids.has(entry.record.id)).map((entry) => entry.record), ...existing];
}
