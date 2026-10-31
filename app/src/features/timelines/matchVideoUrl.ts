import type { BroadcastTimelineMatch } from '@gatcg/shared';

export function matchVideoLink(video: BroadcastTimelineMatch['video']) {
  if (!video || !/^[\w-]{11}$/.test(video.id) || !['match', 'broadcast'].includes(video.kind)) return undefined;
  const start = video.startSeconds;
  if (start !== undefined && (!Number.isInteger(start) || start < 0)) return undefined;
  return { url: `https://www.youtube.com/watch?v=${video.id}${start !== undefined ? `&t=${start}s` : ''}`, label: video.kind === 'match' || start !== undefined ? 'Watch match' : 'Watch broadcast' };
}
