import CardQueryInput from "../../components/CardQueryInput";
import { groupSpoilers, searchSpoilers, spoilerSetKey } from "../../lib/spoilerCatalog";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import spoilers from "../../../../data/reference/card-spoilers-2026-11-01.json";
import CardArtTile from "../../components/CardArtTile";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardCatalog } from "./useCardCatalog";
import { mergePreviewCards } from "../../lib/previewCards";

const controlClass = "mt-2 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue";
const sets = groupSpoilers(spoilers.cards);
// A reveal can be a new printing of an official card: retain the revealed art.
const artwork = new Map(mergePreviewCards([], spoilers.cards, true).map(card => [card.name, card]));
const addedDate = (value: string) => new Date(value.length === 10 ? `${value}T12:00:00-05:00` : value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

export default function CardSpoilers() {
  useDocumentTitle("Card spoilers", "Unreleased Grand Archive cards by set, newest additions first.");
  const catalog = useCardCatalog();
  const byName = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const rawSet = params.get("set") ?? "";
  // Preserve links to the former umbrella filter.
  const set = rawSet === "asphodel-cantabile" ? "" : spoilerSetKey(rawSet);
  const shown = searchSpoilers(query).filter(card => !set || spoilerSetKey(card.setPrefix) === set);
  const groups = groupSpoilers(shown);
  function update(key: string, value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  }
  return <PageLayout width="fluid">
    <PageHeader title="Card spoilers" />
    <div className="my-5 grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Find a spoiler<CardQueryInput type="search" className={controlClass} value={query} placeholder="Name, effect:draw, or element:water" onChange={event => update("q", event.target.value)} /></label>
      <label className="text-sm">Set<select className={controlClass} value={set} onChange={event => update("set", event.target.value)}>
        <option value="">All sets</option>
        {sets.map(group => <option key={group.prefix} value={group.prefix}>{group.name} ({group.prefix})</option>)}
      </select></label>
    </div>
    <p role="status" className="mb-4 text-sm text-ctp-subtext1">{shown.length} of {spoilers.cards.length} spoilers · Newest added first</p>
    {shown.length === 0 && <div className="space-y-3"><p>No spoilers match your filters.</p><Button onClick={() => setParams({})}>Clear filters</Button></div>}
    <div className="space-y-10">
      {groups.map(group => <section key={group.prefix} aria-labelledby={`set-${group.prefix}`}>
        <h2 id={`set-${group.prefix}`} className="mb-4 text-xl font-semibold">{group.name} <span className="text-sm font-normal text-ctp-subtext1">{group.cards.length} {group.cards.length === 1 ? "card" : "cards"}</span></h2>
        <div className="mx-auto grid w-full max-w-sm grid-cols-1 items-start gap-6 sm:max-w-none sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {group.cards.map(card => {
            const catalogCard = byName.get(card.name);
            const content = <><CardArtTile card={artwork.get(card.name)} name={card.name} /><span className="block py-2 text-sm font-medium">{card.name}</span></>;
            return <div key={card.name} className="min-w-0">
              {catalogCard ? <Link aria-label={card.name} to={`/cards/${catalogCard.slug}`} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-ctp-blue">{content}</Link> : content}
              <p className="text-xs text-ctp-subtext1">Added <time dateTime={card.addedAt}>{addedDate(card.addedAt)}</time></p>
            </div>;
          })}
        </div>
      </section>)}
    </div>
  </PageLayout>;
}
