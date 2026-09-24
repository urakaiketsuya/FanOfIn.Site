import type { Card } from "./api-types.js";

export type CostKind = "reserve-activation" | "materialization" | "activated-ability" | "next-activation";
export type ModifierAmount = { kind: "fixed"; value: number } | { kind: "champion-level"; multiplier: number } | { kind: "variable"; expression: string };
export type ModifierConditionKind = "always" | "class-bonus" | "champion-bonus" | "minimum-level" | "board-state" | "turn-state" | "target" | "zone-count" | "other";

export interface CostModifierRule {
  id: string;
  sourceCard: string;
  costKind: CostKind;
  amount: ModifierAmount;
  condition: { kind: ModifierConditionKind; label: string; minimumLevel?: number };
  sourceZone: "self" | "field" | "material-deck" | "unknown";
  stacking: "additive";
  floor: 0;
  usageLimit: "continuous" | "next-card-this-turn" | "first-activation" | "once" | "unknown";
  supported: boolean;
  unsupportedReason?: string;
  evidence: string;
}

export interface CostEvaluationContext {
  championLevel?: number;
  classBonus?: boolean;
  championBonuses?: string[];
  enabledConditions?: string[];
  variableAmounts?: Record<string, number>;
}

export interface CostEvaluation {
  printedCost: number;
  effectiveCost: number;
  applied: { rule: CostModifierRule; reduction: number }[];
  available: CostModifierRule[];
  unsupported: CostModifierRule[];
  assumptions: string[];
}

const clean = (value: string) => value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

function conditionFor(text: string): CostModifierRule["condition"] {
  const level = text.match(/\[Level\s+(\d+)\+\]/i);
  const conditionSignals = [Boolean(level), /\[Class Bonus\]/i.test(text), /\[[^\]]+ Bonus\]/i.test(text) && !/\[Class Bonus\]/i.test(text), /as long as|if you control|opponent controls|this turn|if it targets/i.test(text)].filter(Boolean).length;
  if (conditionSignals > 1) return { kind: "other", label: clean(text.split(/this (?:card|ability) costs/i)[0] || text) };
  if (level) return { kind: "minimum-level", label: `Champion is level ${level[1]}+`, minimumLevel: Number(level[1]) };
  if (/\[Class Bonus\]/i.test(text)) return { kind: "class-bonus", label: "Champion class matches this card" };
  const champion = text.match(/\[([^\]]+) Bonus\]/i);
  if (champion) return { kind: "champion-bonus", label: `Champion bonus: ${champion[1]}` };
  if (/for each|amount of/i.test(text)) return { kind: "zone-count", label: clean(text.split(/this (?:card|ability) costs/i)[0] || text) };
  if (/if it targets|if target/i.test(text)) return { kind: "target", label: clean(text.split(/this card costs/i)[0] || text) };
  if (/this turn|first time/i.test(text)) return { kind: "turn-state", label: clean(text.split(/this (?:card|ability) costs/i)[0] || text) };
  if (/as long as|if you control|opponent controls/i.test(text)) return { kind: "board-state", label: clean(text.split(/this card costs/i)[0] || text) };
  return { kind: "always", label: "Printed reduction applies" };
}

/** Parses explicit Grand Archive cost-reduction sentences. Unmodeled variable text is returned as
 * unsupported instead of silently changing a card's cost. */
export function parseCostModifierRules(card: Pick<Card, "name" | "effect">): CostModifierRule[] {
  const effect = clean(card.effect ?? "");
  if (!effect) return [];
  const sentences = effect.split(/(?<=[.!?])\s+|\n+/).filter((part) => /costs?.{0,80}less to (?:activate|materialize)/i.test(part));
  return sentences.map((evidence, index) => {
    const lower = evidence.toLowerCase();
    const ability = /this ability costs/i.test(evidence);
    const next = /the next .+ costs/i.test(evidence);
    const materialize = /less to materialize/i.test(evidence);
    const fixed = evidence.match(/costs?\s*\(?\s*(\d+)\s*\)?\s+less/i);
    const level = /costs?\s+lv\s+less/i.test(evidence);
    const variable = evidence.match(/costs?\s*\(?\s*(\d+)\s*\)?\s+less[^.]*for each/i);
    const amount: ModifierAmount = level ? { kind: "champion-level", multiplier: 1 } : variable ? { kind: "variable", expression: clean(evidence) } : fixed ? { kind: "fixed", value: Number(fixed[1]) } : { kind: "variable", expression: clean(evidence) };
    const unsupportedReason = amount.kind === "variable" ? "A board- or zone-dependent count must be supplied by the player." : undefined;
    return {
      id: `${card.name}:${index}`,
      sourceCard: card.name,
      costKind: materialize ? "materialization" : ability ? "activated-ability" : next ? "next-activation" : "reserve-activation",
      amount,
      condition: conditionFor(evidence),
      sourceZone: materialize ? "material-deck" : ability || next ? "field" : "self",
      stacking: "additive",
      floor: 0,
      usageLimit: next ? "next-card-this-turn" : /first time/i.test(lower) ? "first-activation" : /activate this ability only once/i.test(lower) ? "once" : "continuous",
      supported: amount.kind !== "variable",
      unsupportedReason,
      evidence: clean(evidence),
    };
  });
}

function conditionMet(rule: CostModifierRule, context: CostEvaluationContext): boolean {
  if (context.enabledConditions?.includes(rule.id)) return true;
  if (rule.condition.kind === "always") return true;
  if (rule.condition.kind === "class-bonus") return context.classBonus === true;
  if (rule.condition.kind === "champion-bonus") return context.championBonuses?.some((name) => rule.condition.label.toLowerCase().includes(name.toLowerCase())) ?? false;
  if (rule.condition.kind === "minimum-level") return (context.championLevel ?? -1) >= (rule.condition.minimumLevel ?? Infinity);
  return false;
}

export function evaluateCardCost(printedCost: number, rules: CostModifierRule[], context: CostEvaluationContext = {}): CostEvaluation {
  const relevant = rules.filter((rule) => rule.costKind === "reserve-activation");
  const unsupported = relevant.filter((rule) => !rule.supported && context.variableAmounts?.[rule.id] == null);
  const applied = relevant.flatMap((rule) => {
    if (!conditionMet(rule, context)) return [];
    const reduction = rule.amount.kind === "fixed" ? rule.amount.value : rule.amount.kind === "champion-level" ? Math.max(0, context.championLevel ?? 0) * rule.amount.multiplier : Math.max(0, context.variableAmounts?.[rule.id] ?? 0);
    return reduction > 0 ? [{ rule, reduction }] : [];
  });
  const effectiveCost = Math.max(0, printedCost - applied.reduce((sum, entry) => sum + entry.reduction, 0));
  return { printedCost, effectiveCost, applied, available: relevant.filter((rule) => !applied.some((entry) => entry.rule.id === rule.id)), unsupported, assumptions: applied.map((entry) => entry.rule.condition.label) };
}
