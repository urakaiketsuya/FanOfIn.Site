/** One physical object has one rest state, even with multiple reservable grants. */
export interface PaymentObject {
  name: string;
  domain: boolean;
  token: boolean;
  rested: boolean;
}
export function reservableObjects(objects: readonly PaymentObject[], domainGrant: boolean, tokenGrant: boolean) {
  return objects.filter(object => !object.rested && ((object.domain && domainGrant) || (object.token && tokenGrant)));
}
/** Mutates only the selected objects; callers check affordability before committing. */
export function restReserveObjects(objects: readonly PaymentObject[], amount: number, domainGrant: boolean, tokenGrant: boolean) {
  const selected = reservableObjects(objects, domainGrant, tokenGrant)
    .sort((a, b) => Number(b.name === 'Epicurean Institute') - Number(a.name === 'Epicurean Institute') || Number(b.domain && domainGrant) - Number(a.domain && domainGrant))
    .slice(0, amount);
  for (const object of selected) object.rested = true;
  // Exclusive accounting: a token domain uses its domain grant first.
  return { count: selected.length, domains: selected.filter(object => object.domain && domainGrant).length,
    tokens: selected.filter(object => !(object.domain && domainGrant)).length };
}
