import type { ArchetypeTaxonomyData, DeckSighting, HomepageData, OmnidexDecklistEntry } from '@gatcg/shared';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { computeChampionTrends } from './championTrends.js';

/** Keep landing-page discovery independent of the full tournament and membership datasets. */
export async function buildHomepage(sightings: DeckSighting[], taxonomy: ArchetypeTaxonomyData, dataDir: string): Promise<HomepageData> {
  const champions = new Set<string>();
  const recent = [...sightings].sort((a, b) => b.eventDate.localeCompare(a.eventDate) || (a.placement ?? Infinity) - (b.placement ?? Infinity) || a.deckId.localeCompare(b.deckId)).filter(s => {
    if (!s.championName || champions.has(s.championName) || champions.size >= 3) return false;
    champions.add(s.championName);
    return true;
  });
  const strategies = new Map(taxonomy.strategyArchetypes.map(f => [f.id, f.name]));
  const decks = await Promise.all(recent.map(async s => {
    const cluster = taxonomy.clusters.find(c => c.deckIds.includes(s.deckId));
    const bundle = JSON.parse(await readFile(path.join(dataDir, 'omnidex/events', `${s.eventId}.json`), 'utf8')) as { decklists: OmnidexDecklistEntry[] };
    const material = Array.isArray(bundle.decklists) ? bundle.decklists.find(d => d.player === s.player)?.decklist?.material : undefined;
    return { id: s.deckId, championName: s.championName!, eventName: s.eventName, eventDate: s.eventDate, placement: s.placement,
      to: s.deckHash ? `/decks/${s.deckHash}` : `/events/${s.eventId}?tab=decklists&player=${s.player}`,
      archetype: cluster ? strategies.get(cluster.strategyArchetypeId) ?? cluster.name : 'Custom build', material: material ?? [] };
  }));
  champions.clear();
  const families = [...taxonomy.strategyArchetypes].filter(f => f.confidence === 'established' && f.buildIds.length && f.identityCards?.length).sort((a, b) => b.playerCount - a.playerCount || a.id.localeCompare(b.id)).filter(f => {
    if (champions.has(f.championName) || champions.size >= 3) return false;
    champions.add(f.championName);
    return true;
  }).map(f => ({ id: f.id, name: f.name, championName: f.championName, identityCards: f.identityCards!.slice(0, 3) }));
  const risingChampions: NonNullable<HomepageData['risingChampions']> = computeChampionTrends(sightings).champions
    .filter(c => (c.trend === 'rising' || c.trend === 'new') && c.trendDeltaPct !== null && c.trendDeltaPct > 0)
    .sort((a, b) => b.trendDeltaPct! - a.trendDeltaPct! || a.championName.localeCompare(b.championName))
    .slice(0, 2).map(c => ({ championName: c.championName, trend: c.trend as 'rising' | 'new', deltaPct: c.trendDeltaPct!, previous: c.seasons.at(-2)!, current: c.seasons.at(-1)! }));
  return { generatedAt: taxonomy.generatedAt, decks, families, risingChampions };
}
