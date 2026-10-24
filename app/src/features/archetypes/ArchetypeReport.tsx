import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { archetypeReport, shortHash, type ArchetypeCluster, type DeckDetailData, type ReportDistribution } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import { useCardCatalog } from '../cards/useCardCatalog';
import CardArtTile from '../../components/CardArtTile';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';

type Report = ReturnType<typeof archetypeReport>;
const number = (n: number) => n > 0 && n < .1 ? '<0.1' : Number(n.toFixed(1)).toString();
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

/** Load every champion partition: a published build may span several champions. */
function Partition({ champion, onData }: { champion: string; onData: (name: string, data: DeckDetailData) => void }) {
  const hash = shortHash(champion), key = `champion-decks-${hash}`, url = `/data/analysis/champion-decks/${hash}.json`;
  const data = usePublishedData<DeckDetailData>(key, url);
  const status = usePublishedDataStatus(key, url);
  useEffect(() => { if (data) onData(champion, data); }, [champion, data, onData]);
  return status.error ? <Panel tone="warning"><p role="alert">{champion} decklists could not be refreshed.</p><Button onClick={status.retry}>Retry decklists</Button></Panel> : null;
}

function Interval({ value, scale, probability = false }: { value: ReportDistribution; scale: number; probability?: boolean }) {
  const display = probability ? percent : number;
  return <div>
    <p className="flex flex-wrap justify-between gap-2 text-xs"><strong>{display(value.median)} median</strong><span>{display(value.low)}–{display(value.high)} middle 50%</span></p>
    <svg viewBox="0 0 300 24" className="w-full" aria-hidden="true"><line x1="8" x2="292" y1="12" y2="12" className="stroke-ctp-surface1" /><line x1={8 + value.low / scale * 284} x2={8 + value.high / scale * 284} y1="12" y2="12" strokeWidth="4" className="stroke-ctp-blue" /><circle cx={8 + value.median / scale * 284} cy="12" r="4" className="fill-ctp-text" /></svg>
    <p className="text-xs text-ctp-subtext0">{display(value.mean)} average</p>
  </div>;
}

