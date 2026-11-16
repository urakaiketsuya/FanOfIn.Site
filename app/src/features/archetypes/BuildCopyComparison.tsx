import { useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { buildCopyDistributions, type ArchetypeCluster } from '@gatcg/shared';
import { useDeckCardIndexData } from './data';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import CardArtTile from '../../components/CardArtTile';
import Button from '../../components/ui/Button';
import { useCardsByNames } from '../events/useCardsByNames';

type Report = ReturnType<typeof buildCopyDistributions>;
export default function BuildCopyComparison({ builds }: { builds: ArchetypeCluster[] }) {
  const index = useDeckCardIndexData();
  const status = usePublishedDataStatus('analysis-deck-card-index', '/data/analysis/deck-card-index.json');
  const [result, setResult] = useState<{ builds: typeof builds; index: typeof index; report: Report }>();
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (index) startTransition(() => setResult({builds, index, report: buildCopyDistributions(builds, [index])})); }, [builds,index]);
  const report = result?.builds === builds && result.index === index ? result.report : undefined;
  return <section className="mt-8" aria-busy={pending}>
    <h2 className="text-xl font-semibold">Observed copies</h2>
    <PublishedSourceStatus label="Recorded lists" status={status} hasData={!!index} />
    {index && (!report || pending) && !status.error && <p role="status">Recalculating…</p>}
    {report?.map(section => <SectionCopies key={section.section + builds.map(b => b.id).join(',')} report={section} />)}
  </section>;
}
function SectionCopies({ report }: { report: Report[number] }) {
  const [limit, setLimit] = useState(6);
  const visible = useMemo(() => report.rows.slice(0,limit), [report,limit]);
  const names = useMemo(() => visible.map(r => r.name), [visible]);
  const cards = useCardsByNames(names);
  return <section className="mt-6">
    <h3 className="text-lg font-semibold">{report.section === 'main' ? 'Main' : 'Material'}</h3>
    <div className="mt-2 grid gap-2 sm:grid-cols-2">{report.populations.map(p => <p key={p.id} className="text-sm break-words"><strong>{p.name}</strong><span className="block text-ctp-subtext0">{p.available}/{p.requested} available lists</span></p>)}</div>
    {!report.rows.length && <p className="mt-3">No recorded {report.section === 'main' ? 'Main' : 'Material'} lists available.</p>}
    {visible.map(row => {
      const card = cards.get(row.name);
      const identity = <><CardArtTile card={card} name={row.name} /><span className="mt-2 block break-words text-sm font-medium">{row.name}</span></>;
      return <article key={row.name} className="mt-4 rounded-xl border border-ctp-surface1 p-3 sm:flex sm:gap-5">
        <div className="mb-4 w-28 shrink-0 sm:mb-0">{card ? <Link className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{identity}</Link> : identity}</div>
        <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-2">{row.values.map((value,i) => <div key={report.populations[i].id} className="min-w-0">
          <h4 className="break-words text-sm font-semibold">{report.populations[i].name}</h4>
          {!value.available ? <p className="text-sm text-ctp-subtext0">Unavailable</p> : <>
            <p className="my-2 text-sm"><strong>{(value.playing/value.available*100).toFixed(1)}%</strong> inclusion · {value.playing}/{value.available} lists</p>
            <div className="space-y-1">{value.buckets.map(bucket => <div key={bucket.quantity} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2 text-xs">
              <span>{bucket.quantity} {bucket.quantity === 1 ? 'copy' : 'copies'}</span><div aria-hidden="true" className="h-2 rounded bg-ctp-surface0"><div className="h-full rounded bg-ctp-teal" style={{width:`${bucket.share!*100}%`}} /></div><span className="text-right tabular-nums">{(bucket.share!*100).toFixed(1)}%</span>
            </div>)}</div>
          </>}
        </div>)}</div>
      </article>;
    })}
    {report.rows.length > limit && <Button className="mt-3" onClick={() => setLimit(n => n+6)}>Show more {report.section} cards ({limit}/{report.rows.length})</Button>}
  </section>;
}
