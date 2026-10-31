import { Link } from 'react-router-dom';
import type { BroadcastEventPairing, BroadcastTimelineMatch, Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import { championsForDeck } from './champions';

export default function TournamentMatch({ match, recap, champions, highlighted, nextLabel, onAdvance }: {
  match: BroadcastEventPairing; recap?: BroadcastTimelineMatch; champions?: Card[]; highlighted?: boolean; nextLabel?: string; onAdvance?: () => void;
}) {
  const content = <>
    {match.players.map(player => {
      const deck = recap?.players.find(p => p.name.toLowerCase() === player.name.toLowerCase())?.deck;
      const cards = championsForDeck(deck ?? '', champions);
      return <div key={player.id} className={`flex min-w-0 items-center gap-2 border-b border-ctp-surface1 px-3 py-3 last:border-0 ${match.winner === player.id ? 'bg-ctp-blue/5' : ''}`}>
        {!!cards.length && <div className="flex max-w-28 flex-wrap gap-1">
          {cards.map(card => <div key={card.slug} className="w-12 [&_[data-component=CardArtTile]]:aspect-square [&_[data-component=CardArtTile]]:rounded-full [&_img]:!w-[160%] [&_img]:!left-[-30%] [&_img]:!top-[-25%]">
            <CardArtTile card={card} name={card.name} artworkOnly /><span className="mt-1 block break-words text-center text-[11px] text-ctp-subtext1">{card.name.split(',')[0]}</span>
          </div>)}
        </div>}
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{player.name}</p>{match.winner === player.id && <span className="text-xs text-ctp-blue">Winner</span>}{player.status === 'tied' && <span className="text-xs text-ctp-subtext1">Draw</span>}{player.status === 'byed' && <span className="text-xs text-ctp-subtext1">Bye</span>}</div>
        <span className="text-lg font-semibold tabular-nums">{['winner', 'loser', 'tied', 'byed'].includes(player.status) ? player.score : '—'}</span>
      </div>;
    })}
    <div className="border-t border-ctp-surface1 px-3 py-2 text-xs text-ctp-subtext1">{recap ? 'Broadcast recap →' : 'Result only'}{match.bronze ? ' · Bronze match' : ''}</div>
  </>;
  return <article data-match-id={match.id} className={`min-w-0 rounded-xl border bg-ctp-mantle ${highlighted ? 'border-ctp-blue ring-1 ring-ctp-blue' : 'border-ctp-surface1'}`}>
    {recap ? <Link to={`/timelines/${recap.id}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ctp-blue" aria-label={`${match.players.map(p => p.name).join(' versus ')} — broadcast recap`}>{content}</Link> : content}
    {nextLabel && onAdvance && <button type="button" onClick={onAdvance} className="min-h-control w-full border-t border-ctp-surface1 px-3 text-left text-xs text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">Advances to {nextLabel} →</button>}
  </article>;
}
