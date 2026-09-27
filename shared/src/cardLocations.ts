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
  const owned = entries.filter(entry => entry.cardUuid === cardUuid).reduce((sum, entry) => sum + entry.ownedQuantity, 0);
  const lent = record?.loans.filter(loan => !loan.returnedAt).reduce((sum, loan) => sum + loan.quantity, 0) ?? 0;
  const assigned = record?.assignments?.reduce((sum, assignment) => sum + assignment.quantity, 0) ?? 0;
  return {owned, lent, assigned, available: Math.max(0, owned - lent), unassigned: Math.max(0, owned - lent - assigned), excess: Math.max(0, lent + assigned - owned)};
}
/** Plan an explicit transfer, consuming unassigned copies before copies in other decks. Never uses loans. */
export function planCardTransfer(deckId: string, required: number, owned: number, record?: CollectionCardTracking) {
  const lent = record?.loans.filter(loan => !loan.returnedAt).reduce((sum, loan) => sum + loan.quantity, 0) ?? 0;
  const current = record?.assignments ?? [];
  const total = current.reduce((sum, row) => sum + row.quantity, 0);
  if (total + lent > owned) return {assignments: current, transfers: [] as CollectionDeckAssignment[], missing: Math.max(0, required - owned), loanBlocked: 0, reconcile: true};
  const target = Math.min(required, Math.max(0, owned - lent));
  let toMove = Math.max(0, target - (current.find(row => row.deckId === deckId)?.quantity ?? 0) - Math.max(0, owned - lent - total));
  const transfers: CollectionDeckAssignment[] = [];
  const assignments = current.filter(row => row.deckId !== deckId).map(row => {
    const quantity = Math.min(toMove, row.quantity); toMove -= quantity;
    if (quantity) transfers.push({...row, quantity});
    return {...row, quantity: row.quantity - quantity};
  }).filter(row => row.quantity > 0);
  if (target) assignments.push({deckId, quantity: target});
  return {assignments, transfers, missing: Math.max(0, required - owned), loanBlocked: Math.max(0, required - target) - Math.max(0, required - owned), reconcile: false};
}
