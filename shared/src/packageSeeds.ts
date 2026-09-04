import type { PackageCandidateSeed } from "./analysis-types.js";

/** Builds pair and multi-member seeds from explicit card-name mentions in rules text. */
export function namedRulesTextSeeds(cards: { name: string; types?: string[]; effect?: string | null; ruleText?: string | null }[]): PackageCandidateSeed[] {
  const names = cards.map((card) => card.name).sort((a, b) => b.length - a.length);
  const grouped = new Map<string, Set<string>>();
  for (const card of cards) {
    const text = `${card.effect ?? ""} ${card.ruleText ?? ""}`.toLowerCase();
    if (!text) continue;
    for (const name of names) {
      if (name === card.name || name.length < 7) continue;
      if (text.includes(name.toLowerCase())) {
        const members = grouped.get(card.name) ?? new Set<string>();
        members.add(name);
        grouped.set(card.name, members);
      }
    }
  }
  return [...grouped].flatMap(([anchorCard, members]) => {
    const memberCards = [...members];
    const anchorIsChampion = cards.find((card) => card.name === anchorCard)?.types?.includes("CHAMPION") ?? false;
    const pairSeeds = memberCards.map((member) => ({ anchorCard, memberCards: [member], evidenceKinds: ["Named rules-text link"], anchorIsChampion }));
    return memberCards.length > 1
      ? [...pairSeeds, { anchorCard, memberCards, evidenceKinds: ["Named rules-text link", "Multi-card cluster"], anchorIsChampion }]
      : pairSeeds;
  });
}

const MECHANICAL_SUBTYPE_RE = /\b(materialize|sacrifice|control|banish|discard|reveal|summon|return)\b/i;

/**
 * Nominates small subtype toolboxes from rules text (for example an effect that materializes a
 * Bullet). Pairwise seeds preserve sparse packages; two-member combinations let the audit find
 * interchangeable/toolbox construction patterns instead of returning only anchor→card pairs.
 */
export function subtypeRulesTextSeeds(cards: { name: string; types?: string[]; subtypes?: string[]; effect?: string | null }[]): PackageCandidateSeed[] {
  const membersBySubtype = new Map<string, string[]>();
  for (const card of cards) {
    for (const subtype of card.subtypes ?? []) {
      const members = membersBySubtype.get(subtype) ?? [];
      members.push(card.name);
      membersBySubtype.set(subtype, members);
    }
  }

  const seeds: PackageCandidateSeed[] = [];
  for (const anchor of cards) {
    const effect = anchor.effect ?? "";
    if (!MECHANICAL_SUBTYPE_RE.test(effect)) continue;
    for (const [subtype, rawMembers] of membersBySubtype) {
      if (!new RegExp(`\\b${subtype.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "i").test(effect)) continue;
      const members = rawMembers.filter((name) => name !== anchor.name);
      // Very broad categories are archetype identity, not a reviewable construction package.
      if (members.length < 2 || members.length > 12) continue;
      const anchorIsChampion = anchor.types?.includes("CHAMPION") ?? false;
      for (const member of members) seeds.push({ anchorCard: anchor.name, memberCards: [member], evidenceKinds: [`${subtype} rules-text link`], anchorIsChampion });
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          seeds.push({ anchorCard: anchor.name, memberCards: [members[i], members[j]], evidenceKinds: [`${subtype} rules-text link`, "Multi-card cluster"], anchorIsChampion });
        }
      }
    }
  }
  return seeds;
}
