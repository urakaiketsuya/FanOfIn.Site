import type { AuthUser, Env } from "./auth";
import type { BinderItem, BinderItemKind, BinderSettings, PublicBinder, Trade, TradeLine, TradeMethod, TradeStatus } from "@gatcg/shared";
import { ApiError, badRequest } from "./errors";

const ACTIVE_RESERVATIONS: TradeStatus[] = ["accepted", "sender_sent", "recipient_sent", "both_sent"];

function settings(row?: Record<string, unknown> | null): BinderSettings {
  return { public: Boolean(row?.is_public), tradeMethod: (row?.trade_method as TradeMethod) ?? "either", location: String(row?.location ?? ""), notes: String(row?.notes ?? ""), updatedAt: row?.updated_at ? String(row.updated_at) : null };
}

async function reservations(env: Env): Promise<Map<string, number>> {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT r.lines_json FROM trades t JOIN trade_revisions r ON r.trade_id = t.id AND r.revision_number = t.current_revision
    WHERE t.status IN ('accepted', 'sender_sent', 'recipient_sent', 'both_sent')`).all<{ lines_json: string }>();
  const result = new Map<string, number>();
  for (const row of rows.results) for (const line of JSON.parse(row.lines_json) as TradeLine[]) result.set(line.binderItemId, (result.get(line.binderItemId) ?? 0) + line.quantity);
  return result;
}

function mapItem(row: Record<string, unknown>, reserved: number): BinderItem {
  return { id: String(row.id), kind: row.kind as BinderItemKind, cardUuid: String(row.card_uuid), cardName: String(row.card_name), editionUuid: row.edition_uuid ? String(row.edition_uuid) : null, setPrefix: row.set_prefix ? String(row.set_prefix) : null, collectorNumber: row.collector_number ? String(row.collector_number) : null, quantity: Number(row.quantity), reservedQuantity: reserved, condition: String(row.condition), language: String(row.language), acceptsAlternatives: Boolean(row.accepts_alternatives), updatedAt: String(row.updated_at) };
}

async function itemsForUser(env: Env, userId: string): Promise<BinderItem[]> {
  const [rows, reserved] = await Promise.all([env.ACCOUNT_DB.prepare("SELECT * FROM binder_items WHERE user_id = ? ORDER BY kind, card_name COLLATE NOCASE").bind(userId).all<Record<string, unknown>>(), reservations(env)]);
  return rows.results.map((row) => mapItem(row, reserved.get(String(row.id)) ?? 0));
}

export async function myBinder(env: Env, user: AuthUser): Promise<{ settings: BinderSettings; items: BinderItem[] }> {
  const row = await env.ACCOUNT_DB.prepare("SELECT * FROM binder_settings WHERE user_id = ?").bind(user.id).first<Record<string, unknown>>();
  return { settings: settings(row), items: await itemsForUser(env, user.id) };
}

export async function publicBinder(env: Env, profileSlug: string): Promise<PublicBinder | null> {
  const owner = await env.ACCOUNT_DB.prepare(`SELECT u.id, u.display_name, u.profile_slug, s.* FROM users u JOIN binder_settings s ON s.user_id = u.id
    WHERE u.profile_slug = ? AND u.profile_discoverable = 1 AND s.is_public = 1`).bind(profileSlug).first<Record<string, unknown>>();
  if (!owner) return null;
  return { owner: { displayName: String(owner.display_name), profileSlug: String(owner.profile_slug) }, settings: settings(owner), items: await itemsForUser(env, String(owner.id)) };
}

export async function saveBinderSettings(env: Env, user: AuthUser, value: unknown): Promise<BinderSettings> {
  const input = value as Partial<BinderSettings> | null;
  if (!input || typeof input.public !== "boolean" || !["local", "shipping", "either"].includes(String(input.tradeMethod))) throw badRequest("Invalid binder settings");
  const location = typeof input.location === "string" ? input.location.trim().slice(0, 100) : "";
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 500) : "";
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.prepare(`INSERT INTO binder_settings (user_id, is_public, trade_method, location, notes, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET is_public = excluded.is_public, trade_method = excluded.trade_method, location = excluded.location, notes = excluded.notes, updated_at = excluded.updated_at`)
    .bind(user.id, input.public ? 1 : 0, input.tradeMethod, location, notes, now).run();
  return { public: input.public, tradeMethod: input.tradeMethod!, location, notes, updatedAt: now };
}

function parseItem(value: unknown): Omit<BinderItem, "id" | "reservedQuantity" | "updatedAt"> {
  const input = value as Partial<BinderItem> | null;
  const kind = input?.kind;
  const cardUuid = typeof input?.cardUuid === "string" ? input.cardUuid.trim() : "";
  const cardName = typeof input?.cardName === "string" ? input.cardName.trim().replace(/\s+/g, " ") : "";
  if (!input || !["available", "wanted"].includes(String(kind)) || !cardUuid || !cardName || !Number.isInteger(input.quantity) || input.quantity! < 1 || input.quantity! > 999) throw badRequest("Invalid binder item");
  return { kind: kind!, cardUuid, cardName, editionUuid: typeof input.editionUuid === "string" && input.editionUuid ? input.editionUuid : null, setPrefix: typeof input.setPrefix === "string" ? input.setPrefix.slice(0, 40) : null, collectorNumber: typeof input.collectorNumber === "string" ? input.collectorNumber.slice(0, 80) : null, quantity: input.quantity!, condition: typeof input.condition === "string" ? input.condition.trim().slice(0, 40) || "Any" : "Any", language: typeof input.language === "string" ? input.language.trim().slice(0, 40) || "Any" : "Any", acceptsAlternatives: input.acceptsAlternatives !== false };
}

async function assertOwned(env: Env, userId: string, item: ReturnType<typeof parseItem>, excludeId?: string): Promise<void> {
  if (item.kind !== "available") return;
  const owned = item.editionUuid
    ? await env.ACCOUNT_DB.prepare("SELECT owned_quantity FROM collection_printing_entries WHERE user_id = ? AND edition_uuid = ?").bind(userId, item.editionUuid).first<{ owned_quantity: number }>()
    : await env.ACCOUNT_DB.prepare("SELECT owned_quantity FROM collection_entries WHERE user_id = ? AND card_uuid = ?").bind(userId, item.cardUuid).first<{ owned_quantity: number }>();
  const published = item.editionUuid
    ? await env.ACCOUNT_DB.prepare("SELECT COALESCE(SUM(quantity), 0) total FROM binder_items WHERE user_id=? AND kind='available' AND edition_uuid=? AND id != ?").bind(userId, item.editionUuid, excludeId ?? "").first<{ total: number }>()
    : await env.ACCOUNT_DB.prepare("SELECT COALESCE(SUM(quantity), 0) total FROM binder_items WHERE user_id=? AND kind='available' AND card_uuid=? AND edition_uuid IS NULL AND id != ?").bind(userId, item.cardUuid, excludeId ?? "").first<{ total: number }>();
  if ((owned?.owned_quantity ?? 0) < item.quantity + Number(published?.total ?? 0)) throw badRequest("Published availability cannot exceed your collection quantity");
  if (excludeId) {
    const reserved = (await reservations(env)).get(excludeId) ?? 0;
    if (reserved > item.quantity) throw badRequest("Quantity cannot be lower than copies reserved by accepted trades");
  }
}

export async function createBinderItem(env: Env, user: AuthUser, value: unknown): Promise<{ id: string }> {
  const item = parseItem(value); await assertOwned(env, user.id, item);
  const id = crypto.randomUUID(), now = new Date().toISOString();
  await env.ACCOUNT_DB.prepare(`INSERT INTO binder_items (id, user_id, kind, card_uuid, card_name, edition_uuid, set_prefix, collector_number, quantity, condition, language, accepts_alternatives, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, user.id, item.kind, item.cardUuid, item.cardName, item.editionUuid, item.setPrefix, item.collectorNumber, item.quantity, item.condition, item.language, item.acceptsAlternatives ? 1 : 0, now).run();
  return { id };
}

export async function updateBinderItem(env: Env, user: AuthUser, id: string, value: unknown): Promise<void> {
  const item = parseItem(value); await assertOwned(env, user.id, item, id);
  const result = await env.ACCOUNT_DB.prepare(`UPDATE binder_items SET kind = ?, card_uuid = ?, card_name = ?, edition_uuid = ?, set_prefix = ?, collector_number = ?, quantity = ?, condition = ?, language = ?, accepts_alternatives = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
    .bind(item.kind, item.cardUuid, item.cardName, item.editionUuid, item.setPrefix, item.collectorNumber, item.quantity, item.condition, item.language, item.acceptsAlternatives ? 1 : 0, new Date().toISOString(), id, user.id).run();
  if (result.meta.changes !== 1) throw new ApiError("Binder item not found", 404, "binder_item_not_found");
}

export async function deleteBinderItem(env: Env, user: AuthUser, id: string): Promise<void> {
  if (((await reservations(env)).get(id) ?? 0) > 0) throw badRequest("An accepted trade reserves this item");
  const result = await env.ACCOUNT_DB.prepare("DELETE FROM binder_items WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  if (result.meta.changes !== 1) throw new ApiError("Binder item not found", 404, "binder_item_not_found");
}

export async function binderMatches(env: Env, user: AuthUser): Promise<PublicBinder[]> {
  const mine = await itemsForUser(env, user.id);
  const wanted = new Set(mine.filter((item) => item.kind === "wanted").map((item) => item.cardUuid));
  const available = new Set(mine.filter((item) => item.kind === "available").map((item) => item.cardUuid));
  if (!wanted.size && !available.size) return [];
  const profiles = await env.ACCOUNT_DB.prepare(`SELECT u.profile_slug FROM users u JOIN binder_settings s ON s.user_id = u.id WHERE u.id != ? AND u.profile_discoverable = 1 AND s.is_public = 1`).bind(user.id).all<{ profile_slug: string }>();
  const result: PublicBinder[] = [];
  for (const profile of profiles.results) {
    const binder = await publicBinder(env, profile.profile_slug);
    if (binder && binder.items.some((item) => (item.kind === "available" && wanted.has(item.cardUuid) && item.quantity > item.reservedQuantity) || (item.kind === "wanted" && available.has(item.cardUuid)))) result.push(binder);
  }
  return result.slice(0, 50);
}

function parseLines(value: unknown): Array<Pick<TradeLine, "binderItemId" | "quantity">> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw badRequest("An offer needs 1–100 card lines");
  const seen = new Set<string>();
  return value.map((raw) => { const line = raw as { binderItemId?: unknown; quantity?: unknown }; if (typeof line.binderItemId !== "string" || seen.has(line.binderItemId) || !Number.isInteger(line.quantity) || Number(line.quantity) < 1 || Number(line.quantity) > 999) throw badRequest("Invalid or duplicate offer line"); seen.add(line.binderItemId); return { binderItemId: line.binderItemId, quantity: Number(line.quantity) }; });
}

async function snapshotLines(env: Env, senderId: string, recipientId: string, raw: unknown): Promise<TradeLine[]> {
  const requested = parseLines(raw), reserved = await reservations(env), lines: TradeLine[] = [];
  for (const request of requested) {
    const row = await env.ACCOUNT_DB.prepare("SELECT * FROM binder_items WHERE id = ? AND kind = 'available' AND user_id IN (?, ?)").bind(request.binderItemId, senderId, recipientId).first<Record<string, unknown>>();
    if (!row) throw badRequest("Offer cards must come from either public binder");
    const free = Number(row.quantity) - (reserved.get(String(row.id)) ?? 0);
    if (request.quantity > free) throw badRequest(`${String(row.card_name)} no longer has enough available copies`);
    lines.push({ direction: String(row.user_id) === senderId ? "sender_gives" : "recipient_gives", binderItemId: String(row.id), cardUuid: String(row.card_uuid), cardName: String(row.card_name), editionUuid: row.edition_uuid ? String(row.edition_uuid) : null, setPrefix: row.set_prefix ? String(row.set_prefix) : null, collectorNumber: row.collector_number ? String(row.collector_number) : null, quantity: request.quantity });
  }
  return lines;
}

async function tradeFor(env: Env, user: AuthUser, id: string): Promise<Record<string, unknown>> {
  const row = await env.ACCOUNT_DB.prepare("SELECT * FROM trades WHERE id = ? AND (sender_user_id = ? OR recipient_user_id = ?)").bind(id, user.id, user.id).first<Record<string, unknown>>();
  if (!row) throw new ApiError("Trade not found", 404, "trade_not_found");
  return row;
}

export async function createTrade(env: Env, user: AuthUser, value: unknown): Promise<{ id: string }> {
  const input = value as { recipientProfileSlug?: unknown; lines?: unknown; message?: unknown } | null;
  if (!input || typeof input.recipientProfileSlug !== "string") throw badRequest("A trade partner is required");
  const recipient = await env.ACCOUNT_DB.prepare(`SELECT u.id FROM users u JOIN binder_settings s ON s.user_id = u.id WHERE u.profile_slug = ? AND s.is_public = 1`).bind(input.recipientProfileSlug).first<{ id: string }>();
  if (!recipient || recipient.id === user.id) throw badRequest("Trade partner is unavailable");
  const lines = await snapshotLines(env, user.id, recipient.id, input.lines);
  const now = new Date().toISOString(), id = crypto.randomUUID(), message = typeof input.message === "string" ? input.message.trim().slice(0, 1_000) : "";
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("INSERT INTO trades (id, sender_user_id, recipient_user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'sent', ?, ?)").bind(id, user.id, recipient.id, now, now),
    env.ACCOUNT_DB.prepare("INSERT INTO trade_revisions (trade_id, revision_number, proposer_user_id, message, lines_json, created_at) VALUES (?, 1, ?, ?, ?, ?)").bind(id, user.id, message, JSON.stringify(lines), now),
    env.ACCOUNT_DB.prepare("INSERT INTO trade_events (id, trade_id, actor_user_id, event_type, created_at) VALUES (?, ?, ?, 'sent', ?)").bind(crypto.randomUUID(), id, user.id, now),
  ]);
  return { id };
}

export async function listTrades(env: Env, user: AuthUser): Promise<Trade[]> {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT t.*, su.display_name sender_name, su.profile_slug sender_slug, ru.display_name recipient_name, ru.profile_slug recipient_slug,
    r.proposer_user_id, r.message, r.lines_json, r.created_at revision_created, pu.profile_slug proposer_slug
    FROM trades t JOIN users su ON su.id=t.sender_user_id JOIN users ru ON ru.id=t.recipient_user_id
    JOIN trade_revisions r ON r.trade_id=t.id AND r.revision_number=t.current_revision JOIN users pu ON pu.id=r.proposer_user_id
    WHERE t.sender_user_id=? OR t.recipient_user_id=? ORDER BY t.updated_at DESC`).bind(user.id, user.id).all<Record<string, unknown>>();
  return rows.results.map((row) => ({ id: String(row.id), status: row.status as TradeStatus, sender: { displayName: String(row.sender_name), profileSlug: String(row.sender_slug) }, recipient: { displayName: String(row.recipient_name), profileSlug: String(row.recipient_slug) }, currentRevision: { number: Number(row.current_revision), proposerProfileSlug: String(row.proposer_slug), message: String(row.message), lines: JSON.parse(String(row.lines_json)) as TradeLine[], createdAt: String(row.revision_created) }, createdAt: String(row.created_at), updatedAt: String(row.updated_at) }));
}

export async function counterTrade(env: Env, user: AuthUser, id: string, value: unknown): Promise<void> {
  const trade = await tradeFor(env, user, id);
  if (!["sent", "countered"].includes(String(trade.status))) throw badRequest("This offer can no longer be revised");
  const current = await env.ACCOUNT_DB.prepare("SELECT proposer_user_id FROM trade_revisions WHERE trade_id=? AND revision_number=?").bind(id, trade.current_revision).first<{ proposer_user_id: string }>();
  if (current?.proposer_user_id === user.id) throw badRequest("The other trader must respond to your offer");
  const input = value as { lines?: unknown; message?: unknown } | null;
  const lines = await snapshotLines(env, String(trade.sender_user_id), String(trade.recipient_user_id), input?.lines);
  const revision = Number(trade.current_revision) + 1, now = new Date().toISOString();
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("INSERT INTO trade_revisions (trade_id, revision_number, proposer_user_id, message, lines_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id, revision, user.id, typeof input?.message === "string" ? input.message.trim().slice(0, 1_000) : "", JSON.stringify(lines), now),
    env.ACCOUNT_DB.prepare("UPDATE trades SET status='countered', current_revision=?, updated_at=? WHERE id=?").bind(revision, now, id),
    env.ACCOUNT_DB.prepare("INSERT INTO trade_events (id, trade_id, actor_user_id, event_type, created_at) VALUES (?, ?, ?, 'countered', ?)").bind(crypto.randomUUID(), id, user.id, now),
  ]);
}

