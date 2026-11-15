import { useEffect, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { cardBuildCopies } from '@gatcg/shared';
import { useArchetypeTaxonomyData, useDeckCardIndexData } from '../archetypes/data';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import Section from '../../components/ui/Section';
import Button from '../../components/ui/Button';
import { CardCopyDistribution } from './CardInfoPanel';

type Rows = ReturnType<typeof cardBuildCopies>;
export default function CardBuildCopies({ name }: { name: string }) {
  const taxonomy = useArchetypeTaxonomyData();
  const index = useDeckCardIndexData();
  const taxonomyStatus = usePublishedDataStatus('analysis-archetype-taxonomy', '/data/analysis/archetype-taxonomy.json');
  const indexStatus = usePublishedDataStatus('analysis-deck-card-index', '/data/analysis/deck-card-index.json');
  const [result, setResult] = useState<{ name: string; rows: Rows }>();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!taxonomy || !index?.cardNames) return;
    startTransition(() => setResult({ name, rows: cardBuildCopies(name, taxonomy.clusters, [index]) }));
  }, [name, taxonomy, index]);
  const failed = [taxonomyStatus, indexStatus].filter(status => status.error);
  return <Section title="Copies by build" className="mt-6">
    {failed.length > 0 && <div role="alert" className="my-3"><p>Build data could not be refreshed.</p><Button onClick={() => failed.forEach(status => status.retry())}>Retry build data</Button></div>}
    {pending && <p role="status">Recalculating…</p>}
    {!result || result.name !== name ? (!failed.length && <p role="status">Loading build distributions…</p>) : <CardBuildCopyResults rows={result.rows} />}
  </Section>;
}

export function CardBuildCopyResults({ rows }: { rows: Rows }) {
  const [all, setAll] = useState(false);
  const played = rows.filter(row => row.playing > 0);
  if (!played.length) return <p className="mt-2 text-sm text-ctp-subtext0">{rows.some(row => row.available) ? 'No available build lists play this card in Main or Material.' : 'Build distributions unavailable.'}</p>;
  return <>
    <div className="mt-3 grid gap-4 md:grid-cols-2">{played.slice(0, all ? undefined : 6).map(row => <article key={row.id} className="min-w-0 rounded-xl border border-ctp-surface1 p-4">
      <h3 className="font-semibold"><Link className="inline-flex min-h-12 items-center text-ctp-blue focus-visible:outline-2" to={`/archetypes/${row.id}`}>{row.name}</Link></h3>
      <p className="text-lg font-semibold">{((row.inclusion ?? 0) * 100).toFixed(1)}% <span className="text-sm font-normal">inclusion</span></p>
      <p className="text-xs text-ctp-subtext0">{row.playing}/{row.available} available lists · {row.available}/{row.requested} recorded</p>
      <CardCopyDistribution buckets={row.buckets} />
    </article>)}</div>
    {played.length > 6 && <Button className="mt-3" onClick={() => setAll(value => !value)} aria-expanded={all}>{all ? 'Show fewer builds' : `Show all ${played.length} builds`}</Button>}
  </>;
}
