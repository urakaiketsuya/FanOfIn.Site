import type { MatchLogRecord, MatchProvenance } from "./match-log-types.js";
import { containsBlockedLanguage } from "./contentPolicy.js";

/** Canonical shape shared by device storage and account mutations. Catalog/source identifiers
 * are bounded but are not subjected to the user-authored prose policy. */
export function validateMatchLogRecord(value: unknown): MatchLogRecord {
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid match record");
    return v as Record<string, unknown>;
  };
  const text = (v: unknown, label: string, max: number, required = false, authored = false): string => {
    if (typeof v !== "string") throw new Error(`Invalid ${label}`);
    const s = v.trim().normalize("NFC");
    if (s.length > max || (required && !s) || (authored && containsBlockedLanguage(s))) throw new Error(`Invalid ${label}: check its length and language`);
    return s;
  };
  const date = (v: unknown, label: string): string => {
    const s = text(v, label, 40, true);
    if (Number.isNaN(Date.parse(s))) throw new Error(`Invalid ${label}`);
    return s;
  };
  const integer = (v: unknown, label: string): number => {
    if (!Number.isSafeInteger(v) || Number(v) < 0 || Number(v) > 100000) throw new Error(`Invalid ${label}`);
    return Number(v);
  };
  const nullableNumber = (v: unknown, label: string) => v === null ? null : integer(v, label);
  const list = (v: unknown, label: string, authored = false): string[] => {
    if (!Array.isArray(v) || v.length > 500) throw new Error(`Invalid ${label}`);
    return v.map(item => text(item, label, 200, true, authored));
  };
  const r = object(value), p = object(r.provenance);
  const id = text(r.id, "match ID", 200, true);
  if (r.version !== 1 || (r.result !== "win" && r.result !== "loss" && r.result !== "draw") || (r.order !== "first" && r.order !== "second" && r.order !== "unknown")) throw new Error("Invalid match record");
  let provenance: MatchProvenance;
  if (p.kind === "manual") {
    if (id.startsWith("clarent:")) throw new Error("Manual records cannot use a Clarent import identifier");
    provenance = { kind: "manual", enteredAt: date(p.enteredAt, "entry date") };
  } else if (p.kind === "clarent") {
    const submissionId = text(p.submissionId, "submission ID", 180, true), matchId = text(p.matchId, "match ID", 160, true);
    const gameNumber = integer(p.gameNumber, "game number");
    if (p.schemaVersion !== 1 || (p.playerSeat !== 1 && p.playerSeat !== 2) || submissionId !== `${matchId}:${gameNumber}` || id !== `clarent:${submissionId}:seat${p.playerSeat}`) throw new Error("Invalid Clarent provenance");
    provenance = { kind: "clarent", schemaVersion: 1, submissionId, matchId, gameNumber, playerSeat: p.playerSeat,
      importedAt: date(p.importedAt, "import date"), sourceVersion: text(p.sourceVersion, "source version", 100, true),
      playerChampionId: text(p.playerChampionId, "champion ID", 200, true), opponentChampionId: text(p.opponentChampionId, "champion ID", 200, true), cardIds: list(p.cardIds, "card IDs") };
    if (p.rawDeckInput !== undefined) provenance.rawDeckInput = text(p.rawDeckInput, "deck input", 20000);
    if (p.cardIdMappings !== undefined) {
      const entries = Object.entries(object(p.cardIdMappings));
      if (entries.length > 500) throw new Error("Too many card mappings");
      provenance.cardIdMappings = Object.fromEntries(entries.map(([key, val]) => [text(key, "card ID", 200, true), text(val, "card ID", 200, true)]));
    }
    if (p.deckMapping !== undefined) {
      const mapping = object(p.deckMapping);
      if (mapping.method !== "exact" && mapping.method !== "manual") throw new Error("Invalid deck mapping");
      provenance.deckMapping = { savedDeckId: text(mapping.savedDeckId, "saved deck ID", 200, true), method: mapping.method };
      if (provenance.deckMapping.savedDeckId !== r.savedDeckId) throw new Error("Deck mapping does not match the linked deck");
    }
  } else throw new Error("Invalid match provenance");
  const record: MatchLogRecord = { version: 1, id, playedAt: date(r.playedAt, "played date"), result: r.result as MatchLogRecord["result"], order: r.order as MatchLogRecord["order"],
    turns: nullableNumber(r.turns, "turns"), mulligans: nullableNumber(r.mulligans, "mulligans"), gamePlanTurn: nullableNumber(r.gamePlanTurn, "game plan turn"),
    opponent: text(r.opponent, "opponent", 200, false, true), deckLabel: text(r.deckLabel, "deck label", 200, false, true),
    sideboardPlan: text(r.sideboardPlan, "sideboard plan", 2000, false, true), notes: text(r.notes, "notes", 10000, false, true),
    notableCards: list(r.notableCards, "notable cards"), bottlenecks: list(r.bottlenecks, "bottlenecks", true), provenance };
  if (r.savedDeckId !== undefined) record.savedDeckId = r.savedDeckId === null ? null : text(r.savedDeckId, "saved deck ID", 200, true);
  if (JSON.stringify(record).length > 64000) throw new Error("Match record is too large");
  return record;
}
