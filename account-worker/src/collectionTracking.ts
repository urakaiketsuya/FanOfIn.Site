import type { CollectionCardTracking, CollectionLoan } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";

export async function listCollectionTracking(env: Env, user: AuthUser): Promise<CollectionCardTracking[]> {
  const rows = await env.ACCOUNT_DB.prepare("SELECT * FROM collection_card_tracking WHERE user_id = ? ORDER BY card_name COLLATE NOCASE").bind(user.id).all<Record<string, string | number>>();
  return rows.results.map(row => ({cardUuid: String(row.card_uuid), cardName: String(row.card_name), mightOwn: Boolean(row.might_own), loans: JSON.parse(String(row.loans_json)), revision: Number(row.revision), updatedAt: String(row.updated_at)}));
}

export async function saveCollectionTracking(env: Env, user: AuthUser, cardUuid: string, value: unknown): Promise<CollectionCardTracking> {
  if (!cardUuid.trim() || cardUuid.length > 200 || !value || typeof value !== "object") throw badRequest("Invalid card tracking record");
  const input = value as Record<string, unknown>;
  const cardName = typeof input.cardName === "string" ? input.cardName.trim() : "";
  if (!cardName || cardName.length > 200 || typeof input.mightOwn !== "boolean" || !Number.isSafeInteger(input.revision) || Number(input.revision) < 0 || !Array.isArray(input.loans) || input.loans.length > 100) throw badRequest("Invalid card tracking details");
  const ids = new Set<string>();
  const loans: CollectionLoan[] = input.loans.map(raw => {
    if (!raw || typeof raw !== "object") throw badRequest("Invalid loan");
    const loan = raw as CollectionLoan;
    const borrower = typeof loan.borrower === "string" ? loan.borrower.trim() : "";
    if (typeof loan.id !== "string" || !loan.id || loan.id.length > 100 || ids.has(loan.id) || !borrower || borrower.length > 120 || !Number.isSafeInteger(loan.quantity) || loan.quantity < 1 || loan.quantity > 9999) throw badRequest("Each loan needs a borrower and 1–9999 copies");
    const validDate = (date: unknown): date is string => typeof date === "string" && date.length <= 30 && Number.isFinite(Date.parse(date));
    if (!validDate(loan.lentAt) || (loan.returnedAt !== undefined && (!validDate(loan.returnedAt) || Date.parse(loan.returnedAt) < Date.parse(loan.lentAt)))) throw badRequest("Invalid loan date");
    ids.add(loan.id);
    return {id: loan.id, borrower, quantity: loan.quantity, lentAt: loan.lentAt, ...(loan.returnedAt ? {returnedAt: loan.returnedAt} : {})};
  });
  const revision = Number(input.revision);
  const updatedAt = new Date().toISOString();
  // Compare-and-swap prevents a stale tab from silently overwriting newer borrower records.
  const statement = revision === 0
    ? env.ACCOUNT_DB.prepare("INSERT INTO collection_card_tracking (user_id, card_uuid, card_name, might_own, loans_json, revision, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?) ON CONFLICT(user_id, card_uuid) DO NOTHING").bind(user.id, cardUuid, cardName, Number(input.mightOwn), JSON.stringify(loans), updatedAt)
    : env.ACCOUNT_DB.prepare("UPDATE collection_card_tracking SET card_name=?, might_own=?, loans_json=?, revision=revision+1, updated_at=? WHERE user_id=? AND card_uuid=? AND revision=?").bind(cardName, Number(input.mightOwn), JSON.stringify(loans), updatedAt, user.id, cardUuid, revision);
  const result = await statement.run();
  if (!result.meta.changes) throw new ApiError("These notes changed in another tab. Close the editor and reload tracking before trying again.", 409, "tracking_conflict");
  return {cardUuid, cardName, mightOwn: input.mightOwn, loans, revision: revision+1, updatedAt};
}
