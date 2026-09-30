import { useMemo, useState, useTransition } from "react";
import { Link, useParams } from "react-router-dom";
import { CARD_TAG_CATEGORIES, canonicalCardTag, cardTagCategory } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import PageLayout from "../../components/layout/PageLayout";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardCatalog } from "./useCardCatalog";
import { useCardTags } from "./cardTags";

import { tagControl, tagGalleryUrl } from "./tagUi";

export default function TagGallery() {
  const { tag: routeTag } = useParams();
  const tag = routeTag ? canonicalCardTag(routeTag) : undefined;
  useDocumentTitle(tag ? `${tag} cards` : "Community tag galleries");
  const { data, lookup, status, local } = useCardTags();
  const cards = useCardCatalog();
  const [search, setSearch] = useState("");
  const [set, setSet] = useState("");
  const [limit, setLimit] = useState(36);
  const [pending, startTransition] = useTransition();
  const matches = useMemo(() => {
    if (!tag) return [];
    return cards.filter(card => lookup?.cards.get(card.uuid)?.has(tag) && card.name.toLowerCase().includes(search.toLowerCase())).flatMap(card => {
      const editions = card.editions.filter(edition => lookup?.editions.get(edition.uuid)?.has(tag) && (!set || edition.set.prefix === set));
      if (cardTagCategory(tag) === "Gameplay") return editions.slice(0, 1).map(edition => ({ card, edition }));
      return editions.map(edition => ({ card, edition }));
    });
  }, [cards, lookup, tag, search, set]);
  const sets = [...new Set(cards.flatMap(card => card.editions.map(edition => edition.set.prefix)))].sort();
  return <PageLayout width="full">
    <Link to="/cards" className="inline-flex min-h-12 items-center text-ctp-blue">Back to cards</Link>
    <h1 className="text-2xl font-bold">{tag ?? "Community tag galleries"}</h1>
    <p className="mt-2 text-sm text-ctp-subtext0">Explore matching artwork and community labels. Silvie imports are mostly unreviewed; approved Fan of Insight contributions are included. Gameplay labels are discovery hints.</p>
    <div className="my-3 flex flex-wrap gap-3"><Link to="/cards/tagging" className={`${tagControl} flex items-center text-ctp-blue`}>Contribute tags</Link>{tag && <Link to="/cards/tags" className={`${tagControl} flex items-center text-ctp-blue`}>All tag galleries</Link>}</div>
    {local.isError && <p role="status" className="my-3 text-sm">Local contributions are unavailable; showing imported tags. <button className={tagControl} onClick={() => void local.refetch()}>Retry contributions</button></p>}
    {!data ? <p role="status">{status.phase === "error" ? <>Tags unavailable. <button className={tagControl} onClick={status.retry}>Retry tags</button></> : "Loading tags…"}</p> : <>
      <div className="flex flex-wrap gap-3"><label className="flex min-w-0 flex-col gap-1 text-sm">{tag ? "Find a card" : "Find a tag"}<input className={tagControl} value={search} onChange={event => { const value = event.target.value; startTransition(() => { setSearch(value); setLimit(36); }); }} /></label>
        {tag && <label className="flex flex-col gap-1 text-sm">Printing set<select className={tagControl} value={set} onChange={event => { setSet(event.target.value); setLimit(36); }}><option value="">All sets</option>{sets.map(prefix => <option key={prefix}>{prefix}</option>)}</select></label>}
      </div>
      {pending && <p role="status">Recalculating…</p>}
      {!tag ? <>{CARD_TAG_CATEGORIES.map(category => <section key={category} className="mt-6"><h2 className="font-semibold">{category}</h2><div className="mt-2 flex flex-wrap gap-2">{data.tags.filter(item => cardTagCategory(item.name) === category && item.name.toLowerCase().includes(search.toLowerCase())).map(item => <Link key={item.name} to={tagGalleryUrl(item.name)} className={`${tagControl} flex items-center gap-2 text-ctp-blue`}>{item.name} <span className="text-ctp-subtext0">{item.cardCount}</span></Link>)}</div></section>)}{!data.tags.some(item => item.name.toLowerCase().includes(search.toLowerCase())) && <p className="mt-4">No tags match your search.</p>}</> : <>
        <p role="status" className="my-3 text-sm text-ctp-subtext0">{matches.length} matching {cardTagCategory(tag) === "Gameplay" ? "cards" : "printings"}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{matches.slice(0, limit).map(({ card, edition }) => <CardResult key={edition.uuid} card={{ ...card, editions: [edition] }} name={card.name}><p className="text-xs text-ctp-subtext0">{edition.set.prefix} · {edition.collector_number}</p></CardResult>)}</div>
        {!matches.length && <p className="mt-4">{cards.length ? "No matching printings. Try another set or search." : "Loading card catalog…"}</p>}
        {matches.length > limit && <button className={`${tagControl} mt-4`} onClick={() => setLimit(value => value + 36)}>Show more printings</button>}
        <Link className="mt-4 inline-flex min-h-12 items-center text-ctp-blue" to={`/cards?${new URLSearchParams({ tag })}`}>Browse all tagged cards, including unmatched printings</Link>
      </>}
    </>}
  </PageLayout>;
}
