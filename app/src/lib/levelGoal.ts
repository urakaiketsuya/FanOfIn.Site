import type { Card } from "@gatcg/shared";
import { probabilityOfRecipe } from "./comboOdds";
import { earliestReserveCostTurn, inferStartingHandSize, isSimpleLevelUpAccelerant, naturalCardsSeenByTurn, naturalLevelByTurn, type PlayOrder } from "./turnToPlay";

export interface LevelGoalConfig {
  targetLevel: number;
  targetTurn: number;
  playOrder: PlayOrder;
  useDirectLevelUp: boolean;
  useFractalPayment: boolean;
}

export interface LevelGoalRoute {
  id: "natural" | "direct" | "fractal";
  label: string;
  probability: number | null;
  status: "available" | "blocked" | "not-needed";
  detail: string;
  bottleneck: string;
}

export interface LevelGoalSuggestion {
  cardName: string;
  currentCopies: number;
  route: string;
  gain: number;
  reason: string;
}

export interface LevelGoalAnalysis {
  startingHandSize: number;
  naturalTurn: number;
  routes: LevelGoalRoute[];
  suggestions: LevelGoalSuggestion[];
  detected: { directLevelCards: string[]; fractalPaymentCards: string[]; fractalCards: string[] };
}

interface Line { name: string; quantity: number }

function copies(lines: Line[]): number { return lines.reduce((sum, line) => sum + line.quantity, 0); }

function chance(deckSize: number, groups: { copies: number; required: number }[], seen: number): number {
  return probabilityOfRecipe(deckSize, groups, seen);
}

/** Goal-oriented level timing analysis. Direct level-up effects can beat the natural one-level-per-
 * turn schedule. Fractal-payment effects only replace a champion's Memory cost, so they improve
 * on-curve reliability but never claim to create an extra materialization or an earlier turn. */
