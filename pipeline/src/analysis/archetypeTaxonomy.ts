import { shortHash, type ArchetypeCluster, type ArchetypeTaxonomyData, type DeckSighting } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import { resolveCard, type CardSignature } from "../cards/catalog.js";
import type { AnalysisContext } from "./context.js";
import { weightedJaccard } from "./similarity.js";
import { computeDeckPrice } from "./deckPricing.js";
import { config } from "../config.js";

/** A build needs this many distinct players to create a cluster seed. Singleton variants may join an existing seed. */
const MIN_GROUP_PLAYERS = 2;

/**
 * Weighted-Jaccard threshold for a build to join an existing cluster. Chosen empirically —
 * verified live against Guo Jia (our largest champion group): single-linkage/union-find
 * clustering chains into 3-4 giant blobs at every threshold from 0.35-0.6, but greedy
 * nearest-seed assignment (this file's algorithm) at 0.45 produces 11 clusters with >=5 players,
 * whose top defining cards cleanly separate by element. See docs/CALCULATIONS.md.
 */
const CLUSTER_THRESHOLD = 0.45;

/** A card must appear in at least this fraction of a cluster's (player-weighted) decks to be "defining". */
const DEFINING_MIN_IN_CLUSTER = 0.8;
/** ...and appear in *fewer* than this fraction of decks generally — otherwise it's just a universal staple, not something that distinguishes this build. */
const DEFINING_MAX_GLOBAL_PRESENCE = 0.85;

/** Shared-main-package overlap used to roll concrete builds into a strategy archetype. */
export function archetypePackageOverlap(
  leftCards: { name: string }[],
  rightCards: { name: string }[],
): number {
  const left = new Set(leftCards.map((card) => card.name));
  const right = new Set(rightCards.map((card) => card.name));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const name of left) if (right.has(name)) shared++;
  // One ubiquitous or incidental card cannot establish a shared engine.
  if (shared < 2) return 0;
  return shared / Math.min(left.size, right.size);
}

/** Wilson score interval, accepting half-wins so tied matches contribute symmetrically. */
export function winRateWilsonInterval(wins: number, matches: number): { low: number; high: number; matches: number } {
  if (matches <= 0) return { low: 0, high: 1, matches: 0 };
  const z = 1.959963984540054;
  const p = wins / matches;
  const z2 = z * z;
  const denominator = 1 + z2 / matches;
  const center = (p + z2 / (2 * matches)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * matches)) / matches)) / denominator;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin), matches };
}

/** Match retired ids to rebuilt clusters by deck-membership overlap and carry aliases forward. */
export function applyArchetypeLineageAliases(current: ArchetypeTaxonomyData, previous: ArchetypeTaxonomyData | null): ArchetypeTaxonomyData {
  if (!previous) return current;
  const currentIds = new Set(current.clusters.map((cluster) => cluster.id));
  const aliases: Record<string, string> = {};
  for (const oldCluster of previous.clusters) {
    if (currentIds.has(oldCluster.id)) continue;
    const oldDecks = new Set(oldCluster.deckIds);
    let bestId: string | null = null;
    let bestOverlap = 0;
    for (const nextCluster of current.clusters) {
      let intersection = 0;
      for (const deckId of nextCluster.deckIds) if (oldDecks.has(deckId)) intersection++;
      const overlap = intersection / Math.min(oldDecks.size, nextCluster.deckIds.length);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestId = nextCluster.id;
      }
    }
    if (bestId && bestOverlap >= 0.6) aliases[oldCluster.id] = bestId;
  }
  for (const [retiredId, formerTarget] of Object.entries(previous.aliases ?? {})) {
    const target = aliases[formerTarget] ?? (currentIds.has(formerTarget) ? formerTarget : null);
    if (target) aliases[retiredId] = target;
  }
  return { ...current, aliases };
}

interface CardDeck {
  deckId: string;
  player: number;
  championName: string;
  cardCounts: Map<string, number>;
  mainCardCounts: Map<string, number>;
}

/** Per-Champion tally within a `BuildGroup` — how many of the group's decks/players ran it under each Champion. */
interface ChampionTally {
  deckIds: string[];
  players: Set<number>;
}

