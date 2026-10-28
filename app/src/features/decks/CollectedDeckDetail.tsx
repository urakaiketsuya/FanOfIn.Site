import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { collectedDecklist } from '@gatcg/shared';
import { useCollectedDecks, useCollectedStatus } from './collectedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import PageLayout from '../../components/layout/PageLayout';
import { InlineState } from '../../components/ui/ContentState';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/FormControl';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import UserDeckHeader from '../account/UserDeckHeader';
import UserDecklistPanel from '../account/UserDecklistPanel';
import UserDeckStats from '../account/UserDeckStats';
import DeckStats from '../../components/DeckStats';
import DecklistActions from '../events/DecklistActions';
import MenuDetails from '../../components/ui/MenuDetails';
import DisclosureChevron from '../../components/DisclosureChevron';
import { useCardCatalog } from '../cards/useCardCatalog';
import { useDeckSightingsData } from '../topdecks/data';
import DeckSightingSummary from './DeckSightingSummary';
import { usePlayerNameById, useEventNameById } from '../tournaments/data';
import { useTabParam } from '../../lib/useTabParam';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { encodeCustomDecks } from '../../lib/compareShareLink';
import { accountApi } from '../../lib/accountApi';

export default function CollectedDeckDetail() {
  const { id } = useParams();
  const data = useCollectedDecks();
  const status = useCollectedStatus();
  const deck = data?.decks.find(d => d.id === id);
  const [params, setParams] = useSearchParams();
  const variant = deck?.variants.find(v => v.id === params.get('variant')) ?? deck?.variants[0];
  const decklist = useMemo(() => variant && data ? collectedDecklist(variant, data.cardNames) : null, [variant, data]);
  const [tab, setTab] = useTabParam('tab', ['decklist', 'stats', 'performance'] as const, 'decklist');
  const catalog = useCardCatalog();
  const cards = useMemo(() => new Map(catalog.map(c => [c.name, c])), [catalog]);
  const sightings = useDeckSightingsData();
  const matches = useMemo(() => deck?.format === 'STANDARD' ? sightings?.sightings.filter(s => s.deckHash === deck.tournamentHash) ?? [] : [], [deck, sightings]);
  const playerName = usePlayerNameById();
  const eventNames = useEventNameById();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; void accountApi.session().then(s => { if (active) setSignedIn(!!s.user); }).catch(() => {}); return () => { active = false; }; }, []);
  useDocumentTitle(deck?.title ?? 'Collected build');
  if (!data || !deck || !decklist) return <PageLayout><PublishedSourceStatus label="Collected builds" status={status} hasData={!!data} /><InlineState>{data ? 'Collected build not found.' : status.phase === 'error' ? 'Collected builds are unavailable.' : 'Loading collected build…'}</InlineState><Link className="inline-flex min-h-control items-center text-ctp-blue" to="/decks?source=collected">Browse collected builds</Link></PageLayout>;
  const custom = encodeURIComponent(encodeCustomDecks([{ label: deck.title, decklist, format: deck.format }]));
  const actionClass = 'inline-flex min-h-control items-center rounded-lg border border-ctp-surface1 px-3 text-sm';
  async function save() {
    if (!deck || !decklist) return;
    setBusy(true); setError(null);
    try { const result = await accountApi.saveDeck({ title: deck.title, format: deck.format, championName: deck.championName, decklist, source: { provider: 'manual', externalDeckId: `collected:${deck.id}:${variant!.id}`, label: 'Collected build' } }); navigate(`/decks/${result.id}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save a copy. Try again.'); }
    finally { setBusy(false); }
  }
  return <PageLayout>
    <Link className="inline-flex min-h-control items-center text-sm text-ctp-blue" to="/decks?source=collected">← Collected builds</Link>
    <UserDeckHeader title={deck.title} championName={deck.championName} format={deck.format} decklist={decklist} eyebrow="Collected build" actions={<>
      {signedIn ? <Button disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save copy'}</Button> : <Link className={actionClass} to="/account">Sign in to save</Link>}
      <Link className={actionClass} to={`/goldfish?custom=${custom}`}>Playtest</Link>
      <MenuDetails className="relative"><summary className={`${actionClass} cursor-pointer list-none`}>More <DisclosureChevron className="ml-1" /></summary><div className="absolute right-0 top-full z-30 mt-2 grid max-h-[60dvh] w-64 max-w-[calc(100vw-2rem)] gap-1 overflow-y-auto rounded-xl border border-ctp-surface1 bg-ctp-base p-2 shadow-xl"><Link className={actionClass} to={`/compare?custom=${custom}`}>Compare deck</Link><DecklistActions showBuilderAction decklist={decklist} cardsByName={cards} deckTitle={deck.title} /></div></MenuDetails>
    </>} />
    {error && <InlineState tone="danger">{error}</InlineState>}
    {matches.length > 0 && <div className="mt-3 text-sm"><DeckSightingSummary sightings={matches} playerName={playerName} eventNameById={eventNames} avgWinRate={matches.reduce((sum, s) => sum + s.winRate, 0) / matches.length} /></div>}
    {deck.variants.length > 1 && <label className="mt-4 flex flex-col gap-1 text-sm">List variant<Select aria-label="List variant" disabled={busy} value={variant!.id} onChange={event => setParams(previous => { const next = new URLSearchParams(previous); next.set('variant', event.target.value); return next; }, { replace: true })}>{deck.variants.map((v, index) => <option key={v.id} value={v.id}>Variant {index + 1} · {v.sideboard.reduce((sum, [, qty]) => sum + qty, 0)} sideboard cards</option>)}</Select></label>}
    <div className="mt-6"><Tabs tabs={[{ key: 'decklist', label: 'Deck' }, { key: 'stats', label: 'Stats' }, { key: 'performance', label: 'Analysis' }]} active={tab} onChange={setTab} label="Collected deck details" baseId="collected-deck" wrap /></div>
    <TabPanel baseId="collected-deck" tab="decklist" active={tab} keepMounted><UserDecklistPanel showActions={false} showStats={false} decklist={decklist} format={deck.format} collectionSource={deck.title} /></TabPanel>
    <TabPanel baseId="collected-deck" tab="stats" active={tab}><DeckStats decklist={decklist} cardsByName={cards} /></TabPanel>
    <TabPanel baseId="collected-deck" tab="performance" active={tab} keepMounted><UserDeckStats key={variant!.id} decklist={decklist} championName={deck.championName} format={deck.format} title={deck.title} /></TabPanel>
  </PageLayout>;
}
