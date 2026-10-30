import { decodeCardLines, type ArchetypeTaxonomyData, type DeckCardIndexData, type DeckPopularityEntry } from './analysis-types';
import type { OmnidexEventSummary } from './omnidex-index-types';
import { buildMembership } from './competitionReports';

type ChampionPool = { decks: number; cards: Map<string, number> };
function period() {
  return { recorded: 0, decks: 0, classified: 0, missing: 0, events: new Set<number>(), builds: new Map<string, number>(), champions: new Map<string, ChampionPool>() };
}
/** Descriptive adjacent-period comparison; never a performance or enjoyment score. */
export function metaFreshness(index: DeckCardIndexData, entries: DeckPopularityEntry[], events: OmnidexEventSummary[], taxonomy: Pick<ArchetypeTaxonomyData, 'clusters'>, scope: { format: string; champion: string; days: 30 | 90 }, asOf: string) {
  const end = Date.parse(asOf), middle = end - scope.days * 86400000, start = middle - scope.days * 86400000;
  const eligible = new Map(events.filter(e => e.format === scope.format && e.status === 'complete' && Date.parse(e.date) > start && Date.parse(e.date) <= end).map(e => [e.id, e]));
  const lists = new Map(index.decks.map(d => [d.deckId, d]));
  const membership = buildMembership(taxonomy);
  const current = period(), previous = period();
  for (const entry of new Map(entries.map(e => [e.deckId, e])).values()) {
    const event = eligible.get(entry.eventId), champion = entry.championName ?? 'Unknown';
    if (!event || (scope.champion && champion !== scope.champion)) continue;
    const bucket = Date.parse(event.date) > middle ? current : previous;
    bucket.recorded++;
    const deck = lists.get(entry.deckId);
    // Require readable nonempty Main and Material; sideboards never define the build.
    if (!deck || !deck.main.length || !deck.material.length || [...deck.main, ...deck.material].some(([id, q]) => !index.cardNames[id] || !Number.isInteger(q) || q <= 0)) { bucket.missing++; continue; }
    bucket.decks++; bucket.events.add(entry.eventId);
    const build = membership(entry.deckId);
    if (build !== 'ambiguous' && build !== 'unclassified') { bucket.classified++; bucket.builds.set(build, (bucket.builds.get(build) ?? 0) + 1); }
    const pool = bucket.champions.get(champion) ?? { decks: 0, cards: new Map<string, number>() };
    pool.decks++;
    for (const name of new Set(decodeCardLines([...deck.main, ...deck.material], index.cardNames).map(l => l.name))) pool.cards.set(name, (pool.cards.get(name) ?? 0) + 1);
    bucket.champions.set(champion, pool);
  }
  const share = (n: number, total: number) => total ? 100 * n / total : null;
  const concentration = (p: typeof current) => p.classified ? share([...p.builds.values()].sort((a,b) => b-a).slice(0,5).reduce((a,b) => a+b,0), p.decks) : null;
  const returning = [...current.builds].filter(([id]) => (previous.builds.get(id) ?? 0) >= 3).reduce((n, [,count]) => n + count, 0);
  const buildById = new Map(taxonomy.clusters.map(b => [b.id,b]));
  const builds = [...current.builds].map(([id, count]) => ({ id, name: buildById.get(id)!.name, champion: buildById.get(id)!.championName, count, previousCount: previous.builds.get(id) ?? 0, share: share(count,current.decks)!, previousShare: share(previous.builds.get(id) ?? 0,previous.decks) })).sort((a,b) => b.count-a.count || a.id.localeCompare(b.id));
  const turnover = [...current.champions].flatMap(([champion, now]) => {
    const before = previous.champions.get(champion);
    if (champion === 'Unknown' || now.decks < 3 || !before || before.decks < 3) return [];
    const names = new Set([...now.cards.keys(), ...before.cards.keys()]);
    const change = [...names].reduce((sum,name) => sum + Math.abs(100*(now.cards.get(name) ?? 0)/now.decks - 100*(before.cards.get(name) ?? 0)/before.decks),0)/names.size;
    return [{ champion, change, current: now.decks, previous: before.decks }];
  }).sort((a,b) => b.current-a.current || a.champion.localeCompare(b.champion));
  const comparable = turnover.reduce((n,row)=>n+row.current,0);
  const summary = (p: typeof current) => ({ recorded:p.recorded, decks:p.decks, classified:p.classified, missing:p.missing, events:p.events.size, builds:p.builds.size, concentration:concentration(p) });
  return { days:scope.days, asOf, middle:new Date(middle).toISOString(), start:new Date(start).toISOString(), current:summary(current), previous:summary(previous), builds, turnover, comparable,
    returning:previous.classified && current.classified ? share(returning,current.decks) : null,
    cardChange:comparable ? turnover.reduce((n,row)=>n+row.change*row.current,0)/comparable : null };
}