interface BuildGroup {
  cardCounts: Map<string, number>;
  mainCardCounts: Map<string, number>;
  deckIds: string[];
  players: Set<number>;
  /** Keyed by championName — almost always a single entry, but the exact same main+material list is occasionally netdecked under more than one Champion. */
  championTallies: Map<string, ChampionTally>;
}

interface Cluster {
  seedCards: Map<string, number>;
  seedSignature: string;
  members: BuildGroup[];
  players: Set<number>;
}

/** Champion and Spirit printings identify the pilot, not the strategic shell being clustered. */
export function isArchetypeStrategyCard(card: CardSignature | undefined): boolean {
  if (!card) return true;
  return !card.types.some((type) => type.toUpperCase() === "CHAMPION" || type.toUpperCase() === "SPIRIT");
}

function canonicalSignature(cardCounts: Map<string, number>): string {
  return Array.from(cardCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, qty]) => `${name}:${qty}`)
    .join("|");
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

/** Dominant non-colorless element among defining cards, weighted by prevalence and requiring a clear margin. */
function dominantElement(definingCards: { name: string; prevalence: number }[], cardIndex: Map<string, CardSignature>): string | null {
  const counts = new Map<string, number>();
  for (const { name, prevalence } of definingCards) {
    const card = cardIndex.get(name);
    if (!card) continue;
    for (const el of card.elements) {
      if (el === "NORM") continue;
      counts.set(el, (counts.get(el) ?? 0) + prevalence);
    }
  }
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = ranked[0];
  if (!top) return null;
  const runnerUp = ranked[1];
  if (runnerUp && top[1] < runnerUp[1] * 1.15) return "Mixed";
  return titleCase(top[0]);
}

/**
 * Data-derived named builds (e.g. "Water Guo Jia") — richer than the existing per-Champion
 * rollup in archetypes.json, since the same card shell is often played under more than one
 * Champion and a single Champion often has several genuinely distinct competitive builds.
 * Clustering is strategy-card-only (main+material excluding Champion and Spirit printings);
 * each resulting cluster
 * then reports which Champion(s) it was actually played under via `championBreakdown`. See
 * docs/CALCULATIONS.md for the full method and the real-data validation behind the threshold
 * choices.
 */
