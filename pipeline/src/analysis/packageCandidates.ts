import { decodeCardLines, type ArchetypeCluster, type DeckCardIndexEntry } from "@gatcg/shared";

export interface ArchetypePackageSource {
  buildId: string;
  buildName: string;
  prevalence: number;
  sectionPattern: "Main → Main" | "Main → Material" | "Material → Material";
}

export interface PackageCandidateEvidence {
  anchorCard: string;
  memberCards: string[];
  matchingDecks: number;
  anchorDecks: number;
  memberDecks: number;
  populationDecks: number;
  support: number;
  confidence: number;
  lift: number;
  championCoverage: number;
  strongestChampions: { championName: string; matchingDecks: number; confidence: number; lift: number }[];
  evidenceKinds: string[];
  archetypeSources?: ArchetypePackageSource[];
  confidenceScore: number;
  cautions: string[];
}

export interface PackageCandidatesData {
  generatedAt: string;
  candidates: PackageCandidateEvidence[];
  families: PackageCandidateFamily[];
}

export interface PackageCandidateFamily {
  anchorCard: string;
  coreCards: string[];
  optionCards: string[];
  minOptions: number;
  evidenceKinds: string[];
  candidateCount: number;
  confidenceScore: number;
  matchingDecks: number;
}

export interface PackageCandidateSeed {
  anchorCard: string;
  memberCards: string[];
  evidenceKinds: string[];
  anchorIsChampion?: boolean;
  archetypeSources?: ArchetypePackageSource[];
}

interface DeckPresence {
  championName: string;
  cards: Set<string>;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

/**
 * Nominates pairs that repeatedly define concrete builds. Defining-card selection has already
 * removed globally ubiquitous cards, so this is substantially less noisy than mining every pair
 * in every deck. A pair must occur in two builds in the same strategy family, or in one very
 * well-established (200-player) build, before it reaches the more expensive deck-level scorer.
 */
export function archetypeOverlapSeeds(clusters: ArchetypeCluster[]): PackageCandidateSeed[] {
  type Accumulator = { anchorCard: string; memberCard: string; strategyIds: Set<string>; sources: ArchetypePackageSource[] };
  const pairs = new Map<string, Accumulator>();
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));

  for (const cluster of clusters) {
    const cards = [
      ...cluster.mainDefiningCards.slice(0, 6).map((card) => ({ ...card, section: "Main" as const })),
      ...cluster.materialDefiningCards.slice(0, 5).map((card) => ({ ...card, section: "Material" as const })),
    ];
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const [left, right] = [cards[i], cards[j]].sort((a, b) => a.name.localeCompare(b.name));
        if (left.name === right.name) continue;
        const key = `${left.name}\u0000${right.name}`;
        const entry = pairs.get(key) ?? { anchorCard: left.name, memberCard: right.name, strategyIds: new Set<string>(), sources: [] };
        entry.strategyIds.add(cluster.strategyArchetypeId);
        const sectionPattern = left.section === right.section
          ? `${left.section} → ${right.section}` as ArchetypePackageSource["sectionPattern"]
          : "Main → Material";
        entry.sources.push({
          buildId: cluster.id,
          buildName: cluster.name,
          prevalence: Math.min(left.prevalence, right.prevalence),
          sectionPattern,
        });
        pairs.set(key, entry);
      }
    }
  }

  return [...pairs.values()].flatMap((entry) => {
    const sources = entry.sources
      .sort((a, b) => b.prevalence - a.prevalence || a.buildName.localeCompare(b.buildName));
    const sourceBuildIds = new Set(sources.map((source) => source.buildId));
    const sourceStrategies = new Map<string, Set<string>>();
    for (const buildId of sourceBuildIds) {
      const cluster = clusterById.get(buildId);
      if (!cluster) continue;
      const ids = sourceStrategies.get(cluster.strategyArchetypeId) ?? new Set<string>();
      ids.add(buildId);
      sourceStrategies.set(cluster.strategyArchetypeId, ids);
    }
    const qualifiesFromMultipleRelatedBuilds = [...sourceStrategies.values()].some((ids) => ids.size >= 2);
    const qualifiesFromLargeBuild = sources.some((source) => (clusterById.get(source.buildId)?.playerCount ?? 0) >= 200);
    if (!qualifiesFromMultipleRelatedBuilds && !qualifiesFromLargeBuild) return [];
    return [{
      anchorCard: entry.anchorCard,
      memberCards: [entry.memberCard],
      evidenceKinds: ["Archetype defining-card overlap"],
      archetypeSources: sources.slice(0, 6),
    }];
  });
}

