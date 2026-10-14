import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { artistDirectory, buildArtistGalleries, type ArtistIdentity, type ArtistCard } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import { useCardCatalog } from '../cards/useCardCatalog';
import { useSyncProgress } from '../../lib/sync/SyncProvider';
import { syncCards } from '../../lib/sync/cards';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

function artworkCounts(cards: number, printings: number) {
  return `${cards} ${cards === 1 ? 'card' : 'cards'} · ${printings} ${printings === 1 ? 'printing' : 'printings'}`;
}

const linkClass = 'inline-flex min-h-12 items-center rounded-lg px-3 text-ctp-blue hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-blue';

function ArtistPortrait({ artist, large = false }: { artist: ArtistIdentity; large?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const src = artist.portrait?.src;
  const initials = artist.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase();
  return <span aria-hidden="true" className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ctp-surface1 bg-ctp-surface0 font-semibold text-ctp-lavender ${large ? 'h-20 w-20 text-2xl' : 'h-14 w-14 text-lg'}`}>
    {initials}
    {src && failedSrc !== src && <img src={src} alt="" width={large ? 80 : 56} height={large ? 80 : 56} loading={large ? 'eager' : 'lazy'} decoding="async" style={{ objectPosition: artist.portrait?.position }} onError={() => setFailedSrc(src)} className={`absolute inset-0 h-full w-full bg-ctp-surface0 ${artist.portrait?.fit === 'contain' ? 'object-contain p-2' : artist.portrait?.framing === 'card-art' ? 'object-cover object-top origin-top scale-200 -translate-y-1/4' : 'object-cover'}`} />}
  </span>;
}

function ArtistArtwork({ entry }: { entry: ArtistCard }) {
  const [selected, setSelected] = useState(entry.editions[0].uuid);
  const edition = entry.editions.find(candidate => candidate.uuid === selected) ?? entry.editions[0];
  return <article className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2">
    <Link to={`/cards/${entry.card.slug}?edition=${encodeURIComponent(edition.uuid)}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">
      <CardArtTile card={entry.card} name={entry.card.name} editionUuid={edition.uuid} />
      <h3 className="flex min-h-12 items-center break-words px-1 py-2 text-sm font-medium">{entry.card.name}</h3>
    </Link>
    {entry.editions.length > 1 ? <label className="block px-1 text-xs text-ctp-subtext1">Printing
      <select aria-label={`${entry.card.name} printing`} value={edition.uuid} onChange={event => setSelected(event.target.value)} className="mt-1 min-h-12 w-full min-w-0 rounded border border-ctp-surface1 bg-ctp-base px-2 text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue">
        {entry.editions.map((printing, index) => <option key={printing.uuid} value={printing.uuid}>{printing.set.name} #{printing.collector_number} · Printing {index + 1}</option>)}
      </select>
      <span className="mt-2 block break-words">{edition.set.name} #{edition.collector_number}</span>
    </label> : <p className="break-words px-1 pb-2 text-xs text-ctp-subtext1">{edition.set.name} #{edition.collector_number}</p>}
  </article>;
}

export default function Artists() {
  const { slug } = useParams<{ slug: string }>();
  const cards = useCardCatalog();
  const progress = useSyncProgress();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const [retrySucceeded, setRetrySucceeded] = useState(false);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const galleries = useMemo(() => buildArtistGalleries(cards), [cards]);
  const artist = galleries.find(candidate => (candidate.slug === slug || candidate.slugAliases?.includes(slug ?? '')));
  const identity = artist ?? artistDirectory.find(candidate => (candidate.slug === slug || candidate.slugAliases?.includes(slug ?? '')));
  const studio = artistDirectory.find(candidate => candidate.id === identity?.studioId);
  const studioArtists = artistDirectory.filter(candidate => identity && candidate.studioId === identity.id);
  const cardSearch = query;
  function setSearch(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  }
  useDocumentTitle(slug ? identity?.name ?? 'Artist' : 'Artists', 'Discover Grand Archive artists, their card artwork, and official accounts.');
  const loading = !cards.length && (retrying || progress.phase === 'idle' || progress.phase === 'syncing');
  const failed = retryError || (!retrySucceeded && progress.phase === 'error');
  async function retry() {
    setRetrying(true);
    setRetryError(false);
    try { await syncCards(); setRetrySucceeded(true); } catch { setRetryError(true); } finally { setRetrying(false); }
  }
  const visibleArtists = galleries.filter(candidate => candidate.credits.some(credit => credit.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) || candidate.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const visibleCards = artist?.cards.filter(entry => entry.card.name.toLocaleLowerCase().includes(cardSearch.trim().toLocaleLowerCase())) ?? [];
  return <PageLayout width="full">
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap gap-2"><Link to="/cards" className={linkClass}>Cards</Link>{slug && <Link to="/artists" className={linkClass}>All artists</Link>}</nav>
    <div className="flex min-w-0 flex-wrap items-center gap-4">{slug && identity && <ArtistPortrait key={identity.id} artist={identity} large />}<div className="min-w-0 [&_h1]:break-words"><PageHeader title={slug ? identity?.name ?? (loading ? 'Artist' : 'Artist not found') : 'Artists'} /></div></div>
    {loading && <p role="status" className="mt-4 text-ctp-subtext1">Loading artist artwork…</p>}
    {failed && !retrying && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3"><p>Card artwork could not be refreshed.</p><Button onClick={() => void retry()}>Retry</Button></div>}
    {slug ? <>
      {identity && identity.links.length > 0 && <nav aria-label={`${identity.name} official accounts`} className="mt-4 flex flex-wrap gap-2">{identity.links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className={`${linkClass} max-w-full break-words border border-ctp-surface1`}>{link.platform} · {link.label} ↗</a>)}</nav>}
      {studio && <p className="mt-4 text-sm text-ctp-subtext1">Credited with <Link className={linkClass} to={`/artists/${encodeURIComponent(studio.slug)}`}>{studio.name}</Link></p>}
      {studioArtists.length > 0 && <section aria-labelledby="studio-artists-heading" className="mt-6">
        <h2 id="studio-artists-heading" className="text-xl font-semibold">Studio artists</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{studioArtists.map(member => {
          const gallery = galleries.find(candidate => candidate.id === member.id);
          const name = member.name.replace(/^DragonArt\s+/i, '');
          return <Link key={member.id} to={`/artists/${encodeURIComponent(member.slug)}`} className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">
            <ArtistPortrait artist={member} /><div className="min-w-0"><h3 className="break-words font-semibold">{name}</h3>{gallery && <p className="mt-1 text-sm text-ctp-subtext1">{artworkCounts(gallery.cards.length, gallery.printingCount)}</p>}</div>
          </Link>;
        })}</div>
      </section>}
      {artist && <>
        <p className="mt-4 text-ctp-subtext1">{artworkCounts(artist.cards.length, artist.printingCount)}</p>
        <label className="mt-5 block max-w-lg text-sm">Search cards<input type="search" value={cardSearch} onChange={event => setSearch(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue" /></label>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{visibleCards.map(entry => <ArtistArtwork key={entry.card.uuid} entry={entry} />)}</div>
        {!visibleCards.length && <p role="status" className="mt-6">No cards match your search.</p>}
      </>}
      {!loading && !artist && <p className="mt-5 text-ctp-subtext1">{identity ? 'No credited artwork is available in the current catalog.' : 'This artist is not in the current catalog.'} <Link className={linkClass} to="/artists">Browse artists</Link></p>}
    </> : <>
      <p className="mt-3 text-ctp-subtext1">Explore the artists behind Grand Archive.</p>
      <label className="mt-5 block max-w-lg text-sm">Search artists<input type="search" value={query} onChange={event => setSearch(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue" /></label>
      {galleries.length > 0 && <p role="status" className="mt-4 text-sm text-ctp-subtext1">{visibleArtists.length} {visibleArtists.length === 1 ? 'artist' : 'artists'}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleArtists.map(candidate => <Link key={candidate.id} to={`/artists/${encodeURIComponent(candidate.slug)}`} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">
        <div className="mb-3 flex min-w-0 items-center gap-3"><ArtistPortrait artist={candidate} /><div className="min-w-0"><h2 className="break-words text-lg font-semibold">{candidate.name}</h2><p className="mt-1 text-sm text-ctp-subtext1">{artworkCounts(candidate.cards.length, candidate.printingCount)}</p></div></div>
        <div className="grid grid-cols-3 gap-2">{candidate.cards.slice(0, 3).map(entry => <div key={entry.card.uuid} className="min-w-0"><CardArtTile card={entry.card} name={entry.card.name} editionUuid={entry.editions[0].uuid} artworkOnly /><p className="mt-1 break-words text-xs text-ctp-subtext1">{entry.card.name}</p></div>)}</div>

      </Link>)}</div>
      {!loading && !visibleArtists.length && <p role="status" className="mt-6">{galleries.length ? 'No artists match your search.' : 'No credited artwork is available.'}</p>}
    </>}
  </PageLayout>;
}
