import { useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDeckCardIndexData, useArchetypeTaxonomyData } from '../archetypes/data';
import { useDeckPopularityIndexData } from '../topdecks/data';
import { useOmnidexIndex, useOmnidexIndexStatus } from '../tournaments/data';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import { useCardsByNames } from '../events/useCardsByNames';
import { Bar, CardIdentity } from '../events/EventReportVisuals';
import { metagameReport, type Section } from './report';

import MetaFreshness from './MetaFreshness';

const sections = ['main', 'material', 'sideboard'] as const;
export default function Metagame() {
  const taxonomy = useArchetypeTaxonomyData();
  const taxonomyStatus = usePublishedDataStatus('analysis-archetype-taxonomy', '/data/analysis/archetype-taxonomy.json');
  const index = useDeckCardIndexData(), popularity = useDeckPopularityIndexData(), events = useOmnidexIndex();
  const indexStatus = usePublishedDataStatus('analysis-deck-card-index', '/data/analysis/deck-card-index.json');
  const popularityStatus = usePublishedDataStatus('analysis-deck-popularity-index', '/data/analysis/deck-popularity-index.json');
  const eventsStatus = useOmnidexIndexStatus();
  const [params, setParams] = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [limit, setLimit] = useState(12);
  const format = params.get('format') || 'standard', champion = params.get('champion') || '';
  const days = ['30', '90', '0'].includes(params.get('days') ?? '') ? Number(params.get('days')) : 30;
  const section: Section = sections.includes(params.get('section') as Section) ? params.get('section') as Section : 'main';
  const asOf = [index?.generatedAt, popularity?.generatedAt, events?.generatedAt].filter((v): v is string => !!v).sort()[0] ?? '';
  const report = useMemo(() => index && popularity && events ? metagameReport(index, popularity.entries, events.events, { format, champion, days }, asOf) : undefined, [index, popularity, events, format, champion, days, asOf]);
  const formats = useMemo(() => [...new Set(events?.events.map(e => e.format) ?? ['standard'])].sort(), [events]);
  const rows = report?.sections[section] ?? [];
  const visible = rows.slice(0, limit);
  const names = useMemo(() => (report?.sections[section] ?? []).slice(0, limit).map(row => row.name), [report, section, limit]);
  const cards = useCardsByNames(names);
  function change(key: string, value: string) {
    startTransition(() => { setLimit(12); setParams(prev => { const next = new URLSearchParams(prev); if (value) next.set(key, value); else next.delete(key); return next; }); });
  }
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
    <header><h1 className="text-3xl font-bold">Metagame</h1><p className="mt-2 text-sm text-ctp-subtext1">Public tournament decks{asOf && ` · through ${asOf.slice(0, 10)}`}</p></header>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="min-w-0 text-sm">Format<select aria-label="Format" className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3" value={format} onChange={e => change('format', e.target.value)}>{[...new Set([format, ...formats])].map(f => <option key={f} value={f}>{f}</option>)}</select></label>
      <label className="min-w-0 text-sm">Period<select aria-label="Period" className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3" value={days} onChange={e => change('days', e.target.value)}><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={0}>All time</option></select></label>
      <label className="min-w-0 text-sm">Champion<select aria-label="Champion" className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3" value={champion} onChange={e => change('champion', e.target.value)}><option value="">All champions</option>{champion && !report?.champions.some(([name]) => name === champion) && <option>{champion}</option>}{report?.champions.map(([name, count]) => <option key={name} value={name}>{name} · {count} decks</option>)}</select></label>
    </div>
    <PublishedSourceStatus label="Deck cards" status={indexStatus} hasData={!!index} />
    <PublishedSourceStatus label="Deck results" status={popularityStatus} hasData={!!popularity} />
    <PublishedSourceStatus label="Events" status={eventsStatus} hasData={!!events} />
    {pending && <p role="status">Recalculating…</p>}
    {report && <div className="space-y-5" aria-busy={pending}>
      <div className="flex flex-wrap gap-x-8 gap-y-3"><p><strong className="text-2xl">{report.decks.toLocaleString()}</strong> public decks</p><p><strong className="text-2xl">{report.events.toLocaleString()}</strong> events</p></div>
      {report.missing > 0 && <p role="status" className="text-sm text-ctp-subtext1">{report.missing} deck lists unavailable</p>}
      <PublishedSourceStatus label="Build groups" status={taxonomyStatus} hasData={!!taxonomy} />
      {index && popularity && events && taxonomy && <MetaFreshness index={index} popularity={popularity} events={events} taxonomy={taxonomy} format={format} champion={champion} days={days === 90 ? 90 : 30} asOf={[asOf, taxonomy.generatedAt].sort()[0]} />}
      <Tabs baseId="metagame" label="Deck section" tabs={sections.map(key => ({ key, label: key[0].toUpperCase() + key.slice(1) }))} active={section} onChange={value => change('section', value)} wrap />
      <TabPanel baseId="metagame" tab={section} active={section} className="space-y-4">
        <h2 className="text-lg font-semibold">{champion || 'All champions'} · {section === 'sideboard' ? 'Sideboard registrations' : 'Most frequent cards'}</h2>
        {section === 'sideboard' && <p className="text-sm text-ctp-subtext1">{report.sideboards}/{report.decks} decks with sideboard cards</p>}
        {!rows.length ? <p className="rounded-xl bg-ctp-mantle p-6">No {section} cards in this scope.</p> : <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map(row => <article key={row.name} className="min-w-0 space-y-3 rounded-xl border border-ctp-surface0 bg-ctp-mantle p-4">
            <CardIdentity name={row.name} card={cards.get(row.name)} />
            <div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="text-2xl">{Number((row.decks / report.decks * 100).toFixed(1))}%</strong><span className="text-sm text-ctp-subtext1">{row.decks.toLocaleString()}/{report.decks.toLocaleString()} decks</span></div>
            <Bar value={row.decks / report.decks * 100} label={`${row.name} inclusion`} blue />
            <p className="text-sm text-ctp-subtext1">{Number((row.copies / row.decks).toFixed(1))} avg. copies when included</p>
          </article>)}</div>
          {limit < rows.length && <Button onClick={() => setLimit(n => n + 24)}>Show more cards ({visible.length}/{rows.length})</Button>}
        </>}
      </TabPanel>
    </div>}
  </div>;
}
