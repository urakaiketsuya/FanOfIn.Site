import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
const hash = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'";
export function buildCatalogSnapshot(input: unknown) {
  const value = input as { generatedAt?: string; cards?: Record<string, unknown>[] };
  if (!value?.generatedAt || !Number.isFinite(Date.parse(value.generatedAt)) || !Array.isArray(value.cards) || !value.cards.length) throw new Error("Invalid full catalog snapshot");
  const cardIds = new Set<string>(), editionIds = new Set<string>();
  for (const card of value.cards) {
    if (typeof card.uuid !== "string" || !card.uuid || cardIds.has(card.uuid) || typeof card.name !== "string" || !card.name || typeof card.slug !== "string" || !card.slug || !Array.isArray(card.editions) || !card.editions.length) throw new Error("Invalid or duplicate card identity");
    cardIds.add(card.uuid);
    for (const edition of card.editions as Record<string, any>[]) {
      if (typeof edition.uuid !== "string" || !edition.uuid || editionIds.has(edition.uuid) || !edition.set?.id || !edition.set?.language || !edition.set?.prefix || !edition.set?.name || typeof edition.collector_number !== "string") throw new Error("Invalid or duplicate edition identity");
      editionIds.add(edition.uuid);
    }
  }
  // Ignore crawl time for content identity; unchanged card data produces no new version.
  const raw = Buffer.from(JSON.stringify({ cards: value.cards }));
  const bytes = gzipSync(raw);
  if (raw.length > 64 * 1024 * 1024 || bytes.length > 16 * 1024 * 1024) throw new Error("Catalog exceeds bounded feed size");
  const version = hash(bytes);
  const chunks: string[] = [];
  for (let n = 0; n < bytes.length; n += 24000) chunks.push(Buffer.from(bytes.subarray(n, n + 24000)).toString("base64"));
  const metadata = { schemaVersion: 1, version, generatedAt: value.generatedAt, cards: cardIds.size, editions: editionIds.size,
    compression: "gzip", bytes: bytes.length, unpackedBytes: raw.length, sha256: version, unpackedSha256: hash(raw), chunks: chunks.length };
  const initialize = `INSERT OR IGNORE INTO catalog_snapshots VALUES(${quote(version)},${quote(JSON.stringify(metadata))},${quote(value.generatedAt)});`;
  const writes = chunks.map((body, i) => `INSERT OR REPLACE INTO catalog_chunks VALUES(${quote(version)},${i},${quote(body)});`);
  const activate = `INSERT OR REPLACE INTO catalog_active(singleton,version) SELECT 1,${quote(version)} WHERE (SELECT count(*) FROM catalog_chunks WHERE version=${quote(version)})=${chunks.length};`;
  return { metadata, initialize, writes, activate };
}
export const cleanupCatalogSql = `DELETE FROM catalog_snapshots WHERE version NOT IN (SELECT version FROM catalog_snapshots ORDER BY created_at DESC LIMIT 3) AND version NOT IN (SELECT version FROM catalog_active);`;
