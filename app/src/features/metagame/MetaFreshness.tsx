import { useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { metaFreshness, seasonalMetaFreshness } from '@gatcg/shared';
import { useChampionCardImages } from '../players/useChampionCardImages';
import { useCardsByNames } from '../events/useCardsByNames';
import { CardIdentity } from '../events/EventReportVisuals';
import Button from '../../components/ui/Button';
import Tabs, { TabPanel } from '../../components/ui/Tabs';

const metricValue = (n: number | null, unit = '%') => n === null ? 'Unavailable' : `${Number(n.toFixed(1))}${unit}`;
type Report = ReturnType<typeof metaFreshness>;
type History = ReturnType<typeof seasonalMetaFreshness>;

export function SeasonTrends({ history, selected, onSelect }: { history: History; selected: number | undefined; onSelect: (id: number) => void }) {
  const rows = [...history].reverse();
  return <section aria-label="Meta trends" className="space-y-3">
    <h2 className="text-xl font-semibold">How is the meta changing?</h2>
    <p className="text-xs text-ctp-subtext1">Each season vs. its predecessor · build shares are observed minimums</p>
    <div className="grid gap-3 lg:grid-cols-3">{[
      { title: 'Returning builds', unit: '%', max: 100, read: (r: Report) => r.returning },
      { title: 'Top 5 build share', unit: '%', max: 100, read: (r: Report) => r.current.concentration },
      { title: 'Card turnover', unit: ' pp', max: Math.max(10, ...rows.map(r => r.report.cardChange ?? 0)), read: (r: Report) => r.cardChange },
    ].map(metric => <figure className="min-w-0 rounded-xl bg-ctp-mantle p-3" key={metric.title}>
      <figcaption className="text-sm font-semibold">{metric.title}</figcaption>
      <svg viewBox="0 0 360 155" className="w-full" role="img" aria-label={`${metric.title} by season. ${rows.map(r => `${r.season.name}: ${metricValue(metric.read(r.report),metric.unit)}`).join('; ')}`}>
        {[0, .5, 1].map(t => <g key={t}><line x1="35" x2="340" y1={115-t*90} y2={115-t*90} className="stroke-ctp-surface1"/><text x="30" y={119-t*90} textAnchor="end" fontSize="10" className="fill-ctp-subtext1">{Number((metric.max*t).toFixed(1))}</text></g>)}
        {rows.map((r,i) => {
          const x = 45 + i * 280 / Math.max(1,rows.length-1), n = metric.read(r.report), prior = i ? metric.read(rows[i-1].report) : null;
          const y = n === null ? 115 : 115-n/metric.max*90;
          return <g key={r.season.id}>
            {r.season.id === selected && <line x1={x} x2={x} y1="15" y2="120" className="stroke-ctp-blue" strokeDasharray="3 3"/>}
            {n !== null && prior !== null && <line x1={45+(i-1)*280/Math.max(1,rows.length-1)} y1={115-prior/metric.max*90} x2={x} y2={y} className="stroke-ctp-blue" strokeWidth="2"/>}
            {n !== null && <circle cx={x} cy={y} r={r.season.id===selected?5:3} className="fill-ctp-blue"/>}
            <text x={x} y="140" textAnchor="middle" fontSize="11" className="fill-ctp-subtext1">S{r.season.id}</text>
          </g>;
        })}
      </svg>
      <p className="text-xs text-ctp-subtext1">{selected ? `${history.find(r=>r.season.id===selected)?.season.name}: ${metricValue(metric.read(history.find(r=>r.season.id===selected)!.report),metric.unit)}` : `Scale: 0–${metric.max}${metric.unit}`}</p>
    </figure>)}</div>
    <div className="flex flex-wrap gap-2" aria-label="Choose a season">{rows.map(r=><Button variant={selected===r.season.id?'primary':'secondary'} key={r.season.id} aria-pressed={selected===r.season.id} onClick={()=>onSelect(r.season.id)}>S{r.season.id} · {r.season.name}{r.inProgress ? ' · In progress' : ''}</Button>)}</div>
    {!rows.length && <p>No season observations available.</p>}
  </section>;
}

function ChangePlot({ before, after, maximum = 100 }: { before: number | null; after: number | null; maximum?: number }) {
  return <div className="space-y-1">
    <p className="text-sm">{metricValue(before)} → <strong>{metricValue(after)}</strong><span className="float-right">{before !== null && after !== null ? `${after-before>0?'+':''}${metricValue(after-before,' pp')}` : 'Unavailable'}</span></p>
    <svg viewBox="0 0 300 20" className="h-5 w-full" aria-hidden="true">
      <line x1="5" x2="295" y1="10" y2="10" className="stroke-ctp-surface1"/>
      {before !== null && after !== null && <line x1={5+before/maximum*290} x2={5+after/maximum*290} y1="10" y2="10" className="stroke-ctp-blue" strokeWidth="3"/>}
      {before !== null && <circle cx={5+before/maximum*290} cy="10" r="4" className="fill-ctp-base stroke-ctp-subtext1" strokeWidth="2"/>}
      {after !== null && <circle cx={5+after/maximum*290} cy="10" r="4" className="fill-ctp-blue"/>}
    </svg>
  </div>;
}

export default function MetaFreshness({ report, buildId, onBuild, section, onSection }: { report: Report; buildId: string; onBuild: (id: string) => void; section: 'main'|'material'|'sideboard'; onSection: (section: string) => void }) {
  const [buildLimit,setBuildLimit] = useState(6), [cardLimit,setCardLimit] = useState(12);
  const cardHeading = useRef<HTMLHeadingElement>(null);
  const buildMaximum = Math.max(5, Math.ceil(Math.max(0,...report.buildChanges.flatMap(b=>[b.current ?? 0,b.previous ?? 0]))/5)*5);
  const selectBuild = (id: string) => { onBuild(id); cardHeading.current?.focus(); cardHeading.current?.scrollIntoView({block:'start'}); };
  const builds = report.buildChanges.slice(0,buildLimit);
  const selected = report.buildChanges.find(b=>b.id===buildId);
  const images = useChampionCardImages(builds.map(b=>b.champion));
  const rows = report.cardChanges.find(s=>s.section===section)!.rows;
  const names = useMemo(()=>rows.slice(0,cardLimit).map(r=>r.name),[rows,cardLimit]);
  const cards = useCardsByNames(names);
  return <>
    <section aria-label="Build changes" className="space-y-3">
      <h2 className="text-xl font-semibold">Which builds changed?</h2>
      <p className="text-xs text-ctp-subtext1">Largest share changes · previous ○ → current ● · scale 0–{buildMaximum}%</p>
      {!builds.length && <p>No classified builds in these periods.</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{builds.map(b=><article key={b.id} className={`min-w-0 space-y-3 rounded-xl border p-4 ${buildId===b.id?'border-ctp-blue bg-ctp-blue/5':'border-ctp-surface0'}`}>
        <CardIdentity name={b.champion} card={images.get(b.champion)}/>
        <Link to={`/archetypes/${b.id}`} className="flex min-h-control items-center text-sm font-semibold text-ctp-blue underline">{b.name}</Link>
        <ChangePlot before={b.previous} after={b.current} maximum={buildMaximum}/>
        <Button aria-pressed={buildId===b.id} onClick={()=>selectBuild(buildId===b.id?'':b.id)}>{buildId===b.id?'Showing card changes':'Show card changes'}</Button>
      </article>)}</div>
      {builds.length<report.buildChanges.length && <Button onClick={()=>setBuildLimit(n=>n+12)}>Show more builds</Button>}
    </section>
    <section aria-label="Card changes" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 ref={cardHeading} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold focus-visible:outline-2 focus-visible:outline-ctp-blue">Which cards changed?</h2>{buildId && <Button onClick={()=>onBuild('')}>Clear build</Button>}</div>
      <p className="text-sm text-ctp-subtext1">{selected?.name ?? (buildId ? 'Selected build has no observations in this scope' : 'All builds in scope')} · {report.cardDecks.previous} → {report.cardDecks.current} public decks</p>
      <Tabs baseId="meta-cards" label="Card section" tabs={['main','material','sideboard'].map(key=>({key,label:key[0].toUpperCase()+key.slice(1)}))} active={section} onChange={onSection} wrap/>
      <TabPanel baseId="meta-cards" tab={section} active={section} className="space-y-3">
        <p className="text-xs text-ctp-subtext1">Inclusion: previous → current · change bars: −100 to +100 pp</p>
        {section==='sideboard' && <p className="text-xs text-ctp-subtext1">With sideboards: {report.sideboards.previous} → {report.sideboards.current} decks</p>}
        {!rows.length && <p>No cards in this scope.</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.slice(0,cardLimit).map(r=><article key={r.name} className="min-w-0 space-y-3 rounded-xl border border-ctp-surface0 p-4"><CardIdentity name={r.name} card={cards.get(r.name)}/><ChangePlot before={r.previous} after={r.current}/>{r.change !== null && <div aria-hidden="true" className="relative h-2 rounded bg-ctp-surface0"><div className="absolute left-1/2 h-full border-l border-ctp-subtext1"/><div className="absolute h-full rounded bg-ctp-blue" style={{left:`${r.change<0?50+r.change/2:50}%`,width:`${Math.abs(r.change)/2}%`}}/></div>}</article>)}</div>
        {cardLimit<rows.length && <Button onClick={()=>setCardLimit(n=>n+12)}>Show more cards</Button>}
      </TabPanel>
    </section>
  </>;
}
