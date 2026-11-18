import type { ArchetypeCluster, ChampionTrend } from './analysis-types';
import type { OmnidexEventSummary } from './omnidex-index-types';
import { canonicalSiteUrl } from './seo';

export const SITEMAP_EVENT_CATEGORIES = new Set(['worlds', 'nationals', 'ascent', 'regionals', 'store-championships']);
export const STATIC_SITEMAP_ROUTES = [
  '/', '/cards', '/artists', '/stores', '/cards/stats', '/cards/staples', '/cards/spoilers',
  '/cards/banlist', '/cards/search-reference', '/cards/packages', '/thema', '/events',
  '/seasons', '/players', '/teams', '/achievements', '/archetypes', '/battle-chart',
  '/champions', '/metagame', '/decks', '/decks/shared', '/pantheon', '/compare',
  '/official-decks', '/products', '/merchandise', '/timelines',
];
export const RETIRED_SITEMAP_ROUTES = new Set(['/sets', '/judges', '/tournaments', '/top-decks', '/popular-decks']);
export function championNameToSlug(name: string): string {
  return encodeURIComponent(name.trim().replace(/\s+/g, '-'));
}
export function championPath(name: string, stats = false): string {
  return `/champions/${championNameToSlug(name)}${stats ? '/stats' : ''}/`;
}
export interface DiscoveryMetadata { title: string; description: string; path: string; url: string; image: string }
function metadata(title: string, description: string, path: string): DiscoveryMetadata {
  return { title, description, path, url: canonicalSiteUrl(path), image: `https://fanofin.site/media/discovery${path.replace(/\/$/, '')}.jpg` };
}
export function championMetadata(name: string, stats = false): DiscoveryMetadata {
  return metadata(`${name} ${stats ? 'Stats & Season Results' : 'Decks & Card Synergies'} · Grand Archive`,
    stats ? `${name} tournament performance, win rates, matchups and season trends in Grand Archive TCG.` : `${name} Grand Archive decks, frequently played cards, synergies and tournament archetypes.`, championPath(name, stats));
}
export function archetypeMetadata(cluster: Pick<ArchetypeCluster, 'id' | 'name' | 'playerCount' | 'definingCards'>): DiscoveryMetadata {
  const cards = cluster.definingCards.slice(0, 3).map(c => c.name).join(', ');
  return metadata(`${cluster.name} · Grand Archive Deck Archetype`,
    `${cluster.name}: ${cluster.playerCount} tournament players${cards ? `; featured cards include ${cards}` : ''}. Explore builds and results.`, `/archetypes/${encodeURIComponent(cluster.id)}/`);
}
export type EventSeoInput = Pick<OmnidexEventSummary, 'id' | 'name' | 'date' | 'status'>;
export function eventMetadata(event: EventSeoInput): DiscoveryMetadata {
  return metadata(`${event.name} · ${event.status === 'complete' ? 'Results' : 'Tournament'} · Grand Archive`,
    `${event.name} (${event.date.slice(0, 10)}): Grand Archive tournament ${event.status === 'complete' ? 'results, standings and published decklists' : 'details and published decklists'}.`, `/events/${event.id}/`);
}
export function discoverySocial(meta: DiscoveryMetadata) { return { src: meta.image, alt: meta.title }; }
export function latestChampionSeason(champion: ChampionTrend) { return champion.seasons.at(-1); }

export function discoveryIndexMetadata(section: 'champions' | 'archetypes' | 'events'): DiscoveryMetadata {
  const title = { champions: 'Grand Archive Champions', archetypes: 'Grand Archive Deck Archetypes', events: 'Grand Archive Tournament Results' }[section];
  return metadata(title, `Browse ${title.toLowerCase()} on Fan of Insight.`, `/${section}/`);
}
