import type { Card, DeckFormat } from "@gatcg/shared";

export type DeckValidationStatus = "Legal" | "Incomplete" | "Illegal";

export interface DeckValidationResult {
  status: DeckValidationStatus;
  reasons: string[];
  unsupportedRules: string[];
}

type Line = { cardName: string; quantity: number };

/** Total sideboard points allowed — see the point-cost comment at its usage below. A 5-card
 * all-Regalia/Champion sideboard (5 × 3) and a 15-card all-Main-type sideboard (15 × 1) are both
 * exactly at budget; anything in between is legal too. */
const SIDEBOARD_POINT_BUDGET = 15;
const SIDEBOARD_MATERIAL_TYPE_POINT_COST = 3;

/** Static Standard-format checks supported by the card catalog. This is a deck-construction
 * check, not a tournament-readiness certification: dynamic card-text exceptions, banlist timing,
 * registration policy, and event-specific rules still need an official judge/source. */
export function validateDeck(
  sections: { main: Line[]; material: Line[]; sideboard: Line[] },
  cardsByName: Map<string, Card>,
  identityElements: Set<string>,
  format: DeckFormat = "STANDARD",
): DeckValidationResult {
  const illegal: string[] = [];
  const incomplete: string[] = [];
  const all = [...sections.main, ...sections.material, ...sections.sideboard];
  const effectiveIdentityElements = new Set(identityElements);
  for (const line of sections.material) {
    const identityCard = cardsByName.get(line.cardName);
    if (identityCard?.types.includes("CHAMPION")) {
      for (const element of identityCard.elements) if (element !== "NORM") effectiveIdentityElements.add(element);
    }
  }
  const totals = new Map<string, number>();
  for (const line of all) totals.set(line.cardName, (totals.get(line.cardName) ?? 0) + line.quantity);

  for (const [name, quantity] of totals) {
    const card = cardsByName.get(name);
    if (!card) {
      incomplete.push(`${name}: card data unavailable, so legality cannot be checked.`);
      continue;
    }
    const formatLimit = card.legality?.[format]?.limit;
    const copyLimit = formatLimit ?? (format === "PANTHEON" ? 1 : 4);
    const label = format === "PANTHEON" ? "Pantheon" : "Standard";
    if (formatLimit === 0) illegal.push(`${name} is not legal in ${label}.`);
    else if (quantity > copyLimit) illegal.push(`${name}: ${quantity} copies exceeds the ${copyLimit}-copy ${label} limit.`);
    if (!card.types.includes("CHAMPION") && effectiveIdentityElements.size > 0 && card.elements.length > 0 &&
        !card.elements.some((element) => element === "NORM" || effectiveIdentityElements.has(element))) {
      illegal.push(`${name} is outside the Champion/Spirit element identity.`);
    }
  }

  const mainTotal = sections.main.reduce((sum, line) => sum + line.quantity, 0);
  const materialTotal = sections.material.reduce((sum, line) => sum + line.quantity, 0);
  const sideboardTotal = sections.sideboard.reduce((sum, line) => sum + line.quantity, 0);
  if (mainTotal < 60) incomplete.push(`Main deck needs ${60 - mainTotal} more card${60 - mainTotal === 1 ? "" : "s"} for ${format === "PANTHEON" ? "Pantheon" : "Standard"}.`);
  if (materialTotal > 12) illegal.push(`Material deck has ${materialTotal} cards; maximum supported is 12.`);
  // Sideboard is a 15-point budget, not a flat card cap: a Regalia/Champion (a Material-deck-type
  // card) costs 3 points instead of 1, so swapping one in for cheaper Main-deck-type tech costs
  // Material deck flexibility elsewhere in the budget — the explicit design goal of this rework.
  // Unresolvable card data defaults to the cheaper 1-point cost rather than blocking on it.
  const sideboardPoints = sections.sideboard.reduce((sum, line) => {
    const card = cardsByName.get(line.cardName);
    const isMaterialType = card ? card.types.includes("REGALIA") || card.types.includes("CHAMPION") : false;
    return sum + line.quantity * (isMaterialType ? SIDEBOARD_MATERIAL_TYPE_POINT_COST : 1);
  }, 0);
  if (sideboardPoints > SIDEBOARD_POINT_BUDGET) {
    illegal.push(`Sideboard uses ${sideboardPoints}/${SIDEBOARD_POINT_BUDGET} points (${sideboardTotal} cards) — Regalia/Champion cards cost ${SIDEBOARD_MATERIAL_TYPE_POINT_COST} points each, others cost 1.`);
  }

  const materialCards = sections.material.map((line) => cardsByName.get(line.cardName)).filter((card): card is Card => Boolean(card));
  if (!materialCards.some((card) => card.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT"))) incomplete.push("Add the required Champion identity piece to the material deck.");
  if (!materialCards.some((card) => card.types.includes("CHAMPION") && card.subtypes.includes("SPIRIT"))) incomplete.push("Choose and add a Spirit before treating this as a completed recommendation.");

  return {
    status: illegal.length > 0 ? "Illegal" : incomplete.length > 0 ? "Incomplete" : "Legal",
    reasons: illegal.length > 0 ? [...illegal, ...incomplete] : incomplete,
    unsupportedRules: [`Cards without a catalog ${format} record use a ${format === "PANTHEON" ? 1 : 4}-copy fallback limit`, "card-text deckbuilding exceptions", "event-specific registration and banlist timing", "gameplay/tournament readiness"],
  };
}
