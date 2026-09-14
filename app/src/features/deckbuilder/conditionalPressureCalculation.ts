import type { Card } from "@gatcg/shared";
import { probabilityAtLeast } from "./synergyReadiness";

export type ConditionalReason = "Bonus" | "Champion state" | "Board state" | "Graveyard" | "Opponent state";

const CONDITION_RULES: { reason: ConditionalReason; pattern: RegExp }[] = [
  { reason: "Bonus", pattern: /(?:\[[^\]]+ bonus\]|\*\*[^*]+ bonus:\*\*)/i },
  { reason: "Champion state", pattern: /(?:\[(?:level|sheen)\s*\d+\+?\]|\bif your champion\b|\bas long as your champion\b)/i },
  { reason: "Graveyard", pattern: /(?:\bif (?:you have|there (?:is|are))[^.\n]*\bgraveyard\b|\bas long as[^.\n]*\bgraveyard\b)/i },
  { reason: "Opponent state", pattern: /(?:\bif (?:an opponent|your opponent)|\bas long as (?:an opponent|your opponent))/i },
  { reason: "Board state", pattern: /(?:\bif you control\b|\bas long as you control\b|\bunless you control\b)/i },
];

export function conditionalReasons(card: Card | undefined): ConditionalReason[] {
  const effect = card?.effect ?? "";
  return CONDITION_RULES.filter((rule) => rule.pattern.test(effect)).map((rule) => rule.reason);
}

export interface ConditionalPressureSummary {
  conditionalCopies: number;
  conditionalNames: number;
  chanceOne: number;
  chanceTwo: number;
  chanceThree: number;
  rows: { name: string; copies: number; reasons: ConditionalReason[] }[];
}

export function calculateConditionalPressure(
  mainLines: { name: string; quantity: number }[],
  catalogByName: Map<string, Card>,
  cardsSeen: number,
): ConditionalPressureSummary {
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const rows = mainLines.flatMap((line) => {
    const reasons = conditionalReasons(catalogByName.get(line.name));
    return reasons.length > 0 ? [{ ...line, copies: line.quantity, reasons }] : [];
  });
  const conditionalCopies = rows.reduce((sum, row) => sum + row.copies, 0);
  const seen = Math.min(cardsSeen, deckSize);
  return {
    conditionalCopies,
    conditionalNames: rows.length,
    chanceOne: probabilityAtLeast(deckSize, conditionalCopies, seen, 1),
    chanceTwo: probabilityAtLeast(deckSize, conditionalCopies, seen, 2),
    chanceThree: probabilityAtLeast(deckSize, conditionalCopies, seen, 3),
    rows: rows.sort((a, b) => b.copies - a.copies || a.name.localeCompare(b.name)),
  };
}
