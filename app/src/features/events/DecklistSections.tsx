import { Link } from "react-router-dom";
import type { Card, CardInclusionEntry, DeckCollectionLine, OmnidexDecklistCardLine } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import { primaryAlternateFace } from "../../lib/cardFaces";
import ElementIcon from "../../components/ElementIcon";
import { VisualCardTile, type VisualFieldVisibility } from "../../components/VisualCardTile";
import Section from "../../components/ui/Section";
import { computeSectionPrice } from "../../lib/deckPrice";
import { formatUsd } from "../../lib/format";
import type { VisualCardSize } from "../../lib/decklistDisplayPrefs";
import type { PriceTrendEntry } from "../pricing/usePriceTrendByName";
import type { SimulatorCardEvidence } from "../deckbuilder/useSimulatorSuggestedBuild";

export type DecklistSection = { title: string; lines: OmnidexDecklistCardLine[] };

export function DetailedDeckSection({ title, lines, cardsByName, priceByName, showThumbnails, ownershipByName }: DecklistSection & { cardsByName: Map<string, Card>; priceByName: Map<string, number>; showThumbnails: boolean; ownershipByName?: Map<string, DeckCollectionLine> }) {
  if (lines.length === 0) return null;
  const total = lines.reduce((n, line) => n + line.quantity, 0);
  const price = computeSectionPrice(lines, priceByName);
  return <Section heading="dense" title={<>{title} · {total}{price.total > 0 && <span className="ml-1 normal-case text-ctp-subtext1">· {formatUsd(price.total)}</span>}</>}>
    <ul className="mt-1 space-y-1">{lines.map((line) => { const card = cardsByName.get(line.card); const unitPrice = priceByName.get(line.card); const ownership = ownershipByName?.get(line.card); return <li key={line.card} className={`flex min-h-9 items-center gap-1.5 rounded-lg px-1.5 text-sm ${ownership?.missing ? "border border-ctp-yellow/35 bg-ctp-yellow/10" : ""}`}>
      <span className="w-6 shrink-0 text-right text-ctp-subtext0">{line.quantity}x</span>
      {showThumbnails && (card?.editions[0] ? <CardImage image={card.editions[0].image} alt={line.card} className="h-8 w-6 shrink-0 rounded object-cover object-top" /> : <div className="h-8 w-6 shrink-0 rounded bg-ctp-surface0" />)}
      {card && <ElementIcon element={card.element} size={14} />}
      {card ? <CardHoverPreview image={card.editions[0]?.image} backImage={primaryAlternateFace(card)?.edition.image} backAlt={primaryAlternateFace(card)?.name} alt={line.card}><Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">{line.card}</Link></CardHoverPreview> : <span className="text-ctp-text">{line.card}</span>}
      {card?.types.includes("CHAMPION") && <span className="shrink-0 rounded-full border border-ctp-blue px-1.5 text-[10px] text-ctp-blue">Champion</span>}
      {ownership?.missing ? <span className="ml-auto shrink-0 rounded-full bg-ctp-yellow/15 px-2 py-0.5 text-[10px] font-semibold text-ctp-yellow">Missing {ownership.missing}</span> : null}
      {unitPrice !== undefined && <span className={`${ownership?.missing ? "" : "ml-auto"} shrink-0 text-xs text-ctp-subtext0`}>{formatUsd(unitPrice * line.quantity)}</span>}
    </li>; })}</ul>
  </Section>;
}

export function CompactDeckSection({ title, lines, cardsByName, ownershipByName, priceByName }: DecklistSection & { cardsByName: Map<string, Card>; ownershipByName?: Map<string, DeckCollectionLine>; priceByName?: Map<string, number> }) {
  if (lines.length === 0) return null;
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  const price = priceByName ? computeSectionPrice(lines, priceByName) : null;
  const columns = title === "Main" ? "sm:grid-cols-2 lg:grid-cols-4" : title === "Material" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return <Section heading="dense" title={<>{title} · {total}{price && price.total > 0 && <span className="ml-1 normal-case text-ctp-subtext1">· {formatUsd(price.total)}</span>}</>}><ul className={`mt-2 grid gap-x-4 gap-y-1.5 ${columns}`}>{lines.map((line) => { const card = cardsByName.get(line.card); const reverseFace = primaryAlternateFace(card); const missing = ownershipByName?.get(line.card)?.missing ?? 0; return <li key={line.card} className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg px-1.5 text-sm ${missing ? "border border-ctp-yellow/35 bg-ctp-yellow/10" : ""}`}>{card?.editions[0] ? <CardImage image={card.editions[0].image} alt={line.card} className="h-9 w-6 shrink-0 rounded-sm object-cover object-top" /> : <div className="h-9 w-6 shrink-0 rounded-sm bg-ctp-surface0" />}{line.quantity > 1 && <span className="shrink-0 text-ctp-subtext0">{line.quantity}x</span>}<span className="min-w-0 truncate">{card ? <CardHoverPreview image={card.editions[0]?.image} backImage={reverseFace?.edition.image} backAlt={reverseFace?.name} alt={line.card}><Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">{line.card}</Link></CardHoverPreview> : <span className="text-ctp-text">{line.card}</span>}</span>{missing > 0 && <span className="ml-auto shrink-0 text-[10px] font-semibold text-ctp-yellow">−{missing}</span>}{priceByName?.has(line.card) && <span className="ml-auto shrink-0 text-xs text-ctp-subtext0">{formatUsd(priceByName.get(line.card)! * line.quantity)}</span>}</li>; })}</ul></Section>;
}

const CARD_SIZE_CLASSES: Record<VisualCardSize, string> = { large: "grid-cols-2 gap-3", medium: "grid-cols-3 gap-2 sm:grid-cols-4", compact: "grid-cols-4 gap-2" };

export function VisualDeckSections({ sections, cardsByName, cardSize, priceByName, priceTrendByName, simulatorEvidenceByName, communityInclusionByName, fields, ownershipByName }: { sections: DecklistSection[]; cardsByName: Map<string, Card>; cardSize: VisualCardSize; priceByName: Map<string, number>; priceTrendByName: Map<string, PriceTrendEntry>; simulatorEvidenceByName: Map<string, SimulatorCardEvidence>; communityInclusionByName: Map<string, CardInclusionEntry> | undefined; fields: VisualFieldVisibility; ownershipByName?: Map<string, DeckCollectionLine> }) {
  return <div className="space-y-6">{sections.map(({ title, lines }) => lines.length > 0 && <Section key={title} heading="dense" title={<>{title} · {lines.reduce((sum, line) => sum + line.quantity, 0)}{fields.price && computeSectionPrice(lines, priceByName).total > 0 && <span className="ml-1 normal-case text-ctp-subtext1">· {formatUsd(computeSectionPrice(lines, priceByName).total)}</span>}</>}><div className={`mt-2 grid ${CARD_SIZE_CLASSES[cardSize]}`}>{lines.map((line) => { const missing = ownershipByName?.get(line.card)?.missing ?? 0; return <div key={line.card} className={missing ? "rounded-xl border-2 border-ctp-yellow bg-ctp-yellow/10 p-1" : ""}><VisualCardTile line={line} card={cardsByName.get(line.card)} unitPrice={priceByName.get(line.card)} priceTrend={priceTrendByName.get(line.card)} communityEntry={communityInclusionByName?.get(line.card)} simulatorEvidence={simulatorEvidenceByName.get(line.card)} fields={fields} footer={missing > 0 ? <p className="mt-1 text-center text-[10px] font-semibold text-ctp-yellow">Missing {missing}</p> : undefined} /></div>; })}</div></Section>)}</div>;
}
