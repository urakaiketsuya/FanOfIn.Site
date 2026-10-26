import type { OmnidexEventSummary } from '@gatcg/shared';
import type { OmnidexEventBundle } from './cache.js';

/** Complete individual fields only; no bracket or placement requirement. */
export function eventField(
  bundle: OmnidexEventBundle,
  champions: ReadonlyMap<number, { championName: string | null }>,
  catalogNames: ReadonlySet<string>,
): OmnidexEventSummary['fieldComposition'] {
  if (bundle.event.status !== 'complete' || /team/i.test(bundle.event.format)
    || ('error' in bundle.teams ? bundle.teams.error !== 'Not a team event.' : bundle.teams.length > 0)
    || 'error' in bundle.decklists) return undefined;
  const ids = new Set([...bundle.event.players, ...bundle.players.map(p => p.id)]);
  if (!ids.size) return undefined;
  const decks = bundle.decklists.filter(d => ids.has(d.player));
  if (decks.length !== ids.size || new Set(decks.map(d => d.player)).size !== ids.size) return undefined;
  const counts = new Map<string, number>();
  for (const deck of decks) {
    const material = deck.decklist.material.filter(l => l.quantity > 0);
    const name = champions.get(deck.player)?.championName;
    if (deck.visible === false || !deck.decklist.main.some(l => l.quantity > 0) || !material.length
      || material.some(l => !catalogNames.has(l.card.trim().toLowerCase())) || !name) return undefined;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return { entrants: ids.size, champions: [...counts].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) };
}
