import type { DisplayDeckLine } from "../../lib/decklistArrangement";
import { cardWithPrinting } from "@gatcg/shared";
import { Link } from "react-router-dom";
import type { Card, CardInclusionEntry, DeckCollectionLine } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import { primaryAlternateFace } from "../../lib/cardFaces";
import ElementIcon from "../../components/ElementIcon";
import { VisualCardTile, type VisualFieldVisibility } from "../../components/VisualCardTile";
import DeckSection from "./DeckSection";
import { computeSectionPrice } from "../../lib/deckPrice";
import { formatUsd } from "../../lib/format";
import type { VisualCardSize } from "../../lib/decklistDisplayPrefs";
import type { PriceTrendEntry } from "../pricing/usePriceTrendByName";
import type { SimulatorCardEvidence } from "../deckbuilder/useSimulatorSuggestedBuild";

export type DecklistSection = { title: string; lines: DisplayDeckLine[] };

/** Display allocations separately without changing the saved deck or section totals. */
function printingRows(lines: DisplayDeckLine[]) {
  return lines.flatMap(line => {
    const rows: DisplayDeckLine[] = (line.printings ?? []).map(printing => ({
      ...line, quantity: printing.quantity, printings: [printing],
    }));
    const unspecified = line.quantity - rows.reduce((sum, row) => sum + row.quantity, 0);
    if (unspecified > 0) rows.push({ ...line, quantity: unspecified, printings: undefined });
    return rows.map((row, index) => ({
      line: row,
      key: `${line.displayKey ?? line.card}:${row.printings?.[0]?.editionUuid ?? "unspecified"}`,
      showOwnership: index === 0,
      mixed: rows.length > 1,
    }));
  });
}

export function DetailedDeckSection({ title, lines, cardsByName, priceByName, showThumbnails, ownershipByName }: DecklistSection & { cardsByName: Map<string, Card>; priceByName: Map<string, number>; showThumbnails: boolean; ownershipByName?: Map<string, DeckCollectionLine> }) {
  if (lines.length === 0) return null;
  const total = lines.reduce((n, line) => n + line.quantity, 0);
  const price = computeSectionPrice(lines, priceByName);
  return <DeckSection title={title} count={title === "Tokens" ? lines.length : total} price={price.total > 0 ? formatUsd(price.total) : undefined}>
    <ul className="mt-1 space-y-1">{printingRows(lines).map(({ line, key, showOwnership, mixed }) => { const originalCard = cardsByName.get(line.card); const card = cardWithPrinting(originalCard, line.printings?.[0]?.editionUuid); const unitPrice = priceByName.get(line.card); const ownership = showOwnership ? ownershipByName?.get(line.card) : undefined; return <li key={key} className={`flex flex-wrap min-h-12 items-center gap-1.5 rounded-lg px-1.5 text-sm ${ownership?.missing ? "border border-ctp-yellow/35 bg-ctp-yellow/10" : ""}`}>
      <span className="w-6 shrink-0 text-right text-ctp-subtext0">{line.quantity}x</span>
      {showThumbnails && (card?.editions[0] ? <CardImage image={card.editions[0].image} alt={line.card} className="h-8 w-6 shrink-0 rounded object-cover object-top" /> : <div className="h-8 w-6 shrink-0 rounded bg-ctp-surface0" />)}
      {card && <ElementIcon element={card.element} size={14} />}
      {card ? <CardHoverPreview image={card.editions[0]?.image} backImage={primaryAlternateFace(card)?.edition.image} backAlt={primaryAlternateFace(card)?.name} alt={line.card}><Link to={`/cards/${card.slug}`} className="inline-flex min-h-control items-center text-ctp-text hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">{line.card}</Link></CardHoverPreview> : <span className="text-ctp-text">{line.card}</span>}
      {line.location && <span className="text-xs text-ctp-subtext1">{line.location}</span>}
      {card?.types.includes("CHAMPION") && <span className="shrink-0 rounded-full border border-ctp-blue px-1.5 text-[10px] text-ctp-blue">Champion</span>}
      {ownership?.missing ? <span className="ml-auto shrink-0 rounded-full bg-ctp-yellow/15 px-2 py-0.5 text-[10px] font-semibold text-ctp-yellow">Missing {ownership.missing}{mixed ? " total" : ""}</span> : null}
      {unitPrice !== undefined && <span className={`${ownership?.missing ? "" : "ml-auto"} shrink-0 text-xs text-ctp-subtext0`}>{formatUsd(unitPrice * line.quantity)}</span>}
    </li>; })}</ul>
  </DeckSection>;
}

const CARD_SIZE_CLASSES: Record<VisualCardSize, string> = { rows: "grid-cols-1 gap-3", large: "grid-cols-2 gap-3", medium: "grid-cols-3 gap-2 sm:grid-cols-4", compact: "grid-cols-4 gap-2" };

export function VisualDeckSections({ sections, cardsByName, cardSize, priceByName, priceTrendByName, simulatorEvidenceByName, communityInclusionByName, fields, ownershipByName }: { sections: DecklistSection[]; cardsByName: Map<string, Card>; cardSize: VisualCardSize; priceByName: Map<string, number>; priceTrendByName: Map<string, PriceTrendEntry>; simulatorEvidenceByName: Map<string, SimulatorCardEvidence>; communityInclusionByName: Map<string, CardInclusionEntry> | undefined; fields: VisualFieldVisibility; ownershipByName?: Map<string, DeckCollectionLine> }) {
  return <div className="space-y-6">{sections.map(({ title, lines }) => lines.length > 0 && <DeckSection key={title} title={title} count={title === "Tokens" ? lines.length : lines.reduce((sum, line) => sum + line.quantity, 0)} price={fields.price && computeSectionPrice(lines, priceByName).total > 0 ? formatUsd(computeSectionPrice(lines, priceByName).total) : undefined}><div className={`mt-2 grid ${CARD_SIZE_CLASSES[cardSize]}`}>{printingRows(lines).map(({ line, key, showOwnership, mixed }) => { const missing = showOwnership ? ownershipByName?.get(line.card)?.missing ?? 0 : 0; return <div key={key} className={missing ? "rounded-xl border-2 border-ctp-yellow bg-ctp-yellow/10 p-1" : ""}><VisualCardTile layout={cardSize === "rows" ? "row" : "tile"} line={line} card={cardWithPrinting(cardsByName.get(line.card), line.printings?.[0]?.editionUuid)} unitPrice={priceByName.get(line.card)} priceTrend={priceTrendByName.get(line.card)} communityEntry={communityInclusionByName?.get(line.card)} simulatorEvidence={simulatorEvidenceByName.get(line.card)} fields={fields} footer={<>{cardSize === "rows" && line.location && <p className="mt-1 text-xs text-ctp-subtext1">{line.location}</p>}{missing > 0 ? <p className="mt-1 text-center text-[10px] font-semibold text-ctp-yellow">Missing {missing}{mixed ? " total" : ""}</p> : undefined}</>} />{cardSize !== "rows" && <p className="mt-1 break-words text-xs text-ctp-text">{line.quantity}× {line.card}</p>}{cardSize !== "rows" && line.location && <p className="mt-1 text-xs text-ctp-subtext1">{line.location}</p>}</div>; })}</div></DeckSection>)}</div>;
}
