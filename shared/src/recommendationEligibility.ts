import type { Card } from "./api-types.js";

const BASIC_ELEMENTS = new Set(["NORM", "FIRE", "WATER", "WIND"]);

/** Printed element access plus verified, card-specific Material-lineage exceptions.
 * Slime Sovereign ignores advanced-element requirements only for Slimes; it does
 * not grant the element to other cards or waive basic-element requirements.
 */
export function isDeckElementCompatible(card: Card, elements: ReadonlySet<string>, materialCards: Iterable<Card | undefined>): boolean {
  if (card.elements.length === 0 || card.elements.some(element => element === "NORM" || elements.has(element))) return true;
  return card.subtypes.includes("SLIME") && card.elements.every(element => !BASIC_ELEMENTS.has(element)) &&
    Array.from(materialCards).some(identity => identity?.types.includes("CHAMPION") && identity.name === "Silvie, Slime Sovereign");
}

/** Printed elements from the actual Material lineage, never main-deck splashes or sideboard cards.
 * Unrecorded choices (e.g. Prismatic Spirit's chosen elements) do not grant speculative access.
 */
export function availableDeckElements(materialCards: Iterable<Card | undefined>): Set<string> {
  const elements = new Set(["NORM"]);
  for (const card of materialCards) {
    if (!card?.types.includes("CHAMPION")) continue;
    for (const element of card.elements) elements.add(element);
  }
  // Exalted's printed reminder enables it when another advanced element is enabled.
  if (Array.from(elements).some((element) => !BASIC_ELEMENTS.has(element) && element !== "EXALTED")) elements.add("EXALTED");
  return elements;
}

/** Add-card suggestions cannot replace identity cards or assume access from an unresolved catalog entry. */
export function isAvailableDeckRecommendation(card: Card | undefined, elements: ReadonlySet<string>): boolean {
  if (!card || card.types.includes("CHAMPION") || card.types.includes("TOKEN") || card.elements.length === 0) return false;
  return card.elements.every((element) => element === "NORM" || elements.has(element));
}
