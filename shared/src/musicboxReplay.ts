import type { Card } from "./api-types.js";

export const MUSICBOX_NAME = "Clockwork Musicbox";
export interface MusicboxReplayState {
  ready: boolean;
  /** Reserve remaining for the replay, after earlier plays. */
  reserve: number;
}

/** Songs that this Musicbox can store from this scenario's hand activations.
 * A single ready Musicbox rests for one replay. Printed reserve costs are used;
 * variable/memory costs and additional activation costs are not assumed payable.
 */
export function musicboxReplayCandidates(
  handActivations: string[], material: { name: string; quantity: number }[],
  cards: Map<string, Card>, state?: MusicboxReplayState,
): string[] {
  if (!state?.ready || !Number.isFinite(state.reserve) || state.reserve < 0 ||
    !material.some(line => line.name === MUSICBOX_NAME && line.quantity > 0)) return [];
  const musicbox = cards.get(MUSICBOX_NAME);
  const champion = material.filter(line => line.quantity > 0).map(line => cards.get(line.name))
    .filter((card): card is Card => !!card?.types.includes("CHAMPION"))
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0];
  if (!musicbox || !champion?.classes.some(c => musicbox.classes.includes(c))) return [];
  return [...new Set(handActivations)].filter(name => {
    const card = cards.get(name);
    return !!card && card.subtypes.some(s => s === "HARMONY" || s === "MELODY") &&
      card.cost.type === "reserve" && typeof card.cost.value === "string" && /^\d+$/.test(card.cost.value) &&
      Number(card.cost.value) <= Math.floor(state.reserve) &&
      !/additional cost/i.test(card.effect ?? "");
  });
}
