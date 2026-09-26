export interface ActiveDeckPackage {
  id: string;
  label: string;
  explanation: string;
  protectedCards: string[];
}

export interface DeckPackageCatalogEntry extends ActiveDeckPackage {
  activation: string;
  active: boolean;
  memberCards: string[];
  observedSupport?: { matchingDecks: number; populationDecks: number; auditLabel: string };
}

interface PackageCard {
  cardName: string;
  quantity: number;
  section: "main" | "material" | "sideboard";
}

interface DeckPackageDefinition {
  id: string;
  label: string;
  explanation: string;
  activation: string;
  observedSupport?: DeckPackageCatalogEntry["observedSupport"];
  memberCards: string[];
  evaluate(cards: PackageCard[]): string[];
}

const RESONANCE_BAUBLES = [
  "Fire Resonance Bauble",
  "Water Resonance Bauble",
  "Wind Resonance Bauble",
];

/** Packages describe construction relationships, not archetype identity. Keep this registry small
 * and auditable: co-occurrence can nominate future packages, but activation rules stay explicit. */
const PACKAGE_DEFINITIONS: DeckPackageDefinition[] = [
  {
    id: "fluffy-shopkeep-resonance-baubles",
    label: "Fluffy Shopkeep resonance package",
    explanation: "Preserves matchup choice and material cards that Fluffy Shopkeep can banish.",
    activation: "Fluffy Shopkeep in Main and at least two distinct Fire, Water, or Wind Resonance Baubles in Material.",
    observedSupport: { matchingDecks: 804, populationDecks: 57_713, auditLabel: "deck-card index audit" },
    memberCards: ["Fluffy Shopkeep", ...RESONANCE_BAUBLES],
    evaluate(cards) {
      const hasShopkeep = cards.some((card) => card.section === "main" && card.cardName === "Fluffy Shopkeep" && card.quantity > 0);
      if (!hasShopkeep) return [];
      const baubles = [...new Set(cards
        .filter((card) => card.section === "material" && card.quantity > 0 && RESONANCE_BAUBLES.includes(card.cardName))
        .map((card) => card.cardName))];
      return baubles.length >= 2 ? baubles : [];
    },
  },
];

export function getRegisteredDeckPackageCatalog(cards: PackageCard[] = []): DeckPackageCatalogEntry[] {
  return PACKAGE_DEFINITIONS.map((definition) => {
    const protectedCards = definition.evaluate(cards);
    return { id: definition.id, label: definition.label, explanation: definition.explanation,
      activation: definition.activation, observedSupport: definition.observedSupport,
      memberCards: definition.memberCards, active: protectedCards.length > 0, protectedCards };
  });
}

export function getDeckPackageCatalog(cards: PackageCard[]): DeckPackageCatalogEntry[] {
  const savedPackages = readPackageStore().packages;
  const consumedRegistry = new Set(savedPackages.flatMap((pkg) => pkg.rules.filter((rule) => rule.status === "registered").flatMap((rule) => rule.sourceIds)));
  const registered = getRegisteredDeckPackageCatalog(cards).filter((entry) => !consumedRegistry.has(`registered:${entry.id}`));
  const mainMaterial = new Set(cards.filter((card) => card.quantity > 0 && card.section !== "sideboard").map((card) => card.cardName));
  const material = new Set(cards.filter((card) => card.quantity > 0 && card.section === "material").map((card) => card.cardName));
  const all = new Set(cards.filter((card) => card.quantity > 0).map((card) => card.cardName));
  const local = savedPackages.filter((pkg) => pkg.rules.some((rule) => rule.status !== "suggested")).map((pkg): DeckPackageCatalogEntry => {
    const registeredSources = new Set(pkg.rules.filter((rule) => rule.status === "registered").flatMap((rule) => rule.sourceIds));
    const registeredProtection = PACKAGE_DEFINITIONS.filter((definition) => registeredSources.has(`registered:${definition.id}`)).flatMap((definition) => definition.evaluate(cards));
    const protectedCards = [...new Set([...evaluateSavedPackage(pkg, mainMaterial, material, all), ...registeredProtection])];
    return { id: pkg.id, label: pkg.name, explanation: "Approved alternative rules. Only members of satisfied rules are protected.", activation: pkg.rules.filter((rule) => rule.status !== "suggested").map((rule) => rule.conditions ? `${rule.conditions.requiredCards.join(" + ")}${rule.conditions.groups.map((group) => ` AND ${group.minimum} of (${group.cards.join(", ")})`).join("")}` : rule.activation).join(" OR "), memberCards: pkg.cards, active: protectedCards.length > 0, protectedCards };
  });
  return [...registered, ...local];
}

export function findActiveDeckPackages(cards: PackageCard[]): ActiveDeckPackage[] {
  return getDeckPackageCatalog(cards).filter((entry) => entry.active);
}

/** Registry membership is intentionally context-free. It tells card-level pages which explicit
 * packages mention a card; only getDeckPackageCatalog can say whether one is active in a deck. */
export function getCardPackageMembership(cardName: string): Omit<DeckPackageCatalogEntry, "active" | "protectedCards">[] {
  return PACKAGE_DEFINITIONS
    .filter((definition) => definition.memberCards.includes(cardName))
    .map(({ id, label, explanation, activation, observedSupport, memberCards }) => ({ id, label, explanation, activation, observedSupport, memberCards }));
}
import { evaluateSavedPackage } from "@gatcg/shared";
import { readPackageStore } from "./savedPackages";
