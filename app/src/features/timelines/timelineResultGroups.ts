import type { BroadcastEventMap, BroadcastTimelineMatch } from '@gatcg/shared';

export function groupTimelineResults(matches: BroadcastTimelineMatch[], events: BroadcastEventMap[], selected = '') {
  const groups = new Map<string, { key: string; name: string; event?: BroadcastEventMap; matches: BroadcastTimelineMatch[] }>();
  for (const match of matches) {
    const event = events.find(e => e.id === match.eventId || e.aliases.includes(match.event));
    const key = String(event?.id ?? match.eventId ?? match.event);
    if (selected && selected !== key && selected !== match.event && selected !== event?.name && !event?.aliases.includes(selected)) continue;
    const group = groups.get(key) ?? { key, name: event?.name ?? match.event.replace(/ Swiss Stage$/, ''), event, matches: [] };
    group.matches.push(match);
    groups.set(key, group);
  }
  function order(match: BroadcastTimelineMatch) {
    const swiss = match.round.match(/^Round\s+(\d+)/i);
    if (swiss) return Number(swiss[1]);
    return /Quarterfinal|Top 8/i.test(match.round) ? 1000 : /Semifinal|Top 4/i.test(match.round) ? 1001 : /Bronze/i.test(match.round) ? 1002 : /Final/i.test(match.round) ? 1003 : 1004;
  }
  return [...groups.values()].sort((a,b) => (b.event?.date ?? '').localeCompare(a.event?.date ?? '') || a.name.localeCompare(b.name)).map(group => ({ ...group, matches: [...group.matches].sort((a,b) => order(a) - order(b)) }));
}
