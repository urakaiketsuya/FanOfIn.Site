import type { Card } from "@gatcg/shared";

export type ComboRequirementKind = "cards" | "attribute" | "keyword";

export interface ComboRequirement {
  kind: ComboRequirementKind;
  cards: string[];
  value: string;
}

export function printedKeywords(card: Card): string[] {
  const keywords = new Set<string>();
  for (const match of (card.effect ?? "").matchAll(/\*\*([^*]+)\*\*/g)) {
    const keyword = match[1].replace(/:\s*$/, "").replace(/\s+(?:\d+(?:\+X)?|X|LV)$/i, "").trim();
    if (keyword) keywords.add(keyword);
  }
  return [...keywords];
}

export function matchesComboRequirement(card: Card, requirement: ComboRequirement): boolean {
  if (requirement.kind === "cards") return requirement.cards.includes(card.name);
  if (!requirement.value) return false;
  if (requirement.kind === "keyword") return printedKeywords(card).some((keyword) => keyword.toLowerCase() === requirement.value.toLowerCase());
  const [field, value] = requirement.value.split(":", 2);
  if (!value) return false;
  return (field === "type" ? card.types : card.subtypes).some((entry) => entry.toLowerCase() === value.toLowerCase());
}