export async function updateTradeStatus(env: Env, user: AuthUser, id: string, next: unknown): Promise<void> {
  if (typeof next !== "string") throw badRequest("Trade status is required");
  const trade = await tradeFor(env, user, id), current = String(trade.status) as TradeStatus;
  const sender = String(trade.sender_user_id) === user.id;
  let status: TradeStatus;
  if (next === "accepted" && ["sent", "countered"].includes(current)) status = "accepted";
  else if (next === "declined" && ["sent", "countered"].includes(current)) status = "declined";
  else if (next === "cancelled" && ["sent", "countered", "accepted"].includes(current)) status = "cancelled";
  else if (next === "disputed" && ["accepted", "sender_sent", "recipient_sent", "both_sent"].includes(current)) status = "disputed";
  else if (next === "sent" && ACTIVE_RESERVATIONS.includes(current)) status = current === "both_sent" ? current : current === (sender ? "recipient_sent" : "sender_sent") ? "both_sent" : sender ? "sender_sent" : "recipient_sent";
  else if (next === "received" && current === "both_sent") {
    const column = sender ? "sender_received" : "recipient_received";
    await env.ACCOUNT_DB.prepare(`UPDATE trades SET ${column}=1, updated_at=? WHERE id=?`).bind(new Date().toISOString(), id).run();
    const receipt = await env.ACCOUNT_DB.prepare("SELECT sender_received, recipient_received FROM trades WHERE id=?").bind(id).first<{ sender_received: number; recipient_received: number }>();
    if (!receipt?.sender_received || !receipt.recipient_received) {
      await env.ACCOUNT_DB.prepare("INSERT INTO trade_events (id, trade_id, actor_user_id, event_type, created_at) VALUES (?, ?, ?, 'received', ?)").bind(crypto.randomUUID(), id, user.id, new Date().toISOString()).run();
      return;
    }
    status = "completed";
  }
  else throw badRequest("That trade action is not available");
  if (status === "accepted") {
    const revision = await env.ACCOUNT_DB.prepare("SELECT lines_json FROM trade_revisions WHERE trade_id=? AND revision_number=?").bind(id, trade.current_revision).first<{ lines_json: string }>();
    if (revision) {
      const currentRevision = await env.ACCOUNT_DB.prepare("SELECT proposer_user_id FROM trade_revisions WHERE trade_id=? AND revision_number=?").bind(id, trade.current_revision).first<{ proposer_user_id: string }>();
      if (currentRevision?.proposer_user_id === user.id) throw badRequest("The other trader must accept this offer");
    }
    await snapshotLines(env, String(trade.sender_user_id), String(trade.recipient_user_id), (JSON.parse(revision!.lines_json) as TradeLine[]).map((line) => ({ binderItemId: line.binderItemId, quantity: line.quantity })));
  }
  const now = new Date().toISOString();
  if (status === "completed") { await applyCompletedTrade(env, trade, user.id, now); return; }
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("UPDATE trades SET status=?, updated_at=? WHERE id=?").bind(status, now, id),
    env.ACCOUNT_DB.prepare("INSERT INTO trade_events (id, trade_id, actor_user_id, event_type, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, user.id, status, now),
  ]);
}