export function computeLevelGoalAnalysis(main: Line[], material: Line[], cardsByName: ReadonlyMap<string, Card>, config: LevelGoalConfig): LevelGoalAnalysis {
  const deckSize = Math.max(60, copies(main));
  const startingHandSize = inferStartingHandSize(material, cardsByName);
  const directLines = main.filter((line) => { const card = cardsByName.get(line.name); return card ? isSimpleLevelUpAccelerant(card) : false; });
  const paymentLines = main.filter((line) => /sacrifice\s+(?:two|2)\s+Fractal phantasias rather than pay the memory cost of champion cards/i.test(cardsByName.get(line.name)?.effect ?? ""));
  const fractalLines = main.filter((line) => cardsByName.get(line.name)?.subtypes.includes("FRACTAL"));
  const directCopies = copies(directLines);
  const paymentCopies = copies(paymentLines);
  const fractalCopies = copies(fractalLines);
  const naturalTurn = Math.max(1, config.targetLevel);
  const levelWithoutAcceleration = naturalLevelByTurn(config.targetTurn);
  const accelerantsNeeded = Math.max(0, config.targetLevel - levelWithoutAcceleration);
  const seenAtTarget = Math.min(deckSize, naturalCardsSeenByTurn(config.targetTurn, startingHandSize, config.playOrder));
  const directCost = Math.min(...directLines.map((line) => cardsByName.get(line.name)?.cost_reserve ?? Number.POSITIVE_INFINITY));
  const directAffordable = Number.isFinite(directCost) && earliestReserveCostTurn(directCost, startingHandSize, config.playOrder) <= config.targetTurn;
  const directReserveDemand = Number.isFinite(directCost) ? directCost * accelerantsNeeded : Number.POSITIVE_INFINITY;
  const directResourceFeasible = directAffordable && seenAtTarget >= accelerantsNeeded + directReserveDemand;
  const directProbability = accelerantsNeeded === 0 ? 1 : directResourceFeasible ? chance(deckSize, [{ copies: directCopies, required: accelerantsNeeded }], seenAtTarget) : 0;

  const setupTurn = Math.max(1, config.targetTurn - 1);
  const setupSeen = Math.min(deckSize, naturalCardsSeenByTurn(setupTurn, startingHandSize, config.playOrder));
  const fractalProbability = config.targetTurn < naturalTurn ? 0 : chance(deckSize, [{ copies: paymentCopies, required: 1 }, { copies: fractalCopies, required: 2 }], setupSeen);

  const routes: LevelGoalRoute[] = [
    { id: "natural", label: "Normal materialization", probability: config.targetTurn >= naturalTurn ? 1 : 0, status: config.targetTurn >= naturalTurn ? "available" : "blocked", detail: config.targetTurn >= naturalTurn ? `The normal schedule reaches level ${config.targetLevel} on turn ${naturalTurn}.` : `Normal materialization cannot reach level ${config.targetLevel} before turn ${naturalTurn}.`, bottleneck: config.targetTurn >= naturalTurn ? "Memory payment and a complete Champion lineage are still required." : "One Champion materialization per turn; turn one skips the Materialize Phase." },
  ];
  if (config.useDirectLevelUp) routes.push({ id: "direct", label: "Direct level-up route", probability: directLines.length ? directProbability : null, status: accelerantsNeeded === 0 ? "not-needed" : directLines.length && directResourceFeasible ? "available" : "blocked", detail: accelerantsNeeded === 0 ? "No acceleration is needed for this target turn." : `${accelerantsNeeded} extra level-up effect${accelerantsNeeded === 1 ? "" : "s"} needed by turn ${config.targetTurn}; ${directCopies} matching copies and at least ${directReserveDemand} Reserve payment are required.`, bottleneck: !directLines.length ? "No self-contained ‘level up your champion’ card was detected." : !directAffordable ? `The cheapest detected effect costs Reserve ${directCost}, beyond the inferred timing.` : !directResourceFeasible ? `${accelerantsNeeded} enabler card${accelerantsNeeded === 1 ? "" : "s"} plus ${directReserveDemand} Reserve payments exceed the ${seenAtTarget}-card natural hand ceiling.` : `Finding ${accelerantsNeeded} direct level-up card${accelerantsNeeded === 1 ? "" : "s"} in ${seenAtTarget} cards; its Reserve ${directCost} payment supplies the memory its trigger consumes.` });
  if (config.useFractalPayment) routes.push({ id: "fractal", label: "Fractal payment route", probability: paymentLines.length && fractalLines.length ? fractalProbability : null, status: config.targetTurn < naturalTurn || !paymentLines.length || fractalCopies < 2 ? "blocked" : "available", detail: config.targetTurn < naturalTurn ? "Replacing a Memory cost does not create an extra materialization, so this route cannot beat the natural level schedule." : `Access estimate for a Fractal-payment Guide plus two Fractals by turn ${setupTurn}.`, bottleneck: !paymentLines.length ? "No Fractal-payment effect was detected." : fractalCopies < 2 ? "Fewer than two Fractal copies are present." : "Matched cards must still be activated and remain on the field; the percentage is an access ceiling, not full board-state certainty." });

  const suggestions: LevelGoalSuggestion[] = [];
  if (config.useDirectLevelUp && accelerantsNeeded > 0 && directResourceFeasible && directCopies >= accelerantsNeeded) {
    for (const line of directLines.filter((entry) => entry.quantity < 4)) {
      const improved = chance(deckSize, [{ copies: directCopies + 1, required: accelerantsNeeded }], seenAtTarget);
      if (improved > directProbability) suggestions.push({ cardName: line.name, currentCopies: line.quantity, route: "Direct level-up", gain: improved - directProbability, reason: `Improves the chance of finding ${accelerantsNeeded} acceleration effect${accelerantsNeeded === 1 ? "" : "s"} by turn ${config.targetTurn}.` });
    }
  }
  if (config.useFractalPayment && config.targetTurn >= naturalTurn && paymentCopies > 0 && fractalCopies >= 2) {
    for (const line of paymentLines.filter((entry) => entry.quantity < 4)) {
      const improved = chance(deckSize, [{ copies: paymentCopies + 1, required: 1 }, { copies: fractalCopies, required: 2 }], setupSeen);
      if (improved > fractalProbability) suggestions.push({ cardName: line.name, currentCopies: line.quantity, route: "Fractal payment", gain: improved - fractalProbability, reason: "Improves access to the Guide that converts two established Fractals into a Champion Memory payment." });
    }
    for (const line of fractalLines.filter((entry) => entry.quantity < 4)) {
      const improved = chance(deckSize, [{ copies: paymentCopies, required: 1 }, { copies: fractalCopies + 1, required: 2 }], setupSeen);
      if (improved > fractalProbability) suggestions.push({ cardName: line.name, currentCopies: line.quantity, route: "Fractal payment", gain: improved - fractalProbability, reason: "Improves access to the two-Fractal payment pool; board establishment and Reserve timing remain separate constraints." });
    }
  }
  suggestions.sort((a, b) => b.gain - a.gain || a.currentCopies - b.currentCopies || a.cardName.localeCompare(b.cardName));
  return { startingHandSize, naturalTurn, routes, suggestions, detected: { directLevelCards: directLines.map((line) => line.name), fractalPaymentCards: paymentLines.map((line) => line.name), fractalCards: fractalLines.map((line) => line.name) } };
}
