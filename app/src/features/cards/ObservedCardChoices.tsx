import { useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { observedCardChoices } from '@gatcg/shared';
import { useArchetypeTaxonomyData, useDeckCardIndexData } from '../archetypes/data';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import { useCardCatalog } from './useCardCatalog';
import Section from '../../components/ui/Section';
import Button from '../../components/ui/Button';
import PackageCardGrid from './PackageCardGrid';
import { referenceLink } from '../deck-analysis/reportModel';

type Rows = ReturnType<typeof observedCardChoices>;
export default function ObservedCardChoices({ name }: { name: string }) {
  const taxonomy = useArchetypeTaxonomyData(), index = useDeckCardIndexData();
  const cards = useCardCatalog(), byName = useMemo(() => new Map(cards.map(c => [c.name, c])), [cards]);
  const taxonomyStatus = usePublishedDataStatus('analysis-archetype-taxonomy', '/data/analysis/archetype-taxonomy.json');
  const indexStatus = usePublishedDataStatus('analysis-deck-card-index', '/data/analysis/deck-card-index.json');
  const [result, setResult] = useState<{ name: string; rows: Rows }>();
  const [limit, setLimit] = useState(3), [pending, startTransition] = useTransition();
  useEffect(() => { if (taxonomy && index) startTransition(() => { setResult({ name, rows: observedCardChoices(name, taxonomy.clusters, [index]) }); setLimit(3); }); }, [name, taxonomy, index]);
  const failed = [taxonomyStatus, indexStatus].filter(s => s.error);
  const rows = result?.name === name ? result.rows : null;
  return <Section title="Observed competing choices" className="mt-6">
    <p className="mt-2 text-xs text-ctp-subtext0">Same build · identical remaining Main + Material</p>
    {!!failed.length && <div role="alert"><p>Build choices could not be refreshed.</p><Button onClick={() => failed.forEach(s => s.retry())}>Retry choices</Button></div>}
    {(!rows || pending) && !failed.length && <p role="status">{pending ? 'Recalculating…' : 'Loading observed choices…'}</p>}
    {rows?.length === 0 && <p className="mt-3 text-sm">No exact one-card alternatives observed.</p>}
    {rows?.slice(0, limit).map(row => <article key={`${row.buildId}:${row.section}:${row.name}:${row.quantity}`} className="mt-4 rounded-xl border border-ctp-surface1 p-4">
      <Link className="inline-flex min-h-control items-center text-sm text-ctp-blue" to={`/archetypes/${row.buildId}`}>{row.buildName}</Link>
      <p className="text-sm">{row.section === 'main' ? 'Main' : 'Material'} · {row.quantity} {row.quantity === 1 ? 'copy' : 'copies'} each</p>
      <PackageCardGrid names={[name, row.name]} cardsByName={byName} captions={new Map([[name, `${(row.withCard.length / (row.withCard.length + row.alternative.length) * 100).toFixed(1)}% · ${row.withCard.length}/${row.withCard.length + row.alternative.length} matched lists`], [row.name, `${(row.alternative.length / (row.withCard.length + row.alternative.length) * 100).toFixed(1)}% · ${row.alternative.length}/${row.withCard.length + row.alternative.length} matched lists`]])} />
      <div className="mt-2 flex flex-wrap gap-3"><Link className="inline-flex min-h-control items-center text-sm text-ctp-blue underline" to={referenceLink(row.pair[0])}>View {name} list</Link><Link className="inline-flex min-h-control items-center text-sm text-ctp-blue underline" to={referenceLink(row.pair[1])}>View alternative list</Link></div>
    </article>)}
    {rows && rows.length > limit && <Button className="mt-3" onClick={() => setLimit(n => n+3)}>Show more choices</Button>}
  </Section>;
}