async function applyCompletedTrade(env: Env, trade: Record<string, unknown>, actorUserId: string, now: string): Promise<void> {
  const revision = await env.ACCOUNT_DB.prepare("SELECT lines_json FROM trade_revisions WHERE trade_id=? AND revision_number=?").bind(trade.id, trade.current_revision).first<{ lines_json: string }>();
  if (!revision) throw badRequest("Trade revision is unavailable");
  const lines = JSON.parse(revision.lines_json) as TradeLine[];
  const statements: D1PreparedStatement[] = [];
  const changes = new Map<string, Array<Record<string, unknown>>>();
  for (const line of lines) {
    const giver = line.direction === "sender_gives" ? String(trade.sender_user_id) : String(trade.recipient_user_id);
    const receiver = line.direction === "sender_gives" ? String(trade.recipient_user_id) : String(trade.sender_user_id);
    const table = line.editionUuid ? "collection_printing_entries" : "collection_entries";
    const keyColumn = line.editionUuid ? "edition_uuid" : "card_uuid";
    const key = line.editionUuid ?? line.cardUuid;
    const giverRow = await env.ACCOUNT_DB.prepare(`SELECT owned_quantity, proxy_quantity FROM ${table} WHERE user_id=? AND ${keyColumn}=?`).bind(giver, key).first<{ owned_quantity: number; proxy_quantity: number }>();
    if (!giverRow || giverRow.owned_quantity < line.quantity) throw badRequest(`${line.cardName} is no longer available in the giver's collection`);
    const receiverRow = await env.ACCOUNT_DB.prepare(`SELECT owned_quantity, proxy_quantity FROM ${table} WHERE user_id=? AND ${keyColumn}=?`).bind(receiver, key).first<{ owned_quantity: number; proxy_quantity: number }>();
    const giverAfter = giverRow.owned_quantity - line.quantity, receiverBefore = receiverRow?.owned_quantity ?? 0, receiverAfter = receiverBefore + line.quantity;
    if (line.editionUuid) {
      statements.push(env.ACCOUNT_DB.prepare(`UPDATE collection_printing_entries SET owned_quantity=?, updated_at=? WHERE user_id=? AND edition_uuid=?`).bind(giverAfter, now, giver, key));
      statements.push(env.ACCOUNT_DB.prepare(`INSERT INTO collection_printing_entries (user_id, card_uuid, card_name, edition_uuid, set_prefix, collector_number, owned_quantity, proxy_quantity, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
        ON CONFLICT(user_id, edition_uuid) DO UPDATE SET owned_quantity=excluded.owned_quantity, updated_at=excluded.updated_at`).bind(receiver, line.cardUuid, line.cardName, line.editionUuid, line.setPrefix, line.collectorNumber, receiverAfter, now));
    } else {
      statements.push(env.ACCOUNT_DB.prepare(`UPDATE collection_entries SET owned_quantity=?, updated_at=? WHERE user_id=? AND card_uuid=?`).bind(giverAfter, now, giver, key));
      statements.push(env.ACCOUNT_DB.prepare(`INSERT INTO collection_entries (user_id, card_uuid, card_name, owned_quantity, proxy_quantity, updated_at) VALUES (?, ?, ?, ?, 0, ?)
        ON CONFLICT(user_id, card_uuid) DO UPDATE SET owned_quantity=excluded.owned_quantity, updated_at=excluded.updated_at`).bind(receiver, line.cardUuid, line.cardName, receiverAfter, now));
    }
    const binderItem = await env.ACCOUNT_DB.prepare("SELECT quantity FROM binder_items WHERE id=?").bind(line.binderItemId).first<{ quantity: number }>();
    if (!binderItem || binderItem.quantity < line.quantity) throw badRequest(`${line.cardName} is no longer available in the binder`);
    statements.push(binderItem.quantity === line.quantity
      ? env.ACCOUNT_DB.prepare("DELETE FROM binder_items WHERE id=?").bind(line.binderItemId)
      : env.ACCOUNT_DB.prepare("UPDATE binder_items SET quantity=quantity-?, updated_at=? WHERE id=?").bind(line.quantity, now, line.binderItemId));
    for (const [userId, before, after] of [[giver, giverRow.owned_quantity, giverAfter], [receiver, receiverBefore, receiverAfter]] as const) {
      const list = changes.get(userId) ?? [];
      const proxy = userId === giver ? giverRow.proxy_quantity : (receiverRow?.proxy_quantity ?? 0);
      list.push({ cardUuid: line.cardUuid, cardName: line.cardName, editionUuid: line.editionUuid ?? undefined, setPrefix: line.setPrefix ?? undefined, collectorNumber: line.collectorNumber ?? undefined, beforeOwned: before, beforeProxy: proxy, afterOwned: after, afterProxy: proxy });
      changes.set(userId, list);
    }
  }
  for (const [userId, userChanges] of changes) statements.push(env.ACCOUNT_DB.prepare("INSERT INTO collection_transactions (id, user_id, source, changes_json, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, `Completed trade ${String(trade.id).slice(0, 8)}`, JSON.stringify(userChanges), now));
  statements.push(env.ACCOUNT_DB.prepare("UPDATE trades SET status='completed', updated_at=? WHERE id=? AND status='both_sent'").bind(now, trade.id));
  statements.push(env.ACCOUNT_DB.prepare("INSERT INTO trade_events (id, trade_id, actor_user_id, event_type, created_at) VALUES (?, ?, ?, 'completed', ?)").bind(crypto.randomUUID(), trade.id, actorUserId, now));
  await env.ACCOUNT_DB.batch(statements);
}