/**
 * Scores semantically nominated relationships against champion-stratified deck data. Semantic
 * nomination is intentional: exhaustively ranking every co-played pair mostly rediscovers staples.
 * The result is review-only and never mutates live package guardrails.
 */
export function computePackageCandidates(
  entries: DeckCardIndexEntry[],
  cardNames: string[],
  championByDeckId: ReadonlyMap<string, string>,
  seeds: PackageCandidateSeed[],
  minMatches = 12,
): PackageCandidatesData {
  const decks: DeckPresence[] = entries.flatMap((entry) => {
    const championName = championByDeckId.get(entry.deckId);
    if (!championName) return [];
    return [{
      championName,
      cards: new Set([...entry.main, ...entry.material, ...entry.sideboard].map(([index]) => cardNames[index])),
    }];
  });
  const deckIndexesByCard = new Map<string, number[]>();
  const populationByChampion = new Map<string, number>();
  decks.forEach((deck, deckIndex) => {
    populationByChampion.set(deck.championName, (populationByChampion.get(deck.championName) ?? 0) + 1);
    for (const card of deck.cards) {
      const indexes = deckIndexesByCard.get(card) ?? [];
      indexes.push(deckIndex);
      deckIndexesByCard.set(card, indexes);
    }
  });

  const candidates = seeds.flatMap((seed): PackageCandidateEvidence[] => {
    const anchorIndexes = deckIndexesByCard.get(seed.anchorCard) ?? [];
    const smallestMemberIndexes = seed.memberCards
      .map((card) => deckIndexesByCard.get(card) ?? [])
      .sort((a, b) => a.length - b.length)[0] ?? [];
    const memberIndexes = smallestMemberIndexes.filter((index) => seed.memberCards.every((card) => decks[index].cards.has(card)));
    const matchingIndexes = anchorIndexes.filter((index) => seed.memberCards.every((card) => decks[index].cards.has(card)));
    if (matchingIndexes.length < minMatches || anchorIndexes.length === 0 || memberIndexes.length === 0) return [];

    const confidence = ratio(matchingIndexes.length, anchorIndexes.length);
    const baseline = ratio(memberIndexes.length, decks.length);
    const lift = baseline > 0 ? confidence / baseline : 0;
    const champions = [...new Set(anchorIndexes.map((index) => decks[index].championName))];
    const strongestChampions = champions.flatMap((championName) => {
      const populationCount = populationByChampion.get(championName) ?? 0;
      const anchorCount = anchorIndexes.reduce((count, index) => count + Number(decks[index].championName === championName), 0);
      const memberCount = memberIndexes.reduce((count, index) => count + Number(decks[index].championName === championName), 0);
      const matchCount = matchingIndexes.reduce((count, index) => count + Number(decks[index].championName === championName), 0);
      if (matchCount < Math.max(3, Math.floor(minMatches / 3))) return [];
      const cohortConfidence = ratio(matchCount, anchorCount);
      const cohortBaseline = ratio(memberCount, populationCount);
      return [{ championName, matchingDecks: matchCount, confidence: cohortConfidence, lift: cohortBaseline > 0 ? cohortConfidence / cohortBaseline : 0 }];
    }).sort((a, b) => b.matchingDecks - a.matchingDecks).slice(0, 4);

    const cautions: string[] = [];
    if (confidence < 0.5) cautions.push("Members often appear without the complete package");
    if (strongestChampions.length < 2) cautions.push("Evidence is concentrated in one champion cohort");
    if (baseline > 0.2) cautions.push("Members are common enough that staple correlation is possible");
    const championCoverage = strongestChampions.length;
    const sampleFactor = Math.min(1, Math.log10(matchingIndexes.length + 1) / 2);
    const championPairPenalty = seed.anchorIsChampion && seed.memberCards.length === 1 ? 15 : 0;
    const score = 100 * (0.42 * Math.min(1, confidence) + 0.28 * Math.min(1, Math.log2(Math.max(1, lift)) / 4) + 0.18 * sampleFactor + 0.12 * Math.min(1, championCoverage / 3)) - championPairPenalty;
    if (championPairPenalty) cautions.push("Single-target champion relationship; prefer broader construction evidence");

    return [{
      ...seed,
      matchingDecks: matchingIndexes.length,
      anchorDecks: anchorIndexes.length,
      memberDecks: memberIndexes.length,
      populationDecks: decks.length,
      support: ratio(matchingIndexes.length, decks.length),
      confidence,
      lift,
      championCoverage,
      strongestChampions,
      confidenceScore: Math.round(score),
      cautions,
    }];
  });

  const sorted = candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
  const named = sorted.filter((candidate) => candidate.evidenceKinds.includes("Named rules-text link"));
  const archetypeOverlap = sorted
    .filter((candidate) => candidate.evidenceKinds.includes("Archetype defining-card overlap") && candidate.confidenceScore >= 40)
    .slice(0, 80);
  const bestSubtypeCluster = new Map<string, PackageCandidateEvidence>();
  for (const candidate of sorted) {
    if (candidate.memberCards.length < 2 || candidate.evidenceKinds.includes("Named rules-text link")) continue;
    const family = candidate.evidenceKinds.find((kind) => kind.endsWith(" rules-text link"));
    if (family && !bestSubtypeCluster.has(family)) bestSubtypeCluster.set(family, candidate);
  }
  // One representative per mechanical subtype prevents a 7-card tribe from flooding review with
  // every anchor/pair permutation. The audit queue is deliberately bounded; rejected families can
  // be revisited without making the UI unusable.
  const subtypeClusters = [...bestSubtypeCluster.values()].filter((candidate) => candidate.confidenceScore >= 40).slice(0, 40);
  const deduped = new Map<string, PackageCandidateEvidence>();
  for (const candidate of [...named, ...subtypeClusters, ...archetypeOverlap]) {
    const key = [candidate.anchorCard, ...candidate.memberCards].sort().join("\u0000");
    if (!deduped.has(key)) deduped.set(key, candidate);
  }
  return {
    generatedAt: new Date().toISOString(),
    candidates: [...deduped.values()].sort((a, b) => b.confidenceScore - a.confidenceScore),
    families: buildPackageCandidateFamilies(candidates),
  };
}

