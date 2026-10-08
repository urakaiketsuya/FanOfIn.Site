import { collectionEntryKey, isCardFinish, type CardFinish } from "@gatcg/shared";
import { assetJson } from "./assets";
import type { PrintingCatalog } from "./printing-catalog";
import type { CollectionEntry, CollectionTransaction, CollectionUpdateLine, CollectionUpdateMode, SharedCardWatch } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";

const MAX_LINES = 500;
const MAX_QUANTITY = 9_999;
const MAX_SOURCE_LENGTH = 160;
const MAX_SHARED_WATCHES = 200;

interface StoredChange {
  cardUuid: string;
  cardName: string;
  editionUuid?: string;
  finish?: CardFinish;
  setPrefix?: string;
  collectorNumber?: string;
  beforeOwned: number;
  beforeProxy: number;
  afterOwned: number;
  afterProxy: number;
}

function parseLines(value: unknown): CollectionUpdateLine[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_LINES) throw badRequest(`Collection updates need 1–${MAX_LINES} cards`);
  const seen = new Set<string>();
  return value.map((raw) => {
    if (!raw || typeof raw !== "object") throw badRequest("Invalid collection card");
    const line = raw as Partial<CollectionUpdateLine>;
    const cardUuid = typeof line.cardUuid === "string" ? line.cardUuid.trim() : "";
    const cardName = typeof line.cardName === "string" ? line.cardName.trim().replace(/\s+/g, " ") : "";
    const editionUuid = typeof line.editionUuid === "string" ? line.editionUuid.trim() : undefined;
    if (line.editionUuid !== undefined && (typeof line.editionUuid !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(editionUuid ?? ""))) throw badRequest("Invalid printing ID");
    if (line.finish !== undefined && !isCardFinish(line.finish)) throw badRequest("Invalid card finish");
    const key = collectionEntryKey({ cardUuid, editionUuid, finish: line.finish });
    if (!cardUuid || cardUuid.length > 200 || !cardName || cardName.length > 200 || (editionUuid?.length ?? 0) > 200 || seen.has(key)) throw badRequest("Invalid or duplicate collection card");
    if (!Number.isInteger(line.quantity) || line.quantity! < 0 || line.quantity! > MAX_QUANTITY) throw badRequest("Invalid collection quantity");
    const proxyQuantity = line.proxyQuantity ?? 0;
    if (!Number.isInteger(proxyQuantity) || proxyQuantity < 0 || proxyQuantity > MAX_QUANTITY) throw badRequest("Invalid proxy quantity");
    for (const value of [line.expectedOwnedQuantity, line.expectedProxyQuantity]) if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 || value > MAX_QUANTITY)) throw badRequest("Invalid collection snapshot");
    seen.add(key);
    return { expectedOwnedQuantity: line.expectedOwnedQuantity, expectedProxyQuantity: line.expectedProxyQuantity, cardUuid, cardName, editionUuid, finish: line.finish, setPrefix: typeof line.setPrefix === "string" ? line.setPrefix.trim().slice(0, 40) : undefined, collectorNumber: typeof line.collectorNumber === "string" ? line.collectorNumber.trim().slice(0, 80) : undefined, quantity: line.quantity!, proxyQuantity };
  });
}

export async function listCollection(env: Env, user: AuthUser): Promise<{ entries: CollectionEntry[]; transactions: CollectionTransaction[] }> {
  const [entries, printings, transactions] = await Promise.all([
    env.ACCOUNT_DB.prepare("SELECT * FROM collection_entries WHERE user_id = ? ORDER BY card_name COLLATE NOCASE").bind(user.id).all<Record<string, string | number | null>>(),
    env.ACCOUNT_DB.prepare("SELECT * FROM collection_printing_entries WHERE user_id = ? ORDER BY card_name COLLATE NOCASE, set_prefix, collector_number").bind(user.id).all<Record<string, string | number | null>>(),
    env.ACCOUNT_DB.prepare("SELECT id, source, changes_json, created_at, undone_at FROM collection_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").bind(user.id).all<Record<string, string | null>>(),
  ]);
  return {
    entries: [
      ...entries.results.map((row) => ({ finish: (row.finish ?? "unspecified") as CardFinish, cardUuid: String(row.card_uuid), cardName: String(row.card_name), ownedQuantity: Number(row.owned_quantity), proxyQuantity: Number(row.proxy_quantity), updatedAt: String(row.updated_at) })),
      ...printings.results.map((row) => ({ finish: (row.finish ?? "unspecified") as CardFinish, cardUuid: String(row.card_uuid), cardName: String(row.card_name), editionUuid: String(row.edition_uuid), setPrefix: row.set_prefix ? String(row.set_prefix) : undefined, collectorNumber: row.collector_number ? String(row.collector_number) : undefined, ownedQuantity: Number(row.owned_quantity), proxyQuantity: Number(row.proxy_quantity), updatedAt: String(row.updated_at) })),
    ],
    transactions: transactions.results.map((row) => ({ id: row.id!, source: row.source!, lineCount: (JSON.parse(row.changes_json!) as unknown[]).length, createdAt: row.created_at!, undoneAt: row.undone_at })),
  };
}

