import type { Card } from "@gatcg/shared";
import type { ComboRecipeRequirement } from "../features/deckbuilder/HypergeometricCalculator";
import type { ComboGoalId } from "./comboGoals";
import { matchesComboRequirement } from "./comboRequirements";

export type ComboPurposeId = "level" | "selection" | "draw" | "mastery" | "damage" | "payment" | "package";
export interface ComboPurpose { id: ComboPurposeId; label: string; cards: string[] }

const PURPOSES: readonly { id: Exclude<ComboPurposeId, "package">; label: string; pattern: RegExp }[] = [
  { id: "level", label: "Accelerates Champion levels", pattern: /\blevel up your champion\b/i },
  { id: "selection", label: "Finds or filters cards", pattern: /\bglimpse\b|\blook at the top\b|\breveal\b|\bsearch your deck\b/i },
  { id: "draw", label: "Creates card advantage", pattern: /\bdraw\s+(?:a|one|two|three|four|five|six|seven|\d+)\s+cards?\b/i },
  { id: "mastery", label: "Builds or spends Mastery", pattern: /\bmastery\b/i },
  { id: "damage", label: "Produces damage", pattern: /\bdeal(?:s|t)?\s+(?:\d+|X|damage)|\bdamage\b/i },
  { id: "payment", label: "Provides or replaces payment", pattern: /\breservable\b|\brather than pay\b|\bpay the memory cost\b|\brecover\s+\d+/i },
];

/** Infers a recipe's jobs from the actual cards matched by its requirements. Broad type/keyword
 * requirements are resolved against the active Main Deck before printed effects are classified. */
export function inferComboPurpose(requirements: ComboRecipeRequirement[], main: { name: string }[], cards: ReadonlyMap<string, Card>): { goalId: ComboGoalId; purposes: ComboPurpose[]; matchedCards: string[] } {
  const matchedCards = Array.from(new Set(requirements.flatMap((requirement) => main.filter((line) => {
    const card = cards.get(line.name);
    return card ? matchesComboRequirement(card, requirement) : false;
  }).map((line) => line.name))));
  const purposes: ComboPurpose[] = PURPOSES.map((purpose) => ({ ...purpose, cards: matchedCards.filter((name) => purpose.pattern.test(cards.get(name)?.effect ?? "")) })).filter((purpose) => purpose.cards.length > 0);
  if (matchedCards.length > 0 && purposes.length === 0) purposes.push({ id: "package", label: "Assembles the chosen package", cards: matchedCards });
  const ids = new Set(purposes.map((purpose) => purpose.id));
  const goalId: ComboGoalId = ids.has("level") ? "level" : ids.has("mastery") ? "mastery" : ids.has("draw") ? "draw" : requirements.length === 1 ? "activate" : "assemble";
  return { goalId, purposes, matchedCards };
}
