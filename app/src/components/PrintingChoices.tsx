import { rarityLabel } from "../features/cards/rarities";
import { useState } from "react";
import { printingLabel, type Card, type CardPrintingAllocation, type CollectionEntry } from "@gatcg/shared";
import CardResult from "./CardResult";
import Button from "./ui/Button";
import DisclosureChevron from "./DisclosureChevron";

/** Controlled edition allocation surface. Callers own drafts and persistence. */
export default function PrintingChoices({ card, quantity, value, onChange, entries, disabled = false, allowSplit = true }: {
  card: Card; quantity: number; value: CardPrintingAllocation[]; onChange: (value: CardPrintingAllocation[]) => void;
  entries?: CollectionEntry[]; disabled?: boolean; allowSplit?: boolean;
}) {
  const [split, setSplit] = useState(value.length > 1 || (value.length === 1 && value[0].quantity !== quantity));
  const [query, setQuery] = useState("");
  const specified = value.reduce((sum, item) => sum + item.quantity, 0);
  const unknown = value.filter(item => !card.editions.some(edition => edition.uuid === item.editionUuid));
  const editions = card.editions.filter(edition => `${printingLabel(edition)} ${edition.rarity}`.toLowerCase().includes(query.toLowerCase()));
  function setQuantity(editionUuid: string, count: number) {
    onChange([...value.filter(item => item.editionUuid !== editionUuid), ...(count > 0 ? [{ editionUuid, quantity: count }] : [])]);
  }
  return <div className="space-y-3">
    <div className="identity-surface rounded-2xl p-4">
      <p className="text-2xl font-semibold tabular-nums">{specified} of {quantity} identified</p>
      <p className="mt-1 text-sm text-ctp-subtext1">{Math.max(0, quantity - specified)} unspecified · Edition and artwork; finish is recorded separately.</p>
    </div>
    {specified > quantity && <p role="alert" className="text-sm text-ctp-red">Choose printings for at most {quantity} copies.</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={disabled || !value.length} onClick={() => onChange([])}>Use unspecified copies</Button>{allowSplit && <Button aria-pressed={split} onClick={() => setSplit(!split)}>{split ? "Choose one printing" : "Split copies"}</Button>}</div>
    {card.editions.length > 6 && <details className="group"><summary className="flex min-h-12 cursor-pointer items-center justify-between list-none text-sm">Find a printing<DisclosureChevron className="group-open:rotate-180" /></summary><label className="block text-sm">Set or collector number<input value={query} onChange={event => setQuery(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label></details>}
    {!card.editions.length && <p role="status" className="text-sm text-ctp-subtext1">Printing data is unavailable. Unspecified copies and existing selections are kept.</p>}
    {unknown.map(item => <div key={item.editionUuid} className="rounded-xl border border-ctp-yellow p-3 text-sm"><p>{item.quantity} × Unavailable printing ({item.editionUuid})</p><Button disabled={disabled} onClick={() => setQuantity(item.editionUuid, 0)}>Make unspecified</Button></div>)}
    {!!card.editions.length && !editions.length && <p role="status">No printings match. Try another set or number.</p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{editions.map(edition => {
      const count = value.find(item => item.editionUuid === edition.uuid)?.quantity ?? 0;
      const owned = entries?.filter(entry => entry.cardUuid === card.uuid && entry.editionUuid === edition.uuid).reduce((sum, entry) => sum + entry.ownedQuantity, 0) ?? 0;
      return <CardResult compactOnMobile key={edition.uuid} card={card} editionUuid={edition.uuid} name={card.name} selected={count > 0} newTab>
        <p className="mt-2 break-words text-sm font-medium">{printingLabel(edition)}</p>
        <p className="text-xs text-ctp-subtext1">{rarityLabel(edition.rarity)}{entries ? ` · ${owned} recorded owned` : ""}</p>
        {count > 0 && <p className="mt-1 text-sm font-semibold text-ctp-blue">✓ {count} selected</p>}
        {allowSplit && split ? <label className="mt-2 block text-sm">Copies<input aria-label={`Copies of ${printingLabel(edition)}`} type="number" min={0} max={quantity} value={count} disabled={disabled} onChange={event => { const next = Number(event.target.value); if (Number.isSafeInteger(next) && next >= 0) setQuantity(edition.uuid, next); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /></label> : <Button className="mt-2 w-full" disabled={disabled || quantity === 0} aria-label={`Use ${printingLabel(edition)} for all ${quantity} ${quantity === 1 ? "copy" : "copies"}`} aria-pressed={count === quantity} onClick={() => onChange([{ editionUuid: edition.uuid, quantity }])}>Use for all {quantity} {quantity === 1 ? "copy" : "copies"}</Button>}
      </CardResult>;
    })}</div>
  </div>;
}