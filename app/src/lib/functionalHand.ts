import { probabilityOfTimedRecipe, type TimedProbabilityRequirementGroup } from "./comboOdds";
import { naturalCardsSeenByTurn, type PlayOrder } from "./turnToPlay";

export type FunctionalHandRole = "proactive" | "setup" | "interaction" | "liability";
export interface FunctionalHandRoleInput { role: FunctionalHandRole; copies: number }
export interface FunctionalHandPoint { turn: number; seen: number; probability: number }
export interface FunctionalHandResult {
  points: FunctionalHandPoint[];
  openingProbability: number;
  targetProbability: number;
  firstTenProbability: number;
  bottleneck: Exclude<FunctionalHandRole, "liability"> | null;
  bestAdditionalCopy: { role: Exclude<FunctionalHandRole, "liability">; gain: number } | null;
}

/** Exact access odds for required, disjoint hand roles with an optional upper-bound liability pool. */
export function computeFunctionalHand(
  deckSize: number,
  startingHandSize: number,
  roles: FunctionalHandRoleInput[],
  requiredRoles: Exclude<FunctionalHandRole, "liability">[],
  maximumLiabilities: number,
  targetTurn: number,
  playOrder: PlayOrder,
  throughTurn = 8,
): FunctionalHandResult {
  const copies = new Map(roles.map((role) => [role.role, Math.max(0, Math.floor(role.copies))]));
  const liabilityCopies = copies.get("liability") ?? 0;
  const odds = (seen: number, adjusted?: { role: Exclude<FunctionalHandRole, "liability">; copies: number }) => {
    const groups: TimedProbabilityRequirementGroup[] = requiredRoles.map((role) => ({ copies: adjusted?.role === role ? adjusted.copies : (copies.get(role) ?? 0), required: 1, seen }));
    if (liabilityCopies > 0) groups.push({ copies: liabilityCopies, required: 0, maximum: Math.max(0, maximumLiabilities), seen });
    return groups.length > 0 ? probabilityOfTimedRecipe(deckSize, groups) : 0;
  };
  const seenAt = (turn: number) => Math.min(deckSize, naturalCardsSeenByTurn(turn, startingHandSize, playOrder));
  const targetSeen = seenAt(targetTurn);
  const targetProbability = odds(targetSeen);
  const access = requiredRoles.map((role) => ({ role, probability: probabilityOfTimedRecipe(deckSize, [{ copies: copies.get(role) ?? 0, required: 1, seen: targetSeen }]) }));
  const sensitivity = requiredRoles
    .filter((role) => (copies.get(role) ?? 0) < deckSize)
    .map((role) => ({ role, gain: odds(targetSeen, { role, copies: (copies.get(role) ?? 0) + 1 }) - targetProbability }))
    .sort((a, b) => b.gain - a.gain)[0] ?? null;
  return {
    points: Array.from({ length: Math.max(1, throughTurn) }, (_, index) => ({ turn: index + 1, seen: seenAt(index + 1), probability: odds(seenAt(index + 1)) })),
    openingProbability: odds(Math.min(deckSize, startingHandSize)),
    targetProbability,
    firstTenProbability: odds(Math.min(deckSize, 10)),
    bottleneck: access.sort((a, b) => a.probability - b.probability)[0]?.role ?? null,
    bestAdditionalCopy: sensitivity && sensitivity.gain > 0 ? sensitivity : null,
  };
}
