import { isCardFinish } from "@gatcg/shared";
import type { CollectionUpdateLine } from "@gatcg/shared";
export const COLLECTION_BATCH_SIZE = 100;
export type CollectionDrafts = Record<string, CollectionUpdateLine>;
export interface CollectionSaveBatch { requestId: string; lines: CollectionDrafts }
export interface CollectionSaveQueue { drafts: CollectionDrafts; pending: CollectionSaveBatch | null }
export const emptyCollectionQueue = (): CollectionSaveQueue => ({drafts:{},pending:null});
export function prepareCollectionBatch(queue: CollectionSaveQueue, requestId: string): CollectionSaveQueue {
  if (queue.pending) return queue;
  // A card's unspecified and printing pools are one atomic inventory adjustment.
  const groups = new Map<string, [string, CollectionUpdateLine][]>();
  for (const entry of Object.entries(queue.drafts)) { const group = groups.get(entry[1].cardUuid) ?? []; group.push(entry); groups.set(entry[1].cardUuid, group); }
  const selected: [string, CollectionUpdateLine][] = [];
  for (const group of groups.values()) {
    if (group.length > 500) throw new Error("Too many printings for one card. Review its quantities before saving.");
    if (selected.length && selected.length + group.length > COLLECTION_BATCH_SIZE) break;
    selected.push(...group);
  }
  const lines = Object.fromEntries(selected);
  return Object.keys(lines).length ? {...queue,pending:{requestId,lines}} : queue;
}
export function acknowledgeCollectionBatch(queue: CollectionSaveQueue, requestId: string): CollectionSaveQueue {
  if (queue.pending?.requestId !== requestId) return queue;
  const drafts = {...queue.drafts};
  for (const [key,line] of Object.entries(queue.pending.lines)) {
    if (JSON.stringify(drafts[key]) === JSON.stringify(line)) delete drafts[key];
  }
  return {drafts,pending:null};
}
/** Only transient failures are retried; the caller reuses the same persisted request ID. */
export async function sendCollectionBatch(send: () => Promise<unknown>, pause = (ms: number) => new Promise(resolve => setTimeout(resolve,ms))) {
  for (let attempt=0; ; attempt++) {
    try { return await send(); }
    catch(error) {
      const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : undefined;
      if (attempt>=2 || (status !== undefined && status !== 408 && status < 500)) throw error;
      await pause(1000 * 2 ** attempt);
    }
  }
}

export function parseCollectionQueue(value: unknown): CollectionSaveQueue {
  function validDrafts(value: unknown): value is CollectionDrafts {
    return !!value && typeof value==='object' && !Array.isArray(value) && Object.values(value).every(line =>
      line && (line.finish === undefined || isCardFinish(line.finish)) && typeof line.cardUuid==='string' && typeof line.cardName==='string' && Number.isInteger(line.quantity) && line.quantity>=0 && line.quantity<=9999 &&
      (line.proxyQuantity===undefined || (Number.isInteger(line.proxyQuantity) && line.proxyQuantity>=0 && line.proxyQuantity<=9999)));
  }
  const queue=value as CollectionSaveQueue | null;
  if(!queue || !validDrafts(queue.drafts) || (queue.pending && (typeof queue.pending.requestId!=='string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(queue.pending.requestId) || !validDrafts(queue.pending.lines)))) throw new Error('Saved changes are invalid');
  return {drafts:queue.drafts,pending:queue.pending ?? null};
}
