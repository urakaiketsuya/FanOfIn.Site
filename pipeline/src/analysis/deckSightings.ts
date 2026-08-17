import { EVENT_CATEGORY_WEIGHTS, type DeckSighting } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures, type DeckCardLine } from "./decklists.js";

/** A stable key for "this exact card list" — main+material combined, since that's what defines a deck's identity (sideboard is situational tech). Empty string for decks with no matched cards at all (unmatched/broken decklists), which are deliberately excluded from duplicate detection below. */
function canonicalSignature(mainCards: DeckCardLine[], materialCards: DeckCardLine[]): string {
  const combined = new Map<string, number>();
  for (const line of [...mainCards, ...materialCards]) {
    combined.set(line.name, (combined.get(line.name) ?? 0) + line.quantity);
  }
  return Array.from(combined.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, qty]) => `${name}:${qty}`)
    .join("|");
}

/**
 * Flattens every public decklist across all ingested events into one lean, filterable/sortable
 * record each. The full decklist stays in the per-event bundle already published at
 * data/omnidex/events/{id}.json — this dataset is deliberately just the browsing/filtering
 * surface (event context, Champion, outcome), not the deck contents.
 */
export function computeDeckSightings(bundles: OmnidexEventBundle[], cardIndex: Map<string, CardSignature>): DeckSighting[] {
  interface Interim extends Omit<DeckSighting, "duplicateCount"> {
    signature: string;
  }

  const interim: Interim[] = [];
  /** Distinct players (not raw deck count) who ran each exact card list — reusing your own list across events shouldn't inflate the count. */
  const playersBySignature = new Map<string, Set<number>>();

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    if ("error" in bundle.standings) continue;

    const { event } = bundle;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);
    const standingsByPlayer = new Map(bundle.standings.standings.map((s) => [s.id, s]));

    for (const entry of bundle.decklists) {
      const standing = standingsByPlayer.get(entry.player);
      if (!standing) continue;

      const totalMatches = standing.statsWins + standing.statsLosses + standing.statsTies;
      const winRate = totalMatches > 0 ? (standing.statsWins + standing.statsTies * 0.5) / totalMatches : 0;
      const sig = signatures.get(entry.player);
      const cardSignature = canonicalSignature(sig?.mainCards ?? [], sig?.materialCards ?? []);

      const playerCount = event.players.length;
      const placementPercentile =
        standing.finalPlacement && playerCount > 0 ? standing.finalPlacement / playerCount : null;
      const eventTierWeight = EVENT_CATEGORY_WEIGHTS[event.category] ?? EVENT_CATEGORY_WEIGHTS.regular;
      const weightedScore = placementPercentile === null ? 0 : eventTierWeight * (1 - placementPercentile);

      if (cardSignature) {
        const players = playersBySignature.get(cardSignature) ?? new Set<number>();
        players.add(entry.player);
        playersBySignature.set(cardSignature, players);
      }

      interim.push({
        deckId: `${event.id}:${entry.player}`,
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        eventCategory: event.category,
        seasonId: event.season?.id ?? null,
        seasonName: event.season?.name ?? null,
        format: event.format,
        player: entry.player,
        championName: sig?.championName ?? null,
        placement: standing.finalPlacement,
        wins: standing.statsWins,
        losses: standing.statsLosses,
        ties: standing.statsTies,
        winRate,
        winner: standing.finalPlacement === 1,
        topCut: Boolean(
          event.singleEliminationCutSize && standing.finalPlacement && standing.finalPlacement <= event.singleEliminationCutSize,
        ),
        high: totalMatches > 0 && winRate >= 0.5,
        placementPercentile,
        eventTierWeight,
        weightedScore,
        underplaced: winRate >= 0.6 && standing.statsWins >= 3 && placementPercentile !== null && placementPercentile > 0.3,
        signature: cardSignature,
      });
    }
  }

  const sightings: DeckSighting[] = interim.map(({ signature, ...rest }) => ({
    ...rest,
    duplicateCount: signature ? (playersBySignature.get(signature)?.size ?? 1) - 1 : 0,
  }));

  sightings.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  return sightings;
}
