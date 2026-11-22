import type { BroadcastTimelineBeat, BroadcastTimelineMatch } from './broadcast-timeline-types';
import type { Card } from './api-types';
import { canonicalSiteUrl } from './seo';

export function timelinePath(id: string): string {
  if (id.toLowerCase() === 'combos' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(id)) throw new Error(`Invalid match ID: ${id}`);
  return `/timelines/${id}/`;
}
export function timelineMatchup(match: BroadcastTimelineMatch) {
  return match.players.map(player => match.sourceVideos ? player.deck : player.name).join(' vs. ');
}

export function timelineSourceLinks(match: BroadcastTimelineMatch) {
  return (match.sourceVideos ?? []).flatMap(source => {
    const link = timelineVideoLink({ id: source.id, kind: 'match' });
    return link ? [{ ...link, label: source.label }] : [];
  });
}

export function timelineMetadata(match: BroadcastTimelineMatch) {
  const title = `${timelineMatchup(match)} · ${match.event} · ${match.round}`;
  const description = `Grand Archive: ${match.players.map(player => `${player.name} (${player.deck})`).join(' vs. ')}. ${match.result}. Game recaps, cards and source video.`;
  const path = timelinePath(match.id);
  return { title, description, path, url: canonicalSiteUrl(path), image: `https://fanofin.site/media/matches/${match.id}.jpg` };
}
export function timelineVideoLink(video: BroadcastTimelineMatch['video']) {
  if (!video || !/^[\w-]{11}$/.test(video.id) || !['match', 'broadcast'].includes(video.kind)) return undefined;
  const start = video.startSeconds;
  if (start !== undefined && (!Number.isInteger(start) || start < 0)) return undefined;
  return { url: `https://www.youtube.com/watch?v=${video.id}${start !== undefined ? `&t=${start}s` : ''}`, label: video.kind === 'match' || start !== undefined ? 'Watch match' : 'Watch broadcast' };
}
export function beatVideoLink(beat: BroadcastTimelineBeat, video: BroadcastTimelineMatch['video'], sources?: BroadcastTimelineMatch['sourceVideos']) {
  const time = beat.timestamp;
  if (!time) return undefined;
  const creatorSource = sources?.find(source => source.id === time.videoId);
  const source = video?.id === time.videoId ? video : creatorSource && { id: creatorSource.id, kind: 'match' as const };
  if (!source) return undefined;
  const link = timelineVideoLink({ ...source, startSeconds: time.seconds });
  if (!link) return undefined;
  const hours = Math.floor(time.seconds / 3600);
  const minutes = Math.floor(time.seconds / 60) % 60;
  const seconds = String(time.seconds % 60).padStart(2, '0');
  return { url: link.url, label: hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}` };
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
