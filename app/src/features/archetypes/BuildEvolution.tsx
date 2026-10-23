import { useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { buildEvolution, compareEvolutionSeasons, shortHash, type ArchetypeCluster, type Card, type DeckDetailData, type EvolutionSeason, type OmnidexIndexData } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import { useCardsByNames } from '../events/useCardsByNames';
import CardArtTile from '../../components/CardArtTile';
import DisclosureChevron from '../../components/DisclosureChevron';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';

const percent = (value: number) => value > 0 && value < 0.001 ? '<0.1%' : `${(value * 100).toFixed(1)}%`;

function CardPreview({ name, card, children }: { name: string; card?: Card; children?: React.ReactNode }) {
  const content = <><CardArtTile name={name} card={card} /><span className="mt-2 block break-words text-xs font-medium">{name}</span></>;
  return <div className="min-w-0">{card ? <Link className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{content}</Link> : content}<div className="mt-1 text-xs text-ctp-subtext0">{children}</div></div>;
}

export default function BuildEvolution({ cluster, builds, familyName }: { cluster: ArchetypeCluster; builds: ArchetypeCluster[]; familyName: string }) {
  const hash = shortHash(cluster.championName);
  const key = `champion-decks-${hash}`;
  const url = `/data/analysis/champion-decks/${hash}.json`;
  const detail = usePublishedData<DeckDetailData>(key, url);
  const detailStatus = usePublishedDataStatus(key, url);
  const events = usePublishedData<OmnidexIndexData>('omnidex-browse', '/data/omnidex/browse.json');
  const eventStatus = usePublishedDataStatus('omnidex-browse', '/data/omnidex/browse.json');
  const [seasons, setSeasons] = useState<EvolutionSeason[]>([]);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (detail && events) startTransition(() => setSeasons(buildEvolution(builds, detail.cards, detail.popularity, events.events)));
  }, [builds, detail, events]);
  const available = seasons.filter(season => season.listedCount > 0);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const before = available.find(season => season.id === from) ?? available.at(-2) ?? available[0];
  const after = available.find(season => season.id === to) ?? available.at(-1);
  const changes = useMemo(() => before && after ? compareEvolutionSeasons(before, after) : [], [before, after]);
  const names = useMemo(() => [...new Set(seasons.flatMap(season => season.cards.map(card => card.name)))], [seasons]);
  const images = useCardsByNames(names);
  const [showRetained, setShowRetained] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visibleChanges = changes.filter(change => showRetained || change.status !== 'Retained' || change.before?.prevalence !== change.after?.prevalence || change.before?.averageCopies !== change.after?.averageCopies);
  const error = detailStatus.error || eventStatus.error;
  const retry = () => { detailStatus.retry(); eventStatus.retry(); };
  return <section className="mt-6 space-y-5" aria-label="Build evolution" aria-busy={pending}>
    <div><h2 className="text-xl font-semibold">Build evolution</h2><p className="mt-1 text-sm text-ctp-subtext0">{familyName} · Main + material · {builds.length} published {builds.length === 1 ? 'build' : 'builds'}</p></div>
    {pending && <p role="status">Recalculating seasons…</p>}
    {error && <div role="alert" className="text-sm text-ctp-red">Season data could not be refreshed. <Button variant="secondary" onClick={retry}>Retry</Button></div>}
    {(!detail || !events) ? <p role="status">{error ? 'Season data is unavailable.' : 'Loading season decklists…'}</p> : seasons.length === 0 ? <p>No season records are available for this build.</p> : <>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {seasons.map(season => <Panel key={season.id} className="min-w-0">
          <h3 className="font-semibold">{season.name}</h3><p className="mt-1 text-xs text-ctp-subtext0">{season.deckCount} recorded decks · {season.listedCount} available lists</p>
          {season.listedCount > 0 ? <><p className="mt-4 text-xs font-medium text-ctp-subtext1">Most adopted cards · season pool</p><div className="mt-2 grid grid-cols-3 gap-2">{season.cards.slice(0, 3).map(card => <CardPreview key={card.name} name={card.name} card={images.get(card.name)}>{percent(card.prevalence)} of lists<br />{card.averageCopies.toFixed(1)} copies when played</CardPreview>)}</div></> : <p className="mt-4 text-sm text-ctp-subtext0">{season.deckCount ? 'Card lists unavailable.' : 'No recorded decks this season.'}</p>}
          {season.deckCount > 0 && <div className="mt-4 space-y-3"><h4 className="text-xs font-medium">Build share within this family</h4>{season.builds.filter(build => build.count > 0).map(build => <div key={build.id}><div className="flex items-start justify-between gap-2 text-xs"><Link className="inline-flex min-h-control min-w-0 items-center break-words text-ctp-blue hover:underline" to={`/archetypes/${build.id}`}>{build.name}{build.id === cluster.id ? ' (this build)' : ''}</Link><span className="shrink-0 pt-3">{percent(build.share)} · {build.count}</span></div><div className="h-2 overflow-hidden rounded bg-ctp-surface0"><div className="h-full rounded bg-ctp-blue" style={{ width: `${build.share * 100}%` }} /></div></div>)}</div>}
        </Panel>)}
      </div>
      {available.length < 2 ? <p className="text-sm text-ctp-subtext0">Two seasons with available decklists are needed to compare card changes.</p> : <Panel>
        <h3 className="text-lg font-semibold">Compare seasons</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{([{ label: 'From season', value: before!.id, update: setFrom }, { label: 'To season', value: after!.id, update: setTo }]).map(control => <label key={control.label} className="min-w-0 text-sm">{control.label}<span className="relative mt-1 block"><select className="min-h-control w-full appearance-none rounded border border-ctp-surface1 bg-ctp-base py-2 pl-3 pr-10 focus-visible:outline-2 focus-visible:outline-ctp-blue" value={control.value} onChange={event => { const value = Number(event.target.value); startTransition(() => control.update(value)); }}>{available.map(season => <option key={season.id} value={season.id}>{season.name}</option>)}</select><span className="pointer-events-none absolute right-3 top-3.5"><DisclosureChevron /></span></span></label>)}</div>
        <p className="mt-3 text-xs text-ctp-subtext0">{before!.listedCount} → {after!.listedCount} lists · Adoption and average copies when played</p>
        <Button className="mt-3" variant="secondary" aria-expanded={showRetained} onClick={() => setShowRetained(value => !value)}>{showRetained ? 'Hide unchanged cards' : 'Show unchanged cards'}</Button>
        {visibleChanges.length === 0 && <p className="mt-4 text-sm">No card adoption or copy-count changes between these seasons.</p>}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{(showAll ? visibleChanges : visibleChanges.slice(0, 12)).map(change => <CardPreview key={change.name} name={change.name} card={images.get(change.name)}><strong className="text-ctp-text">{change.status}</strong><br />{percent(change.before?.prevalence ?? 0)} → {percent(change.after?.prevalence ?? 0)} adoption<br />{change.before?.averageCopies.toFixed(1) ?? '—'} → {change.after?.averageCopies.toFixed(1) ?? '—'} copies</CardPreview>)}</div>
        {visibleChanges.length > 12 && <Button className="mt-4" variant="secondary" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Show largest changes' : `Show all ${visibleChanges.length} cards`}</Button>}
      </Panel>}
    </>}
  </section>;
}
