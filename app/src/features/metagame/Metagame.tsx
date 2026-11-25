import { useMemo, useOptimistic, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDeckCardIndexData, useArchetypeTaxonomyData } from '../archetypes/data';
import { useDeckPopularityIndexData } from '../topdecks/data';
import { useOmnidexIndex, useOmnidexIndexStatus } from '../tournaments/data';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import { EVENT_CATEGORY_ORDER, metaFreshness, seasonalMetaFreshness } from '@gatcg/shared';
import MetaFreshness, { SeasonTrends } from './MetaFreshness';
import TournamentPrep from './TournamentPrep';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import PageLayout from '../../components/layout/PageLayout';
import PageHeader from '../../components/ui/PageHeader';

type MetaView = 'changes' | 'prep';
const views: { key: MetaView; label: string }[] = [
  { key: 'changes', label: 'Changes' },
  { key: 'prep', label: 'Tournament prep' },
];
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
  const requestedView = params.get('view');
  const view: MetaView = requestedView === 'prep' || (!requestedView && (params.has('prepSort') || params.has('eventTier'))) ? 'prep' : 'changes';
  const format = params.get('format') || 'standard', champion = params.get('champion') || '';
  const asOf = [index?.generatedAt, popularity?.generatedAt, events?.generatedAt, taxonomy?.generatedAt].filter((v): v is string => !!v).sort()[0] ?? '';
  const history = useMemo(()=>index && popularity && events && taxonomy ? seasonalMetaFreshness(index,popularity.entries,events.events,taxonomy,events.seasons,{format,champion},asOf):[],[index,popularity,events,taxonomy,format,champion,asOf]);
  const requested = params.get('period') ?? (params.get('days') === '90' ? '90' : history[0] ? `season-${history[0].season.id}` : '30');
  const selected = history.find(r=>`season-${r.season.id}`===requested);
  const period = selected ? requested : requested==='90'?'90':'30';
  const buildId = params.get('build') || '';
  const eventTiers = useMemo(() => {
    const requestedTiers = params.getAll('eventTier');
    return EVENT_CATEGORY_ORDER.filter(tier => requestedTiers.includes(tier));
  }, [params]);
  const requestedSortTier = params.get('prepSort') ?? '';
  const sortTier = (eventTiers.length ? eventTiers : EVENT_CATEGORY_ORDER).includes(requestedSortTier) ? requestedSortTier : '';
  const requestedTierMinimum = params.get('prepMinMatches') ?? '';
  const parsedTierMinimum = /^\d+$/.test(requestedTierMinimum) ? Number(requestedTierMinimum) : 0;
  const tierMinMatches = sortTier && Number.isSafeInteger(parsedTierMinimum) ? parsedTierMinimum : 0;
  const [selectedEventTiers, setSelectedEventTiers] = useOptimistic(eventTiers);
  const section = sections.includes(params.get('section') as typeof sections[number]) ? params.get('section') as typeof sections[number] : 'main';
  const report = useMemo(()=>index && popularity && events && taxonomy ? metaFreshness(index,popularity.entries,events.events,taxonomy,{format,champion,days:period==='90'?90:30,buildId,tournamentPrep:true,prepEventTiers:eventTiers,prepSortTier:sortTier,prepTierMinMatches:tierMinMatches,seasons:selected?{current:selected.season.id,previous:selected.previousSeason?.id}:undefined},asOf):undefined,[index,popularity,events,taxonomy,format,champion,period,buildId,eventTiers,sortTier,tierMinMatches,selected,asOf]);
  const formats = useMemo(()=>[...new Set(events?.events.map(e=>e.format) ?? ['standard'])].sort(),[events]);
  const champions = useMemo(()=>[...new Set(popularity?.entries.map(e=>e.championName).filter((n): n is string=>!!n) ?? [])].sort(),[popularity]);
  function change(key: string, value: string) {
    startTransition(() => setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (['format', 'champion', 'period'].includes(key)) next.delete('build');
      if (key === 'prepSort' && !value) next.delete('prepMinMatches');
      return next;
    }));
  }
  function changeEventTiers(tiers: string[]) {
    const selectedTiers = EVENT_CATEGORY_ORDER.filter(tier => tiers.includes(tier));
    startTransition(() => {
      setSelectedEventTiers(selectedTiers);
      setParams(previous => {
        const next = new URLSearchParams(previous);
        next.delete('eventTier');
        for (const tier of selectedTiers) next.append('eventTier', tier);
        if (selectedTiers.length && !selectedTiers.includes(next.get('prepSort') ?? '')) {
          next.delete('prepSort');
          next.delete('prepMinMatches');
        }
        return next;
      });
    });
  }
  const control = 'mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3';
  return <PageLayout width="fluid" className="space-y-6">
    <PageHeader title="Metagame" />
    <Tabs tabs={views} active={view} onChange={value => change('view', value)} baseId="metagame-view" label="Metagame view" variant="pill" wrap />
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
    {report && <div aria-busy={pending}>
      <TabPanel baseId="metagame-view" tab="prep" active={view}>
        <TournamentPrep prep={report.tournamentPrep} format={format} eventTiers={selectedEventTiers} onEventTiersChange={changeEventTiers} sortTier={sortTier} onSortTierChange={tier => change('prepSort', tier)}
          tierMinMatches={tierMinMatches} onTierMinimumChange={matches => change('prepMinMatches', matches ? String(matches) : '')} />
      </TabPanel>
      <TabPanel baseId="metagame-view" tab="changes" active={view} className="space-y-6">
        <div className="space-y-1 border-y border-ctp-surface0 py-3">
          <h2 className="font-semibold">{selected ? `${selected.season.name} vs. ${selected.previousSeason?.name ?? 'no earlier season'}` : `Last ${period} days vs. previous ${period} days`}</h2>
          <p className="text-xs text-ctp-subtext1">Previous → current · Public lists {report.previous.decks}/{report.previous.recorded} → {report.current.decks}/{report.current.recorded} · Build matches {report.previous.classified}/{report.previous.decks} → {report.current.classified}/{report.current.decks}</p>
          {!report.previous.decks && <p className="text-sm">No previous-period public decks to compare.</p>}
          {!report.current.decks && <p className="text-sm">No current-period public decks.</p>}
        </div>
        <MetaFreshness key={`${period}:${format}:${champion}`} report={report} buildId={buildId} onBuild={id=>change('build',id)} section={section} onSection={value=>change('section',value)}/>
        <SeasonTrends history={history} selected={selected?.season.id} onSelect={id=>change('period',`season-${id}`)}/>
      </TabPanel>
    </div>}
  </PageLayout>;
}