export async function updateCollection(env: Env, user: AuthUser, value: unknown): Promise<{ transactionId: string; changed: number }> {
  if (!value || typeof value !== "object") throw badRequest("Invalid collection update");
  const input = value as { mode?: unknown; source?: unknown; lines?: unknown; requestId?: unknown };
  const mode = input.mode as CollectionUpdateMode;
  if (mode !== "add" && mode !== "at-least" && mode !== "set") throw badRequest("Invalid collection update mode");
  const source = typeof input.source === "string" ? input.source.trim().replace(/\s+/g, " ") : "";
  if (!source || source.length > MAX_SOURCE_LENGTH) throw badRequest("A valid collection source is required");
  const lines = parseLines(input.lines);
  const requestId = input.requestId === undefined ? crypto.randomUUID() : input.requestId;
  if (typeof requestId !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(requestId)) throw badRequest("Invalid collection request ID");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({mode,source,lines})));
  const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2,"0")).join("");
  async function acknowledged() {
    const row = await env.ACCOUNT_DB.prepare("SELECT request_hash, transaction_id, changed FROM collection_update_receipts WHERE user_id=? AND request_id=?").bind(user.id, requestId).first<{request_hash:string;transaction_id:string;changed:number}>();
    if (!row) return null;
    if (row.request_hash !== hash) throw new ApiError("This save ID was already used for different changes",409,"collection_request_conflict");
    return {transactionId:row.transaction_id,changed:Number(row.changed)};
  }
  const previous = await acknowledged();
  if (previous) return previous;
  if (lines.some(line => line.editionUuid && (line.quantity > 0 || (line.proxyQuantity ?? 0) > 0))) {
    const catalog = await assetJson<PrintingCatalog>(env, "/data/card-printings.json");
    for (const line of lines) if (line.editionUuid && (line.quantity > 0 || (line.proxyQuantity ?? 0) > 0)) {
      const printing = catalog[line.editionUuid];
      if (!printing || printing[0] !== line.cardUuid) throw badRequest("A selected printing does not belong to this card.");
      line.cardName = printing[1]; line.setPrefix = printing[2]; line.collectorNumber = printing[3];
    }
  }
  const [canonical, printings] = await Promise.all([
    env.ACCOUNT_DB.prepare("SELECT card_uuid, finish, owned_quantity, proxy_quantity FROM collection_entries WHERE user_id=? AND card_uuid IN (SELECT value FROM json_each(?))").bind(user.id,JSON.stringify(lines.filter(line=>!line.editionUuid).map(line=>line.cardUuid))).all<{card_uuid:string;finish:CardFinish;owned_quantity:number;proxy_quantity:number}>(),
    env.ACCOUNT_DB.prepare("SELECT edition_uuid, finish, owned_quantity, proxy_quantity FROM collection_printing_entries WHERE user_id=? AND edition_uuid IN (SELECT value FROM json_each(?))").bind(user.id,JSON.stringify(lines.filter(line=>line.editionUuid).map(line=>line.editionUuid))).all<{edition_uuid:string;finish:CardFinish;owned_quantity:number;proxy_quantity:number}>(),
  ]);
  const canonicalById = new Map(canonical.results.map(row=>[JSON.stringify([row.card_uuid, row.finish]),row]));
  const printingById = new Map(printings.results.map(row=>[JSON.stringify([row.edition_uuid, row.finish]),row]));
  const changes: StoredChange[] = [];
  const expected: StoredChange[] = [];
  for (const line of lines) {
    const current = line.editionUuid ? printingById.get(JSON.stringify([line.editionUuid, line.finish ?? "unspecified"])) : canonicalById.get(JSON.stringify([line.cardUuid, line.finish ?? "unspecified"]));
    const beforeOwned = Number(current?.owned_quantity ?? 0);
    const beforeProxy = Number(current?.proxy_quantity ?? 0);
    if ((line.expectedOwnedQuantity !== undefined && line.expectedOwnedQuantity !== beforeOwned) || (line.expectedProxyQuantity !== undefined && line.expectedProxyQuantity !== beforeProxy)) throw new ApiError("This collection changed since your draft began. Reload and review the quantities before saving.", 409, "collection_draft_conflict");
    const afterOwned = mode === "add" ? Math.min(MAX_QUANTITY, beforeOwned + line.quantity) : mode === "at-least" ? Math.max(beforeOwned, line.quantity) : line.quantity;
    const afterProxy = mode === "add" ? Math.min(MAX_QUANTITY, beforeProxy + (line.proxyQuantity ?? 0)) : mode === "at-least" ? Math.max(beforeProxy, line.proxyQuantity ?? 0) : (line.proxyQuantity ?? 0);
    expected.push({...line,beforeOwned,beforeProxy,afterOwned,afterProxy});
    if (afterOwned !== beforeOwned || afterProxy !== beforeProxy || !current) changes.push({ cardUuid: line.cardUuid, cardName: line.cardName, editionUuid: line.editionUuid, finish: line.finish, setPrefix: line.setPrefix, collectorNumber: line.collectorNumber, beforeOwned, beforeProxy, afterOwned, afterProxy });
  }
  const transactionId = changes.length ? crypto.randomUUID() : "";
  const now = new Date().toISOString();
  try { await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("INSERT INTO collection_update_receipts (user_id,request_id,request_hash,transaction_id,changed,expected_json,created_at) VALUES (?,?,?,?,?,?,?)").bind(user.id,requestId,hash,transactionId,changes.length,JSON.stringify(expected),now),
    ...[...changes].sort((a, b) => (b.afterOwned - b.beforeOwned) - (a.afterOwned - a.beforeOwned)).map((change) => change.editionUuid
      ? change.afterOwned === 0 && change.afterProxy === 0
        ? env.ACCOUNT_DB.prepare("DELETE FROM collection_printing_entries WHERE user_id = ? AND edition_uuid = ? AND finish = ?").bind(user.id, change.editionUuid, change.finish ?? "unspecified")
        : env.ACCOUNT_DB.prepare(`INSERT INTO collection_printing_entries
          (user_id, card_uuid, card_name, edition_uuid, set_prefix, collector_number, owned_quantity, proxy_quantity, updated_at, finish) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, edition_uuid, finish) DO UPDATE SET card_name = excluded.card_name, set_prefix = excluded.set_prefix,
          collector_number = excluded.collector_number, owned_quantity = excluded.owned_quantity, proxy_quantity = excluded.proxy_quantity, updated_at = excluded.updated_at`)
          .bind(user.id, change.cardUuid, change.cardName, change.editionUuid, change.setPrefix ?? null, change.collectorNumber ?? null, change.afterOwned, change.afterProxy, now, change.finish ?? "unspecified")
      : change.afterOwned === 0 && change.afterProxy === 0
      ? env.ACCOUNT_DB.prepare("DELETE FROM collection_entries WHERE user_id = ? AND card_uuid = ? AND finish = ?").bind(user.id, change.cardUuid, change.finish ?? "unspecified")
      : env.ACCOUNT_DB.prepare(`INSERT INTO collection_entries
        (user_id, card_uuid, card_name, owned_quantity, proxy_quantity, updated_at, finish) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, card_uuid, finish) DO UPDATE SET card_name = excluded.card_name, owned_quantity = excluded.owned_quantity,
        proxy_quantity = excluded.proxy_quantity, updated_at = excluded.updated_at`)
        .bind(user.id, change.cardUuid, change.cardName, change.afterOwned, change.afterProxy, now, change.finish ?? "unspecified")),
    ...(changes.length ? [env.ACCOUNT_DB.prepare("INSERT INTO collection_transactions (id, user_id, source, changes_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(transactionId, user.id, source, JSON.stringify(changes), now)] : []),
  ]); } catch (error) {
    const receipt = await acknowledged();
    if (receipt) return receipt;
    if (error instanceof Error && error.message.includes("Collection changed while saving")) throw new ApiError("Collection changed while saving. Retry to use the latest quantities.",409,"collection_snapshot_conflict");
    throw error;
  }
  return { transactionId, changed: changes.length };
}

