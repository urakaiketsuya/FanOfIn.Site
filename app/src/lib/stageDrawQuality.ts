import { probabilityOfRecipe } from "./comboOdds";
import { naturalCardsSeenByTurn, type PlayOrder } from "./turnToPlay";

export interface StageDrawInput { earlyCopies: number; lateCopies: number; flexibleCopies: number; conditionalCopies: number }
export interface StageDrawResult { earlySeen: number; lateSeen: number; openingFunctional: number; lateInjection: number; stagedPlan: number; earlyClog: number; lateFlood: number }

/** Exact ordered-position model for an early requirement followed by a later draw-window requirement. */
export function computeStageDrawQuality(deckSize: number, startingHandSize: number, input: StageDrawInput, earlyTurn: number, lateTurn: number, playOrder: PlayOrder, maximumOpeningClunk: number): StageDrawResult {
  const counts = [input.earlyCopies, input.lateCopies, input.flexibleCopies, input.conditionalCopies].map((value) => Math.max(0, Math.floor(value)));
  const categorized = counts.reduce((sum, value) => sum + value, 0);
  const other = Math.max(0, deckSize - categorized);
  const allCounts = [...counts, other];
  const earlySeen = Math.min(deckSize, naturalCardsSeenByTurn(earlyTurn, startingHandSize, playOrder));
  const lateSeen = Math.min(deckSize, naturalCardsSeenByTurn(Math.max(earlyTurn, lateTurn), startingHandSize, playOrder));
  const maximum = Math.max(0, Math.floor(maximumOpeningClunk));
  // State: early-useful hit, opening clunk count (capped above maximum), late-window useful hit, category draws.
  let states = new Map<string, { early: number; clunk: number; late: number; drawn: number[]; probability: number }>();
  states.set("0|0|0|0,0,0,0,0", { early: 0, clunk: 0, late: 0, drawn: [0,0,0,0,0], probability: 1 });
  for (let draw = 1; draw <= lateSeen; draw++) {
    const next = new Map<string, { early: number; clunk: number; late: number; drawn: number[]; probability: number }>();
    for (const state of states.values()) for (let category = 0; category < allCounts.length; category++) {
      const available = allCounts[category] - state.drawn[category];
      if (available <= 0) continue;
      const drawn = [...state.drawn]; drawn[category]++;
      const inEarly = draw <= earlySeen;
      const early = state.early || (inEarly && (category === 0 || category === 2)) ? 1 : 0;
      const clunk = Math.min(maximum + 1, state.clunk + (inEarly && (category === 1 || category === 3) ? 1 : 0));
      const late = state.late || (!inEarly && (category === 1 || category === 2)) ? 1 : 0;
      const key = `${early}|${clunk}|${late}|${drawn.join(",")}`;
      const probability = state.probability * available / (deckSize - draw + 1);
      const prior = next.get(key);
      next.set(key, { early, clunk, late, drawn, probability: (prior?.probability ?? 0) + probability });
    }
    states = next;
  }
  let openingFunctional = 0, lateInjection = 0, stagedPlan = 0;
  for (const state of states.values()) {
    const opening = state.early === 1 && state.clunk <= maximum;
    if (opening) openingFunctional += state.probability;
    if (state.late === 1) lateInjection += state.probability;
    if (opening && state.late === 1) stagedPlan += state.probability;
  }
  return {
    earlySeen, lateSeen, openingFunctional, lateInjection, stagedPlan,
    earlyClog: probabilityOfRecipe(deckSize, [{ copies: counts[1] + counts[3], required: maximum + 1 }], earlySeen),
    lateFlood: probabilityOfRecipe(deckSize, [{ copies: counts[0], required: 2 }], lateSeen),
  };
}
