import type { Card } from "@gatcg/shared";
import type { ComboRecipeRequirement } from "../features/deckbuilder/HypergeometricCalculator";
import { computeDrawEngineTiming, drawEngineSources } from "../features/deckbuilder/drawEffects";
import { matchesComboRequirement } from "./comboRequirements";
import { probabilityOfTimedRecipe } from "./comboOdds";
import { inferStartingHandSize, naturalCardsSeenByTurn, type PlayOrder } from "./turnToPlay";

interface Line { name: string; quantity: number }

export interface ComboTurnPoint { turn: number; cardsSeen: number; probability: number | null }

function fragmentedSpirit(material: Line[], cards: ReadonlyMap<string, Card>): { bonus: number; name: string | null } {
  for (const line of material) {
    const card = cards.get(line.name);
    if (card?.level !== 0) continue;
    const glimpse = (card.effect ?? "").match(/\bGlimpse\s+(\d+)\b/i);
    const draw = (card.effect ?? "").match(/\bDraw\s+(\d+|six)\s+cards\b/i);
    if (glimpse && draw) return { bonus: Number(glimpse[1]), name: card.name };
  }
  return { bonus: 0, name: null };
}

/** Automatic access forecast. Draw engines contribute their timing-weighted expected draws. A
 * Fragmented Spirit contributes its Glimpse depth as additional inspected cards, not hand size. */
export function forecastComboByTurn(main: Line[], material: Line[], cards: ReadonlyMap<string, Card>, requirements: ComboRecipeRequirement[], playOrder: PlayOrder, maxTurn = 6): ComboTurnPoint[] {
  const deckSize = Math.max(60, main.reduce((sum, line) => sum + line.quantity, 0));
  const startingHand = inferStartingHandSize(material, cards);
  const spirit = fragmentedSpirit(material, cards);
  const sources = drawEngineSources(main, material, cards).filter((source) => source.name !== spirit.name);
  const matches = requirements.map((requirement) => main.filter((line) => { const card = cards.get(line.name); return card ? matchesComboRequirement(card, requirement) : false; }));
  const avoidMatches = requirements.map((requirement) => requirement.avoid ? main.filter((line) => { const card = cards.get(line.name); return card ? matchesComboRequirement(card, requirement.avoid!) : false; }) : []);
  const membership = new Map<string, number>();
  for (const group of [...matches, ...avoidMatches]) for (const line of group) membership.set(line.name, (membership.get(line.name) ?? 0) + 1);
  const overlaps = [...membership.values()].some((count) => count > 1);
  const wantedGroups = requirements.map((requirement, index) => ({ required: requirement.required, copies: matches[index].reduce((sum, line) => sum + line.quantity, 0), byTurn: requirement.byTurn }));
  const groups = [...wantedGroups, ...requirements.flatMap((requirement, index) => requirement.avoid ? [{ required: 0, maximum: requirement.avoid.maximum, copies: avoidMatches[index].reduce((sum, line) => sum + line.quantity, 0), byTurn: requirement.byTurn }] : [])];
  const ready = requirements.length >= 2 && !overlaps && wantedGroups.every((group) => group.copies >= group.required);

  const accessByTurn = Array.from({ length: maxTurn }, (_, index) => {
    const turn = index + 1;
    const naturalSeen = naturalCardsSeenByTurn(turn, startingHand, playOrder);
    const drawTiming = computeDrawEngineTiming(sources, deckSize, naturalSeen, startingHand);
    const cardsSeen = Math.min(deckSize, Math.round(naturalSeen + drawTiming.expectedActiveDraws + spirit.bonus));
    return { turn, cardsSeen };
  });
  return accessByTurn.map(({ turn, cardsSeen }) => ({
    turn,
    cardsSeen,
    probability: ready ? probabilityOfTimedRecipe(deckSize, groups.map((group) => ({
      ...group,
      seen: accessByTurn[Math.min(turn, group.byTurn ?? turn) - 1]?.cardsSeen ?? cardsSeen,
    }))) : null,
  }));
}
