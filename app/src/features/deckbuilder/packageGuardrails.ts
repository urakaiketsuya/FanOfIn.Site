import { PUBLISHED_PACKAGE_CATALOG, evaluatePublishedPackage, evaluateSavedPackage, type PackageDeckCard } from "@gatcg/shared";
import { readPackageStore } from "./savedPackages";

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

type PackageCard = PackageDeckCard;

export function getRegisteredDeckPackageCatalog(cards: PackageCard[] = []): DeckPackageCatalogEntry[] {
  return PUBLISHED_PACKAGE_CATALOG.packages.filter(definition => definition.protection.mode !== "none").map((definition) => {
    const { active, protectedCards } = evaluatePublishedPackage(definition, cards);
    return { id: definition.id, label: definition.label, explanation: definition.explanation,
      activation: definition.activation, observedSupport: definition.observedSupport,
      memberCards: [...definition.memberCards], active, protectedCards };
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
    const registeredProtection = PUBLISHED_PACKAGE_CATALOG.packages.filter((definition) => registeredSources.has(`registered:${definition.id}`)).flatMap((definition) => evaluatePublishedPackage(definition, cards).protectedCards);
    const protectedCards = [...new Set([...evaluateSavedPackage(pkg, mainMaterial, material, all), ...registeredProtection])];
    return { id: pkg.id, label: pkg.name, explanation: "Approved alternative rules. Only members of satisfied rules are protected.", activation: pkg.rules.filter((rule) => rule.status !== "suggested").map((rule) => rule.conditions ? `${rule.conditions.requiredCards.join(" + ")}${rule.conditions.groups.map((group) => ` AND ${group.minimum} of (${group.cards.join(", ")})`).join("")}` : rule.activation).join(" OR "), memberCards: pkg.cards, active: protectedCards.length > 0, protectedCards };
  });
  return [...registered, ...local];
}

export function findActiveDeckPackages(cards: PackageCard[]): ActiveDeckPackage[] {
  return getDeckPackageCatalog(cards).filter((entry) => entry.active);
}

// Compatibility export for existing consumers. Membership never reads browser approvals.
export { getPublishedPackageMembership as getCardPackageMembership } from "@gatcg/shared";
