import type { CollectionCardTracking, CollectionLoan, CollectionDeckAssignment } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";

export async function listCollectionTracking(env: Env, user: AuthUser, cardUuid?: string | string[]): Promise<CollectionCardTracking[]> {
  const ids = typeof cardUuid === "string" ? [cardUuid] : cardUuid;
  const filter = ids?.length ? `AND card_uuid IN (SELECT value FROM json_each(?))` : "";
  const rows = await env.ACCOUNT_DB.prepare(`SELECT * FROM collection_card_tracking WHERE user_id = ? ${filter} ORDER BY card_name COLLATE NOCASE`).bind(user.id,...(ids?.length ? [JSON.stringify(ids)] : [])).all<Record<string, string | number>>();
  const records: CollectionCardTracking[] = rows.results.map(row => ({cardUuid: String(row.card_uuid), cardName: String(row.card_name), mightOwn: Boolean(row.might_own), loans: JSON.parse(String(row.loans_json)), assignments: JSON.parse(String(row.assignments_json)), revision: Number(row.revision), updatedAt: String(row.updated_at)}));
  const trading = await env.ACCOUNT_DB.prepare(`SELECT b.card_uuid,b.card_name,SUM(b.quantity) listed,COALESCE(SUM(r.quantity),0) reserved FROM binder_items b LEFT JOIN (SELECT binder_item_id,SUM(quantity) quantity FROM trade_card_reservations WHERE user_id=? GROUP BY binder_item_id) r ON r.binder_item_id=b.id WHERE b.user_id=? AND b.kind='available' ${filter.replace('card_uuid','b.card_uuid')} GROUP BY b.card_uuid`).bind(user.id,user.id,...(ids?.length ? [JSON.stringify(ids)] : [])).all<{card_uuid:string;card_name:string;listed:number;reserved:number}>();
  const byId = new Map(records.map(record => [record.cardUuid, record]));
  for (const item of trading.results) {
    let record = byId.get(item.card_uuid);
    if (!record) {record={cardUuid:item.card_uuid,cardName:item.card_name,mightOwn:false,loans:[],assignments:[],revision:0,updatedAt:""};records.push(record);}
    record.tradeListedQuantity=item.listed; record.tradeReservedQuantity=item.reserved;
  }
  return records;
}

function prepareTracking(env: Env, user: AuthUser, cardUuid: string, value: unknown) {
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
  const assignments = input.assignments as CollectionDeckAssignment[] | undefined;
  if (assignments !== undefined && (!Array.isArray(assignments) || assignments.length > 100)) throw badRequest("Invalid deck assignments");
  const decks = new Set<string>();
  for (const row of assignments ?? []) {
    if (!row || typeof row.deckId !== "string" || !row.deckId || row.deckId.length > 200 || decks.has(row.deckId) || !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 9999) throw badRequest("Each deck assignment needs a unique deck and 1–9999 copies");
    decks.add(row.deckId);
  }
  const revision = Number(input.revision);
  const updatedAt = new Date().toISOString();
  const assignmentJson = assignments === undefined ? null : JSON.stringify(assignments);
  // The capacity check and revision check run inside the same SQLite statement.
  // Existing over-allocation can be reduced, but cannot be expanded by a new allocation.
  const stock = `(SELECT COALESCE(SUM(owned_quantity),0) FROM (SELECT owned_quantity FROM collection_entries WHERE user_id=? AND card_uuid=? UNION ALL SELECT owned_quantity FROM collection_printing_entries WHERE user_id=? AND card_uuid=?))`;
  const sumAssigned = (json: string) => `(SELECT COALESCE(SUM(json_extract(value,'$.quantity')),0) FROM json_each(${json}))`;
  const sumLoaned = (json: string) => `(SELECT COALESCE(SUM(json_extract(value,'$.quantity')),0) FROM json_each(${json}) WHERE json_extract(value,'$.returnedAt') IS NULL)`;
  const newAssignments = revision === 0 ? "COALESCE(?, '[]')" : "COALESCE(?, assignments_json)";
  const assignmentCount = sumAssigned(newAssignments);
  const lent = loans.filter(loan => !loan.returnedAt).reduce((sum, loan) => sum + loan.quantity, 0);
  const validDecks = `NOT EXISTS (SELECT 1 FROM json_each(${newAssignments}) a WHERE NOT EXISTS (SELECT 1 FROM user_decks d WHERE d.id=json_extract(a.value,'$.deckId') AND d.owner_user_id=?))`;
  const capacity = `${assignmentCount} + ? <= ${stock}`;
  const stockArgs = [user.id,cardUuid,user.id,cardUuid];
  const statement = revision === 0
    ? env.ACCOUNT_DB.prepare(`INSERT INTO collection_card_tracking (user_id,card_uuid,card_name,might_own,loans_json,assignments_json,revision,updated_at) SELECT ?,?,?,?,?,COALESCE(?,'[]'),1,? WHERE ${capacity} AND ${validDecks} ON CONFLICT(user_id,card_uuid) DO NOTHING`)
      .bind(user.id,cardUuid,cardName,Number(input.mightOwn),JSON.stringify(loans),assignmentJson,updatedAt,assignmentJson,lent,...stockArgs,assignmentJson,user.id)
    : env.ACCOUNT_DB.prepare(`UPDATE collection_card_tracking SET card_name=?,might_own=?,loans_json=?,assignments_json=COALESCE(?,assignments_json),revision=revision+1,updated_at=? WHERE user_id=? AND card_uuid=? AND revision=? AND (${capacity} OR (${assignmentCount} + ? <= ${sumAssigned('assignments_json')} + ${sumLoaned('loans_json')} AND ${assignmentCount} <= ${sumAssigned('assignments_json')})) AND ${validDecks}`)
      .bind(cardName,Number(input.mightOwn),JSON.stringify(loans),assignmentJson,updatedAt,user.id,cardUuid,revision,assignmentJson,lent,...stockArgs,assignmentJson,lent,assignmentJson,assignmentJson,user.id);
  return {statement, cardName, loans, assignments, mightOwn: input.mightOwn, revision};
}

