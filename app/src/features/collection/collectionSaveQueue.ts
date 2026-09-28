import type { CollectionUpdateLine } from "@gatcg/shared";
export const COLLECTION_BATCH_SIZE = 100;
export type CollectionDrafts = Record<string, CollectionUpdateLine>;
export interface CollectionSaveBatch { requestId: string; lines: CollectionDrafts }
export interface CollectionSaveQueue { drafts: CollectionDrafts; pending: CollectionSaveBatch | null }
export const emptyCollectionQueue = (): CollectionSaveQueue => ({drafts:{},pending:null});
export function prepareCollectionBatch(queue: CollectionSaveQueue, requestId: string): CollectionSaveQueue {
  if (queue.pending) return queue;
  const lines = Object.fromEntries(Object.entries(queue.drafts).slice(0,COLLECTION_BATCH_SIZE));
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
      line && typeof line.cardUuid==='string' && typeof line.cardName==='string' && Number.isInteger(line.quantity) && line.quantity>=0 && line.quantity<=9999 &&
      (line.proxyQuantity===undefined || (Number.isInteger(line.proxyQuantity) && line.proxyQuantity>=0 && line.proxyQuantity<=9999)));
  }
  const queue=value as CollectionSaveQueue | null;
  if(!queue || !validDrafts(queue.drafts) || (queue.pending && (typeof queue.pending.requestId!=='string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(queue.pending.requestId) || !validDrafts(queue.pending.lines)))) throw new Error('Saved changes are invalid');
  return {drafts:queue.drafts,pending:queue.pending ?? null};
}
