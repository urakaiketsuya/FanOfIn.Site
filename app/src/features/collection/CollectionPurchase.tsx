import { useState, type ReactNode } from "react";
import type { Card } from "@gatcg/shared";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { shoppingBatches, shoppingLines, type ShoppingChoice } from "./collectionShopping";

export interface CollectionPurchaseMode {
  active: boolean;
  choices: Record<string, ShoppingChoice>;
  choose: (id: string, name: string, quantity: number) => void;
}

/** Shopping changes the shared grid's interaction; it never renders a second card grid. */
export default function CollectionPurchase({ cards, preview, children }: {
  cards: Card[]; preview?: boolean; children: (mode: CollectionPurchaseMode) => ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [review, setReview] = useState(false);
  const [choices, setChoices] = useState<Record<string, ShoppingChoice>>({});
  const [message, setMessage] = useState("");
  const lines = shoppingLines(choices);
  const batches = shoppingBatches(lines);
  const list = lines.map(line => `${line.quantity} ${line.name}`).join("\n");
  const hidden = Object.keys(choices).filter(id => !cards.some(card => card.uuid === id)).length;
  const control = "min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue";
  function choose(id: string, name: string, quantity: number) {
    setChoices(current => { const next = { ...current }; if (quantity > 0) next[id] = { name, quantity }; else delete next[id]; return next; });
    setMessage("");
  }
  return <>
    {!preview && <div className="my-3 flex flex-wrap items-center gap-2">
      <button type="button" aria-pressed={active} onClick={() => setActive(!active)} className={control}>{active ? "Done selecting" : "Select to buy"}</button>
      {active && <button type="button" disabled={!cards.length} onClick={() => setChoices(current => ({ ...current, ...Object.fromEntries(cards.map(card => [card.uuid, current[card.uuid] ?? { name: card.name, quantity: 1 }])) }))} className={control}>Select all {cards.length}</button>}
      {!!lines.length && <button type="button" onClick={() => setReview(true)} className={`${control} border-ctp-blue`}>Review purchase ({lines.length})</button>}
    </div>}
    {active && <p role="status" className="mb-3 text-sm text-ctp-subtext1">Select cards below to buy.{hidden > 0 ? ` ${hidden} selected outside these filters.` : ""}</p>}
    {children({ active, choices, choose })}
    {review && <EditorDialog title="Review purchase" doneLabel="Back to cards" onDismiss={() => setReview(false)}>
      <p className="text-sm text-ctp-subtext1">Choose quantities, then open TCGplayer. Printing and condition are chosen there.</p>
      <div className="my-3 divide-y divide-ctp-surface1">{Object.entries(choices).map(([id, choice]) => <div key={id} className="flex flex-wrap items-center gap-2 py-3">
        <span className="min-w-0 flex-1 text-sm">{choice.name}</span>
        <input type="number" min={0} max={99} aria-label={`Buy quantity for ${choice.name}`} value={choice.quantity} onChange={event => choose(id, choice.name, Math.max(0, Math.min(99, Math.floor(Number(event.target.value) || 0))))} className="min-h-12 w-16 rounded-lg border border-ctp-surface1 bg-ctp-base px-2" />
        <button type="button" aria-label={`Remove ${choice.name} from shopping list`} onClick={() => choose(id, choice.name, 0)} className={control}>Remove</button>
      </div>)}</div>
      {!lines.length && <p role="status">No cards selected.</p>}
      {batches.length > 1 && <p className="my-2 text-sm">Open each of the {batches.length} batches to include all selected cards.</p>}
      <div className="flex flex-wrap gap-2">{batches.map((batch, index) => <a key={index} href={buildTcgplayerMassEntryUrl(batch)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-lg bg-ctp-blue px-3 text-sm font-medium text-ctp-base">TCGplayer Mass Entry{batches.length > 1 ? ` · ${index + 1}` : ""} ↗</a>)}</div>
      {!!lines.length && <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(list); setMessage("Copied."); } catch { setMessage("Copy the list below."); } }} className={`${control} mt-3`}>Copy list</button>}
      {message && <><p role="status" className="my-2 text-sm">{message}</p><textarea aria-label="Shopping list" readOnly value={list} rows={4} className="w-full rounded-lg border border-ctp-surface1 bg-ctp-base p-2" /></>}
    </EditorDialog>}
  </>;
}