export async function saveCollectionTracking(env: Env, user: AuthUser, cardUuid: string, value: unknown): Promise<CollectionCardTracking> {
  const {statement} = prepareTracking(env,user,cardUuid,value);
  const result = await statement.run();
  if (!result.meta.changes) throw new ApiError("Locations changed in another tab, a deck is unavailable, or assigned and lent copies exceed ownership. Reload locations and reconcile quantities before retrying.",409,"tracking_conflict");
  return (await listCollectionTracking(env,user,cardUuid))[0];
}

/** D1 batch is transactional: a failed assertion rolls back every preceding write.
 * Exact revision+content matches permit replay after a response was interrupted.
 */
export async function saveCollectionTrackingBatch(env: Env, user: AuthUser, value: unknown): Promise<CollectionCardTracking[]> {
  const cards = (value as {cards?: unknown})?.cards;
  if (!Array.isArray(cards) || !cards.length || cards.length > 100) throw badRequest("Send 1–100 card locations at a time");
  const seen = new Set<string>();
  const statements: D1PreparedStatement[] = [];
  for (const card of cards) {
    if (!card || typeof card.cardUuid !== "string" || seen.has(card.cardUuid) || !Array.isArray(card.assignments)) throw badRequest("Each card needs a unique ID and assignments");
    seen.add(card.cardUuid);
    const prepared = prepareTracking(env,user,card.cardUuid,card);
    statements.push(prepared.statement);
    statements.push(env.ACCOUNT_DB.prepare(`SELECT CASE WHEN EXISTS (
      SELECT 1 FROM collection_card_tracking WHERE user_id=? AND card_uuid=? AND revision=?
      AND card_name=? AND might_own=? AND loans_json=? AND assignments_json=?
    ) THEN 1 ELSE json('tracking_conflict') END`).bind(user.id,card.cardUuid,prepared.revision+1,prepared.cardName,Number(prepared.mightOwn),JSON.stringify(prepared.loans),JSON.stringify(prepared.assignments)));
  }
  try { await env.ACCOUNT_DB.batch(statements); }
  catch (reason) {
    if (/JSON|tracking_conflict|reserv/i.test(String(reason))) throw new ApiError("Locations changed or copies are unavailable. Reload locations before retrying.",409,"tracking_conflict");
    throw reason;
  }
  return await listCollectionTracking(env,user,[...seen]);
}
