import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";

export interface ShoppingChoice { name: string; quantity: number }
export function shoppingLines(choices: Record<string, ShoppingChoice>): ShoppingChoice[] {
  const totals = new Map<string, number>();
  for (const {name,quantity} of Object.values(choices)) {
    if (!Number.isSafeInteger(quantity) || quantity < 1) continue;
    totals.set(name,(totals.get(name) ?? 0)+quantity);
  }
  return [...totals].map(([name,quantity])=>({name,quantity})).sort((a,b)=>a.name.localeCompare(b.name));
}
/** Keep links manageable without dropping selections from large filtered lists. */
export function shoppingBatches(lines: ShoppingChoice[]): ShoppingChoice[][] {
  const batches: ShoppingChoice[][] = [];
  let batch: ShoppingChoice[] = [];
  for (const line of lines) {
    if (batch.length && (batch.length >= 50 || buildTcgplayerMassEntryUrl([...batch,line]).length > 6000)) { batches.push(batch); batch=[]; }
    batch.push(line);
  }
  if(batch.length) batches.push(batch);
  return batches;
}