export function computeArchetypeTaxonomy(
  bundles: OmnidexEventBundle[],
  ctx: AnalysisContext,
  deckSightings: DeckSighting[],
  priceByName: Map<string, number>,
  options: { clusterThreshold?: number } = {},
): ArchetypeTaxonomyData {
  if (config.fastMode) return { generatedAt: new Date().toISOString(), clusters: [], strategyArchetypes: [], coverage: { classifiedDeckCount: 0, totalDeckCount: 0, classificationRate: 0 }, aliases: {}, cardClusterIndex: {} };
  const clusterThreshold = options.clusterThreshold ?? CLUSTER_THRESHOLD;

  const sightingByDeckId = new Map(deckSightings.map((s) => [s.deckId, s]));

  const allDecks: CardDeck[] = [];
  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = ctx.getEventSignatures(bundle);
    for (const entry of bundle.decklists) {
      const championName = signatures.get(entry.player)?.championName;
      if (!championName) continue;
      const cardCounts = new Map<string, number>();
      const mainCardCounts = new Map<string, number>();
      for (const [section, lines] of [["main", entry.decklist.main], ["material", entry.decklist.material]] as const) {
        for (const line of lines) {
        // Canonicalize — otherwise a mis-cased submission of an otherwise-identical decklist
        // would score as a *different* exact-signature build group, and its copy of the card
        // would never count toward that card's real cluster prevalence.
        const card = resolveCard(ctx.cardIndex, line.card);
        if (!isArchetypeStrategyCard(card)) continue;
        const name = card?.name ?? line.card;
        cardCounts.set(name, (cardCounts.get(name) ?? 0) + line.quantity);
        if (section === "main") mainCardCounts.set(name, (mainCardCounts.get(name) ?? 0) + line.quantity);
        }
      }
      if (cardCounts.size === 0) continue;
      allDecks.push({ deckId: `${bundle.id}:${entry.player}`, player: entry.player, championName, cardCounts, mainCardCounts });
    }
  }

  // Group into exact-signature "builds" by cards alone — same convention as
  // useDeckPopularity.ts's canonicalSignature, but global rather than scoped to one Champion, so
  // the exact same 40-card list played under two different Champions still lands in one group
  // (tracked separately per Champion via championTallies).
  const groups = new Map<string, BuildGroup>();
  for (const d of allDecks) {
    const sig = canonicalSignature(d.cardCounts);
    const g = groups.get(sig) ?? { cardCounts: d.cardCounts, mainCardCounts: d.mainCardCounts, deckIds: [], players: new Set<number>(), championTallies: new Map<string, ChampionTally>() };
    g.deckIds.push(d.deckId);
    g.players.add(d.player);
    const tally = g.championTallies.get(d.championName) ?? { deckIds: [], players: new Set<number>() };
    tally.deckIds.push(d.deckId);
    tally.players.add(d.player);
    g.championTallies.set(d.championName, tally);
    groups.set(sig, g);
  }

  const sortedGroups = Array.from(groups.entries())
    .sort(([signatureA, a], [signatureB, b]) => b.players.size - a.players.size || signatureA.localeCompare(signatureB));
  const seedGroups = sortedGroups.filter(([, group]) => group.players.size >= MIN_GROUP_PLAYERS);
  const singletonGroups = sortedGroups.filter(([, group]) => group.players.size < MIN_GROUP_PLAYERS);

  // Greedy nearest-seed clustering, not union-find/single-linkage — see CLUSTER_THRESHOLD doc
  // comment for why: single-linkage chains adjacent-but-not-alike builds into a few giant blobs.
  // Global across every Champion — a build's card shell decides its cluster, not who's piloting it.
  const rawClusters: Cluster[] = [];
  const seedClustersByCard = new Map<string, Cluster[]>();
  const candidateClusters = (cardCounts: Map<string, number>): Cluster[] => {
    const candidates = new Set<Cluster>();
    for (const name of cardCounts.keys()) {
      for (const cluster of seedClustersByCard.get(name) ?? []) candidates.add(cluster);
    }
    return Array.from(candidates);
  };
  for (const [signature, group] of seedGroups) {
    let best: Cluster | null = null;
    let bestScore = 0;
    for (const c of candidateClusters(group.cardCounts)) {
      const score = weightedJaccard(group.cardCounts, c.seedCards);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best && bestScore >= clusterThreshold) {
      best.members.push(group);
      for (const p of group.players) best.players.add(p);
    } else {
      const cluster = { seedCards: group.cardCounts, seedSignature: signature, members: [group], players: new Set(group.players) };
      rawClusters.push(cluster);
      for (const name of cluster.seedCards.keys()) {
        const indexed = seedClustersByCard.get(name) ?? [];
        indexed.push(cluster);
        seedClustersByCard.set(name, indexed);
      }
    }
  }

  // A one-off variant cannot establish an archetype by itself, but it can provide evidence for
  // an already-supported shell. This removes the previous bias toward exact copied lists while
  // retaining the two-player minimum for discovering a new strategy.
  for (const [, group] of singletonGroups) {
    let best: Cluster | null = null;
    let bestScore = 0;
    for (const cluster of candidateClusters(group.cardCounts)) {
      const score = weightedJaccard(group.cardCounts, cluster.seedCards);
      if (score > bestScore || (score === bestScore && best && cluster.seedSignature.localeCompare(best.seedSignature) < 0)) {
        bestScore = score;
        best = cluster;
      }
    }
    if (!best || bestScore < clusterThreshold) continue;
    best.members.push(group);
    for (const player of group.players) best.players.add(player);
  }

  // Global card prevalence (across ALL decks, not just multi-player groups) — the denominator for
  // "is this card actually discriminating, or just a staple" now that there's no single Champion
  // to compare a cluster against.
  const globalDeckCount = allDecks.length;
  const globalPresence = new Map<string, number>();
  const globalMainPresence = new Map<string, number>();
  for (const d of allDecks) {
    for (const name of d.cardCounts.keys()) {
      globalPresence.set(name, (globalPresence.get(name) ?? 0) + 1);
    }
    for (const name of d.mainCardCounts.keys()) globalMainPresence.set(name, (globalMainPresence.get(name) ?? 0) + 1);
  }

  const clusterSummaries: ArchetypeCluster[] = [];
  for (const cluster of rawClusters) {
    if (cluster.players.size < config.minArchetypePlayers) continue;

    const deckIds = cluster.members.flatMap((g) => g.deckIds);
    const clusterDeckTotal = deckIds.length;

    // Use deck sightings here, matching globalPresence's unit. Every member is an exact-signature
    // group, so each card in the signature is present in all of that group's deck sightings.
    const inClusterPresence = new Map<string, number>();
    const inClusterMainPresence = new Map<string, number>();
    for (const g of cluster.members) {
      for (const name of g.cardCounts.keys()) {
        inClusterPresence.set(name, (inClusterPresence.get(name) ?? 0) + g.deckIds.length);
      }
      for (const name of g.mainCardCounts.keys()) {
        inClusterMainPresence.set(name, (inClusterMainPresence.get(name) ?? 0) + g.deckIds.length);
      }
    }
    const definingCards = Array.from(inClusterPresence.entries())
      .map(([name, deckCount]) => ({ name, prevalence: deckCount / clusterDeckTotal }))
      .filter((c) => c.prevalence >= DEFINING_MIN_IN_CLUSTER)
      .filter((c) => (globalPresence.get(c.name) ?? 0) / globalDeckCount < DEFINING_MAX_GLOBAL_PRESENCE)
      .sort((a, b) => b.prevalence - a.prevalence);

    if (definingCards.length === 0) continue; // nothing to name or justify this cluster with
    const mainDefiningCards = Array.from(inClusterMainPresence.entries())
      .map(([name, deckCount]) => ({ name, prevalence: deckCount / clusterDeckTotal }))
      .filter((c) => c.prevalence >= DEFINING_MIN_IN_CLUSTER)
      .filter((c) => (globalMainPresence.get(c.name) ?? 0) / globalDeckCount < DEFINING_MAX_GLOBAL_PRESENCE)
      .sort((a, b) => b.prevalence - a.prevalence || a.name.localeCompare(b.name));

    // Aggregate each member group's per-Champion tallies into one breakdown for the whole
    // cluster, then name/link the cluster after its plurality Champion (most players).
    const championAgg = new Map<string, { deckIds: Set<string>; players: Set<number> }>();
    for (const g of cluster.members) {
      for (const [champ, tally] of g.championTallies) {
        const agg = championAgg.get(champ) ?? { deckIds: new Set<string>(), players: new Set<number>() };
        for (const id of tally.deckIds) agg.deckIds.add(id);
        for (const p of tally.players) agg.players.add(p);
        championAgg.set(champ, agg);
      }
    }
    const championBreakdown = Array.from(championAgg.entries())
      .map(([championName, agg]) => ({ championName, deckCount: agg.deckIds.size, playerCount: agg.players.size }))
      .sort((a, b) => b.playerCount - a.playerCount || b.deckCount - a.deckCount || a.championName.localeCompare(b.championName));
    const championName = championBreakdown[0].championName;

    const element = dominantElement(definingCards, ctx.cardIndex);
    const championDeckTotal = championBreakdown.reduce((sum, champion) => sum + champion.deckCount, 0);
    const hasChampionMajority = championBreakdown[0].deckCount / championDeckTotal >= 0.6;
    const name = hasChampionMajority
      ? element
        ? `${element} ${championName}`
        : `${championName} — ${definingCards[0].name}`
      : `${element ?? "Mixed"} ${definingCards[0].name} Shell`;

    const sightings = deckIds.map((id) => sightingByDeckId.get(id)).filter((s): s is DeckSighting => !!s);
    const events = new Set(sightings.map((s) => s.eventId));
    const avgWinRate = sightings.length > 0 ? sightings.reduce((sum, s) => sum + s.winRate, 0) / sightings.length : 0;
    const matches = sightings.reduce((sum, sighting) => sum + sighting.wins + sighting.losses + sighting.ties, 0);
    const effectiveWins = sightings.reduce((sum, sighting) => sum + sighting.wins + sighting.ties * 0.5, 0);
    const winRateInterval = winRateWilsonInterval(effectiveWins, matches);

    let weightedSimilarity = 0;
    let weightedMargin = 0;
    let similarityWeight = 0;
    let minSimilarity = 1;
    for (const member of cluster.members) {
      const ownSimilarity = weightedJaccard(member.cardCounts, cluster.seedCards);
      let alternativeSimilarity = 0;
      for (const alternative of candidateClusters(member.cardCounts)) {
        if (alternative === cluster) continue;
        alternativeSimilarity = Math.max(alternativeSimilarity, weightedJaccard(member.cardCounts, alternative.seedCards));
      }
      const weight = member.deckIds.length;
      weightedSimilarity += ownSimilarity * weight;
      weightedMargin += (ownSimilarity - alternativeSimilarity) * weight;
      similarityWeight += weight;
      minSimilarity = Math.min(minSimilarity, ownSimilarity);
    }
    const quality = {
      meanSimilarity: similarityWeight > 0 ? weightedSimilarity / similarityWeight : 0,
      minSimilarity: similarityWeight > 0 ? minSimilarity : 0,
      meanAssignmentMargin: similarityWeight > 0 ? weightedMargin / similarityWeight : 0,
    };

    const topCutCount = sightings.filter((s) => s.topCut).length;
    const topCutRate = sightings.length > 0 ? topCutCount / sightings.length : 0;
    const placements = sightings.map((s) => s.placement).filter((p): p is number => p !== null);
    const avgPlacement = placements.length > 0 ? placements.reduce((sum, p) => sum + p, 0) / placements.length : null;

    // Weighted by sighting count (how many players actually ran this exact list), same
    // convention as avgWinRate above — a build ten people played counts ten times as much
    // toward the cluster's average price as one two people played.
    let priceSum = 0;
    let priceWeight = 0;
    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    for (const g of cluster.members) {
      const price = computeDeckPrice(g.cardCounts, priceByName);
      if (price === null) continue;
      priceSum += price * g.deckIds.length;
      priceWeight += g.deckIds.length;
      minPrice = minPrice === null ? price : Math.min(minPrice, price);
      maxPrice = maxPrice === null ? price : Math.max(maxPrice, price);
    }
    const avgPrice = priceWeight > 0 ? priceSum / priceWeight : null;

    const bySeasonId = new Map<number, { seasonName: string; earliestEventDate: string; sightings: DeckSighting[] }>();
    for (const s of sightings) {
      if (s.seasonId === null || s.seasonName === null) continue;
      const entry = bySeasonId.get(s.seasonId) ?? { seasonName: s.seasonName, earliestEventDate: s.eventDate, sightings: [] };
      if (s.eventDate < entry.earliestEventDate) entry.earliestEventDate = s.eventDate;
      entry.sightings.push(s);
      bySeasonId.set(s.seasonId, entry);
    }
    // Chronological order via each season's earliest event date within this cluster, not
    // assumed from seasonId — same convention as championTrends.ts, since seasonId ordering
    // isn't guaranteed to match release order.
    const seasons: ArchetypeCluster["seasons"] = Array.from(bySeasonId.entries())
      .map(([seasonId, { seasonName, earliestEventDate, sightings: seasonSightings }]) => ({
        seasonId,
        seasonName,
        earliestEventDate,
        deckCount: seasonSightings.length,
        playerCount: new Set(seasonSightings.map((s) => s.player)).size,
        eventCount: new Set(seasonSightings.map((s) => s.eventId)).size,
        avgWinRate: seasonSightings.reduce((sum, s) => sum + s.winRate, 0) / seasonSightings.length,
      }))
      .sort((a, b) => a.earliestEventDate.localeCompare(b.earliestEventDate))
      .map(({ earliestEventDate: _earliestEventDate, ...rest }) => rest);

    // Trend: this build's own two most recent seasons with data (not necessarily
    // calendar-adjacent — a build can skip a season). Raw player-count/win-rate deltas, as
    // asked for directly, rather than the normalized "share of season" championTrends.ts uses —
    // simpler and matches what was requested, at the cost of not correcting for backfill
    // coverage growing season to season (documented in docs/CALCULATIONS.md).
    let trend: ArchetypeCluster["trend"] = null;
    if (seasons.length >= 2) {
      const previous = seasons[seasons.length - 2];
      const latest = seasons[seasons.length - 1];
      trend = {
        previousSeasonName: previous.seasonName,
        latestSeasonName: latest.seasonName,
        playerCountChange: latest.playerCount - previous.playerCount,
        winRateChangePct: (latest.avgWinRate - previous.avgWinRate) * 100,
      };
    }

    clusterSummaries.push({
      // Based on the deterministic representative seed rather than threshold-sensitive defining
      // cards or a plurality Champion that can flip as new events are ingested.
      id: shortHash(cluster.seedSignature),
      championName,
      championBreakdown,
      name,
      deckCount: deckIds.length,
      playerCount: cluster.players.size,
      eventCount: events.size,
      confidence: cluster.players.size >= 20 && events.size >= 2 ? "established" : "emerging",
      avgWinRate,
      winRateInterval,
      quality,
      definingCards: definingCards.slice(0, 12),
      mainDefiningCards: mainDefiningCards.slice(0, 12),
      strategyArchetypeId: "",
      deckIds,
      seasons,
      trend,
      metaShare: 0, // filled in once every cluster's deckCount is known, below
      topCutCount,
      topCutRate,
      avgPlacement,
      avgPrice,
      minPrice,
      maxPrice,
    });
  }

  // Disambiguate same-named clusters (e.g. two element-tied clusters under the same plurality
  // Champion) by appending the runner-up's top defining card. Global now, not per-Champion — a
  // name collision can happen across two different-plurality-Champion clusters just as easily.
  const byName = new Map<string, ArchetypeCluster[]>();
  for (const c of clusterSummaries) {
    const list = byName.get(c.name) ?? [];
    list.push(c);
    byName.set(c.name, list);
  }
  for (const list of byName.values()) {
    if (list.length <= 1) continue;
    list.sort((a, b) => b.playerCount - a.playerCount);
    // The biggest cluster keeps the bare name; each runner-up picks the first of its own
    // defining cards not already claimed as a disambiguator in this group (not just its #1
    // card — three-plus same-named clusters can otherwise all rank the same generic staple
    // first and collide again after "disambiguating").
    const usedSuffixes = new Set<string>();
    for (let i = 1; i < list.length; i++) {
      const suffix = list[i].definingCards.map((d) => d.name).find((n) => !usedSuffixes.has(n));
      const chosen = suffix ?? `build ${i + 1}`;
      usedSuffixes.add(chosen);
      list[i].name = `${list[i].name} (${chosen})`;
    }
  }

  // Builds are deliberately more granular than archetypes. Group neighboring builds when their
  // main-deck defining packages substantially overlap under the same plurality Champion. Greedy
  // seed assignment avoids the transitive chaining problem that made single-linkage unsuitable
  // for the build clustering itself.
  const strategyGroups: { seed: ArchetypeCluster; builds: ArchetypeCluster[] }[] = [];
  for (const build of [...clusterSummaries].sort((a, b) => b.playerCount - a.playerCount || a.id.localeCompare(b.id))) {
    let best: (typeof strategyGroups)[number] | null = null;
    let bestScore = 0;
    for (const group of strategyGroups) {
      if (group.seed.championName !== build.championName) continue;
      const score = archetypePackageOverlap(build.mainDefiningCards, group.seed.mainDefiningCards);
      if (score > bestScore) {
        best = group;
        bestScore = score;
      }
    }
    if (best && bestScore >= 0.6) best.builds.push(build);
    else strategyGroups.push({ seed: build, builds: [build] });
  }

  const strategyArchetypes: ArchetypeTaxonomyData["strategyArchetypes"] = strategyGroups.map((group) => {
    const buildIds = group.builds.map((build) => build.id).sort();
    const deckIds = Array.from(new Set(group.builds.flatMap((build) => build.deckIds)));
    const totalDecks = group.builds.reduce((sum, build) => sum + build.deckCount, 0);
    const cardWeights = new Map<string, number>();
    for (const build of group.builds) {
      for (const card of build.mainDefiningCards) {
        cardWeights.set(card.name, (cardWeights.get(card.name) ?? 0) + card.prevalence * build.deckCount);
      }
    }
    const definingCards = Array.from(cardWeights.entries())
      .map(([name, weight]) => ({ name, prevalence: totalDecks > 0 ? weight / totalDecks : 0 }))
      .filter((card) => card.prevalence >= 0.75)
      .sort((a, b) => b.prevalence - a.prevalence || a.name.localeCompare(b.name))
      .slice(0, 8);
    const sightings = deckIds.map((deckId) => sightingByDeckId.get(deckId)).filter((sighting): sighting is DeckSighting => !!sighting);
    const players = new Set(sightings.map((sighting) => sighting.player));
    const events = new Set(sightings.map((sighting) => sighting.eventId));
    const id = shortHash(`strategy:${buildIds.join("|")}`);
    for (const build of group.builds) build.strategyArchetypeId = id;
    return {
      id,
      // Keep the largest build's readable base name. Collision handling below adds a strategy
      // card only when one Champion has multiple distinct package families with the same label.
      name: group.seed.name.replace(/ \([^)]*\)$/, ""),
      championName: group.seed.championName,
      buildIds,
      definingCards,
      deckCount: deckIds.length,
      playerCount: players.size,
      eventCount: events.size,
      avgWinRate: sightings.length > 0 ? sightings.reduce((sum, sighting) => sum + sighting.winRate, 0) / sightings.length : 0,
      confidence: players.size >= 20 && events.size >= 2 ? "established" as const : "emerging" as const,
    };
  });
  const strategiesByName = new Map<string, typeof strategyArchetypes>();
  for (const strategy of strategyArchetypes) {
    const list = strategiesByName.get(strategy.name) ?? [];
    list.push(strategy);
    strategiesByName.set(strategy.name, list);
  }
  for (const duplicates of strategiesByName.values()) {
    if (duplicates.length <= 1) continue;
    duplicates.sort((a, b) => b.playerCount - a.playerCount || a.id.localeCompare(b.id));
    for (let index = 1; index < duplicates.length; index++) {
      duplicates[index].name += ` — ${duplicates[index].definingCards[0]?.name ?? `strategy ${index + 1}`}`;
    }
  }
  strategyArchetypes.sort((a, b) => b.playerCount - a.playerCount || a.name.localeCompare(b.name));

  const clusters = clusterSummaries;

  // Scoped to the clustered population (not every sighting) — an unclustered one-off brew was
  // never eligible to have a "share" of a named-build breakdown in the first place.
  const totalClusteredDecks = clusters.reduce((sum, c) => sum + c.deckCount, 0);
  for (const c of clusters) {
    c.metaShare = totalClusteredDecks > 0 ? c.deckCount / totalClusteredDecks : 0;
  }

  clusters.sort((a, b) => b.playerCount - a.playerCount);

  // Card -> every cluster it's a defining card of — same "iterate clusters, invert" shape as
  // cardImpact.ts's deckClusterIndex, just card-keyed and to multiple clusters instead of one.
  const cardClusterIndex: ArchetypeTaxonomyData["cardClusterIndex"] = {};
  for (const c of clusters) {
    for (const dc of c.definingCards) {
      (cardClusterIndex[dc.name] ??= []).push({ clusterId: c.id, prevalence: dc.prevalence });
    }
  }

  const classifiedDeckCount = new Set(clusters.flatMap((cluster) => cluster.deckIds)).size;
  return {
    generatedAt: new Date().toISOString(),
    clusters,
    strategyArchetypes,
    coverage: {
      classifiedDeckCount,
      totalDeckCount: allDecks.length,
      classificationRate: allDecks.length > 0 ? classifiedDeckCount / allDecks.length : 0,
    },
    aliases: {},
    cardClusterIndex,
  };
}
