import Tabs, { TabPanel } from "../../components/ui/Tabs";
import DiscordIcon from "../../components/DiscordIcon";
import { DISCORD_INVITE_URL } from "../../lib/communityLinks";
import { needsMerchandisePhoto } from "./photoSources";
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { merchandiseBundles, MERCHANDISE_CATALOG_SOURCE } from "@gatcg/shared";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/ContentState";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { merchandiseCatalog as catalog } from "@gatcg/shared";
import MerchandisePhoto from "./MerchandisePhoto";
import { galleryImageUrl, imgurEmbedUrl } from "./photoPresentation";

const SOURCE = MERCHANDISE_CATALOG_SOURCE;
const categories = [...new Set(catalog.map(item => item.category))].sort();
const PAGE_SIZE = 24;
const bounties = catalog.filter(needsMerchandisePhoto);
const linkStyle = "inline-flex min-h-12 items-center rounded-md px-3 text-sm text-ctp-blue hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-blue";

function ReleaseImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="flex h-44 items-center justify-center bg-ctp-crust p-4 text-center text-ctp-subtext1">{name}</div> : <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-44 w-full bg-ctp-crust object-contain p-2" />;
}

export default function MerchandiseIndex() {
  useDocumentTitle("Merchandise", "Browse Grand Archive playmats, sleeves, deckboxes, clothing, and collectibles.");
  const [params, setParams] = useSearchParams();
  const view = params.get("tab") === "bounties" ? "bounties" : "catalog";
  const query = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const needle = query.trim().toLowerCase();
  const filtered = (view === "bounties" ? bounties : catalog).filter(item => (!category || item.category === category) && (!needle || `${item.name} ${item.detail} ${item.sourceSheet}`.toLowerCase().includes(needle)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number(params.get("page") ?? 1);
  const page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(pages, requestedPage)) : 1;
  function filter(key: string, value: string) {
    setParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); next.delete("page"); return next; }, { replace: true });
  }
  function move(value: number) {
    setParams(current => { const next = new URLSearchParams(current); next.set("page", String(value)); return next; });
    const results = document.getElementById("merchandise-results");
    results?.focus({ preventScroll: true });
    results?.scrollIntoView({ block: "start" });
  }
  return <PageLayout width="wide" data-component="MerchandiseIndex">
    <PageHeader title="Merchandise" description="Playmats, sleeves, deckboxes, and collectibles from the Grand Archive community catalog." />
    <nav aria-label="Product pages" className="mb-5 flex flex-wrap gap-2">
      <Link className={linkStyle} to="/collection?tab=merchandise">Track collection</Link>
      <Link className={linkStyle} to="/products">Set releases</Link>
      <Link className={linkStyle} to="/official-decks">Official product decks</Link>
      <a className={linkStyle} href={SOURCE} target="_blank" rel="noreferrer">Source spreadsheet ↗</a>
    </nav>
    <Tabs baseId="merchandise" label="Merchandise views" variant="pill" wrap active={view} onChange={value => filter("tab", value === "catalog" ? "" : value)} tabs={[{ key: "catalog", label: "Catalog" }, { key: "bounties", label: `Bounties (${bounties.length})` }]} />
    <TabPanel baseId="merchandise" tab={view} active={view} className="mt-5">
    {view === "bounties" && <section aria-labelledby="photo-bounties" className="mb-5 rounded-xl border border-ctp-surface0 bg-ctp-mantle/70 p-4">
      <h2 id="photo-bounties" className="text-xl font-semibold">Help complete the photo catalog</h2>
      <p className="mt-2 text-sm text-ctp-subtext1">These items need a photo. Join our Discord and share a clear image with the item’s name, category, and edition or event. If it’s from a listing, include the source link.</p>
      <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" aria-label="Join Discord to share merchandise photos (opens in a new tab)" className={`${linkStyle} mt-3 font-semibold`}><DiscordIcon />Join Discord</a>
    </section>}
    {view === "catalog" && !query && !category && page === 1 && <section aria-labelledby="merchandise-featured" className="mb-8">
      <h2 id="merchandise-featured" className="mb-3 text-xl font-semibold">Featured merchandise sets</h2>
      <div className="grid gap-4 sm:grid-cols-3">{merchandiseBundles.filter(bundle => bundle.overviewImageUrl).slice(0, 3).map(bundle => <article key={bundle.id} className="overflow-hidden rounded-xl border border-ctp-surface0 bg-ctp-mantle/70">
        <ReleaseImage src={bundle.overviewImageUrl!} name={`${bundle.releaseName} · ${bundle.champion}`} />
        <div className="p-4"><h3 className="font-semibold">{bundle.releaseName} · {bundle.champion}</h3><p className="mt-1 text-xs text-ctp-subtext0">Full merchandise set</p><a href={bundle.sourceUrl} target="_blank" rel="noreferrer" className={linkStyle}>View release ↗</a></div>
      </article>)}</div>
    </section>}
    <section id="merchandise-results" tabIndex={-1} aria-labelledby="merchandise-catalog" className="scroll-mt-24">
      <h2 id="merchandise-catalog" className="mb-3 text-xl font-semibold">{view === "bounties" ? "Photos wanted" : "Browse merchandise"}</h2>
      <div className="mb-4 grid gap-3 rounded-xl border border-ctp-surface0 bg-ctp-mantle/50 p-3 sm:grid-cols-2">
        <label className="text-sm">Search<input value={query} onChange={event => filter("q", event.target.value)} placeholder="Name, artist, set, or event…" className="mt-1 min-h-12 w-full min-w-0 rounded-md border border-ctp-surface1 bg-ctp-base px-3 text-ctp-text" /></label>
        <label className="text-sm">Category<select value={category} onChange={event => filter("category", event.target.value)} className="mt-1 min-h-12 w-full min-w-0 rounded-md border border-ctp-surface1 bg-ctp-base px-3 text-ctp-text"><option value="">All categories</option>{category && !categories.includes(category) && <option value={category}>{category}</option>}{categories.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <p role="status" className="mb-3 text-sm text-ctp-subtext0">{filtered.length} {view === "bounties" ? "items need photos" : "catalog entries"}{filtered.length > 0 && ` · Page ${page} of ${pages}`}</p>
      {!filtered.length ? <EmptyState title={view === "bounties" ? "No photo bounties match" : "No merchandise matches"} action={<Button onClick={() => setParams(view === "bounties" ? { tab: "bounties" } : {})}>Clear filters</Button>} /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(item => { return <article key={item.id} className="flex min-w-0 flex-col rounded-xl border border-ctp-surface0 bg-ctp-mantle/70 p-4">
        {view === "catalog" && <MerchandisePhoto item={item} />}
        <p className="mb-2 text-xs font-medium text-ctp-mauve">{item.category}</p>
        <h3 className="break-words text-lg font-semibold">{item.name}</h3>
        {item.detail && <p className="mt-2 break-words text-sm text-ctp-subtext1">{item.detail}</p>}
        <div className="mt-auto flex flex-wrap gap-1 pt-3"><Link className={linkStyle} to={`/collection?tab=merchandise&merchandise=${encodeURIComponent(item.id)}`} aria-label={`Track ${item.name} in your collection`}>Track collection</Link>{item.photoUrl && !imgurEmbedUrl(item.photoUrl) && !galleryImageUrl(item.photoUrl) && <a className={linkStyle} href={item.photoUrl} target="_blank" rel="noreferrer" aria-label={`View photos of ${item.name}`}>View photos ↗</a>}<a className={linkStyle} href={`${SOURCE}?range=${encodeURIComponent(`'${item.sourceSheet}'!${item.sourceCell}`)}`} target="_blank" rel="noreferrer" aria-label={`View source for ${item.name}`}>Source ↗</a></div>
      </article>; })}</div>}
      {pages > 1 && <nav aria-label="Merchandise pagination" className="mt-5 flex flex-wrap items-center justify-center gap-3"><Button disabled={page === 1} onClick={() => move(page - 1)}>Previous</Button><span className="text-sm">{page} / {pages}</span><Button disabled={page === pages} onClick={() => move(page + 1)}>Next</Button></nav>}
    </section>
    </TabPanel>
    <p className="mt-8 text-xs text-ctp-subtext0">Catalog: Grand Archive Playmats Collection · imported November 14, 2026. Artist-signed entries retain their own category. Featured release images: Grand Archive.</p>
  </PageLayout>;
}
