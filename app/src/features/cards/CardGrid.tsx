import type { CardGrouping } from "../../lib/cardResultGroups";
import GroupedCardResults from "../../components/GroupedCardResults";
import CardGridSizeControl from "../../components/CardGridSizeControl";
import { CARD_GRID_MINIMUM } from "../../lib/cardGridSize";
import CardLayoutControls from "../../components/CardLayoutControls";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";
import DisclosureChevron from "../../components/DisclosureChevron";
import type { CardGridSize } from "../../lib/cardGridSize";
import "./CardGrid.css";
import { formatUsd } from "../../lib/format";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { Card, CardEdition } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import { InlineState } from "../../components/ui/ContentState";
import { primaryAlternateFace } from "../../lib/cardFaces";

interface CardGridProps {
  cards: Card[];
  winRates?: ReadonlyMap<string, number>;
  prices?: ReadonlyMap<string, number>;
  /** Which edition's art to show per card – defaults to the first. Set detail pages pass the edition from that set. */
  pickEdition?: (card: Card) => CardEdition | undefined;
}

export default function CardGrid({ cards, pickEdition, prices, winRates }: CardGridProps) {
  const [view, setView] = useState<{ layout: "Grid" | "Rows" | "List"; size: CardGridSize }>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("catalog-card-view-v1") ?? "null");
      if (saved && ["Grid", "Rows", "List"].includes(saved.layout) && ["large", "medium", "compact"].includes(saved.size)) return saved;
    } catch { /* Use the browse defaults when storage is unavailable. */ }
    return { layout: "Grid", size: "medium" };
  });
  useEffect(() => {
    try { localStorage.setItem("catalog-card-view-v1", JSON.stringify(view)); } catch { /* Preferences remain usable in memory. */ }
  }, [view]);
  const [viewOpen, setViewOpen] = useState(false);
  const viewId = useId();
  const [grouping, setGrouping] = useState<CardGrouping>("none");
  const [expanded, setExpanded] = useState(false);
  const layout = view.layout;
  const controls = (showExpand: boolean) => <div className="flex flex-wrap items-center gap-3">
    <CardLayoutControls value={layout} onChange={layout => setView(current => ({ ...current, layout }))} />
    {layout === "Grid" && <CardGridSizeControl value={view.size} onChange={size => setView(current => ({ ...current, size }))} />}
    {showExpand && <Button onClick={event => { event.currentTarget.focus(); setExpanded(true); }}>Expand cards</Button>}
  </div>;
  const minimum = layout === "Grid" ? CARD_GRID_MINIMUM[view.size] : "20rem";
  const content = (overview = false) => cards.length === 0 ? <InlineState className="mt-8">No cards match these filters.</InlineState> : <GroupedCardResults resultKey={JSON.stringify(cards.map(card => card.uuid))} grouping={grouping} onGrouping={setGrouping} items={cards} cardFor={card => card} pageSize={60} toolbar={<><p role="status" className="mr-auto self-center text-sm tabular-nums">{cards.length} {cards.length === 1 ? "card" : "cards"}</p>{!overview && <Button aria-expanded={viewOpen} aria-controls={viewId} onClick={() => setViewOpen(open => !open)}>View<DisclosureChevron className={viewOpen ? "rotate-180" : ""} /></Button>}{!overview && viewOpen && <div id={viewId} className="w-full rounded-xl border border-ctp-surface1 p-3">{controls(true)}</div>}</>}>{visible => <div className={`catalog-card-grid ${layout === "Grid" ? `catalog-card-grid--${view.size}` : "catalog-card-grid--rows"}`} style={{ "--catalog-card-min": minimum } as CSSProperties}>
    {visible.map(card => <CardGridItem key={card.uuid} card={card} edition={pickEdition ? pickEdition(card) : card.editions[0]} prices={prices} winRates={winRates} layout={layout} />)}
  </div>}</GroupedCardResults>;
  return <div data-component="CardGrid" className="min-w-0">
    {content()}
    {expanded && <DialogSheet title={`Card overview · ${cards.length} cards`} fullScreen onDismiss={() => setExpanded(false)}><div className="flex h-full min-h-0 flex-col gap-3"><div className="shrink-0">{controls(false)}</div><div className="min-h-0 flex-1 overflow-y-auto">{content(true)}</div></div></DialogSheet>}
  </div>;
}

function CardGridItem({ card, edition, prices, winRates, layout }: { layout: "Grid" | "Rows" | "List"; card: Card; edition: CardEdition | undefined; prices?: ReadonlyMap<string, number>; winRates?: ReadonlyMap<string, number> }) {
  const compact = layout !== "Grid";
  const [showBack, setShowBack] = useState(false);
  const reverseFace = primaryAlternateFace(card, edition);
  useEffect(() => setShowBack(false), [edition?.uuid]);
  const faceName = showBack ? reverseFace?.name ?? `${card.name} reverse face` : card.name;
  const faceEdition = showBack ? reverseFace?.edition : edition;

  return (
    <article className={`group min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2 transition-colors hover:border-ctp-blue ${compact ? "flex flex-wrap items-center gap-3" : ""}`}>
      <div className={compact ? `relative shrink-0 ${layout === "List" ? "w-12" : "w-24"}` : "relative"}>
        <Link to={`/cards/${card.slug}`} aria-label={`Open ${faceName}`} className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/50">
          <CardArtTile card={faceEdition ? { ...card, editions: [faceEdition] } : card} name={faceName} />
        </Link>
        {reverseFace && (
          <button
            type="button"
            onClick={() => setShowBack((value) => !value)}
            aria-label={`Show ${showBack ? "front" : "reverse"} face of ${card.name}`}
            aria-pressed={showBack}
            className="absolute bottom-2 right-2 flex min-h-12 min-w-12 items-center justify-center rounded-full border border-ctp-surface1 bg-ctp-base/95 px-2 text-[10px] font-semibold text-ctp-blue shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/50"
          >
            {showBack ? "Front" : "Flip"}
          </button>
        )}
      </div>
      <Link to={`/cards/${card.slug}`} className="mt-1 flex min-h-12 min-w-0 flex-1 items-center break-words rounded px-1 text-sm font-medium text-ctp-text hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">{faceName}</Link>
      {winRates?.has(card.name) && <p className="px-1 text-sm text-ctp-subtext1">{(winRates.get(card.name)! * 100).toFixed(1)}% adjusted win rate</p>}
      {prices && <p className="px-1 text-sm text-ctp-subtext1">{prices.has(card.name) ? `From ${formatUsd(prices.get(card.name)!)}` : "Price unavailable"}</p>}
    </article>
  );
}
