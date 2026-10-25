import type { OmnidexDecklistEntry, OmnidexEvent, OmnidexPlayer } from './omnidex-types';

export interface EventChampionReport {
  name: string;
  cardName: string;
  entrants: number;
  advanced: number;
  rate: number;
  cards: { name: string; field: number; top: number; fieldRate: number; topRate: number }[];
}
export interface EventReport {
  status: string | null;
  entrants: number;
  cut: number;
  average: number;
  champions: EventChampionReport[];
}

/** Complete-field, individual-event report. Percentages are 0–100. */
export function computeEventReport(
  event: OmnidexEvent,
  players: OmnidexPlayer[],
  decks: OmnidexDecklistEntry[] | undefined,
  champions: ReadonlyMap<number, { name: string; cardName: string }>,
  teamEvent = false,
): EventReport {
  const ids = new Set([...event.players, ...players.map(p => p.id)]);
  const result: EventReport = { status: null, entrants: ids.size, cut: event.singleEliminationCutSize ?? 0, average: 0, champions: [] };
  const unavailable = (status: string) => ({ ...result, status });
  if (teamEvent || /team/i.test(event.format)) return unavailable('Individual-event reports only.');
  if (event.status !== 'complete') return unavailable('Results available after the event finishes.');
  if (!result.cut || !event.stages.some(s => s.type === 'swiss') || !event.stages.some(s => s.type === 'single-elimination')) return unavailable('No recorded Swiss-to-top-cut bracket.');
  const byId = new Map(players.map(p => [p.id, p]));
  if (!ids.size || players.length !== byId.size || [...ids].some(id => !Number.isInteger(byId.get(id)?.finalPlacement) || (byId.get(id)?.finalPlacement ?? 0) < 1)) return unavailable('Complete final placements unavailable.');
  const advanced = new Set(players.filter(p => p.finalPlacement! <= result.cut).map(p => p.id));
  if (advanced.size !== result.cut || result.cut >= ids.size) return unavailable('Top-cut results could not be verified.');
  result.average = advanced.size / ids.size * 100;
  if (!decks) return unavailable('Decklists unavailable.');
  const byPlayer = new Map(decks.filter(d => ids.has(d.player)).map(d => [d.player, d]));
  if (decks.filter(d => ids.has(d.player)).length !== byPlayer.size) return unavailable('Conflicting player decklists.');
  const covered = [...ids].filter(id => { const d = byPlayer.get(id); return d?.visible !== false && d?.decklist.main.some(l => l.quantity > 0) && d.decklist.material.some(l => l.quantity > 0); }).length;
  if (covered !== ids.size) return unavailable(`Public decklists: ${covered}/${ids.size} · Complete field required.`);
  if ([...ids].some(id => !champions.has(id))) return unavailable('Champion data incomplete.');
  const groups = new Map<string, { row: EventChampionReport; names: Map<string, { field: number; top: number }> }>();
  for (const id of ids) {
    const champion = champions.get(id)!;
    let group = groups.get(champion.name);
    if (!group) {
      group = { row: { ...champion, entrants: 0, advanced: 0, rate: 0, cards: [] }, names: new Map() };
      groups.set(champion.name, group);
    }
    group.row.entrants++;
    if (advanced.has(id)) group.row.advanced++;
    const deck = byPlayer.get(id)!.decklist;
    for (const name of new Set([...deck.main, ...deck.material].filter(l => l.quantity > 0).map(l => l.card))) {
      const count = group.names.get(name) ?? { field: 0, top: 0 };
      count.field++;
      if (advanced.has(id)) count.top++;
      group.names.set(name, count);
    }
  }
  result.champions = [...groups.values()].map(({ row, names }) => ({
    ...row, rate: row.advanced / row.entrants * 100,
    cards: [...names].filter(([, n]) => n.top > 0).map(([name, n]) => ({ name, ...n, fieldRate: n.field / row.entrants * 100, topRate: n.top / row.advanced * 100 }))
      .sort((a, b) => b.topRate - a.topRate || (b.topRate - b.fieldRate) - (a.topRate - a.fieldRate) || a.name.localeCompare(b.name)),
  })).sort((a, b) => b.rate - a.rate || b.entrants - a.entrants || a.name.localeCompare(b.name));
  return result;
}
