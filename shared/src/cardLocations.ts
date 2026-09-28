import type { CollectionCardTracking, CollectionDeckAssignment, CollectionEntry } from './collection-types.js';
import type { OmnidexDecklist } from './omnidex-types.js';

export const locationCardKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
export function deckCardRequirements(decklist: OmnidexDecklist): Map<string, {name: string; quantity: number}> {
  const result = new Map<string, {name: string; quantity: number}>();
  for (const line of [...decklist.main, ...decklist.material, ...decklist.sideboard]) {
    const key = locationCardKey(line.card);
    result.set(key, {name: line.card, quantity: (result.get(key)?.quantity ?? 0) + line.quantity});
  }
  return result;
}
export function cardLocationState(cardUuid: string, entries: CollectionEntry[], record?: CollectionCardTracking) {
  return locationStateFromOwned(entries.reduce((sum, entry) => sum + (entry.cardUuid === cardUuid ? entry.ownedQuantity : 0), 0), record);
}
export function collectionLocationIndex(entries: CollectionEntry[], records: CollectionCardTracking[]) {
  const owned = new Map<string,number>();
  for (const entry of entries) owned.set(entry.cardUuid,(owned.get(entry.cardUuid) ?? 0)+entry.ownedQuantity);
  const byId = new Map(records.map(record=>[record.cardUuid,record]));
  return new Map([...new Set([...owned.keys(),...byId.keys()])].map(uuid=>[uuid,locationStateFromOwned(owned.get(uuid) ?? 0,byId.get(uuid))]));
}
function locationStateFromOwned(owned: number, record?: CollectionCardTracking) {
  const lent = record?.loans.filter(loan => !loan.returnedAt).reduce((sum, loan) => sum + loan.quantity, 0) ?? 0;
  const reserved = record?.tradeReservedQuantity ?? 0;
  const assigned = record?.assignments?.reduce((sum, assignment) => sum + assignment.quantity, 0) ?? 0;
  return {owned, lent, assigned, reserved, available: Math.max(0, owned - lent - reserved), unassigned: Math.max(0, owned - lent - assigned - reserved), excess: Math.max(0, lent + assigned + reserved - owned)};
}
/** Plan an explicit transfer, consuming unassigned copies before copies in other decks. Never uses loans. */
export function planCardTransfer(deckId: string, required: number, owned: number, record?: CollectionCardTracking) {
  const lent = record?.loans.filter(loan => !loan.returnedAt).reduce((sum, loan) => sum + loan.quantity, 0) ?? 0;
  const reserved = record?.tradeReservedQuantity ?? 0;
  const current = record?.assignments ?? [];
  const total = current.reduce((sum, row) => sum + row.quantity, 0);
  if (total + lent + reserved > owned) return {assignments: current, transfers: [] as CollectionDeckAssignment[], missing: Math.max(0, required - owned), loanBlocked: 0, reconcile: true};
  const target = Math.min(required, Math.max(0, owned - lent - reserved));
  let toMove = Math.max(0, target - (current.find(row => row.deckId === deckId)?.quantity ?? 0) - Math.max(0, owned - lent - reserved - total));
  const transfers: CollectionDeckAssignment[] = [];
  const assignments = current.filter(row => row.deckId !== deckId).map(row => {
    const quantity = Math.min(toMove, row.quantity); toMove -= quantity;
    if (quantity) transfers.push({...row, quantity});
    return {...row, quantity: row.quantity - quantity};
  }).filter(row => row.quantity > 0);
  if (target) assignments.push({deckId, quantity: target});
  return {assignments, transfers, missing: Math.max(0, required - owned), loanBlocked: Math.max(0, required - target) - Math.max(0, required - owned), reconcile: false};
}

/** Split a partial return into outstanding and returned records, conserving the loaned total. */
export function returnLoanCopies(loans: NonNullable<CollectionCardTracking['loans']>, id: string, quantity: number, returnedAt: string, newId: string) {
  const loan = loans.find(row => row.id === id);
  if (!loan || loan.returnedAt || !Number.isInteger(quantity) || quantity < 1 || quantity > loan.quantity) throw new Error('Choose a return quantity within the outstanding loan.');
  if (quantity < loan.quantity && loans.length >= 100) throw new Error('This card has reached the loan history limit. Return the full loan or keep the partial return unsaved.');
  if (!Number.isFinite(Date.parse(returnedAt)) || Date.parse(returnedAt) < Date.parse(loan.lentAt)) throw new Error('Return date must be on or after the loan date.');
  if (quantity === loan.quantity) return loans.map(row => row.id === id ? {...row, returnedAt} : row);
  if (loans.some(row => row.id === newId)) throw new Error('Return record must have a unique ID.');
  return [...loans.map(row => row.id === id ? {...row, quantity: row.quantity - quantity} : row), {...loan, id: newId, quantity, returnedAt}];
}
