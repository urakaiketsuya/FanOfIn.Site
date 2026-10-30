import CardLayoutControls from "../../components/CardLayoutControls";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import { formatUsd } from "../../lib/format";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, CardEdition } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import { InlineState } from "../../components/ui/ContentState";
import { primaryAlternateFace } from "../../lib/cardFaces";

interface CardGridProps {
  cards: Card[];
  prices?: ReadonlyMap<string, number>;
  /** Which edition's art to show per card – defaults to the first. Set detail pages pass the edition from that set. */
  pickEdition?: (card: Card) => CardEdition | undefined;
}

export default function CardGrid({ cards, pickEdition, prices }: CardGridProps) {
  const prefs = useDecklistDisplayPrefs();
  const [expanded, setExpanded] = useState(false);
  const layout = prefs.displayMode === "detailed" ? "List" : prefs.visualCardSize === "rows" ? "Rows" : "Grid";
  const controls = (showExpand: boolean) => <div className="flex flex-wrap items-center justify-between gap-3">
    <CardLayoutControls value={layout} onChange={value => {
      prefs.setDisplayMode(value === "List" ? "detailed" : "visual");
      if (value === "Rows") prefs.setVisualCardSize("rows");
      else if (value === "Grid" && prefs.visualCardSize === "rows") prefs.setVisualCardSize("medium");
    }} />
    {layout === "Grid" && <label className="flex items-center gap-2 text-sm">Grid size<select aria-label="Grid size" value={prefs.visualCardSize} onChange={event => prefs.setVisualCardSize(event.target.value as "large" | "medium" | "compact")} className="min-h-control rounded border border-ctp-surface1 bg-ctp-base px-2 focus-visible:outline-2 focus-visible:outline-ctp-blue"><option value="large">Large</option><option value="medium">Medium</option><option value="compact">Compact</option></select></label>}
    {showExpand && <Button onClick={() => setExpanded(true)}>Expand cards</Button>}
  </div>;
  const minimum = layout === "Grid" ? ({ large: "9rem", medium: "6.5rem", compact: "4.75rem", rows: "9rem" }[prefs.visualCardSize]) : "20rem";
  const content = cards.length === 0 ? <InlineState className="mt-8">No cards match these filters.</InlineState> : <div className="mt-4 grid items-start gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minimum}), 1fr))` }}>
    {cards.map(card => <CardGridItem key={card.uuid} card={card} edition={pickEdition ? pickEdition(card) : card.editions[0]} prices={prices} layout={layout} />)}
  </div>;
  return <div data-component="CardGrid" className="mt-6 min-w-0">
    {controls(true)}{content}
    {expanded && <DialogSheet title={`Card overview · ${cards.length} cards`} fullScreen onDismiss={() => setExpanded(false)}><div className="flex h-full min-h-0 flex-col gap-3"><div className="shrink-0">{controls(false)}</div><div className="min-h-0 flex-1 overflow-y-auto">{content}</div></div></DialogSheet>}
  </div>;
}

function CardGridItem({ card, edition, prices, layout }: { layout: "Grid" | "Rows" | "List"; card: Card; edition: CardEdition | undefined; prices?: ReadonlyMap<string, number> }) {
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
          <CardArtTile card={faceEdition ? { ...card, editions: [faceEdition] } : undefined} name={faceName} />
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
      {prices && <p className="px-1 text-sm text-ctp-subtext1">{prices.has(card.name) ? `From ${formatUsd(prices.get(card.name)!)}` : "Price unavailable"}</p>}
    </article>
  );
}
