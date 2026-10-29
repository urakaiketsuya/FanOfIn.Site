import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { deckQuantityEvidence, shortHash, MIN_QUANTITY_EVIDENCE_LISTS, type Card, type DeckDetailData, type DeckFormat, type OmnidexDecklist } from '@gatcg/shared';
import { useArchetypeTaxonomyData } from '../archetypes/data';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import CardArtTile from '../../components/CardArtTile';
import Button from '../../components/ui/Button';

type Props = { decklist: Pick<OmnidexDecklist, 'main' | 'material'>; format?: DeckFormat; championName?: string | null; cardsByName: Map<string, Card> };
function Partition({ champion, onData, onFailure }: { champion: string; onData: (champion: string, data: DeckDetailData) => void; onFailure: (champion: string, failed: boolean) => void }) {
  const hash = shortHash(champion), key = `champion-decks-${hash}`, url = `/data/analysis/champion-decks/${hash}.json`;
  const data = usePublishedData<DeckDetailData>(key, url);
  const status = usePublishedDataStatus(key, url);
  useEffect(() => onFailure(champion, !!status.error), [champion, status.error, onFailure]);
  useEffect(() => { if (data) onData(champion, data); }, [champion, data, onData]);
  return status.error ? <p role="alert" className="text-sm text-ctp-yellow">{champion} lists could not be refreshed. <Button onClick={status.retry}>Retry lists</Button></p> : null;
}
function Evidence({ decklist, championName, cardsByName }: Props & { championName: string }) {
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
  const [computed, setComputed] = useState<{ target: typeof target; report: ReturnType<typeof deckQuantityEvidence> } | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (taxonomy && partitions.has(championName)) startTransition(() => setComputed({ target, report: deckQuantityEvidence(target, 'STANDARD', taxonomy.clusters, partitions) }));
  }, [target, taxonomy, partitions, championName]);
  const report = computed?.target === target ? computed.report : null;
  const champions = [...new Set([championName, ...(report?.champions ?? [])])];
  const [all, setAll] = useState(false);
  return <div aria-busy={pending} className="space-y-3">
    {champions.map(name => <Partition key={name} champion={name} onData={onData} onFailure={onFailure} />)}
    {taxonomyStatus.error && <p role="alert" className="text-sm text-ctp-yellow">Build assignments could not be refreshed. <Button onClick={taxonomyStatus.retry}>Retry builds</Button></p>}
    {!report || report.status === 'loading' ? <p role="status" className="text-sm text-ctp-subtext1">{failures.size || taxonomyStatus.error ? 'Comparable lists unavailable.' : 'Loading comparable lists…'}</p> : <>
      {report.cluster && <div><Link className="inline-flex min-h-control items-center text-sm font-medium text-ctp-blue" to={`/archetypes/${report.cluster.id}`}>{report.cluster.name}</Link><p className="mt-1 text-xs text-ctp-subtext1">Standard tournaments · all recorded events{report.period && <span className="mt-1 block">{report.period.first} – {report.period.last}</span>}</p></div>}
      {report.status === 'unmatched' || report.status === 'ambiguous' ? <p role="status" className="text-sm text-ctp-subtext1">{report.status === 'ambiguous' ? 'This exact list has conflicting published build assignments.' : 'No published build assignment for this exact list.'}</p> : <>
        <p role="status" className="text-xs text-ctp-subtext1">{report.lists} distinct lists · {report.sightings} sightings · this list excluded{pending ? ' · Recalculating…' : ''}</p>
        {report.missing > 0 && <p className="text-xs text-ctp-yellow">{report.missing} assigned lists unavailable.</p>}
        {report.status === 'sparse' ? <p role="status" className="text-sm text-ctp-subtext1">At least {MIN_QUANTITY_EVIDENCE_LISTS} other distinct lists needed.</p> : <>
          <div className="grid gap-4 sm:grid-cols-2">{report.rows.slice(0, all ? undefined : 6).map(row => {
            const card = cardsByName.get(row.name);
            const visual = <><CardArtTile card={card} name={row.name} cornerBadge={`Your list ×${row.current}`} artworkOnly /><span className="mt-1 block text-sm font-medium">{row.name}</span></>;
            return <article key={row.name} className="min-w-0 rounded-lg border border-ctp-surface1 p-3">
              {card ? <Link className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{visual}</Link> : visual}
              <p className="my-2 text-xs text-ctp-subtext1">Included in {row.included}/{report.lists} lists</p>
              <div className="space-y-1">{row.buckets.map(bucket => <div key={bucket.quantity} className="grid grid-cols-[2rem_minmax(0,1fr)_5rem] items-center gap-2 text-xs"><span>{bucket.quantity}×</span><span aria-hidden="true" className="h-2 rounded bg-ctp-surface0"><span className="block h-2 rounded bg-ctp-blue" style={{ width: `${bucket.lists / report.lists * 100}%` }} /></span><span className="text-right tabular-nums">{bucket.lists} · {(bucket.lists / report.lists * 100).toFixed(1)}%</span></div>)}</div>
            </article>;
          })}</div>
          {report.rows.length > 6 && <Button aria-expanded={all} onClick={() => setAll(value => !value)}>{all ? 'Show fewer cards' : `Show all ${report.rows.length} cards`}</Button>}
        </>}
      </>}
    </>}
  </div>;
}
export default function DeckQuantityEvidence(props: Props) {
  return <section aria-label="Observed copy counts" className="border-t border-ctp-surface1 pt-3"><h3 className="mb-3 text-sm font-semibold">Observed copy counts</h3>
    {props.format !== 'STANDARD' ? <p className="text-sm text-ctp-subtext1">Comparable build data is available for Standard tournament lists.</p> : !props.championName ? <p className="text-sm text-ctp-subtext1">Champion needed to find a published build.</p> : <Evidence key={props.championName} {...props} championName={props.championName} />}
  </section>;
}
