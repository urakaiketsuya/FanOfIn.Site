import type { OmnidexPlayerSummary } from '@gatcg/shared';
import type { OmnidexEventBundle } from './cache.js';

/** Identity discovery includes every public roster; results remain completed-event only. */
export function buildPlayerDirectory(bundles: readonly OmnidexEventBundle[]): OmnidexPlayerSummary[] {
  const players = new Map<number, OmnidexPlayerSummary>();
  // Latest fetched identity wins, independent of event scheduling and caller order.
  for (const bundle of [...bundles].sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt) || a.id - b.id)) {
    for (const player of bundle.players) {
      const previous = players.get(player.id);
      players.set(player.id, {
        id: player.id, username: player.username, country: player.country, emblem: player.emblem,
        eventIds: [...new Set([...(previous?.eventIds ?? []), bundle.id])].sort((a, b) => a - b),
      });
    }
  }
  return [...players.values()].sort((a, b) => a.id - b.id);
}