/** Merges overlapping relationships without pretending every discovered member is mandatory. */
export function buildPackageCandidateFamilies(candidates: PackageCandidateEvidence[]): PackageCandidateFamily[] {
  const eligible = candidates.filter((candidate) => candidate.confidenceScore >= 40);
  const groups = new Map<string, PackageCandidateEvidence[]>();
  for (const candidate of eligible) {
    const relationship = candidate.evidenceKinds.find((kind) => kind.endsWith(" rules-text link")) ?? candidate.evidenceKinds[0] ?? "Unknown";
    const key = `${candidate.anchorCard}\u0000${relationship}`;
    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }

  const families: PackageCandidateFamily[] = [];
  for (const group of groups.values()) {
    // Connected components prevent two unrelated toolboxes on the same anchor from being merged.
    const remaining = new Set(group);
    while (remaining.size > 0) {
      const first = remaining.values().next().value as PackageCandidateEvidence;
      remaining.delete(first);
      const component = [first];
      const knownMembers = new Set(first.memberCards);
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const candidate of [...remaining]) {
          if (!candidate.memberCards.some((card) => knownMembers.has(card))) continue;
          remaining.delete(candidate);
          component.push(candidate);
          candidate.memberCards.forEach((card) => knownMembers.add(card));
          expanded = true;
        }
      }
      if (component.length < 2 || knownMembers.size < 3) continue;
      const occurrence = new Map<string, number>();
      for (const candidate of component) for (const card of candidate.memberCards) occurrence.set(card, (occurrence.get(card) ?? 0) + 1);
      const coreCards = [...knownMembers].filter((card) => occurrence.get(card) === component.length).sort();
      const optionCards = [...knownMembers].filter((card) => !coreCards.includes(card)).sort();
      if (optionCards.length < 2) continue;
      const strongestScore = Math.max(...component.map((candidate) => candidate.confidenceScore));
      const strongest = component.filter((candidate) => candidate.confidenceScore >= strongestScore - 5);
      const minOptions = Math.max(1, ...strongest.map((candidate) => candidate.memberCards.filter((card) => optionCards.includes(card)).length));
      families.push({
        anchorCard: first.anchorCard,
        coreCards,
        optionCards,
        minOptions: Math.min(minOptions, optionCards.length),
        evidenceKinds: [...new Set(component.flatMap((candidate) => candidate.evidenceKinds))],
        candidateCount: component.length,
        confidenceScore: strongestScore,
        matchingDecks: Math.max(...component.map((candidate) => candidate.matchingDecks)),
      });
    }
  }
  return families.sort((a, b) => b.confidenceScore - a.confidenceScore || b.optionCards.length - a.optionCards.length).slice(0, 40);
}

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
