import type { Card } from "@gatcg/shared";

export type ComboRequirementKind = "cards" | "attribute" | "keyword";

export interface ComboRequirement {
  kind: ComboRequirementKind;
  cards: string[];
  value: string;
}

export function printedKeywords(card: Card): string[] {
  const keywords = new Map<string, string>();
  for (const match of (card.effect ?? "").matchAll(/\*\*([^*]+)\*\*/g)) {
    const keyword = match[1].replace(/^:\s*/, "").replace(/:\s*$/, "").replace(/\s+(?:\d+(?:\+X)?|X|LV)$/i, "").trim();
    if (!keyword || keyword.length > 40 || !/^[A-Za-z][A-Za-z ]*$/.test(keyword)) continue;
    const key = keyword.toLowerCase();
    const existing = keywords.get(key);
    if (!existing || (/^[a-z]/.test(existing) && /^[A-Z]/.test(keyword))) keywords.set(key, keyword);
  }
  return [...keywords.values()];
}

export function matchesComboRequirement(card: Card, requirement: ComboRequirement): boolean {
  if (requirement.kind === "cards") return requirement.cards.includes(card.name);
  if (!requirement.value) return false;
  if (requirement.kind === "keyword") return printedKeywords(card).some((keyword) => keyword.toLowerCase() === requirement.value.toLowerCase());
  const [field, value] = requirement.value.split(":", 2);
  if (!value) return false;
  return (field === "type" ? card.types : card.subtypes).some((entry) => entry.toLowerCase() === value.toLowerCase());
}
