import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { computeEventReport, type Card, type OmnidexDecklistEntry, type OmnidexEvent, type OmnidexPlayer } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import { InlineState } from '../../components/ui/ContentState';
import { findDeckChampionName } from '../../lib/ttsExport';
import { useCardsByNames } from './useCardsByNames';

const percent = (value: number) => `${Number(value.toFixed(1))}%`;
function Bar({ value, label, blue = false }: { value: number; label: string; blue?: boolean }) {
  return <div role="img" aria-label={`${label}: ${percent(value)}`} className="h-2.5 overflow-hidden rounded bg-ctp-surface0"><div className={`h-full rounded ${blue ? 'bg-ctp-blue' : 'bg-ctp-teal'}`} style={{ width: `${value}%` }} /></div>;
}
function CardIdentity({ name, card }: { name: string; card?: Card }) {
  const content = <><div className="w-14 shrink-0"><CardArtTile name={name} card={card} /></div><span className="min-w-0 break-words text-sm font-medium">{name}</span></>;
  return card ? <Link className="flex min-h-control items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{content}</Link> : <div className="flex items-center gap-3">{content}</div>;
}
export default function EventReport({ event, players, decks, teamEvent }: { event: OmnidexEvent; players: OmnidexPlayer[]; decks?: OmnidexDecklistEntry[]; teamEvent: boolean }) {
  const names = useMemo(() => decks?.flatMap(d => [...d.decklist.main, ...d.decklist.material].map(l => l.card)) ?? [], [decks]);
  const catalog = useCardsByNames(names);
  const report = useMemo(() => {
    const champions = new Map<number, { name: string; cardName: string }>();
    for (const deck of decks ?? []) {
      if (deck.decklist.material.some(l => l.quantity > 0 && !catalog.has(l.card))) continue;
      const cardName = findDeckChampionName(deck.decklist.material.filter(l => l.quantity > 0), catalog);
      if (cardName) champions.set(deck.player, { name: cardName.split(',')[0].trim(), cardName });
    }
    return computeEventReport(event, players, decks, champions, teamEvent);
  }, [event, players, decks, catalog, teamEvent]);
  if (report.status) return <InlineState className="mt-6">{report.status}</InlineState>;
  return <div className="mt-6 space-y-8" data-component="EventReport">
    <section aria-labelledby="event-advancement">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="event-advancement" className="text-xl font-semibold">Who made top cut?</h2><p className="text-xs text-ctp-subtext0">% of entrants advancing · Top {report.cut}</p></div>
      <p className="mt-1 text-xs text-ctp-subtext0">{report.entrants} entrants · Complete public field · Bars: 0–100%</p>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(60px,2fr)_4rem] items-center gap-3 border-y border-ctp-surface1 py-4"><span className="text-sm">Event average</span><Bar value={report.average} label="Event average" blue /><span className="text-right text-lg font-semibold tabular-nums">{percent(report.average)}</span></div>
      {report.champions.map(row => <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_minmax(60px,2fr)_4rem] items-center gap-3 py-3"><div><Link to={`/champions/${encodeURIComponent(row.name)}`} className="inline-flex min-h-control items-center rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-ctp-blue">{row.name}</Link><p className="text-xs text-ctp-subtext0">{row.entrants} {row.entrants === 1 ? 'entrant' : 'entrants'}</p></div><Bar value={row.rate} label={`${row.name} advancing`} /><span className="text-right text-lg font-semibold tabular-nums">{percent(row.rate)}</span></div>)}
    </section>
    <section aria-labelledby="event-field">
      <h2 id="event-field" className="text-xl font-semibold">How did the field change?</h2>
      <p className="mt-1 text-xs text-ctp-subtext0">Champion share · {report.entrants} entrants → Top {report.cut}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...report.champions].sort((a, b) => b.fieldShare - a.fieldShare || a.name.localeCompare(b.name)).map(row => <article key={row.name} className="rounded-xl bg-ctp-mantle p-4">
          <CardIdentity name={row.cardName} card={catalog.get(row.cardName)} />
          <div className="mb-1 mt-4 flex items-baseline justify-between gap-2"><span className="text-xs text-ctp-subtext1">Field</span><span className="text-xl font-semibold tabular-nums">{percent(row.fieldShare)}</span></div>
          <Bar value={row.fieldShare} label={`${row.name} share of field`} blue />
          <div className="mb-1 mt-3 flex items-baseline justify-between gap-2"><span className="text-xs text-ctp-subtext1">Top cut</span><span className="text-xl font-semibold tabular-nums">{percent(row.topCutShare)}</span></div>
          <Bar value={row.topCutShare} label={`${row.name} share of top cut`} />
        </article>)}
      </div>
    </section>
    {report.champions.filter(row => row.advanced > 0).map(row => <section key={row.name} aria-label={`${row.name} top-cut cards`}>
      <h2 className="text-xl font-semibold">What did top-cut {row.name} decks play?</h2>
      <p className="mt-1 text-xs text-ctp-subtext0">Card inclusion · {row.advanced} top-cut lists · {row.entrants} {row.name} lists overall · Main + Material</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{row.cards.filter(c => !catalog.get(c.name)?.types.includes('CHAMPION')).slice(0, 6).map(card => <article key={card.name} className="rounded-xl bg-ctp-mantle p-4">
        <CardIdentity name={card.name} card={catalog.get(card.name)} />
        <div className="mb-1 mt-4 flex items-baseline justify-between gap-2"><span className="text-xs text-ctp-subtext1">Top-cut {row.name}</span><span className="text-xl font-semibold tabular-nums">{percent(card.topRate)}</span></div><Bar value={card.topRate} label={`Top-cut ${row.name} including ${card.name}`} />
        <div className="mb-1 mt-3 flex items-baseline justify-between gap-2"><span className="text-xs text-ctp-subtext1">All {row.name}</span><span className="text-xl font-semibold tabular-nums">{percent(card.fieldRate)}</span></div><Bar value={card.fieldRate} label={`All ${row.name} including ${card.name}`} blue />
      </article>)}</div>
      <Link className="mt-3 inline-flex min-h-control items-center rounded px-2 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`?tab=decklists&browse=all&deck-search-champion=${encodeURIComponent(row.name)}`}>Browse {row.name} decks →</Link>
    </section>)}
  </div>;
}
