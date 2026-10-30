import { useMemo, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDeckCardIndexData, useArchetypeTaxonomyData } from '../archetypes/data';
import { useDeckPopularityIndexData } from '../topdecks/data';
import { useOmnidexIndex, useOmnidexIndexStatus } from '../tournaments/data';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import { metaFreshness, seasonalMetaFreshness } from '@gatcg/shared';
import MetaFreshness, { SeasonTrends } from './MetaFreshness';

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
  const format = params.get('format') || 'standard', champion = params.get('champion') || '';
  const asOf = [index?.generatedAt, popularity?.generatedAt, events?.generatedAt, taxonomy?.generatedAt].filter((v): v is string => !!v).sort()[0] ?? '';
  const history = useMemo(()=>index && popularity && events && taxonomy ? seasonalMetaFreshness(index,popularity.entries,events.events,taxonomy,events.seasons,{format,champion},asOf):[],[index,popularity,events,taxonomy,format,champion,asOf]);
  const requested = params.get('period') ?? (params.get('days') === '90' ? '90' : history[0] ? `season-${history[0].season.id}` : '30');
  const selected = history.find(r=>`season-${r.season.id}`===requested);
  const period = selected ? requested : requested==='90'?'90':'30';
  const buildId = params.get('build') || '';
  const section = sections.includes(params.get('section') as typeof sections[number]) ? params.get('section') as typeof sections[number] : 'main';
  const report = useMemo(()=>index && popularity && events && taxonomy ? metaFreshness(index,popularity.entries,events.events,taxonomy,{format,champion,days:period==='90'?90:30,buildId,seasons:selected?{current:selected.season.id,previous:selected.previousSeason?.id}:undefined},asOf):undefined,[index,popularity,events,taxonomy,format,champion,period,buildId,selected,asOf]);
  const formats = useMemo(()=>[...new Set(events?.events.map(e=>e.format) ?? ['standard'])].sort(),[events]);
  const champions = useMemo(()=>[...new Set(popularity?.entries.map(e=>e.championName).filter((n): n is string=>!!n) ?? [])].sort(),[popularity]);
  function change(key: string, value: string) {
    startTransition(()=>setParams(prev=>{const next=new URLSearchParams(prev); if(value) next.set(key,value); else next.delete(key); if(['format','champion','period'].includes(key)) next.delete('build'); return next;}));
  }
  const control = 'mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3';
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
    <header><h1 className="text-3xl font-bold">Metagame</h1><p className="mt-2 text-sm text-ctp-subtext1">What changed—and which decks and cards explain it?</p></header>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="min-w-0 text-sm">Format<select aria-label="Format" className={control} value={format} onChange={e=>change('format',e.target.value)}>{[...new Set([format,...formats])].map(f=><option key={f}>{f}</option>)}</select></label>
      <label className="min-w-0 text-sm">Period<select aria-label="Period" className={control} value={period} onChange={e=>change('period',e.target.value)}>{history.map(r=><option key={r.season.id} value={`season-${r.season.id}`}>{r.season.name}{r.inProgress?' · In progress':''}</option>)}<option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
      <label className="min-w-0 text-sm">Champion<select aria-label="Champion" className={control} value={champion} onChange={e=>change('champion',e.target.value)}><option value="">All champions</option>{[...new Set([...champions,...(champion?[champion]:[])])].map(c=><option key={c}>{c}</option>)}</select></label>
    </div>
    <PublishedSourceStatus label="Deck cards" status={indexStatus} hasData={!!index}/>
    <PublishedSourceStatus label="Deck results" status={popularityStatus} hasData={!!popularity}/>
    <PublishedSourceStatus label="Events" status={eventsStatus} hasData={!!events}/>
    <PublishedSourceStatus label="Build groups" status={taxonomyStatus} hasData={!!taxonomy}/>
    {pending && <p role="status">Recalculating…</p>}
    {report && <div className="space-y-6" aria-busy={pending}>
      <SeasonTrends history={history} selected={selected?.season.id} onSelect={id=>change('period',`season-${id}`)}/>
      <div className="space-y-1 border-y border-ctp-surface0 py-3">
        <h2 className="font-semibold">{selected ? `${selected.season.name} vs. ${selected.previousSeason?.name ?? 'no earlier season'}` : `Last ${period} days vs. previous ${period} days`}</h2>
        <p className="text-xs text-ctp-subtext1">Previous → current · Public lists {report.previous.decks}/{report.previous.recorded} → {report.current.decks}/{report.current.recorded} · Build matches {report.previous.classified}/{report.previous.decks} → {report.current.classified}/{report.current.decks}</p>
        {!report.previous.decks && <p className="text-sm">No previous-period public decks to compare.</p>}
        {!report.current.decks && <p className="text-sm">No current-period public decks.</p>}
      </div>
      <MetaFreshness key={`${period}:${format}:${champion}`} report={report} buildId={buildId} onBuild={id=>change('build',id)} section={section} onSection={value=>change('section',value)}/>
    </div>}
  </div>;
}
