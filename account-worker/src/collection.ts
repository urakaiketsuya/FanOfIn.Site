import type { CollectionEntry, CollectionTransaction, CollectionUpdateLine, CollectionUpdateMode } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";

const MAX_LINES = 500;
const MAX_QUANTITY = 9_999;
const MAX_SOURCE_LENGTH = 160;

interface StoredChange {
  cardUuid: string;
  cardName: string;
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
    if (!cardUuid || cardUuid.length > 200 || !cardName || cardName.length > 200 || seen.has(cardUuid)) throw badRequest("Invalid or duplicate collection card");
    if (!Number.isInteger(line.quantity) || line.quantity! < 0 || line.quantity! > MAX_QUANTITY) throw badRequest("Invalid collection quantity");
    const proxyQuantity = line.proxyQuantity ?? 0;
    if (!Number.isInteger(proxyQuantity) || proxyQuantity < 0 || proxyQuantity > MAX_QUANTITY) throw badRequest("Invalid proxy quantity");
    seen.add(cardUuid);
    return { cardUuid, cardName, quantity: line.quantity!, proxyQuantity };
  });
}

export async function listCollection(env: Env, user: AuthUser): Promise<{ entries: CollectionEntry[]; transactions: CollectionTransaction[] }> {
  const [entries, transactions] = await Promise.all([
    env.ACCOUNT_DB.prepare("SELECT * FROM collection_entries WHERE user_id = ? ORDER BY card_name COLLATE NOCASE").bind(user.id).all<Record<string, string | number | null>>(),
    env.ACCOUNT_DB.prepare("SELECT id, source, changes_json, created_at, undone_at FROM collection_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").bind(user.id).all<Record<string, string | null>>(),
  ]);
  return {
    entries: entries.results.map((row) => ({ cardUuid: String(row.card_uuid), cardName: String(row.card_name), ownedQuantity: Number(row.owned_quantity), proxyQuantity: Number(row.proxy_quantity), updatedAt: String(row.updated_at) })),
    transactions: transactions.results.map((row) => ({ id: row.id!, source: row.source!, lineCount: (JSON.parse(row.changes_json!) as unknown[]).length, createdAt: row.created_at!, undoneAt: row.undone_at })),
  };
}

export async function updateCollection(env: Env, user: AuthUser, value: unknown): Promise<{ transactionId: string; changed: number }> {
  if (!value || typeof value !== "object") throw badRequest("Invalid collection update");
  const input = value as { mode?: unknown; source?: unknown; lines?: unknown };
  const mode = input.mode as CollectionUpdateMode;
  if (mode !== "add" && mode !== "at-least" && mode !== "set") throw badRequest("Invalid collection update mode");
  const source = typeof input.source === "string" ? input.source.trim().replace(/\s+/g, " ") : "";
  if (!source || source.length > MAX_SOURCE_LENGTH) throw badRequest("A valid collection source is required");
  const lines = parseLines(input.lines);
  const changes: StoredChange[] = [];
  for (const line of lines) {
    const current = await env.ACCOUNT_DB.prepare("SELECT owned_quantity, proxy_quantity FROM collection_entries WHERE user_id = ? AND card_uuid = ?")
      .bind(user.id, line.cardUuid).first<{ owned_quantity: number; proxy_quantity: number }>();
    const beforeOwned = Number(current?.owned_quantity ?? 0);
    const beforeProxy = Number(current?.proxy_quantity ?? 0);
    const afterOwned = mode === "add" ? Math.min(MAX_QUANTITY, beforeOwned + line.quantity) : mode === "at-least" ? Math.max(beforeOwned, line.quantity) : line.quantity;
    const afterProxy = mode === "add" ? Math.min(MAX_QUANTITY, beforeProxy + (line.proxyQuantity ?? 0)) : mode === "at-least" ? Math.max(beforeProxy, line.proxyQuantity ?? 0) : (line.proxyQuantity ?? 0);
    if (afterOwned !== beforeOwned || afterProxy !== beforeProxy || !current) changes.push({ cardUuid: line.cardUuid, cardName: line.cardName, beforeOwned, beforeProxy, afterOwned, afterProxy });
  }
  if (changes.length === 0) return { transactionId: "", changed: 0 };
  const transactionId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.batch([
    ...changes.map((change) => change.afterOwned === 0 && change.afterProxy === 0
      ? env.ACCOUNT_DB.prepare("DELETE FROM collection_entries WHERE user_id = ? AND card_uuid = ?").bind(user.id, change.cardUuid)
      : env.ACCOUNT_DB.prepare(`INSERT INTO collection_entries
        (user_id, card_uuid, card_name, owned_quantity, proxy_quantity, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, card_uuid) DO UPDATE SET card_name = excluded.card_name, owned_quantity = excluded.owned_quantity,
        proxy_quantity = excluded.proxy_quantity, updated_at = excluded.updated_at`)
        .bind(user.id, change.cardUuid, change.cardName, change.afterOwned, change.afterProxy, now)),
    env.ACCOUNT_DB.prepare("INSERT INTO collection_transactions (id, user_id, source, changes_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(transactionId, user.id, source, JSON.stringify(changes), now),
  ]);
  return { transactionId, changed: changes.length };
}

export async function undoCollectionTransaction(env: Env, user: AuthUser, transactionId: string): Promise<boolean> {
  const transaction = await env.ACCOUNT_DB.prepare("SELECT changes_json, undone_at FROM collection_transactions WHERE id = ? AND user_id = ?")
    .bind(transactionId, user.id).first<{ changes_json: string; undone_at: string | null }>();
  if (!transaction) throw new ApiError("Collection change not found", 404, "collection_transaction_not_found");
  if (transaction.undone_at) throw badRequest("This collection change was already undone", "collection_transaction_already_undone");
  const changes = JSON.parse(transaction.changes_json) as StoredChange[];
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.batch([
    ...changes.map((change) => change.beforeOwned === 0 && change.beforeProxy === 0
      ? env.ACCOUNT_DB.prepare("DELETE FROM collection_entries WHERE user_id = ? AND card_uuid = ?").bind(user.id, change.cardUuid)
      : env.ACCOUNT_DB.prepare(`INSERT INTO collection_entries
        (user_id, card_uuid, card_name, owned_quantity, proxy_quantity, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, card_uuid) DO UPDATE SET card_name = excluded.card_name, owned_quantity = excluded.owned_quantity,
        proxy_quantity = excluded.proxy_quantity, updated_at = excluded.updated_at`)
        .bind(user.id, change.cardUuid, change.cardName, change.beforeOwned, change.beforeProxy, now)),
    env.ACCOUNT_DB.prepare("UPDATE collection_transactions SET undone_at = ? WHERE id = ? AND user_id = ? AND undone_at IS NULL").bind(now, transactionId, user.id),
  ]);
  return true;
}
