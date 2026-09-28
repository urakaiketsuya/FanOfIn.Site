import type { BinderItem } from './trade-types.js';
import type { CollectionEntry, CollectionCardTracking } from './collection-types.js';
import { cardLocationState } from './cardLocations.js';

/** Listings are intent, reservations are commitments. Printing pools remain distinct. */
export function tradeAvailability(cardUuid: string, entries: CollectionEntry[], record: CollectionCardTracking | undefined, items: BinderItem[]) {
  const state = cardLocationState(cardUuid, entries, record ? {...record,tradeReservedQuantity:0} : undefined);
  const listed = items.filter(item => item.kind === 'available' && item.cardUuid === cardUuid);
  const reserved = listed.reduce((sum,item) => sum + item.reservedQuantity,0);
  const published = listed.reduce((sum,item) => sum + item.quantity,0);
  return {...state, reserved, published, free: Math.max(0,state.unassigned-reserved), listable:Math.max(0,state.unassigned-published)};
}

/** Deterministically cap public availability when ownership or locations change. */
export function effectiveBinderItems(entries: CollectionEntry[], records: CollectionCardTracking[], items: BinderItem[]): BinderItem[] {
  const remaining = new Map<string,number>();
  const pools = new Map<string,number>();
  const key = (uuid: string, edition?: string|null) => JSON.stringify([uuid,edition ?? null]);
  for(const entry of entries) pools.set(key(entry.cardUuid,entry.editionUuid),entry.ownedQuantity);
  for(const item of items) if(item.kind==='available') {
    if(!remaining.has(item.cardUuid)) remaining.set(item.cardUuid,tradeAvailability(item.cardUuid,entries,records.find(r=>r.cardUuid===item.cardUuid),items).free);
    const k=key(item.cardUuid,item.editionUuid); pools.set(k,Math.max(0,(pools.get(k)??0)-item.reservedQuantity));
  }
  return [...items].sort((a,b)=>a.id.localeCompare(b.id)).map(item=>{
    if(item.kind!=='available') return item;
    const k=key(item.cardUuid,item.editionUuid);
    const free=Math.max(0,Math.min(item.quantity-item.reservedQuantity,remaining.get(item.cardUuid)??0,pools.get(k)??0));
    remaining.set(item.cardUuid,(remaining.get(item.cardUuid)??0)-free); pools.set(k,(pools.get(k)??0)-free);
    return {...item,quantity:item.reservedQuantity+free};
  });
}
