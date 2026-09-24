import { createHash } from "node:crypto";
import type { ArchetypeData, CardStatsData, PublicApiMetadata, PublicArchetype, PublicCardStats } from "@gatcg/shared";

export interface ApiEntry { kind: "cards" | "archetypes"; id: string; hash: string; body: string }
export interface ApiSnapshot { metadata: PublicApiMetadata; entries: ApiEntry[] }
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

export function buildSnapshot(cards: CardStatsData, archetypes: ArchetypeData): ApiSnapshot {
  for (const timestamp of [cards.generatedAt, archetypes.generatedAt]) {
    if (!timestamp || !Number.isFinite(Date.parse(timestamp))) throw new Error("Invalid source timestamp");
  }
  if (!Number.isSafeInteger(cards.decksConsidered) || cards.decksConsidered < 0) throw new Error("Invalid deck count");
  const entries: ApiEntry[] = [];
  function add(kind: ApiEntry["kind"], id: string, value: PublicCardStats | PublicArchetype) {
    if (!id || id.length > 256) throw new Error(`Invalid ${kind} identifier`);
    for (const [field, amount] of Object.entries(value)) {
      if (typeof amount === "number" && (!Number.isFinite(amount) || amount < 0)) throw new Error(`Invalid ${field}`);
    }
    for (const field of ["deckCount", "eventCount", "totalCopies", "recentDeckCount", "priorDeckCount"] as const) {
      if (field in value && !Number.isSafeInteger((value as unknown as Record<string, unknown>)[field])) throw new Error(`Invalid ${field}`);
    }
    if (!Number.isFinite(value.avgWinRate) || value.avgWinRate < 0 || value.avgWinRate > 1) throw new Error("Invalid win rate");
    if ("adjustedWinRate" in value && (!Number.isFinite(value.adjustedWinRate) || value.adjustedWinRate < 0 || value.adjustedWinRate > 1)) throw new Error("Invalid adjusted win rate");
    const body = JSON.stringify(value);
    if (Buffer.byteLength(body) > 32_000) throw new Error("API payload exceeds 32 KB");
    entries.push({ kind, id, body, hash: hash(body) });
  }
  for (const card of cards.cards) {
    if (!card.slug) continue;
    const { name, slug, deckCount, totalCopies, eventCount, avgWinRate, adjustedWinRate, recentDeckCount, priorDeckCount, marketPrice } = card;
    add("cards", slug, { name, slug, deckCount, totalCopies, eventCount, avgWinRate, adjustedWinRate, recentDeckCount, priorDeckCount, marketPrice });
  }
  for (const archetype of archetypes.archetypes) {
    const { signature, classes, elements, deckCount, eventCount, avgWinRate } = archetype;
    add("archetypes", signature, { signature, classes, elements, deckCount, eventCount, avgWinRate });
  }
  entries.sort((a, b) => Buffer.compare(Buffer.from(`${a.kind}:${a.id}`), Buffer.from(`${b.kind}:${b.id}`)));
  if (new Set(entries.map(e => `${e.kind}:${e.id}`)).size !== entries.length) throw new Error("Duplicate API identifier");
  const counts = { cards: entries.filter(e => e.kind === "cards").length, archetypes: archetypes.archetypes.length };
  if (!counts.cards || !counts.archetypes) throw new Error("Refusing to publish an empty dataset");
  const base = {
    apiVersion: "v1" as const,
    sources: { cards: cards.generatedAt, archetypes: archetypes.generatedAt },
    scope: "published-omnidex-analysis" as const,
    decksConsidered: cards.decksConsidered,
    counts,
    cardsWithoutSlug: cards.cards.length - counts.cards,
  };
  const datasetVersion = hash(JSON.stringify([base, entries.map(e => [e.kind, e.id, e.hash])]));
  return { metadata: { ...base, datasetVersion }, entries };
}

/** Staging statements are idempotent. No currently active rows are mutated. */
export function snapshotSql(snapshot: ApiSnapshot): string {
  const version = quote(snapshot.metadata.datasetVersion);
  const statements = [`INSERT INTO api_snapshots(version, metadata) VALUES (${version}, ${quote(JSON.stringify(snapshot.metadata))}) ON CONFLICT DO NOTHING;`];
  for (const entry of snapshot.entries) {
    statements.push(`INSERT INTO api_payloads(hash, body) VALUES (${quote(entry.hash)}, ${quote(entry.body)}) ON CONFLICT DO NOTHING;`);
    statements.push(`INSERT INTO api_entries(version, kind, id, hash) VALUES (${version}, ${quote(entry.kind)}, ${quote(entry.id)}, ${quote(entry.hash)}) ON CONFLICT DO NOTHING;`);
  }
  // One atomic pointer change, only after every expected entry and payload exists.
  statements.push(`INSERT INTO api_active(singleton, version)
SELECT 1, ${version} WHERE (SELECT count(*) FROM api_entries e JOIN api_payloads p ON p.hash=e.hash WHERE e.version=${version})=${snapshot.entries.length}
ON CONFLICT(singleton) DO UPDATE SET version=excluded.version;`);
  return statements.join("\n");
}

// Run only after publication is confirmed. Publishers must be serialized.
export const cleanupSql = `DELETE FROM api_entries WHERE version <> (SELECT version FROM api_active WHERE singleton=1);
DELETE FROM api_snapshots WHERE version <> (SELECT version FROM api_active WHERE singleton=1);
DELETE FROM api_payloads WHERE NOT EXISTS (SELECT 1 FROM api_entries e WHERE e.hash=api_payloads.hash);`;
