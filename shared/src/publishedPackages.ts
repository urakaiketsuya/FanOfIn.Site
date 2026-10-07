/** Reviewed site catalog. Released with the app; browser approvals never mutate it. */
export interface PackageDeckCard {
  cardName: string;
  quantity: number;
  section: "main" | "material" | "sideboard";
}

export interface PackageRequirement {
  section: "main" | "material";
  cards: readonly string[];
  /** Number of distinct names, not copies. */
  minimum: number;
}

export interface PublishedCardPackage {
  id: string;
  revision: number;
  label: string;
  explanation: string;
  activation: string;
  memberCards: readonly string[];
  /** All requirements must match; alternatives live within a requirement. */
  requirements: readonly PackageRequirement[];
  /** Preserves the registered Lorraine lineage check; context is not a pool member. */
  materialChampionPrefix?: string;
  /** Publication and Builder protection are independent decisions. */
  protection: { mode: "none" } | { mode: "present-members"; cards: readonly string[] };
  evidence: readonly { path: string; note: string }[];
  observedSupport?: { matchingDecks: number; populationDecks: number; auditLabel: string };
}

const baubles = ["Fire Resonance Bauble", "Water Resonance Bauble", "Wind Resonance Bauble"];
const argusFuel = ["Crystal of Argus", "Eye of Argus"];
const clarents = ["Clarent, Reimagined", "Clarent, Sword of Peace"];

export const PUBLISHED_PACKAGE_CATALOG: {
  schemaVersion: 1;
  revision: number;
  packages: readonly PublishedCardPackage[];
} = {
  schemaVersion: 1,
  revision: 2,
  packages: [
    {
      id: "fluffy-shopkeep-resonance-baubles", revision: 1,
      label: "Fluffy Shopkeep resonance package",
      explanation: "Preserves matchup choice and material cards that Fluffy Shopkeep can banish.",
      activation: "Fluffy Shopkeep in Main and at least two distinct Fire, Water, or Wind Resonance Baubles in Material.",
      memberCards: ["Fluffy Shopkeep", ...baubles],
      requirements: [{ section: "main", cards: ["Fluffy Shopkeep"], minimum: 1 }, { section: "material", cards: baubles, minimum: 2 }],
      protection: { mode: "present-members", cards: baubles },
      observedSupport: { matchingDecks: 804, populationDecks: 57_713, auditLabel: "deck-card index audit" },
      evidence: [{ path: "docs/CALCULATIONS.md", note: "Registered Shopkeep construction policy. The printed effect permits any two Material cards; the bauble pool preserves the existing matchup-choice policy. Counts are the original historical audit, not current usage." }],
    },
    {
      id: "argus-material-fuel", revision: 1,
      label: "Argus material-fuel package",
      explanation: "Each Crystal of Argus or Eye of Argus banished from Material pays 3 of Argus's reserve cost.",
      activation: "Argus, All-Seeing Giant in Main and at least one Crystal of Argus or Eye of Argus in Material.",
      memberCards: ["Argus, All-Seeing Giant", ...argusFuel],
      requirements: [{ section: "main", cards: ["Argus, All-Seeing Giant"], minimum: 1 }, { section: "material", cards: argusFuel, minimum: 1 }],
      protection: { mode: "present-members", cards: ["Argus, All-Seeing Giant", ...argusFuel] },
      evidence: [{ path: "docs/CALCULATIONS.md", note: "Catalog-verified named Material cost contribution; see Automatic package approval policy v1. Publication does not depend on browser auto-approval." }],
    },
    {
      id: "turbo-charge-backup-charger", revision: 1,
      label: "Turbo Charge + Backup Charger",
      explanation: "Backup Charger produces the Powercell that Turbo Charge sacrifices to draw two cards.",
      activation: "Turbo Charge in Main and Backup Charger in Material.",
      memberCards: ["Turbo Charge", "Backup Charger"],
      requirements: [{ section: "main", cards: ["Turbo Charge"], minimum: 1 }, { section: "material", cards: ["Backup Charger"], minimum: 1 }],
      protection: { mode: "present-members", cards: ["Turbo Charge", "Backup Charger"] },
      evidence: [{ path: "docs/experiments/package-construction.md", note: "Repeated construction finding. Cached catalog text confirms Powercell production and sacrifice; activation describes deck construction, not immediate playability." }],
    },
    {
      id: "clarent-reimagined-lineage", revision: 1,
      label: "Clarent, Reimagined + Clarent, Sword of Peace",
      explanation: "Lorraine can banish Clarent, Sword of Peace from Material to help pay for Clarent, Reimagined.",
      activation: "A Lorraine champion and both Clarent, Reimagined and Clarent, Sword of Peace in Material.",
      memberCards: clarents,
      requirements: [{ section: "material", cards: clarents, minimum: 2 }],
      materialChampionPrefix: "Lorraine,",
      protection: { mode: "present-members", cards: clarents },
      evidence: [{ path: "docs/experiments/package-construction.md", note: "Repeated construction finding. Cached Clarent, Reimagined text explicitly names Sword of Peace under Lorraine Bonus." }],
    },

    {
      id: "return-to-archive-looking-glass", revision: 1,
      label: "Return to the Archive + The Looking Glass",
      explanation: "The Looking Glass can begin on the field from your starting Material deck. Return to the Archive can sacrifice it to recover 2 and draw a card; you give up its Distortion elemental access while it is gone.",
      activation: "Return to the Archive in Main and The Looking Glass in Material. The Glass must be on the field to sacrifice it.",
      memberCards: ["Return to the Archive", "The Looking Glass"],
      requirements: [{ section: "main", cards: ["Return to the Archive"], minimum: 1 }, { section: "material", cards: ["The Looking Glass"], minimum: 1 }],
      protection: { mode: "none" },
      evidence: [{ path: "docs/CALCULATIONS.md", note: "Catalog revision 2 publication review: official card API and September 14 B&R checked 2026-10-07. Exact construction core repeated in 39/47 later cohort decks; no win-rate claim or alternative-regalia pool." }],
    },
    {
      id: "numinous-monk-capacitance", revision: 1,
      label: "Numinous Monk + Capacitance X Psycho",
      explanation: "With both on the field, keep Capacitance X Psycho awake and rest another regalia using Numinous Monk's granted ability to deal 2 damage. Resting Capacitance itself turns off its damage increase. Playing the pair requires access to Crux and Arcane; Capacitance's special Material activation also requires Lorraine Bonus and six Arcane cards in banishment, and enters rested.",
      activation: "Numinous Monk in Main and Capacitance X Psycho in Material. The damage interaction needs both on the field, Capacitance awake, and another awake regalia.",
      memberCards: ["Numinous Monk", "Capacitance X Psycho"],
      requirements: [{ section: "main", cards: ["Numinous Monk"], minimum: 1 }, { section: "material", cards: ["Capacitance X Psycho"], minimum: 1 }],
      protection: { mode: "none" },
      evidence: [{ path: "docs/CALCULATIONS.md", note: "Catalog revision 2 publication review: official card API and September 14 B&R checked 2026-10-07. Exact core repeated in 12/21 later cohort decks. Deck presence does not establish elemental access or awake/field state." }],
    },
    {
      id: "prototype-pistol-windpiercer", revision: 1,
      label: "Prototype Pistol + Windpiercer",
      explanation: "Rest Windpiercer to load an unloaded Prototype Pistol on the field. Windpiercer adds its On Attack effect when used as ammunition. You need Wind access for Windpiercer; the Pistol's On Enter power bonus requires Ranger Class Bonus.",
      activation: "Prototype Pistol and Windpiercer in Material. Put both on the field, with Windpiercer awake and the Pistol unloaded, before loading.",
      memberCards: ["Prototype Pistol", "Windpiercer"],
      requirements: [{ section: "material", cards: ["Prototype Pistol", "Windpiercer"], minimum: 2 }],
      protection: { mode: "none" },
      evidence: [{ path: "docs/CALCULATIONS.md", note: "Catalog revision 2 publication review: official card API and September 14 B&R checked 2026-10-07. Exact core repeated in 13/31 later cohort decks. Other Guns are not inferred members." }],
    },
  ],
};

