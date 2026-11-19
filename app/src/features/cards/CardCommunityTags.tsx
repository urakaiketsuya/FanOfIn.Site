import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { CARD_TAG_CATEGORIES, cardTagCategory } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import { tagGalleryUrl } from "./tagUi";
import { useCardTags } from "./cardTags";

const PREVIEW_TAGS = 6;

export default function CardCommunityTags({ cardUuid, editionUuid }: { cardUuid: string; editionUuid?: string }) {
  const { data, lookup, status, local } = useCardTags();
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const names = [...lookup?.cards.get(cardUuid) ?? []].sort((a, b) => a.localeCompare(b));
  const editionTags = editionUuid ? lookup?.editions.get(editionUuid) : undefined;
  const preview = names.slice(0, PREVIEW_TAGS);
  const chip = "inline-flex min-h-8 max-w-full items-center rounded-lg border border-ctp-surface2 px-3 py-1 text-sm text-ctp-blue transition-all duration-200 hover:-translate-y-0.5 hover:bg-ctp-surface0 hover:shadow-md active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-ctp-blue";
  return <section className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
    <div className="flex flex-wrap items-center gap-2 px-2">
      <h2 className="text-sm font-semibold">Community tags {data && <span className="text-ctp-subtext0">({names.length})</span>}</h2>
      <Link className="ml-auto inline-flex min-h-12 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-ctp-blue transition-all duration-200 hover:-translate-y-0.5 hover:bg-ctp-surface0 hover:shadow-md active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/tagging?${new URLSearchParams({ card: cardUuid, ...(editionUuid ? { edition: editionUuid } : {}) })}`}><span aria-hidden="true">＋</span>Suggest tags</Link>
    </div>
    <div className="px-2">
      {local.isError && <p role="status" className="text-sm">Local contributions unavailable; showing imported tags.</p>}
      {!data ? <p role="status" className="text-sm text-ctp-subtext0">{status.phase === "error" ? <>Community tags unavailable. <button type="button" onClick={status.retry} className="min-h-12 px-3 text-ctp-blue focus-visible:outline-2">Retry tags</button></> : "Loading community tags…"}</p>
        : names.length === 0 ? <p className="text-sm text-ctp-subtext0">No community tags yet. Be the first to suggest one.</p>
        : <ul className="flex flex-wrap gap-2" aria-label="Community tags">
          {preview.map(name => <li key={name} className="max-w-full"><Link to={tagGalleryUrl(name)} className={chip}>{name}</Link></li>)}
          {names.length > PREVIEW_TAGS && <li><button type="button" className={`${chip} bg-ctp-surface0`} onClick={() => setExpanded(true)}>+{names.length - PREVIEW_TAGS} more</button></li>}
        </ul>}
    </div>
    <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)} className="mt-1 flex min-h-12 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-ctp-subtext0 transition-colors duration-200 hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-blue">
      Tag details and sources
      <DisclosureChevron className={`ml-auto shrink-0 ${expanded ? "rotate-180" : ""}`} />
    </button>
    <div id={id} hidden={!expanded} className="px-2 pb-2">
      {local.isError && <p role="status" className="text-sm">Local contributions unavailable; showing imported tags.</p>}
      {!data ? <p role="status" className="text-sm text-ctp-subtext0">{status.phase === "error" ? <>Community tags unavailable. <button type="button" onClick={status.retry} className="min-h-12 px-3 text-ctp-blue focus-visible:outline-2">Retry tags</button></> : "Loading community tags…"}</p> : <>
        <p className="mb-3 text-xs leading-relaxed text-ctp-subtext0">Community labels from <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center text-ctp-blue underline">silvie.gg Art Tagger</a>, mostly unreviewed, plus approved local contributions. Tags cover all printings; “Other printing” means the selected artwork is not tagged. Gameplay labels are discovery hints, not verified effects.</p>
        {names.length === 0 && <p className="text-sm text-ctp-subtext0">No community tags yet. Missing tags do not mean a character or effect is absent.</p>}
        {CARD_TAG_CATEGORIES.map(category => {
          const tags = names.filter(name => cardTagCategory(name) === category);
          return tags.length > 0 && <div key={category} className="mt-3">
            <h3 className="mb-2 text-xs font-semibold text-ctp-subtext0">{category}</h3>
            <div className="flex flex-wrap gap-2">{tags.map(name => <Link key={name} to={tagGalleryUrl(name)} className="flex min-h-12 max-w-full flex-col justify-center rounded-xl border border-ctp-surface2 px-3 py-2 text-sm text-ctp-blue transition-all duration-200 hover:-translate-y-0.5 hover:bg-ctp-surface0 hover:shadow-md active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-ctp-blue">
              <span className="break-words">{name}</span>
              {!editionTags?.has(name) && <span className="text-xs text-ctp-subtext0">Other printing</span>}
            </Link>)}</div>
          </div>;
        })}
      </>}
    </div>
  </section>;
}
