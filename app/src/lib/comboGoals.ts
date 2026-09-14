export type ComboGoalId = "level" | "activate" | "assemble" | "draw" | "mastery";

export interface ComboGoalDefinition {
  id: ComboGoalId;
  label: string;
  summary: string;
  calculatorMode: "single" | "functional" | "recipe";
  evidence: "rules-exact" | "access-ceiling";
  measures: string;
  doesNotMeasure: string;
  ruleLinks: { label: string; href: string }[];
}

/** Product-facing rule contracts for Combo Lab goals. New goals must declare both what their
 * calculator proves and which game-state requirements it omits. */
export const COMBO_GOALS: readonly ComboGoalDefinition[] = [
  { id: "level", label: "Level up my Champion", summary: "Reach a chosen Champion level by a chosen turn.", calculatorMode: "recipe", evidence: "rules-exact", measures: "Natural materialization timing, detected direct level-up routes, payment alternatives, and card access.", doesNotMeasure: "Opponent interaction or conditional effects that require a changing game state.", ruleLinks: [
    { label: "Materialize Phase", href: "https://rules.gatcg.com/game-mechanics/game-mechanics-turn-order/turn-order-materialize-phase" },
    { label: "Champion cards", href: "https://rules.gatcg.com/general-rules/general-rules-card-types/card-types-champion" },
    { label: "Costs and Memory", href: "https://rules.gatcg.com/game-mechanics/game-mechanics-playing-cards/playing-cards-costs-and-memory" },
  ] },
  { id: "activate", label: "Activate a key card", summary: "Find a specific card before the turn when you want to activate it.", calculatorMode: "single", evidence: "access-ceiling", measures: "The exact chance that enough copies are among the cards seen.", doesNotMeasure: "Elements, targets, modes, additional costs, timing permission, responses, or resolution.", ruleLinks: [
    { label: "Card Activation", href: "https://rules.gatcg.com/game-mechanics/game-mechanics-playing-cards/playing-cards-card-activation" },
    { label: "Timing and Permissions", href: "https://rules.gatcg.com/game-mechanics/game-mechanics-timing-and-permissions" },
  ] },
  { id: "assemble", label: "Assemble a combo package", summary: "Find every required card, type, subtype, or keyword in one package.", calculatorMode: "recipe", evidence: "access-ceiling", measures: "Exact without-replacement access odds for disjoint requirements joined with AND.", doesNotMeasure: "Play order, costs, legal targets, zones, timing windows, or whether effects resolve.", ruleLinks: [
    { label: "Game Zones", href: "https://rules.gatcg.com/game-mechanics/game-mechanics-game-zones" },
    { label: "Timing and Permissions", href: "https://rules.gatcg.com/game-mechanics/game-mechanics-timing-and-permissions" },
  ] },
  { id: "draw", label: "Find extra card draw", summary: "Measure access to cards whose printed text explicitly draws cards.", calculatorMode: "functional", evidence: "access-ceiling", measures: "Access to conservatively detected draw effects and their expected contribution to cards seen.", doesNotMeasure: "Whether conditional draw triggers, resolves, or is strategically safe from decking out.", ruleLinks: [
    { label: "Drawing Cards", href: "https://rules.gatcg.com/game-mechanics/game-mechanics-drawing-cards" },
  ] },
  { id: "mastery", label: "Enable a Mastery payoff", summary: "Assemble the cards or attributes that build toward a Mastery threshold.", calculatorMode: "recipe", evidence: "access-ceiling", measures: "Access to the package you identify as creating or exploiting the Mastery.", doesNotMeasure: "Counter accumulation, combat events, restrictions, replacement of an existing Mastery, or trigger resolution.", ruleLinks: [
    { label: "Mastery", href: "https://rules.gatcg.com/game-mechanics/game-mechanics-mastery" },
  ] },
];

export function comboGoal(id: ComboGoalId): ComboGoalDefinition {
  return COMBO_GOALS.find((goal) => goal.id === id) ?? COMBO_GOALS[0];
}
