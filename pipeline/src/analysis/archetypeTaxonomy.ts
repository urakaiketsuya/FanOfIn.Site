import { shortHash, type ArchetypeCluster, type ArchetypeTaxonomyData, type DeckSighting } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures } from "./decklists.js";
import { weightedJaccard } from "./similarity.js";
import { computeDeckPrice } from "./deckPricing.js";
import { config } from "../config.js";

/**
 * A build needs at least this many distinct players before it's eligible to seed or join a
 * cluster — same "netdecked more than once" bar as Popular Decks (`useDeckPopularity.ts`), so a
 * one-off brew doesn't get treated as a real strategy.
 */
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

interface CardDeck {
  deckId: string;
  player: number;
  championName: string;
  cardCounts: Map<string, number>;
}

/** Per-Champion tally within a `BuildGroup` — how many of the group's decks/players ran it under each Champion. */
interface ChampionTally {
  deckIds: string[];
  players: Set<number>;
}

interface BuildGroup {
  cardCounts: Map<string, number>;
  deckIds: string[];
  players: Set<number>;
  /** Keyed by championName — almost always a single entry, but the exact same main+material list is occasionally netdecked under more than one Champion. */
  championTallies: Map<string, ChampionTally>;
}

interface Cluster {
  seedCards: Map<string, number>;
  members: BuildGroup[];
  players: Set<number>;
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

/** Dominant non-colorless element among a cluster's defining cards — the primary naming signal. */
function dominantElement(definingCards: { name: string }[], cardIndex: Map<string, CardSignature>): string | null {
  const counts = new Map<string, number>();
  for (const { name } of definingCards) {
    const card = cardIndex.get(name);
    if (!card) continue;
    for (const el of card.elements) {
      if (el === "NORM") continue;
      counts.set(el, (counts.get(el) ?? 0) + 1);
    }
  }
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return top ? titleCase(top[0]) : null;
}

/**
 * Data-derived named builds (e.g. "Water Guo Jia") — richer than the existing per-Champion
 * rollup in archetypes.json, since the same card shell is often played under more than one
 * Champion and a single Champion often has several genuinely distinct competitive builds.
 * Clustering is card-only (main+material, ignoring Champion entirely); each resulting cluster
 * then reports which Champion(s) it was actually played under via `championBreakdown`. See
 * docs/CALCULATIONS.md for the full method and the real-data validation behind the threshold
 * choices.
 */
export function computeArchetypeTaxonomy(
  bundles: OmnidexEventBundle[],
  cardIndex: Map<string, CardSignature>,
  deckSightings: DeckSighting[],
  priceByName: Map<string, number>,
): ArchetypeTaxonomyData {
  if (config.fastMode) return { generatedAt: new Date().toISOString(), clusters: [] };

  const sightingByDeckId = new Map(deckSightings.map((s) => [s.deckId, s]));

  const allDecks: CardDeck[] = [];
  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);
    for (const entry of bundle.decklists) {
      const championName = signatures.get(entry.player)?.championName;
      if (!championName) continue;
      const cardCounts = new Map<string, number>();
      for (const line of [...entry.decklist.main, ...entry.decklist.material]) {
        cardCounts.set(line.card, (cardCounts.get(line.card) ?? 0) + line.quantity);
      }
      if (cardCounts.size === 0) continue;
      allDecks.push({ deckId: `${bundle.id}:${entry.player}`, player: entry.player, championName, cardCounts });
    }
  }

  // Group into exact-signature "builds" by cards alone — same convention as
  // useDeckPopularity.ts's canonicalSignature, but global rather than scoped to one Champion, so
  // the exact same 40-card list played under two different Champions still lands in one group
  // (tracked separately per Champion via championTallies).
  const groups = new Map<string, BuildGroup>();
  for (const d of allDecks) {
    const sig = canonicalSignature(d.cardCounts);
    const g = groups.get(sig) ?? { cardCounts: d.cardCounts, deckIds: [], players: new Set<number>(), championTallies: new Map<string, ChampionTally>() };
    g.deckIds.push(d.deckId);
    g.players.add(d.player);
    const tally = g.championTallies.get(d.championName) ?? { deckIds: [], players: new Set<number>() };
    tally.deckIds.push(d.deckId);
    tally.players.add(d.player);
    g.championTallies.set(d.championName, tally);
    groups.set(sig, g);
  }

  const multiPlayerGroups = Array.from(groups.values())
    .filter((g) => g.players.size >= MIN_GROUP_PLAYERS)
    .sort((a, b) => b.players.size - a.players.size);

  // Greedy nearest-seed clustering, not union-find/single-linkage — see CLUSTER_THRESHOLD doc
  // comment for why: single-linkage chains adjacent-but-not-alike builds into a few giant blobs.
  // Global across every Champion — a build's card shell decides its cluster, not who's piloting it.
  const rawClusters: Cluster[] = [];
  for (const group of multiPlayerGroups) {
    let best: Cluster | null = null;
    let bestScore = 0;
    for (const c of rawClusters) {
      const score = weightedJaccard(group.cardCounts, c.seedCards);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best && bestScore >= CLUSTER_THRESHOLD) {
      best.members.push(group);
      for (const p of group.players) best.players.add(p);
    } else {
      rawClusters.push({ seedCards: group.cardCounts, members: [group], players: new Set(group.players) });
    }
  }

  // Global card prevalence (across ALL decks, not just multi-player groups) — the denominator for
  // "is this card actually discriminating, or just a staple" now that there's no single Champion
  // to compare a cluster against.
  const globalDeckCount = allDecks.length;
  const globalPresence = new Map<string, number>();
  for (const d of allDecks) {
    for (const name of d.cardCounts.keys()) {
      globalPresence.set(name, (globalPresence.get(name) ?? 0) + 1);
    }
  }

  const clusterSummaries: ArchetypeCluster[] = [];
  for (const cluster of rawClusters) {
    if (cluster.players.size < config.minBattleChartSampleSize) continue;

    const deckIds = cluster.members.flatMap((g) => g.deckIds);
    const clusterPlayerTotal = cluster.players.size;

    // Track by *distinct players*, not summed group sizes — a player who submitted more than
    // one exact-signature list within this cluster (e.g. tweaked their build between events)
    // would otherwise get counted once per list, pushing prevalence past 100%. A real bug caught
    // live: "Fractal of Polar Depths (143%)" before this fix.
    const inClusterPresence = new Map<string, Set<number>>();
    for (const g of cluster.members) {
      for (const name of g.cardCounts.keys()) {
        const players = inClusterPresence.get(name) ?? new Set<number>();
        for (const p of g.players) players.add(p);
        inClusterPresence.set(name, players);
      }
    }
    const definingCards = Array.from(inClusterPresence.entries())
      .map(([name, players]) => ({ name, prevalence: players.size / clusterPlayerTotal }))
      .filter((c) => c.prevalence >= DEFINING_MIN_IN_CLUSTER)
      .filter((c) => (globalPresence.get(c.name) ?? 0) / globalDeckCount < DEFINING_MAX_GLOBAL_PRESENCE)
      .sort((a, b) => b.prevalence - a.prevalence);

    if (definingCards.length === 0) continue; // nothing to name or justify this cluster with

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

    const element = dominantElement(definingCards, cardIndex);
    const name = element ? `${element} ${championName}` : `${championName} — ${definingCards[0].name}`;

    const sightings = deckIds.map((id) => sightingByDeckId.get(id)).filter((s): s is DeckSighting => !!s);
    const events = new Set(sightings.map((s) => s.eventId));
    const avgWinRate = sightings.length > 0 ? sightings.reduce((sum, s) => sum + s.winRate, 0) / sightings.length : 0;

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
      id: "",
      championName,
      championBreakdown,
      name,
      deckCount: deckIds.length,
      playerCount: clusterPlayerTotal,
      eventCount: events.size,
      avgWinRate,
      definingCards: definingCards.slice(0, 12),
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

  for (const c of clusterSummaries) {
    c.id = shortHash(`${c.championName}::${[...c.definingCards.map((d) => d.name)].sort().join(",")}`);
  }

  const clusters = clusterSummaries;

  // Scoped to the clustered population (not every sighting) — an unclustered one-off brew was
  // never eligible to have a "share" of a named-build breakdown in the first place.
  const totalClusteredDecks = clusters.reduce((sum, c) => sum + c.deckCount, 0);
  for (const c of clusters) {
    c.metaShare = totalClusteredDecks > 0 ? c.deckCount / totalClusteredDecks : 0;
  }

  clusters.sort((a, b) => b.playerCount - a.playerCount);

  return { generatedAt: new Date().toISOString(), clusters };
}
