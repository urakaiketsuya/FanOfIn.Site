export interface EffectTextCard {
  effect: string | null;
}

interface NamedLine {
  name: string;
  quantity: number;
}

/**
 * Genuine ability keywords from rules.gatcg.com/glossary/keywords-and-abilities — deliberately
 * excludes trigger-timing labels (On Enter, On Attack, ...) and conditional/restriction markers
 * (Class Bonus, Level Locked, ...), which aren't "abilities" in the sense a player means by
 * "keyword composition". Floating Memory is excluded too since it has its own richer,
 * class-bonus-aware breakdown (`computeFloatingMemory` in app/src/lib/deckIdentity.ts).
 */
export const ABILITY_KEYWORDS = [
  "Aethercalling",
  "Agility",
  "Ambush",
  "Aenean Progression",
  "Brew",
  "Bulwark",
  "Cascade",
  "Cleave",
  "Critical",
  "Command",
  "Commanded Will",
  "Divine Relic",
  "Efficiency",
  "Elysian Aura",
  "Empower",
  "Ephemerate",
  "Fast Activation",
  "First Boon",
  "Foster",
  "Hindered",
  "Imbue",
  "Immortality",
  "Inherited Effect",
  "Intercept",
  "Interdiction",
  "Kindle",
  "Lineage Release",
  "Lineage",
  "Link Shield",
  "Link",
  "Multistrike",
  "Omnishroud",
  "Prepare",
  "Preserve",
  "Pride",
  "Ranged",
  "Renewable",
  "Reservable",
  "Retort",
  "Spellshroud",
  "Starcalling",
  "Steadfast",
  "Stealth",
  "Taunt",
  "True Sight",
  "Unblockable",
  "Vigor",
];

function keywordRegex(keyword: string): RegExp {
  if (keyword === "Preserve") return /\*\*Preserved?\*\*/;
  // Imbue's element-qualified variants put a prefix inside the same bold span before the word
  // itself — "**Advanced Imbue 2**", "**Crux & Tera Imbue 3**" — not just "**Imbue N**". Verified
  // against the real card corpus: this is the only keyword templated that way.
  if (keyword === "Imbue") return /\*\*(?:[A-Za-z]+(?:\s*&\s*[A-Za-z]+)?\s+)?Imbue(?:\s+(?:\d+|X))?\*\*/;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\*\\*${escaped}(?: \\d+)?\\*\\*`);
}

export const KEYWORD_PATTERNS = ABILITY_KEYWORDS.map((keyword) => ({ keyword, re: keywordRegex(keyword) }));

/**
 * Which cards in a deck (weighted by copies) carry each ability keyword — matches the bolded-keyword
 * convention verified for Floating Memory. Counts presence per card copy, not repeat mentions within
 * one card's text. Shared between the app (per-deck composition charts, client-resolved cards) and
 * the pipeline (per-sighting keyword tagging, catalog-resolved cards) — the `EffectTextCard` param
 * type is deliberately minimal so both `Card` and the pipeline's `CardSignature` satisfy it.
 */
export function computeKeywordComposition(lines: NamedLine[], cardsByName: Map<string, EffectTextCard>): Map<string, number> {
  const counts = new Map<string, number>();

  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card?.effect) continue;
    for (const { keyword, re } of KEYWORD_PATTERNS) {
      if (re.test(card.effect)) counts.set(keyword, (counts.get(keyword) ?? 0) + line.quantity);
    }
  }

  return counts;
}
