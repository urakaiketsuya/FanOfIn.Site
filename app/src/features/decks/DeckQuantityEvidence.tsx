import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { shortHash, MIN_QUANTITY_EVIDENCE_LISTS, type Card, type DeckDetailData, type DeckFormat, type OmnidexDecklist } from '@gatcg/shared';
import { useCardCatalog } from '../cards/useCardCatalog';
import { useArchetypeTaxonomyData } from '../archetypes/data';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import Button from '../../components/ui/Button';
import DeckBuildSummary from './DeckBuildSummary';
import { useDeckBuildComparison } from './useDeckBuildComparison';
import { buildComparisonState } from './buildComparisonHandoff';

type Props = { expectedBuildId?: string; decklist: Pick<OmnidexDecklist, 'main' | 'material'>; format?: DeckFormat; championName?: string | null; cardsByName: Map<string, Card> };
function Partition({ champion, onData, onFailure }: { champion: string; onData: (champion: string, data: DeckDetailData) => void; onFailure: (champion: string, failed: boolean) => void }) {
  const hash = shortHash(champion), key = `champion-decks-${hash}`, url = `/data/analysis/champion-decks/${hash}.json`;
  const data = usePublishedData<DeckDetailData>(key, url);
  const status = usePublishedDataStatus(key, url);
  useEffect(() => onFailure(champion, !!status.error), [champion, status.error, onFailure]);
  useEffect(() => { if (data) onData(champion, data); }, [champion, data, onData]);
  return status.error ? <p role="alert" className="text-sm text-ctp-yellow">{champion} lists could not be refreshed. <Button onClick={status.retry}>Retry lists</Button></p> : null;
}
function Evidence({ decklist, championName, cardsByName, expectedBuildId }: Props & { championName: string }) {
  // Page callers may only resolve the selected deck. References need the whole catalog.
  const catalog = useCardCatalog();
  const comparisonCards = useMemo(() => new Map([...cardsByName, ...catalog.map(card => [card.name, card] as const)]), [cardsByName, catalog]);
  const taxonomy = useArchetypeTaxonomyData();
  const taxonomyStatus = usePublishedDataStatus('analysis-archetype-taxonomy', '/data/analysis/archetype-taxonomy.json');
  const [partitions, setPartitions] = useState<Map<string, DeckDetailData>>(new Map());
  const [failures, setFailures] = useState<Set<string>>(new Set());
  const onFailure = useCallback((name: string, failed: boolean) => setFailures(previous => {
    if (previous.has(name) === failed) return previous;
    const next = new Set(previous); if (failed) next.add(name); else next.delete(name); return next;
  }), []);
  const onData = useCallback((name: string, data: DeckDetailData) => setPartitions(previous => previous.get(name) === data ? previous : new Map(previous).set(name, data)), []);
  const target = useMemo(() => ({ main: decklist.main.map(line => ({ name: line.card, quantity: line.quantity })), material: decklist.material.map(line => ({ name: line.card, quantity: line.quantity })) }), [decklist]);
  const input = useMemo(() => taxonomy && partitions.has(championName)
    ? { target, clusters: taxonomy.clusters, partitions, cards: comparisonCards } : null,
  [target, taxonomy, partitions, championName, comparisonCards]);
  const { result: computed, pending, error, retry } = useDeckBuildComparison(input);
  const report = computed?.report;
  const champions = [...new Set([championName, ...(report?.champions ?? [])])];
  return <div aria-busy={pending} className="space-y-3">
    {champions.map(name => <Partition key={name} champion={name} onData={onData} onFailure={onFailure} />)}
    {taxonomyStatus.error && <p role="alert" className="text-sm text-ctp-yellow">Build assignments could not be refreshed. <Button onClick={taxonomyStatus.retry}>Retry builds</Button></p>}
    {error ? <p role="alert" className="text-sm text-ctp-yellow">{error} <Button onClick={retry}>Retry comparison</Button></p> : !report || report.status === 'loading' ? <p role="status" className="text-sm text-ctp-subtext1">{failures.size || taxonomyStatus.error ? 'Comparable lists unavailable.' : 'Loading comparable lists…'}</p> : expectedBuildId && report.cluster?.id !== expectedBuildId ? <p role="status" className="text-sm text-ctp-subtext1">This deck no longer has a matching assignment in this build.</p> : <>
      {report.cluster && <div>{!expectedBuildId && <Link className="inline-flex min-h-control items-center text-sm font-medium text-ctp-blue" to={`/archetypes/${report.cluster.id}`} state={buildComparisonState(report.cluster.id, championName, decklist)}>{report.cluster.name}</Link>}<p className="mt-1 text-xs text-ctp-subtext1">Standard tournaments · all recorded events{report.period && <span className="mt-1 block">{report.period.first} – {report.period.last}</span>}</p></div>}
      {report.status === 'unmatched' || report.status === 'ambiguous' ? <p role="status" className="text-sm text-ctp-subtext1">{report.status === 'ambiguous' ? 'This exact list has conflicting published build assignments.' : 'No published build assignment for this exact list.'}</p> : <>
        <p role="status" className="text-xs text-ctp-subtext1">{report.lists} distinct lists · {report.sightings} sightings · this list excluded{pending ? ' · Recalculating…' : ''}</p>
        {report.missing > 0 && <p className="text-xs text-ctp-yellow">{report.missing} assigned lists unavailable.</p>}
        {report.status === 'sparse' ? <p role="status" className="text-sm text-ctp-subtext1">At least {MIN_QUANTITY_EVIDENCE_LISTS} other distinct lists needed.</p> : <>
          <DeckBuildSummary comparison={computed!.comparison} cardsByName={comparisonCards} />
        </>}
      </>}
    </>}
  </div>;
}
export default function DeckQuantityEvidence(props: Props) {
  return <section aria-label="Your deck versus build" className="border-t border-ctp-surface1 pt-3"><h3 className="mb-3 text-sm font-semibold">Your deck versus build</h3>
    {props.format !== 'STANDARD' ? <p className="text-sm text-ctp-subtext1">Comparable build data is available for Standard tournament lists.</p> : !props.championName ? <p className="text-sm text-ctp-subtext1">Champion needed to find a published build.</p> : <Evidence key={props.championName} {...props} championName={props.championName} />}
  </section>;
}
