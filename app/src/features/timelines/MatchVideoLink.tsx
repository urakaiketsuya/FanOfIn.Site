import type { BroadcastTimelineMatch } from '@gatcg/shared';
import { matchVideoLink } from './matchVideoUrl';

export default function MatchVideoLink({ match }: { match: BroadcastTimelineMatch }) {
  const link = matchVideoLink(match.video);
  if (!link) return null;
  return <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${link.label}: ${match.players.map(p => p.name).join(' versus ')} (opens in a new tab)`} className="inline-flex min-h-control items-center gap-2 rounded px-3 text-sm font-medium text-ctp-blue hover:bg-ctp-blue/10 focus-visible:outline-2 focus-visible:outline-ctp-blue"><span aria-hidden="true">▶</span>{link.label}<span aria-hidden="true">↗</span></a>;
}
