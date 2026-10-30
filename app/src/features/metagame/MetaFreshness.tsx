import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { metaFreshness, type ArchetypeTaxonomyData, type DeckCardIndexData, type DeckPopularityIndexData, type OmnidexIndexData } from '@gatcg/shared';
import { useChampionCardImages } from '../players/useChampionCardImages';
import { CardIdentity, Bar } from '../events/EventReportVisuals';

const value = (n: number | null, unit = '%') => n === null ? 'Unavailable' : `${Number(n.toFixed(1))}${unit}`;
export default function MetaFreshness({ index, popularity, events, taxonomy, format, champion, days, asOf }: { index: DeckCardIndexData; popularity: DeckPopularityIndexData; events: OmnidexIndexData; taxonomy: ArchetypeTaxonomyData; format: string; champion: string; days: 30 | 90; asOf: string }) {
  const report = useMemo(() => metaFreshness(index,popularity.entries,events.events,taxonomy,{format,champion,days},asOf),[index,popularity,events,taxonomy,format,champion,days,asOf]);
  const buildShare = (n: number | null, period: typeof report.current) => `${n !== null && period.classified < period.decks ? '≥' : ''}${value(n)}`;
  const images = useChampionCardImages([...report.builds.slice(0,6).map(b=>b.champion), ...report.turnover.slice(0,6).map(r=>r.champion)]);
  return <section aria-label="Meta freshness" className="space-y-4">
    <div><h2 className="text-xl font-semibold">Meta freshness</h2><p className="text-sm text-ctp-subtext1">Last {days} days vs. previous {days} · {report.middle.slice(0,10)}–{asOf.slice(0,10)}</p></div>
    <div className="grid gap-3 sm:grid-cols-3">{[
      {title:'Top 5 build share',number:buildShare(report.current.concentration,report.current),detail:`Previous: ${buildShare(report.previous.concentration,report.previous)}`},
      {title:'Returning builds',number:buildShare(report.returning,report.current),detail:'Builds with 3+ previous registrations'},
      {title:'Card turnover',number:value(report.cardChange,' pp'),detail:`Average inclusion change · ${report.comparable} comparable decks`},
    ].map(row=><div key={row.title} className="rounded-xl bg-ctp-mantle p-4"><h3 className="text-sm">{row.title}</h3><strong className="my-2 block text-2xl">{row.number}</strong><p className="text-xs text-ctp-subtext1">{row.detail}</p></div>)}</div>
    <p className="text-sm text-ctp-subtext1">Public-list coverage: {report.current.decks}/{report.current.recorded} recent · {report.previous.decks}/{report.previous.recorded} previous. Build matches: {report.current.classified}/{report.current.decks} recent · {report.previous.classified}/{report.previous.decks} previous.</p>
    {!report.current.decks && <p>No public decks in this period.</p>}
    {!report.previous.decks && <p>No previous-period decks to compare.</p>}
    {!!report.builds.length && <><h3 className="font-semibold">Most played builds</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{report.builds.slice(0,6).map(build=><article key={build.id} className="min-w-0 space-y-3 rounded-xl border border-ctp-surface0 p-4"><CardIdentity name={build.champion} card={images.get(build.champion)}/><Link className="flex min-h-control items-center break-words text-sm font-semibold text-ctp-blue underline" to={`/archetypes/${build.id}`}>{build.name}</Link><div className="flex flex-wrap justify-between gap-2"><strong>{value(build.share)}</strong><span>{build.count}/{report.current.decks} decks</span></div><Bar value={build.share} label={`${build.name} recent share`} blue/><p className="text-xs text-ctp-subtext1">Previous {value(build.previousShare)}{build.previousShare !== null && ` · ${build.share-build.previousShare>=0?'+':''}${Number((build.share-build.previousShare).toFixed(1))} pp`}</p></article>)}</div></>}
    <h3 className="font-semibold">Card turnover by champion</h3>
    {!report.turnover.length && <p className="text-sm text-ctp-subtext1">Needs 3 public decks per champion in each period.</p>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{report.turnover.slice(0,6).map(row=><article key={row.champion} className="space-y-3 rounded-xl border border-ctp-surface0 p-4"><CardIdentity name={row.champion} card={images.get(row.champion)}/><strong className="block">{value(row.change,' pp')} inclusion change</strong><p className="text-xs text-ctp-subtext1">{row.current} recent · {row.previous} previous decks</p></article>)}</div>
  </section>;
}
