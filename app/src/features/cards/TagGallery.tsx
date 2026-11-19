import { useBrowseState } from "../../lib/useBrowseState";
import CardQueryInput from "../../components/CardQueryInput";
import { searchCardPrintings } from "./filters";
import { useMemo, useState, useTransition } from "react";
import { Link, useParams } from "react-router-dom";
import { CARD_TAG_CATEGORIES, canonicalCardTag, cardTagCategory } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import PageLayout from "../../components/layout/PageLayout";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardCatalog } from "./useCardCatalog";
import { useCardTags } from "./cardTags";

import { tagAction, tagChoice, tagControl, tagGalleryUrl } from "./tagUi";

type View = "popular" | "az" | "few" | "recent";
const VIEWS: { id: View; label: string }[] = [{ id: "popular", label: "Most cards" }, { id: "az", label: "A–Z" }, { id: "few", label: "Needs cards" }, { id: "recent", label: "Recently added" }];
/** A tag with this many cards or fewer is still thin and welcomes more matches. */
const FEW_CARDS = 5;

export default function TagGallery() {
  const { tag: routeTag } = useParams();
  const tag = routeTag ? canonicalCardTag(routeTag) : undefined;
  useDocumentTitle(tag ? `${tag} cards` : "Community tag galleries");
  const { data, lookup, status, local, recent } = useCardTags();
  const cards = useCardCatalog();
  const [search, setSearch] = useBrowseState('cards/TagGallery.search', "");
  const [set, setSet] = useBrowseState('cards/TagGallery.set', "");
  const [view, setView] = useBrowseState<View>('cards/TagGallery.view', "popular");
  const [limit, setLimit] = useState(36);
  const [pending, startTransition] = useTransition();
  const matches = useMemo(() => {
    if (!tag) return [];
    return cards.filter(card => lookup?.cards.get(card.uuid)?.has(tag)).flatMap(card => {
      const editions = searchCardPrintings(card, search, lookup).filter(edition => lookup?.editions.get(edition.uuid)?.has(tag) && (!set || edition.set.prefix === set));
      if (cardTagCategory(tag) === "Gameplay") return editions.slice(0, 1).map(edition => ({ card, edition }));
      return editions.map(edition => ({ card, edition }));
    });
  }, [cards, lookup, tag, search, set]);
  const listed = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    const list = data.tags.filter(item => item.name.toLowerCase().includes(q));
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    if (view === "recent") { const order = new Map(recent.map((name, i) => [name, i])); return list.filter(item => order.has(item.name)).sort((a, b) => order.get(a.name)! - order.get(b.name)!); }
    if (view === "few") return list.filter(item => item.cardCount <= FEW_CARDS).sort((a, b) => a.cardCount - b.cardCount || byName(a, b));
    if (view === "az") return list.sort(byName);
    return list.sort((a, b) => b.cardCount - a.cardCount || byName(a, b));
  }, [data, search, view, recent]);
  const sets = [...new Set(cards.flatMap(card => card.editions.map(edition => edition.set.prefix)))].sort();
  return <PageLayout width="full">
    <Link to="/cards" className="inline-flex min-h-12 items-center text-ctp-blue">Back to cards</Link>
    <h1 className="text-2xl font-bold">{tag ?? "Community tag galleries"}</h1>
    <p className="mt-2 text-sm text-ctp-subtext0">Explore matching artwork and community labels. Silvie imports are mostly unreviewed; approved Fan of Insight contributions are included. Gameplay labels are discovery hints.</p>
    <div className="my-3 flex flex-wrap gap-3"><Link to="/cards/tagging" className={`${tagAction} flex items-center text-ctp-blue`}>Contribute tags</Link>{tag && <Link to="/cards/tags" className={`${tagAction} flex items-center text-ctp-blue`}>All tag galleries</Link>}</div>
    {local.isError && <p role="status" className="my-3 text-sm">Local contributions are unavailable; showing imported tags. <button className={tagAction} onClick={() => void local.refetch()}>Retry contributions</button></p>}
    {!data ? <p role="status">{status.phase === "error" ? <>Tags unavailable. <button className={tagAction} onClick={status.retry}>Retry tags</button></> : "Loading tags…"}</p> : <>
      <div className="flex flex-wrap gap-3"><label className="flex min-w-0 flex-col gap-1 text-sm">{tag ? "Find a card" : "Find a tag"}{tag ? <CardQueryInput tagsAvailable className={tagControl} value={search} onChange={event => { const value = event.target.value; startTransition(() => { setSearch(value); setLimit(36); }); }} /> : <input className={tagControl} value={search} onChange={event => { const value = event.target.value; startTransition(() => { setSearch(value); setLimit(36); }); }} />}</label>
        {tag && <label className="flex flex-col gap-1 text-sm">Printing set<select className={tagControl} value={set} onChange={event => { setSet(event.target.value); setLimit(36); }}><option value="">All sets</option>{sets.map(prefix => <option key={prefix}>{prefix}</option>)}</select></label>}
      </div>
      {pending && <p role="status">Recalculating…</p>}
      {!tag ? <>
        <div role="radiogroup" aria-label="Tag view" className="mt-4 flex flex-wrap gap-2">{VIEWS.map(item => <button key={item.id} type="button" role="radio" aria-checked={view === item.id} className={`${tagChoice(view === item.id)} min-w-32`} onClick={() => setView(item.id)}>{view === item.id && <span aria-hidden="true">✓</span>}{item.label}</button>)}</div>
        {view === "few" && <p className="mt-3 text-sm text-ctp-subtext0">Tags with {FEW_CARDS} or fewer cards, thinnest first. Use ＋ to suggest more matching cards.</p>}
        {view === "recent" && <p className="mt-3 text-sm text-ctp-subtext0">Tags first added by approved Fan of Insight contributions, newest first.</p>}
        {(view === "recent" ? [null] : CARD_TAG_CATEGORIES).map(category => {
          const items = category ? listed.filter(item => cardTagCategory(item.name) === category) : listed;
          return items.length > 0 && <section key={category ?? "recent"} className="mt-6">{category && <h2 className="font-semibold">{category}</h2>}<div className="mt-2 flex flex-wrap gap-2">{items.map(item => <span key={item.name} className="inline-flex items-stretch gap-1">
            <Link to={tagGalleryUrl(item.name)} className={`${tagControl} flex items-center gap-2 text-ctp-blue transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]`}>{item.name} <span className="text-ctp-subtext0">{item.cardCount}</span></Link>
            {view === "few" && <Link to={`/cards/tagging?${new URLSearchParams({ tag: item.name })}`} aria-label={`Suggest more cards for ${item.name}`} className={`${tagControl} flex items-center font-semibold text-ctp-blue transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]`}>＋</Link>}
          </span>)}</div></section>;
        })}
        {listed.length === 0 && <p className="mt-4">{view === "recent" && !search ? "No site contributions have been approved yet." : view === "few" && !search ? `Every tag has more than ${FEW_CARDS} cards.` : "No tags match your search."}</p>}
      </> : <>
        <p role="status" className="my-3 text-sm text-ctp-subtext0">{matches.length} matching {cardTagCategory(tag) === "Gameplay" ? "cards" : "printings"}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{matches.slice(0, limit).map(({ card, edition }) => <CardResult key={edition.uuid} card={{ ...card, editions: [edition] }} name={card.name}><p className="text-xs text-ctp-subtext0">{edition.set.prefix} · {edition.collector_number}</p></CardResult>)}</div>
        {!matches.length && <p className="mt-4">{cards.length ? "No matching printings. Try another set or search." : "Loading card catalog…"}</p>}
        {matches.length > limit && <button className={`${tagAction} mt-4`} onClick={() => setLimit(value => value + 36)}>Show more printings</button>}
        <Link className="mt-4 inline-flex min-h-12 items-center text-ctp-blue" to={`/cards?${new URLSearchParams({ tag })}`}>Browse all tagged cards, including unmatched printings</Link>
      </>}
    </>}
  </PageLayout>;
}
