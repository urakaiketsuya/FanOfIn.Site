import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BinderItem, Card, CollectionEntry } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import CardResult from "../../components/CardResult";
import PrintingChoices from "../../components/PrintingChoices";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";
import { accountApi } from "../../lib/accountApi";

const inputClass = "mt-1 block min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base";
export default function BinderItemEditor({ cards, collection, item, onDismiss, onSaved }: {
  cards: Card[]; collection: CollectionEntry[]; item?: BinderItem; onDismiss: () => void; onSaved: () => void;
}) {
  const [kind, setKind] = useState(item?.kind ?? "available");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<{ uuid: string; name: string } | null>(item ? { uuid: item.cardUuid, name: item.cardName } : null);
  const [editionUuid, setEditionUuid] = useState(item?.editionUuid ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [condition, setCondition] = useState(item?.condition ?? "Any");
  const [language, setLanguage] = useState(item?.language ?? "Any");
  const [alternatives, setAlternatives] = useState(item?.acceptsAlternatives ?? true);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [active, setActive] = useState(0), [open, setOpen] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const id = useId();
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, id, open]);
  const options = useMemo(() => kind === "available"
    ? [...new Map(collection.filter(entry => entry.ownedQuantity > 0).map(entry => [entry.cardUuid, { uuid: entry.cardUuid, name: entry.cardName }])).values()]
    : cards.map(card => ({ uuid: card.uuid, name: card.name })), [cards, collection, kind]);
  const results = useMemo(() => options.filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12), [options, query]);
  const card = cards.find(card => card.uuid === chosen?.uuid);
  function choose(value: { uuid: string; name: string }) { setChosen(value); setEditionUuid(kind === "available" ? collection.find(row => row.cardUuid === value.uuid && row.ownedQuantity > 0)?.editionUuid ?? "" : ""); setOpen(false); setSaved(false); setQuery(value.name); setDirty(true); }
  async function save() {
    if (!chosen) return;
    setBusy(true); setError("");
    const edition = card?.editions.find(row => row.uuid === editionUuid);
    const source = collection.find(row => row.cardUuid === chosen.uuid && (row.editionUuid ?? "") === editionUuid);
    const value = { kind, cardUuid: chosen.uuid, cardName: chosen.name, editionUuid: editionUuid || null,
      setPrefix: edition?.set.prefix ?? source?.setPrefix ?? (editionUuid === item?.editionUuid ? item.setPrefix : null),
      collectorNumber: edition?.collector_number ?? source?.collectorNumber ?? (editionUuid === item?.editionUuid ? item.collectorNumber : null),
      quantity, condition, language, acceptsAlternatives: alternatives };
    try {
      if (item) await accountApi.updateBinderItem(item.id, value); else await accountApi.addBinderItem(value);
      onSaved();
      if (item) onDismiss();
      else { setChosen(null); setQuery(""); setEditionUuid(""); setQuantity(1); setDirty(false); setSaved(true); setError(""); search.current?.focus(); }
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save. Try again."); }
    finally { setBusy(false); }
  }
  return <DialogSheet title={item ? "Edit listing" : "Add card"} onDismiss={onDismiss} dirty={dirty} dismissible={!busy} footer={<>
    {saved && <p role="status" className="mb-2 text-sm">Card added. Search for another card.</p>}
    {error && <p role="alert" className="mb-2 text-sm text-ctp-red">{error}</p>}
    <Button disabled={busy || !chosen || !Number.isInteger(quantity) || quantity < Math.max(1, item?.reservedQuantity ?? 0) || quantity > 999} onClick={() => void save()}>{busy ? "Saving…" : item ? "Save listing" : "Add card"}</Button>
  </>}><fieldset disabled={busy} onChange={() => setDirty(true)} className="min-w-0 space-y-4">
    {!item && <label className="block text-sm">List<select className={inputClass} value={kind} onChange={event => { setKind(event.target.value as typeof kind); setChosen(null); setQuery(""); setEditionUuid(""); }}><option value="available">Available</option><option value="wanted">Wanted</option></select></label>}
    {!item && <div><label htmlFor={id} className="text-sm">Search {kind === "available" ? "owned cards" : "cards"}</label>
      <input ref={search} id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-results`} aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined} autoComplete="off" className={inputClass} value={query} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); setChosen(null); }} onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(index => (index + (event.key === "ArrowDown" ? 1 : -1) + Math.max(1, results.length)) % Math.max(1, results.length)); }
        if (event.key === "Enter" && open && results[active]) { event.preventDefault(); choose(results[active]); }
      }} />
      {open && <div id={`${id}-results`} role="listbox" aria-label="Matching cards" className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-ctp-surface1">
        {results.map((result, index) => <div key={result.uuid} id={`${id}-${index}`} role="option" aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose(result)} className={`flex min-h-12 cursor-pointer items-center gap-3 p-2 ${active === index ? "bg-ctp-surface1" : ""}`}><div className="w-12 shrink-0"><CardArtTile card={cards.find(card => card.uuid === result.uuid)} name={result.name} /></div><span className="text-sm">{result.name}</span></div>)}
        {!results.length && <p role="status" className="p-3 text-sm">{options.length ? "No matching cards." : kind === "available" ? "No owned cards recorded. Add copies in your collection first." : "Card catalog unavailable. Sync cards and try again."}</p>}
      </div>}
    </div>}
    {chosen && <><CardResult compactOnMobile card={card} name={chosen.name} editionUuid={editionUuid || undefined} newTab><p className="text-sm">{kind === "wanted" ? "Wanted" : "Available"}</p></CardResult>
      <label className="block text-sm">Quantity<input type="number" min={Math.max(1, item?.reservedQuantity ?? 0)} max={999} className={inputClass} value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></label>
      {card && <div><h3 className="mb-2 text-sm font-semibold">{kind === "wanted" ? "Preferred printing · unspecified means any" : "Owned printing"}</h3><PrintingChoices card={kind === "wanted" ? card : { ...card, editions: card.editions.filter(edition => collection.some(row => row.cardUuid === card.uuid && row.editionUuid === edition.uuid && row.ownedQuantity > 0) || edition.uuid === item?.editionUuid) }} entries={kind === "available" ? collection : undefined} allowSplit={false} quantity={Number.isInteger(quantity) && quantity > 0 ? quantity : 1} value={editionUuid ? [{ editionUuid, quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1 }] : []} onChange={value => { setEditionUuid(value[0]?.editionUuid ?? ""); setDirty(true); }} /></div>}
      {kind === "wanted" && <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={alternatives} onChange={event => setAlternatives(event.target.checked)} />Accept alternative printings</label>}
      <label className="block text-sm">Condition<select className={inputClass} value={condition} onChange={event => setCondition(event.target.value)}>{[...new Set([item?.condition ?? "Any", "Any", "Near mint", "Lightly played", "Moderately played", "Heavily played", "Damaged"])].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-sm">Language<select className={inputClass} value={language} onChange={event => setLanguage(event.target.value)}>{[...new Set([item?.language ?? "Any", "Any", "English", "Japanese", "Chinese", "Korean"])].map(value => <option key={value}>{value}</option>)}</select></label>
    </>}
  </fieldset></DialogSheet>;
}