export interface PublishedPackageEvaluation {
  active: boolean;
  protectedCards: string[];
}

export function evaluatePublishedPackage(definition: PublishedCardPackage, cards: readonly PackageDeckCard[]): PublishedPackageEvaluation {
  const present = (section: "main" | "material", name: string) => cards.some(card => card.section === section && card.cardName === name && card.quantity > 0);
  const active = definition.requirements.length > 0 && definition.requirements.every(requirement =>
    new Set(requirement.cards.filter(name => present(requirement.section, name))).size >= requirement.minimum,
  ) && (!definition.materialChampionPrefix || cards.some(card => card.section === "material" && card.quantity > 0 && card.cardName.startsWith(definition.materialChampionPrefix!)));
  const protection = definition.protection;
  // Required cores retain catalog order; alternative pools retain deck order, as in the registry.
  const protectedCards = active && protection.mode === "present-members"
    ? definition.requirements.flatMap(requirement => {
      const names = requirement.minimum === requirement.cards.length ? requirement.cards : cards
        .filter(card => card.section === requirement.section && card.quantity > 0 && requirement.cards.includes(card.cardName))
        .map(card => card.cardName);
      return names.filter(name => protection.cards.includes(name) && present(requirement.section, name));
    })
    : [];
  return { active, protectedCards: [...new Set(protectedCards)] };
}

export function getPublishedPackageMembership(cardName: string) {
  return PUBLISHED_PACKAGE_CATALOG.packages.filter(definition => definition.memberCards.includes(cardName)).map(definition => ({
    id: definition.id, label: definition.label, explanation: definition.explanation, activation: definition.activation,
    memberCards: [...definition.memberCards], observedSupport: definition.observedSupport,
  }));
}
