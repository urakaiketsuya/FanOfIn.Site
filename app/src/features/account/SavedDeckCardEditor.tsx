import type { Card, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";

export type DeckSectionKey = keyof OmnidexDecklist;

const EDIT_SECTIONS: { key: DeckSectionKey; title: string }[] = [
  { key: "main", title: "Main" },
  { key: "material", title: "Material" },
  { key: "sideboard", title: "Sideboard" },
];

function EditableCardTile({ line, card, section, onChangeQuantity, onMove, onRemove }: { line: OmnidexDecklistCardLine; card: Card | undefined; section: DeckSectionKey; onChangeQuantity: (quantity: number) => void; onMove: (section: DeckSectionKey) => void; onRemove: () => void }) {
  const maxQuantity = Math.max(1, Math.min(card?.legality?.STANDARD?.limit ?? 4, 4));
  return <div className="overflow-hidden rounded-lg border border-ctp-surface1">
    <div className="relative aspect-[5/7] bg-ctp-surface0">
      <CardHoverPreview image={card?.editions[0]?.image} alt={line.card}>
        {card ? <Link to={`/cards/${card.slug}`} title={line.card} className="block h-full w-full">{card.editions[0] ? <CardImage image={card.editions[0].image} alt={line.card} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{line.card}</span>}</Link> : <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{line.card}</span>}
      </CardHoverPreview>
      <input type="number" min={1} max={maxQuantity} value={line.quantity} aria-label={`Copies of ${line.card}`} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1) onChangeQuantity(Math.min(next, maxQuantity)); }} className="absolute right-1.5 top-1.5 w-11 rounded border border-ctp-surface1 bg-ctp-base/90 px-1 py-0.5 text-right text-xs text-ctp-text focus:border-ctp-blue focus:outline-none" />
    </div>
    <div className="grid grid-cols-[1fr_auto] border-t border-ctp-surface1">
      <select value={section} onChange={(event) => onMove(event.target.value as DeckSectionKey)} aria-label={`Move ${line.card} to section`} className="min-w-0 bg-ctp-base px-2 py-2 text-xs text-ctp-subtext1 focus:outline-none"><option value="main">Main</option><option value="material">Material</option><option value="sideboard">Sideboard</option></select>
      <button type="button" onClick={onRemove} className="border-l border-ctp-surface1 px-2 py-1.5 text-xs text-ctp-subtext1 hover:bg-ctp-red/10 hover:text-ctp-red" aria-label={`Remove ${line.card}`}>×</button>
    </div>
  </div>;
}

export function MaybeboardCardTile({ line, card, onChangeQuantity, onMove, onRemove }: { line: OmnidexDecklistCardLine; card: Card | undefined; onChangeQuantity: (quantity: number) => void; onMove: () => void; onRemove: () => void }) {
  const maxQuantity = Math.max(1, Math.min(card?.legality?.STANDARD?.limit ?? 4, 4));
  return <div className="overflow-hidden rounded-lg border border-ctp-yellow/40 bg-ctp-mantle">
    <div className="relative aspect-[5/7] bg-ctp-surface0"><CardHoverPreview image={card?.editions[0]?.image} alt={line.card}>{card?.editions[0] ? <Link to={`/cards/${card.slug}`} className="block h-full w-full"><CardImage image={card.editions[0].image} alt={line.card} className="h-full w-full object-cover" /></Link> : <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{line.card}</span>}</CardHoverPreview><input type="number" min={1} max={maxQuantity} value={line.quantity} aria-label={`Maybeboard copies of ${line.card}`} onChange={(event) => { const quantity = Number(event.target.value); if (Number.isInteger(quantity) && quantity >= 1) onChangeQuantity(Math.min(quantity, maxQuantity)); }} className="absolute right-1.5 top-1.5 w-11 rounded border border-ctp-surface1 bg-ctp-base/90 px-1 py-0.5 text-right text-xs text-ctp-text" /></div>
    <div className="grid grid-cols-[1fr_auto] border-t border-ctp-surface1"><button type="button" onClick={onMove} className="min-h-10 px-2 text-left text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10">Move to editor</button><button type="button" onClick={onRemove} aria-label={`Remove ${line.card} from maybeboard`} className="min-h-10 min-w-10 border-l border-ctp-surface1 text-ctp-subtext1 hover:bg-ctp-red/10 hover:text-ctp-red">×</button></div>
  </div>;
}

export function EditableDecklistGrid({ decklist, cardsByName, onChangeQuantity, onMove, onRemove }: { decklist: OmnidexDecklist; cardsByName: Map<string, Card>; onChangeQuantity: (section: DeckSectionKey, name: string, quantity: number) => void; onMove: (from: DeckSectionKey, to: DeckSectionKey, name: string) => void; onRemove: (section: DeckSectionKey, name: string) => void }) {
  const sections = EDIT_SECTIONS.map((section) => ({ ...section, lines: decklist[section.key] })).filter((section) => section.lines.length > 0);
  if (sections.length === 0) return <p className="text-sm text-ctp-subtext1">No cards yet. Search above to begin building.</p>;
  return <div className="space-y-5">{sections.map((section) => <details key={section.key} open className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ctp-text [&::-webkit-details-marker]:hidden"><span>{section.title}</span><span className="flex items-center gap-2"><span className="rounded-full bg-ctp-surface0 px-2 py-0.5 text-xs font-normal text-ctp-subtext1">{section.lines.reduce((total, line) => total + line.quantity, 0)} cards</span><span aria-hidden="true" className="text-ctp-subtext0 transition-transform group-open:rotate-180">⌄</span></span></summary>
    <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">{section.lines.map((line) => <EditableCardTile key={line.card} line={line} card={cardsByName.get(line.card)} section={section.key} onChangeQuantity={(quantity) => onChangeQuantity(section.key, line.card, quantity)} onMove={(destination) => onMove(section.key, destination, line.card)} onRemove={() => onRemove(section.key, line.card)} />)}</div>
  </details>)}</div>;
}

export { EDIT_SECTIONS };
