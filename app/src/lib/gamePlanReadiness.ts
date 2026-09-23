import { expectedCardsSeenForRecipe, probabilityOfRecipe } from "./comboOdds";
import { naturalCardsSeenByTurn, type PlayOrder } from "./turnToPlay";

export type GamePlanRole = "enabler" | "payoff" | "protection";
export interface GamePlanRoleInput { role: GamePlanRole; copies: number; required: number }
export interface GamePlanReadinessPoint { turn: number; seen: number; coreProbability: number; protectedProbability: number | null }
export interface GamePlanReadinessResult {
  points: GamePlanReadinessPoint[]; expectedCoreCardsSeen: number | null;
  targetCoreProbability: number; targetProtectedProbability: number | null;
  payoffWithoutEnabler: number; enablerWithoutPayoff: number; bottleneck: GamePlanRole | null;
  bestAdditionalCopy: { role: GamePlanRole; gain: number } | null;
}

const normalize = (input: GamePlanRoleInput) => ({ copies: Math.max(0, Math.floor(input.copies)), required: Math.max(1, Math.floor(input.required)) });

/** Exact access odds for disjoint, player-declared roles. Ready means found, not playable. */
export function computeGamePlanReadiness(deckSize: number, startingHandSize: number, roles: GamePlanRoleInput[], targetTurn: number, playOrder: PlayOrder, throughTurn = 8): GamePlanReadinessResult {
  const byRole = new Map(roles.map((input) => [input.role, normalize(input)]));
  const enabler = byRole.get("enabler") ?? { copies: 0, required: 1 };
  const payoff = byRole.get("payoff") ?? { copies: 0, required: 1 };
  const protection = byRole.get("protection") ?? { copies: 0, required: 1 };
  const coreGroups = [enabler, payoff];
  const hasCore = enabler.copies >= enabler.required && payoff.copies >= payoff.required;
  const hasProtection = protection.copies >= protection.required;
  const seenAt = (turn: number) => Math.min(deckSize, naturalCardsSeenByTurn(turn, startingHandSize, playOrder));
  const oddsAt = (turn: number, groups = coreGroups) => probabilityOfRecipe(deckSize, groups, seenAt(turn));
  const points = Array.from({ length: Math.max(1, throughTurn) }, (_, index) => ({
    turn: index + 1, seen: seenAt(index + 1), coreProbability: hasCore ? oddsAt(index + 1) : 0,
    protectedProbability: hasCore && hasProtection ? oddsAt(index + 1, [...coreGroups, protection]) : null,
  }));
  const targetSeen = seenAt(targetTurn);
  const core = hasCore ? probabilityOfRecipe(deckSize, coreGroups, targetSeen) : 0;
  const enablerOdds = probabilityOfRecipe(deckSize, [enabler], targetSeen);
  const payoffOdds = probabilityOfRecipe(deckSize, [payoff], targetSeen);
  const roleOdds: [GamePlanRole, number][] = [["enabler", enablerOdds], ["payoff", payoffOdds]];
  if (hasProtection) roleOdds.push(["protection", probabilityOfRecipe(deckSize, [protection], targetSeen)]);
  const sensitivity = hasCore ? roles.filter((role) => role.role !== "protection" && enabler.copies + payoff.copies < deckSize).map((role) => {
    const changed = coreGroups.map((group, index) => ({ ...group, copies: group.copies + ((index === 0 && role.role === "enabler") || (index === 1 && role.role === "payoff") ? 1 : 0) }));
    return { role: role.role, gain: probabilityOfRecipe(deckSize, changed, targetSeen) - core };
  }).sort((a, b) => b.gain - a.gain)[0] ?? null : null;
  return {
    points, expectedCoreCardsSeen: hasCore ? expectedCardsSeenForRecipe(deckSize, coreGroups) : null,
    targetCoreProbability: core, targetProtectedProbability: hasCore && hasProtection ? probabilityOfRecipe(deckSize, [...coreGroups, protection], targetSeen) : null,
    payoffWithoutEnabler: Math.max(0, payoffOdds - core), enablerWithoutPayoff: Math.max(0, enablerOdds - core),
    bottleneck: roleOdds.sort((a, b) => a[1] - b[1])[0]?.[0] ?? null,
    bestAdditionalCopy: sensitivity && sensitivity.gain > 0 ? sensitivity : null,
  };
}
