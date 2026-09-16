import type { Card } from "@gatcg/shared";
import type { LockedSection } from "../model/builderTypes";

type CardCatalog = Map<string, Card>;

function isChampionLevel(card: Card | undefined): card is Card & { level: number } {
  return Boolean(card?.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT") && card.level != null);
}

function sameChampionIdentity(card: Card, identity: string): boolean {
  return card.name.split(",")[0].trim() === identity;
}

export function toggleLockedCard(cards: Map<string, number>, sections: Map<string, LockedSection>, name: string, quantity: number, section?: LockedSection) {
  const nextCards = new Map(cards);
  const nextSections = new Map(sections);
  if (nextCards.has(name)) {
    nextCards.delete(name);
    nextSections.delete(name);
  } else {
    nextCards.set(name, quantity);
    if (section) nextSections.set(name, section);
  }
  return { cards: nextCards, sections: nextSections };
}

export function selectChampionPrint(cards: Map<string, number>, sections: Map<string, LockedSection>, rejected: Set<string>, selected: Card, catalog: CardCatalog) {
  if (selected.level == null) return { cards, sections, rejected };
  const identity = selected.name.split(",")[0].trim();
  const nextCards = new Map(cards);
  const nextSections = new Map(sections);
  for (const lockedName of cards.keys()) {
    const card = catalog.get(lockedName);
    if (isChampionLevel(card) && card.level === selected.level && sameChampionIdentity(card, identity)) {
      nextCards.delete(lockedName);
      nextSections.delete(lockedName);
    }
  }
  nextCards.set(selected.name, 1);
  nextSections.set(selected.name, "material");
  const nextRejected = new Set(rejected);
  nextRejected.delete(selected.name);
  return { cards: nextCards, sections: nextSections, rejected: nextRejected };
}

export function restoreChampionLevel(cards: Map<string, number>, sections: Map<string, LockedSection>, level: number, identity: string, catalog: CardCatalog) {
  const nextCards = new Map(cards);
  const nextSections = new Map(sections);
  for (const lockedName of cards.keys()) {
    const card = catalog.get(lockedName);
    if (isChampionLevel(card) && card.level === level && sameChampionIdentity(card, identity)) {
      nextCards.delete(lockedName);
      nextSections.delete(lockedName);
    }
  }
  return { cards: nextCards, sections: nextSections };
}

export function removeLockedCard(cards: Map<string, number>, sections: Map<string, LockedSection>, name: string, catalog: CardCatalog) {
  const nextCards = new Map(cards);
  const nextSections = new Map(sections);
  const removed = catalog.get(name);
  if (isChampionLevel(removed)) {
    const identity = removed.name.split(",")[0].trim();
    for (const lockedName of cards.keys()) {
      const candidate = catalog.get(lockedName);
      if (isChampionLevel(candidate) && candidate.level > removed.level && sameChampionIdentity(candidate, identity)) {
        nextCards.delete(lockedName);
        nextSections.delete(lockedName);
      }
    }
  }
  nextCards.delete(name);
  nextSections.delete(name);
  return { cards: nextCards, sections: nextSections };
}

export function promoteMaybeboardCard(cards: Map<string, number>, sections: Map<string, LockedSection>, maybeboard: Map<string, number>, name: string, catalog: CardCatalog) {
  const quantity = maybeboard.get(name);
  if (!quantity || cards.has(name)) return null;
  const card = catalog.get(name);
  const section: LockedSection = card?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ? "material" : "main";
  const nextMaybeboard = new Map(maybeboard);
  nextMaybeboard.delete(name);
  return {
    cards: new Map(cards).set(name, quantity),
    sections: new Map(sections).set(name, section),
    maybeboard: nextMaybeboard,
  };
}