export async function listSharedCardWatches(env: Env, user: AuthUser): Promise<SharedCardWatch[]> {
  const rows = await env.ACCOUNT_DB.prepare("SELECT card_uuid, card_name FROM shared_card_watches WHERE user_id = ? ORDER BY card_name COLLATE NOCASE")
    .bind(user.id).all<{ card_uuid: string; card_name: string }>();
  return rows.results.map((row) => ({ cardUuid: row.card_uuid, cardName: row.card_name }));
}

/** Toggles whether a card counts toward the owner's cross-deck sharing checks (see `watchedCardUsage` in the app). Kept in its own table rather than on `collection_entries` so it survives that table deleting a row once owned/proxy quantity both hit 0. */
export async function setSharedCardWatch(env: Env, user: AuthUser, cardUuid: string, value: unknown): Promise<boolean> {
  if (!cardUuid || cardUuid.length > 200) throw badRequest("Invalid card");
  if (!value || typeof value !== "object") throw badRequest("Invalid request");
  const input = value as { cardName?: unknown; watched?: unknown };
  if (typeof input.watched !== "boolean") throw badRequest("watched must be a boolean");
  if (!input.watched) {
    await env.ACCOUNT_DB.prepare("DELETE FROM shared_card_watches WHERE user_id = ? AND card_uuid = ?").bind(user.id, cardUuid).run();
    return true;
  }
  const cardName = typeof input.cardName === "string" ? input.cardName.trim().replace(/\s+/g, " ") : "";
  if (!cardName || cardName.length > 200) throw badRequest("A valid card name is required");
  const count = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count FROM shared_card_watches WHERE user_id = ?").bind(user.id).first<{ count: number }>();
  if ((count?.count ?? 0) >= MAX_SHARED_WATCHES) throw badRequest(`You can track up to ${MAX_SHARED_WATCHES} shared cards`);
  await env.ACCOUNT_DB.prepare(`INSERT INTO shared_card_watches (user_id, card_uuid, card_name, created_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, card_uuid) DO UPDATE SET card_name = excluded.card_name`)
    .bind(user.id, cardUuid, cardName, new Date().toISOString()).run();
  return true;
}

