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

export interface HandRecipeGroupInput { id: string; label: string; copies: number; minimum: number }
export interface HandRecipeResult {
  points: FunctionalHandPoint[];
  openingProbability: number;
  targetProbability: number;
  firstTenProbability: number;
  bottleneck: { id: string; label: string } | null;
  bestAdditionalCopy: { id: string; label: string; gain: number } | null;
}

/** Exact odds for user-named, mutually exclusive requirement pools plus an optional capped pool. */
export function computeHandRecipe(
  deckSize: number,
  startingHandSize: number,
  groups: HandRecipeGroupInput[],
  unwantedCopies: number,
  maximumUnwanted: number,
  targetTurn: number,
  playOrder: PlayOrder,
  throughTurn = 8,
): HandRecipeResult {
  const active = groups.filter((group) => group.minimum > 0).map((group) => ({ ...group, copies: Math.max(0, Math.floor(group.copies)), minimum: Math.max(0, Math.floor(group.minimum)) }));
  const odds = (seen: number, adjustedId?: string) => {
    const requirements: TimedProbabilityRequirementGroup[] = active.map((group) => ({ copies: group.copies + (adjustedId === group.id ? 1 : 0), required: group.minimum, seen }));
    if (unwantedCopies > 0) requirements.push({ copies: Math.max(0, Math.floor(unwantedCopies)), required: 0, maximum: Math.max(0, Math.floor(maximumUnwanted)), seen });
    return requirements.length > 0 ? probabilityOfTimedRecipe(deckSize, requirements) : 0;
  };
  const seenAt = (turn: number) => Math.min(deckSize, naturalCardsSeenByTurn(turn, startingHandSize, playOrder));
  const targetSeen = seenAt(targetTurn);
  const targetProbability = odds(targetSeen);
  const access = active.map((group) => ({ group, probability: probabilityOfTimedRecipe(deckSize, [{ copies: group.copies, required: group.minimum, seen: targetSeen }]) }));
  const sensitivity = active.filter((group) => group.copies < deckSize).map((group) => ({ id: group.id, label: group.label, gain: odds(targetSeen, group.id) - targetProbability })).sort((a, b) => b.gain - a.gain)[0] ?? null;
  const bottleneck = access.sort((a, b) => a.probability - b.probability)[0]?.group ?? null;
  return {
    points: Array.from({ length: Math.max(1, throughTurn) }, (_, index) => ({ turn: index + 1, seen: seenAt(index + 1), probability: odds(seenAt(index + 1)) })),
    openingProbability: odds(Math.min(deckSize, startingHandSize)),
    targetProbability,
    firstTenProbability: odds(Math.min(deckSize, 10)),
    bottleneck: bottleneck ? { id: bottleneck.id, label: bottleneck.label } : null,
    bestAdditionalCopy: sensitivity && sensitivity.gain > 0 ? sensitivity : null,
  };
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