export default function ArchetypeReport({ cluster }: { cluster: ArchetypeCluster }) {
  const champions = useMemo(() => [...new Set([cluster.championName, ...cluster.championBreakdown.map(row => row.championName)])], [cluster]);
  const [partitions, setPartitions] = useState<Map<string, DeckDetailData>>(new Map());
  const onData = useCallback((name: string, data: DeckDetailData) => setPartitions(previous => previous.get(name) === data ? previous : new Map(previous).set(name, data)), []);
  const catalog = useCardCatalog();
  const cards = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const [report, setReport] = useState<Report | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = champions.every(name => partitions.has(name));
  useEffect(() => {
    if (ready) startTransition(() => setReport(archetypeReport(cluster.deckIds, champions.map(name => partitions.get(name)!.cards), cards)));
  }, [ready, cluster, champions, partitions, cards]);
  const [allCards, setAllCards] = useState(false);
  const [allAccess, setAllAccess] = useState(false);
  const cardPreview = (name: string) => {
    const card = cards.get(name), content = <><CardArtTile name={name} card={card} /><span className="mt-2 block break-words text-xs font-medium">{name}</span></>;
    return card ? <Link className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{content}</Link> : content;
  };
  const coreMain = report?.cards.filter(card => card.section === 'main' && card.inclusion >= .9) ?? [];
  const accessCards = coreMain.length ? coreMain : report?.cards.filter(card => card.section === 'main').slice(0, 8) ?? [];
  return <section aria-label="Archetype report" aria-busy={pending} className="mt-6 space-y-5">
    <div><h2 className="text-xl font-semibold">Archetype report</h2><p className="mt-1 text-sm text-ctp-subtext0">{cluster.name} · Standard tournament lists · Main + Material</p></div>
    {champions.map(champion => <Partition key={champion} champion={champion} onData={onData} />)}
    {!ready || !report ? <p role="status">Waiting for build lists · {partitions.size}/{champions.length} champion sources available</p> : !report.listed ? <p role="status">No Main decklists available for this build.</p> : <>
      <p role="status" className="text-sm text-ctp-subtext0">{report.listed}/{report.requested} recorded lists available · {pending ? 'Recalculating…' : 'All recorded events'}</p>
      {report.missingNames.length > 0 && <p role="status" className="text-sm text-ctp-yellow">Card data incomplete · composition covers {report.complete}/{report.listed} lists. Unresolved: {report.missingNames.join(', ')}</p>}
      <Panel><h3 className="text-lg font-semibold">Typical deck composition</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{[{ label: 'Main deck size', value: report.mainSize }, { label: 'Material size', value: report.materialSize }].map(({ label, value }) => <div key={label}><h4 className="mb-2 text-sm font-medium">{label}</h4><Interval value={value} scale={Math.max(1, value.high)} /></div>)}</div>
        {report.complete === 0 ? <p className="mt-4" role="status">Composition unavailable until card data resolves.</p> : <div className="mt-6 grid gap-6 sm:grid-cols-2">{['Type · ', 'Element · ', 'Reserve · ', 'Printed Floating Memory'].map(group => {
          const rows = report.composition.filter(row => row.label.startsWith(group));
          const scale = Math.max(1, ...rows.map(row => row.high));
          return <section key={group}><h4 className="mb-3 font-semibold">{group === 'Type · ' ? 'Main card types' : group === 'Element · ' ? 'Main elements' : group === 'Reserve · ' ? 'Main Reserve-cost curve' : group}</h4><div className="space-y-4">{rows.map(row => <div key={row.label}><p className="mb-1 text-xs text-ctp-subtext1">{group === 'Printed Floating Memory' ? 'Main copies with printed keyword' : row.label.slice(group.length)}</p><Interval value={row} scale={scale} /></div>)}</div><p className="mt-2 text-xs text-ctp-subtext0">Shared scale: 0–{number(scale)} copies</p></section>;
        })}</div>}
      </Panel>
      <Panel><h3 className="text-lg font-semibold">Core cards and flexible choices</h3><p className="mt-1 text-xs text-ctp-subtext0">Core: present in at least 90% of available lists · copies among lists playing the card</p>
        {(['main', 'material'] as const).map(section => <section key={section} className="mt-5"><h4 className="font-semibold">{section === 'main' ? 'Main' : 'Material'}</h4><div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{report.cards.filter(card => card.section === section).slice(0, allCards ? undefined : 12).map(card => <article key={card.name} className="min-w-0">{cardPreview(card.name)}<p className="mt-2 text-xs font-semibold">{card.inclusion >= .9 ? 'Core' : 'Flexible'} · {percent(card.inclusion)} inclusion</p><p className="mt-1 text-xs text-ctp-subtext0">{card.lists}/{report.listed} lists · {number(card.copies.median)} typical copies</p><p className="mt-1 text-xs text-ctp-subtext0">{number(card.copies.low)}–{number(card.copies.high)} middle 50% · {number(card.copies.mean)} average</p></article>)}</div></section>)}
        {(['main', 'material'] as const).some(section => report.cards.filter(card => card.section === section).length > 12) && <Button className="mt-4" aria-expanded={allCards} onClick={() => setAllCards(value => !value)}>{allCards ? 'Show most common cards' : 'Show all cards'}</Button>}
      </Panel>
      <Panel><h3 className="text-lg font-semibold">Draw consistency across builds</h3><p className="mt-1 text-xs text-ctp-subtext0">{coreMain.length ? 'Core Main cards' : 'Most common Main cards'} · find at least one · all {report.listed} available lists, including lists without the card</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">{accessCards.slice(0, allAccess ? undefined : 8).map(card => <article key={card.name} className="min-w-0"><div className="max-w-32">{cardPreview(card.name)}</div><div className="mt-3 space-y-3">{card.access.map(point => <div key={point.seen}><p className="mb-1 text-xs font-semibold">{point.seen} cards seen</p><Interval value={point} scale={1} probability /></div>)}</div></article>)}</div>
        {accessCards.length > 8 && <Button className="mt-4" aria-expanded={allAccess} onClick={() => setAllAccess(value => !value)}>{allAccess ? 'Show first eight cards' : 'Show all core-card odds'}</Button>}
      </Panel>
    </>}
  </section>;
}