export async function undoCollectionTransaction(env: Env, user: AuthUser, transactionId: string): Promise<boolean> {
  const transaction = await env.ACCOUNT_DB.prepare("SELECT changes_json, undone_at FROM collection_transactions WHERE id = ? AND user_id = ?")
    .bind(transactionId, user.id).first<{ changes_json: string; undone_at: string | null }>();
  if (!transaction) throw new ApiError("Collection change not found", 404, "collection_transaction_not_found");
  if (transaction.undone_at) throw badRequest("This collection change was already undone", "collection_transaction_already_undone");
  const changes = JSON.parse(transaction.changes_json) as StoredChange[];
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.batch([
    ...changes.map((change) => change.editionUuid
      ? change.beforeOwned === 0 && change.beforeProxy === 0
        ? env.ACCOUNT_DB.prepare("DELETE FROM collection_printing_entries WHERE user_id = ? AND edition_uuid = ? AND finish = ?").bind(user.id, change.editionUuid, change.finish ?? "unspecified")
        : env.ACCOUNT_DB.prepare(`INSERT INTO collection_printing_entries
          (user_id, card_uuid, card_name, edition_uuid, set_prefix, collector_number, owned_quantity, proxy_quantity, updated_at, finish) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, edition_uuid, finish) DO UPDATE SET card_name = excluded.card_name, set_prefix = excluded.set_prefix,
          collector_number = excluded.collector_number, owned_quantity = excluded.owned_quantity, proxy_quantity = excluded.proxy_quantity, updated_at = excluded.updated_at`)
          .bind(user.id, change.cardUuid, change.cardName, change.editionUuid, change.setPrefix ?? null, change.collectorNumber ?? null, change.beforeOwned, change.beforeProxy, now, change.finish ?? "unspecified")
      : change.beforeOwned === 0 && change.beforeProxy === 0
      ? env.ACCOUNT_DB.prepare("DELETE FROM collection_entries WHERE user_id = ? AND card_uuid = ? AND finish = ?").bind(user.id, change.cardUuid, change.finish ?? "unspecified")
      : env.ACCOUNT_DB.prepare(`INSERT INTO collection_entries
        (user_id, card_uuid, card_name, owned_quantity, proxy_quantity, updated_at, finish) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, card_uuid, finish) DO UPDATE SET card_name = excluded.card_name, owned_quantity = excluded.owned_quantity,
        proxy_quantity = excluded.proxy_quantity, updated_at = excluded.updated_at`)
        .bind(user.id, change.cardUuid, change.cardName, change.beforeOwned, change.beforeProxy, now, change.finish ?? "unspecified")),
    env.ACCOUNT_DB.prepare("UPDATE collection_transactions SET undone_at = ? WHERE id = ? AND user_id = ? AND undone_at IS NULL").bind(now, transactionId, user.id),
  ]);
  return true;
}
