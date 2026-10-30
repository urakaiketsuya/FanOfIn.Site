import { useEffect, useMemo, useState, useTransition } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDeckCardIndexData } from '../archetypes/data';
import { useDeckPopularityIndexData } from '../topdecks/data';
import { useOmnidexIndex, useOmnidexIndexStatus } from '../tournaments/data';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import { CardIdentity, Bar } from '../events/EventReportVisuals';
import { useCardsByNames } from '../events/useCardsByNames';
import { playerCardPatterns } from './cardPatternReport';
import type { Section } from '../metagame/report';

export default function PlayerCardPatterns({ playerId, active }: { playerId: number; active: boolean }) {
  const [visited, setVisited] = useState(active);
  useEffect(() => { if (active) setVisited(true); }, [active]);
  return active || visited ? <Report key={playerId} playerId={playerId} /> : null;
}
function Report({ playerId }: { playerId: number }) {
  const index = useDeckCardIndexData(), popularity = useDeckPopularityIndexData(), events = useOmnidexIndex();
  const indexStatus = usePublishedDataStatus('analysis-deck-card-index', '/data/analysis/deck-card-index.json');
  const popularityStatus = usePublishedDataStatus('analysis-deck-popularity-index', '/data/analysis/deck-popularity-index.json');
  const eventStatus = useOmnidexIndexStatus();
  const [params, setParams] = useSearchParams();
  const [pending, transition] = useTransition();
  const [limit, setLimit] = useState(6), [newLimit, setNewLimit] = useState(6);
  const format = params.get('cards-format') || 'standard', selected = params.get('cards-champion');
  const section = (['main', 'material', 'sideboard'].includes(params.get('cards-section') ?? '') ? params.get('cards-section') : 'main') as Section;
  const asOf = [index?.generatedAt, popularity?.generatedAt, events?.generatedAt].filter((s): s is string => !!s).sort()[0] ?? '';
  const report = useMemo(() => index && popularity && events ? playerCardPatterns(index, popularity.entries, events.events, playerId, format, selected, asOf) : undefined, [index, popularity, events, playerId, format, selected, asOf]);
  const names = useMemo(() => [...(report?.sections[section].slice(0, limit).map(r => r.name) ?? []), ...(report?.newCards.filter(r => r.section === section).slice(0, newLimit).map(r => r.name) ?? [])], [report, section, limit, newLimit]);
  const cards = useCardsByNames(names);
  function change(key: string, value: string) { transition(() => { setLimit(6); setNewLimit(6); setParams(prev => { const next = new URLSearchParams(prev); next.set(key, value); if (key === 'cards-format') next.delete('cards-champion'); return next; }); }); }
  const rows = report?.sections[section] ?? [], newRows = report?.newCards.filter(r => r.section === section) ?? [];
  return <section className="mt-6 space-y-5" aria-label="Player card patterns" aria-busy={pending}>
    <h2 className="text-xl font-semibold">Card patterns</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-sm">Format<select aria-label="Card patterns format" className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3" value={format} onChange={e => change('cards-format', e.target.value)}>{[...new Set([format, ...(events?.events.map(e => e.format) ?? [])])].sort().map(f => <option key={f}>{f}</option>)}</select></label>
      <label className="min-w-0 text-sm">Champion<select aria-label="Card patterns champion" className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3" value={report?.champion ?? selected ?? ''} onChange={e => change('cards-champion', e.target.value)}>{!report?.champions.length && <option value={selected ?? ''}>{selected || 'No public decks'}</option>}{selected && report?.champions.length && !report.champions.some(([name]) => name === selected) ? <option>{selected}</option> : null}{report?.champions.map(([name, count]) => <option key={name} value={name}>{name} · {count} {count === 1 ? 'deck' : 'decks'}</option>)}</select></label>
    </div>
    <PublishedSourceStatus label="Deck cards" status={indexStatus} hasData={!!index} />
    <PublishedSourceStatus label="Deck results" status={popularityStatus} hasData={!!popularity} />
    <PublishedSourceStatus label="Events" status={eventStatus} hasData={!!events} />
    {pending && <p role="status">Recalculating…</p>}
    {report && <>
      <p className="text-sm text-ctp-subtext1">{report.champion || 'No champion'} · {report.decks} public {report.decks === 1 ? 'deck' : 'decks'} · {report.historyStart?.slice(0, 10) ?? 'No history'}–{asOf.slice(0, 10)}</p>
      {report.missing > 0 && <p role="status">{report.missing} deck lists unavailable</p>}
      <Tabs baseId="player-card-patterns" label="Card pattern section" active={section} onChange={s => change('cards-section', s)} wrap tabs={(['main', 'material', 'sideboard'] as const).map(key => ({ key, label: key[0].toUpperCase() + key.slice(1) }))} />
      <TabPanel baseId="player-card-patterns" tab={section} active={section} className="space-y-6">
        <section className="space-y-3"><h3 className="text-lg font-semibold">Most played{section === 'sideboard' ? ' sideboard cards' : ''}</h3>
          {!rows.length && <p>No {section} cards recorded.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.slice(0, limit).map(row => <article key={row.name} className="min-w-0 space-y-3 rounded-xl border border-ctp-surface0 p-4"><CardIdentity name={row.name} card={cards.get(row.name)} /><div className="flex flex-wrap justify-between gap-2"><strong>{Number((100 * row.decks / report.decks).toFixed(1))}%</strong><span>{row.decks}/{report.decks} decks</span></div><Bar value={100 * row.decks / report.decks} label={`${row.name} inclusion`} blue /><p className="text-sm text-ctp-subtext1">{Number((row.copies / row.decks).toFixed(1))} avg. copies when included</p></article>)}</div>
          {limit < rows.length && <Button onClick={() => setLimit(n => n + 12)}>More frequently played cards</Button>}
        </section>
        <section className="space-y-3"><h3 className="text-lg font-semibold">First seen with {report.champion || 'this champion'}</h3><p className="text-sm text-ctp-subtext1">Last 90 days · public-list history</p>
          {!newRows.length && <p>No newly seen {section} cards.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{newRows.slice(0, newLimit).map(row => <article key={row.name} className="min-w-0 space-y-2 rounded-xl border border-ctp-surface0 p-4"><CardIdentity name={row.name} card={cards.get(row.name)} /><Link className="inline-flex min-h-control items-center text-sm text-ctp-blue underline" to={`/events/${row.eventId}?player=${playerId}`}>First seen {row.date.slice(0, 10)}</Link><p className="text-sm">{row.decks} {row.decks === 1 ? 'appearance' : 'appearances'}</p></article>)}</div>
          {newLimit < newRows.length && <Button onClick={() => setNewLimit(n => n + 12)}>More newly seen cards</Button>}
        </section>
      </TabPanel>
    </>}
  </section>;
}
