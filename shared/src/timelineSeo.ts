import type { BroadcastTimelineMatch } from './broadcast-timeline-types';
import type { Card } from './api-types';
import { canonicalSiteUrl } from './seo';

export function timelinePath(id: string): string {
  if (id.toLowerCase() === 'combos' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(id)) throw new Error(`Invalid match ID: ${id}`);
  return `/timelines/${id}/`;
}
export function timelineMetadata(match: BroadcastTimelineMatch) {
  const title = `${match.players.map(player => player.name).join(' vs. ')} · ${match.event} · ${match.round}`;
  const description = `Grand Archive: ${match.players.map(player => `${player.name} (${player.deck})`).join(' vs. ')}. ${match.result}. Game recaps, cards and broadcast video.`;
  const path = timelinePath(match.id);
  return { title, description, path, url: canonicalSiteUrl(path), image: `https://fanofin.site/media/matches/${match.id}.jpg` };
}
export function timelineVideoLink(video: BroadcastTimelineMatch['video']) {
  if (!video || !/^[\w-]{11}$/.test(video.id) || !['match', 'broadcast'].includes(video.kind)) return undefined;
  const start = video.startSeconds;
  if (start !== undefined && (!Number.isInteger(start) || start < 0)) return undefined;
  return { url: `https://www.youtube.com/watch?v=${video.id}${start !== undefined ? `&t=${start}s` : ''}`, label: video.kind === 'match' || start !== undefined ? 'Watch match' : 'Watch broadcast' };
}
// One representative printing per explicitly named champion, preserving deck-label order.
export function timelineChampions(deck: string, cards: Card[] = []) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const words = ` ${normalize(deck)} `;
  const matches = new Map<string, { card: Card; position: number }>();
  for (const card of cards) {
    if (!card.types.includes('CHAMPION') || card.subtypes?.includes('SPIRIT')) continue;
    const name = normalize(card.name.split(',')[0]);
    const position = words.indexOf(` ${name} `);
    if (name && position >= 0 && !matches.has(name)) matches.set(name, { card, position });
  }
  return [...matches.values()].sort((a, b) => a.position - b.position).map(({ card }) => card);
}

export function timelineRoundLabel(round: string): string {
  return round.split("(")[0].replace(/\s+—\s+(?!Quarterfinal|Semifinal).*$/, "").trim();
}
