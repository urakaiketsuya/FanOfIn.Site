import { shortHash, type ArchetypeCluster, type ArchetypeTaxonomyData, type DeckSighting } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures } from "./decklists.js";
import { weightedJaccard } from "./similarity.js";
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
/** ...and appear in *fewer* than this fraction of the champion's other decks — otherwise it's just a universal staple, not something that distinguishes this build. */
const DEFINING_MAX_CHAMPION_WIDE = 0.85;

interface ChampionDeck {
  deckId: string;
  player: number;
  cardCounts: Map<string, number>;
}

interface BuildGroup {
  cardCounts: Map<string, number>;
  deckIds: string[];
  players: Set<number>;
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
 * Data-derived named builds within each Champion (e.g. "Water Guo Jia") — richer than the
 * existing per-Champion rollup in archetypes.json, since a single Champion often has several
 * genuinely distinct competitive builds. See docs/CALCULATIONS.md for the full method and the
 * real-data validation behind the threshold choices.
 */
export function computeArchetypeTaxonomy(
  bundles: OmnidexEventBundle[],
  cardIndex: Map<string, CardSignature>,
  deckSightings: DeckSighting[],
): ArchetypeTaxonomyData {
  if (config.fastMode) return { generatedAt: new Date().toISOString(), clusters: [] };

  const sightingByDeckId = new Map(deckSightings.map((s) => [s.deckId, s]));

  const byChampion = new Map<string, ChampionDeck[]>();
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
      const list = byChampion.get(championName) ?? [];
      list.push({ deckId: `${bundle.id}:${entry.player}`, player: entry.player, cardCounts });
      byChampion.set(championName, list);
    }
  }

  const clusters: ArchetypeCluster[] = [];

  for (const [championName, championDecks] of byChampion) {
    // Group into exact-signature "builds" — same convention as useDeckPopularity.ts.
    const groups = new Map<string, BuildGroup>();
    for (const d of championDecks) {
      const sig = canonicalSignature(d.cardCounts);
      const g = groups.get(sig) ?? { cardCounts: d.cardCounts, deckIds: [], players: new Set<number>() };
      g.deckIds.push(d.deckId);
      g.players.add(d.player);
      groups.set(sig, g);
    }

    const multiPlayerGroups = Array.from(groups.values())
      .filter((g) => g.players.size >= MIN_GROUP_PLAYERS)
      .sort((a, b) => b.players.size - a.players.size);

    // Greedy nearest-seed clustering, not union-find/single-linkage — see CLUSTER_THRESHOLD doc
    // comment for why: single-linkage chains adjacent-but-not-alike builds into a few giant blobs.
    const championClusters: Cluster[] = [];
    for (const group of multiPlayerGroups) {
      let best: Cluster | null = null;
      let bestScore = 0;
      for (const c of championClusters) {
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
        championClusters.push({ seedCards: group.cardCounts, members: [group], players: new Set(group.players) });
      }
    }

    // Champion-wide card prevalence (across ALL of this champion's decks, not just multi-player
    // groups) — the denominator for "is this card actually discriminating, or just a staple".
    const championWideDeckCount = championDecks.length;
    const championWidePresence = new Map<string, number>();
    for (const d of championDecks) {
      for (const name of d.cardCounts.keys()) {
        championWidePresence.set(name, (championWidePresence.get(name) ?? 0) + 1);
      }
    }

    const championClusterSummaries: ArchetypeCluster[] = [];
    for (const cluster of championClusters) {
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
        .filter((c) => (championWidePresence.get(c.name) ?? 0) / championWideDeckCount < DEFINING_MAX_CHAMPION_WIDE)
        .sort((a, b) => b.prevalence - a.prevalence);

      if (definingCards.length === 0) continue; // nothing to name or justify this cluster with

      const element = dominantElement(definingCards, cardIndex);
      const name = element ? `${element} ${championName}` : `${championName} — ${definingCards[0].name}`;

      const sightings = deckIds.map((id) => sightingByDeckId.get(id)).filter((s): s is DeckSighting => !!s);
      const events = new Set(sightings.map((s) => s.eventId));
      const avgWinRate = sightings.length > 0 ? sightings.reduce((sum, s) => sum + s.winRate, 0) / sightings.length : 0;

      championClusterSummaries.push({
        id: "",
        championName,
        name,
        deckCount: deckIds.length,
        playerCount: clusterPlayerTotal,
        eventCount: events.size,
        avgWinRate,
        definingCards: definingCards.slice(0, 12),
        deckIds,
      });
    }

    // Disambiguate same-named clusters within this champion (e.g. two element-tied clusters) by
    // appending the runner-up's top defining card.
    const byName = new Map<string, ArchetypeCluster[]>();
    for (const c of championClusterSummaries) {
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

    for (const c of championClusterSummaries) {
      c.id = shortHash(`${c.championName}::${[...c.definingCards.map((d) => d.name)].sort().join(",")}`);
    }

    clusters.push(...championClusterSummaries);
  }

  clusters.sort((a, b) => b.playerCount - a.playerCount);

  return { generatedAt: new Date().toISOString(), clusters };
}
