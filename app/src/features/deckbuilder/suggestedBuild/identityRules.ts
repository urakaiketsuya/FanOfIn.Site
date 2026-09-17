import type { Card } from "@gatcg/shared";
import type { DeckBuilderRow } from "../useDeckBuilderPopulation";

export const IDENTITY_STAPLE_PREVALENCE = 0.8;
export const MIN_IDENTITY_STAPLE_POPULATION = 10;

export function championIdentityName(card: Card): string {
  return card.name.includes(",") ? card.name.split(",")[0].trim() : card.name;
}

export function hasChampionBonus(card: Card | undefined, championCard: Card | undefined): boolean {
  if (!card || !championCard || !card.effect) return false;
  const identity = championIdentityName(championCard).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\[${identity} Bonus\\]`, "i").test(card.effect);
}

const GUO_JIA_FATESTONE_BY_SPIRIT_ELEMENT: Readonly<Record<string, string>> = {
  ARCANE: "Fabled Azurite Fatestone",
  FIRE: "Fabled Ruby Fatestone",
  WATER: "Fabled Sapphire Fatestone",
  WIND: "Fabled Emerald Fatestone",
};

export function guoJiaFatestoneForIdentity(championCard: Card | undefined, spiritCard: Card | undefined): string | undefined {
  if (!championCard || championIdentityName(championCard) !== "Guo Jia" || !spiritCard) return undefined;
  for (const element of spiritCard.elements) {
    const fatestone = GUO_JIA_FATESTONE_BY_SPIRIT_ELEMENT[element];
    if (fatestone) return fatestone;
  }
  return undefined;
}

export function intendedChampionLevel(lockedCards: Map<string, number>, cardsByName: Map<string, Card>, identityName: string | null): number | null {
  let highest: number | null = null;
  for (const name of lockedCards.keys()) {
    const card = cardsByName.get(name);
    if (!card?.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT") || card.level == null || (identityName !== null && championIdentityName(card) !== identityName)) continue;
    highest = highest === null ? card.level : Math.max(highest, card.level);
  }
  return highest;
}

export function isElementCompatible(card: Card | undefined, identityElements: Set<string>): boolean {
  if (identityElements.size === 0 || !card || card.elements.length === 0) return true;
  return card.elements.some((element) => element === "NORM" || identityElements.has(element));
}

export function computeIdentityElements(championCard: Card | undefined, spiritCard: Card | undefined): Set<string> {
  return new Set([...(championCard?.elements ?? []), ...(spiritCard?.elements ?? [])].filter((element) => element !== "NORM"));
}

export function findChampionIdentityElements(spiritRows: DeckBuilderRow[], championCard: Card | undefined, cardsByName: Map<string, Card>): Set<string> {
  const elements = new Set<string>();
  if (!championCard) return elements;
  const identityName = championIdentityName(championCard);
  for (const row of spiritRows) {
    for (const name of row.material.keys()) {
      const card = cardsByName.get(name);
      if (!card?.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT") || championIdentityName(card) !== identityName) continue;
      for (const element of card.elements) if (element !== "NORM") elements.add(element);
    }
  }
  if (elements.size === 0) for (const element of championCard.elements) if (element !== "NORM") elements.add(element);
  return elements;
}

export function findChampionCard(spiritRows: DeckBuilderRow[], lockedCards: Map<string, number>, cardsByName: Map<string, Card>): Card | undefined {
  for (const name of lockedCards.keys()) {
    const card = cardsByName.get(name);
    if (card?.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT")) return card;
  }
  const counts = new Map<string, number>();
  for (const row of spiritRows) {
    for (const name of row.material.keys()) {
      const card = cardsByName.get(name);
      if (card?.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT")) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return best ? cardsByName.get(best[0]) : undefined;
}
