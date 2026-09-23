export interface DeckLine { name: string; quantity: number }

export interface SideboardPlanResult {
  cardsOut: number;
  cardsIn: number;
  balanced: boolean;
  valid: boolean;
  errors: string[];
  postboardMain: DeckLine[];
}

function selectedTotal(selection: Record<string, number>) {
  return Object.values(selection).reduce((sum, quantity) => sum + Math.max(0, Math.floor(quantity || 0)), 0);
}

export function buildSideboardPlan(main: DeckLine[], sideboard: DeckLine[], outs: Record<string, number>, ins: Record<string, number>): SideboardPlanResult {
  const errors: string[] = [];
  const mainByName = new Map(main.map((line) => [line.name, line.quantity]));
  const sideboardByName = new Map(sideboard.map((line) => [line.name, line.quantity]));
  const cardsOut = selectedTotal(outs);
  const cardsIn = selectedTotal(ins);

  for (const [name, quantity] of Object.entries(outs)) if (quantity > (mainByName.get(name) ?? 0)) errors.push(`Cannot remove ${quantity} copies of ${name}.`);
  for (const [name, quantity] of Object.entries(ins)) if (quantity > (sideboardByName.get(name) ?? 0)) errors.push(`Cannot add ${quantity} copies of ${name}.`);
  if (cardsOut !== cardsIn) errors.push(`Choose the same number of cards in and out (${cardsOut} out, ${cardsIn} in).`);

  const quantities = new Map(main.map((line) => [line.name, line.quantity - Math.max(0, Math.floor(outs[line.name] ?? 0))]));
  for (const line of sideboard) quantities.set(line.name, (quantities.get(line.name) ?? 0) + Math.max(0, Math.floor(ins[line.name] ?? 0)));
  const order = [...main.map((line) => line.name), ...sideboard.map((line) => line.name).filter((name) => !mainByName.has(name))];
  const postboardMain = order.map((name) => ({ name, quantity: quantities.get(name) ?? 0 })).filter((line) => line.quantity > 0);

  return { cardsOut, cardsIn, balanced: cardsOut === cardsIn, valid: cardsOut > 0 && errors.length === 0, errors, postboardMain };
}
