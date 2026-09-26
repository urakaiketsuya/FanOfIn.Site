import { decodeCardLines, matchesPackageRule, packageRuleKey, type DeckCardIndexEntry, type PackageApprovalEvidence, type PackageCandidatesData, type PackageReviewRule } from "@gatcg/shared";

interface CatalogCard { name: string; types?: string[]; effect?: string | null }
/** This deliberately small verification whitelist is checked against the current catalog text.
 * Text nominations and inferred families are not mechanical verification. */
function verifiedMechanics(anchor: string, members: string[], catalog: CatalogCard[]) {
  const text = catalog.find((card) => card.name === anchor)?.effect ?? "";
  const verified = anchor === "Argus, All-Seeing Giant" && members.length > 0 && members.every((name) => ["Crystal of Argus", "Eye of Argus"].includes(name)) &&
    text.includes("you may banish one or more cards named Crystal of Argus or Eye of Argus from your material deck") && text.includes("Each card banished this way pays for 3 of that cost");
  return { verified, description: verified ? "Catalog-verified Argus material-deck cost contribution; each named member is a legal contributor." : "Text nomination only; no reviewed, unambiguous mechanical verification for this exact rule." };
}
export function attachPackageApprovalEvidence(data: PackageCandidatesData, entries: DeckCardIndexEntry[], cardNames: string[], champions: ReadonlyMap<string, string>, catalog: CatalogCard[]): void {
  const decks = entries.flatMap((entry) => {
    const champion = champions.get(entry.deckId);
    const event = entry.deckId.slice(0, entry.deckId.indexOf(":"));
    if (!champion) return [];
    return [{ champion, event, cards: new Set(decodeCardLines([...entry.main, ...entry.material].filter(([, q]) => q > 0), cardNames).map((line) => line.name)), material: new Set(decodeCardLines(entry.material.filter(([, q]) => q > 0), cardNames).map((line) => line.name)) }];
  });
  const byChampion = new Map<string, typeof decks>();
  for (const deck of decks) { const cohort = byChampion.get(deck.champion) ?? []; cohort.push(deck); byChampion.set(deck.champion, cohort); }
  const cache = new Map<string, PackageApprovalEvidence>();
  const measure = (rule: PackageReviewRule, anchor: string, members: string[], inferred: boolean): PackageApprovalEvidence => {
    const key = packageRuleKey(rule);
    const cacheKey = `${inferred}:${anchor}:${key}`;
    const prior = cache.get(cacheKey); if (prior) return prior;
    const verification = verifiedMechanics(anchor, members, catalog);
    const materialMembers = verification.verified ? members : [];
    const targets: PackageReviewRule = { requiredCards: rule.requiredCards.filter((card) => card !== anchor), groups: rule.groups };
    const cohorts = [...byChampion].flatMap(([championName, population]) => {
      const anchorDecks = population.filter((deck) => deck.cards.has(anchor));
      if (!anchorDecks.length) return [];
      const memberDecks = population.filter((deck) => matchesPackageRule(deck.cards, targets) && materialMembers.every((card) => deck.material.has(card)));
      const matching = anchorDecks.filter((deck) => matchesPackageRule(deck.cards, rule) && materialMembers.every((card) => deck.material.has(card)));
      const confidence = matching.length / anchorDecks.length;
      const baseline = memberDecks.length / population.length;
      const championCards = catalog.filter((card) => card.types?.includes("CHAMPION") && (card.name === championName || card.name.startsWith(`${championName},`))).map((card) => card.name);
      return [{ championName, championCards, matchingDecks: matching.length, matchingEvents: new Set(matching.map((deck) => deck.event).filter(Boolean)).size, anchorDecks: anchorDecks.length, confidence, lift: baseline ? confidence / baseline : 0 }];
    }).sort((a, b) => b.matchingDecks - a.matchingDecks);
    const result = { ruleKey: key, generatedAt: data.generatedAt, mechanicsVerified: !inferred && verification.verified, verification: verification.description,
      ambiguities: inferred ? ["This rule was inferred by merging overlapping findings; its complete mechanics need review."] : [], requiredMaterialCards: materialMembers, cohorts };
    cache.set(cacheKey, result); return result;
  };
  for (const candidate of data.candidates) candidate.approvalEvidence = measure({ requiredCards: [candidate.anchorCard, ...candidate.memberCards], groups: [] }, candidate.anchorCard, candidate.memberCards, false);
  for (const family of data.families) {
    family.approvalEvidence = measure({ requiredCards: [family.anchorCard, ...family.coreCards], groups: [{ cards: family.optionCards, minimum: family.minOptions }] }, family.anchorCard, [...family.coreCards, ...family.optionCards], true);
    for (const candidate of family.sourceFindings ?? []) candidate.approvalEvidence = measure({ requiredCards: [candidate.anchorCard, ...candidate.memberCards], groups: [] }, candidate.anchorCard, candidate.memberCards, false);
  }
}
