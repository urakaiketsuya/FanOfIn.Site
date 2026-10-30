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
  const [limit, setLimit] = useState(6), [newLimit, setNewLimit] = useState(6), [uniqueLimit, setUniqueLimit] = useState(6);
  const format = params.get('cards-format') || 'standard', selected = params.get('cards-champion');
  const section = (['main', 'material', 'sideboard'].includes(params.get('cards-section') ?? '') ? params.get('cards-section') : 'main') as Section;
  const asOf = [index?.generatedAt, popularity?.generatedAt, events?.generatedAt].filter((s): s is string => !!s).sort()[0] ?? '';
  const report = useMemo(() => index && popularity && events ? playerCardPatterns(index, popularity.entries, events.events, playerId, format, selected, asOf) : undefined, [index, popularity, events, playerId, format, selected, asOf]);
  const names = useMemo(() => [...(report?.uniqueCards[section].slice(0, uniqueLimit).map(r => r.name) ?? []), ...(report?.sections[section].slice(0, limit).map(r => r.name) ?? []), ...(report?.trends[section].slice(0, 6).map(r => r.name) ?? []), ...(report?.signatures[section].slice(0, 6).map(r => r.name) ?? []), ...(report?.newCards.filter(r => r.section === section).slice(0, newLimit).map(r => r.name) ?? [])], [report, section, limit, newLimit, uniqueLimit]);
  const cards = useCardsByNames(names);
  function change(key: string, value: string) { transition(() => { setLimit(6); setNewLimit(6); setUniqueLimit(6); setParams(prev => { const next = new URLSearchParams(prev); next.set(key, value); if (key === 'cards-format') next.delete('cards-champion'); return next; }); }); }
  const rows = report?.sections[section] ?? [], newRows = report?.newCards.filter(r => r.section === section) ?? [];
  return <section className="mt-6 space-y-5" aria-label="Player card patterns" aria-busy={pending}>
    <h2 className="text-xl font-semibold">Card patterns</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-sm">Format<select aria-label="Card patterns format" className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3" value={format} onChange={e => change('cards-format', e.target.value)}>{[...new Set([format, ...(events?.events.map(e => e.format) ?? [])])].sort().map(f => <option key={f}>{f}</option>)}</select></label>
      <label className="min-w-0 text-sm">Champion<select aria-label="Card patterns champion" className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3" value={report?.champion ?? selected ?? ''} onChange={e => change('cards-champion', e.target.value)}><option value="">All champions</option>{!report?.champions.length && selected && <option value={selected ?? ''}>{selected || 'No public decks'}</option>}{selected && report?.champions.length && !report.champions.some(([name]) => name === selected) ? <option>{selected}</option> : null}{report?.champions.map(([name, count]) => <option key={name} value={name}>{name} · {count} {count === 1 ? 'deck' : 'decks'}</option>)}</select></label>
    </div>
    <PublishedSourceStatus label="Deck cards" status={indexStatus} hasData={!!index} />
    <PublishedSourceStatus label="Deck results" status={popularityStatus} hasData={!!popularity} />
    <PublishedSourceStatus label="Events" status={eventStatus} hasData={!!events} />
    {pending && <p role="status">Recalculating…</p>}
    {report && <>
      <p className="text-sm text-ctp-subtext1">{report.champion || 'All champions'} · {report.decks} public {report.decks === 1 ? 'deck' : 'decks'} · {report.historyStart ? `${report.historyStart.slice(0, 10)}–${asOf.slice(0, 10)}` : 'No history'}</p>
      {report.missing > 0 && <p role="status">{report.missing} deck lists unavailable</p>}
      <Tabs baseId="player-card-patterns" label="Card pattern section" active={section} onChange={s => change('cards-section', s)} wrap tabs={(['main', 'material', 'sideboard'] as const).map(key => ({ key, label: key === 'sideboard' && report ? `Sideboard · ${report.sideboards}` : key[0].toUpperCase() + key.slice(1) }))} />
      <TabPanel baseId="player-card-patterns" tab={section} active={section} className="space-y-6">
        <section className="space-y-3">{section === 'sideboard' && <p className="text-sm text-ctp-subtext1">{report.sideboards}/{report.decks} decks with sideboard cards</p>}<h3 className="text-lg font-semibold">Most played{section === 'sideboard' ? ' sideboard cards' : ''}</h3>
          {!rows.length && <p>No {section} cards recorded.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.slice(0, limit).map(row => <article key={row.name} className="min-w-0 space-y-3 rounded-xl border border-ctp-surface0 p-4"><CardIdentity name={row.name} card={cards.get(row.name)} /><div className="flex flex-wrap justify-between gap-2"><strong>{Number((100 * row.decks / report.decks).toFixed(1))}%</strong><span>{row.decks}/{report.decks} decks</span></div><Bar value={100 * row.decks / report.decks} label={`${row.name} inclusion`} blue /><p className="text-sm text-ctp-subtext1">{Number((row.copies / row.decks).toFixed(1))} avg. copies when included</p></article>)}</div>
          {limit < rows.length && <Button onClick={() => setLimit(n => n + 12)}>More frequently played cards</Button>}
        </section>
        {report.champion && <section className="space-y-3">
          <h3 className="text-lg font-semibold">Unique choices with {report.champion}</h3>
          <p className="text-sm text-ctp-subtext1">Only this player · {report.peers.decks} other public decks compared</p>
          {report.peers.missing > 0 && <p className="text-sm text-ctp-subtext1">{report.peers.missing} other deck lists unavailable</p>}
          {!report.peers.decks ? <p>No other public decks to compare.</p> : !report.uniqueCards[section].length ? <p>No unique {section} choices recorded.</p> : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{report.uniqueCards[section].slice(0, uniqueLimit).map(row => <article key={row.name} className="min-w-0 space-y-3 rounded-xl border border-ctp-surface0 p-4"><CardIdentity name={row.name} card={cards.get(row.name)} /><p className="text-sm">{row.decks}/{report.decks} decks · {Number((row.copies / row.decks).toFixed(1))} avg. copies</p></article>)}</div>
          {uniqueLimit < report.uniqueCards[section].length && <Button onClick={() => setUniqueLimit(n => n + 12)}>More unique choices</Button>}
        </section>}
        <section className="space-y-3"><h3 className="text-lg font-semibold">First seen{report.champion ? ` with ${report.champion}` : ' across all champions'}</h3><p className="text-sm text-ctp-subtext1">Last 90 days · public-list history</p>
          {!newRows.length && <p>No newly seen {section} cards.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{newRows.slice(0, newLimit).map(row => <article key={row.name} className="min-w-0 space-y-2 rounded-xl border border-ctp-surface0 p-4"><CardIdentity name={row.name} card={cards.get(row.name)} /><Link className="inline-flex min-h-control items-center text-sm text-ctp-blue underline" to={`/events/${row.eventId}?player=${playerId}`}>First seen {row.date.slice(0, 10)}</Link><p className="text-sm">{row.decks} {row.decks === 1 ? 'appearance' : 'appearances'}</p></article>)}</div>
          {newLimit < newRows.length && <Button onClick={() => setNewLimit(n => n + 12)}>More newly seen cards</Button>}
        </section>
        {([
          { title: 'Recent changes', rows: report.trends[section], other: report.previous, label: 'Previous 90 days', minimum: 3, signature: false },
          { title: 'Signature choices', rows: report.signatures[section], other: report.others, label: 'Other players', minimum: 10, signature: true },
        ] as const).map(group => <section key={group.title} className="space-y-3">
          <h3 className="text-lg font-semibold">{group.title}</h3>
          <p className="text-sm text-ctp-subtext1">{group.signature ? `Last 90 days · ${report.champion ? 'same champion' : 'all champions'}` : 'Last 90 days vs. previous 90 days'} · {asOf.slice(0, 10)}</p>
          {report.recent.decks < 3 || group.other.decks < group.minimum
            ? <p className="text-sm">{report.recent.decks} recent decks · {group.other.decks} {group.signature ? 'other-player' : 'previous-period'} decks. Needs 3 recent and {group.minimum} {group.signature ? 'other-player' : 'previous-period'} decks.</p>
            : !group.rows.length ? <p>{group.signature ? 'No standout choices in this section.' : 'No inclusion changes in this section.'}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.rows.slice(0, 6).map(row => <article key={row.name} className="min-w-0 space-y-3 rounded-xl border border-ctp-surface0 p-4">
            <CardIdentity name={row.name} card={cards.get(row.name)} />
            <strong className="block">{row.delta > 0 ? '+' : '−'}{Number(Math.abs(row.delta).toFixed(1))} pp {group.signature ? 'vs. others' : row.delta > 0 ? 'increase' : 'decrease'}</strong>
            {[
              { label: 'Recent decks', percent: row.leftPercent, count: row.leftCount, total: report.recent.decks, blue: true },
              { label: group.label, percent: row.rightPercent, count: row.rightCount, total: group.other.decks, blue: false },
            ].map(value => <div key={value.label} className="space-y-1"><div className="flex flex-wrap justify-between gap-2 text-sm"><span>{value.label}</span><strong>{Number(value.percent.toFixed(1))}% · {value.count}/{value.total}</strong></div><Bar value={value.percent} label={`${row.name}: ${value.label}`} blue={value.blue} /></div>)}
          </article>)}</div>
        </section>)}
      </TabPanel>
    </>}
  </section>;
}
