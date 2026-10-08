import { useMemo, useState } from "react";
import { collectionEntryKey, finishLabel, type Card, type CollectionEntry, type CollectionUpdateLine } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import DialogSheet from "../../components/ui/DialogSheet";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";

/** A local draft; only Save changes writes inventory. Printing and proxy quantities stay distinct. */
export default function DeckOwnershipEditor({ required, entries, cardsByName, onSave, onDismiss }: {
  required: CollectionUpdateLine[]; entries: CollectionEntry[]; cardsByName: Map<string, Card>;
  onSave: (lines: CollectionUpdateLine[]) => Promise<boolean>; onDismiss: () => void;
}) {
  const [baseline] = useState(entries);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [ownership, setOwnership] = useState("all");
  const [element, setElement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => required.map(line => {
    const saved = baseline.filter(entry => entry.cardUuid === line.cardUuid);
    const canonical = saved.find(entry => !entry.editionUuid && (!entry.finish || entry.finish === "unspecified")) ?? { cardUuid: line.cardUuid, cardName: line.cardName, ownedQuantity: 0, proxyQuantity: 0, updatedAt: "" };
    return { required: line, entries: [canonical, ...saved.filter(entry => entry.editionUuid || (entry.finish && entry.finish !== "unspecified"))] };
  }), [baseline, required]);
  const value = (entry: CollectionEntry) => quantities[collectionEntryKey(entry)] ?? String(entry.ownedQuantity);
  const changed = rows.flatMap(row => row.entries.filter(entry => value(entry) !== String(entry.ownedQuantity)));
  const invalid = changed.some(entry => value(entry).trim() === "" || !Number.isInteger(Number(value(entry))) || Number(value(entry)) < 0 || Number(value(entry)) > 9999);
  const elements = [...new Set(rows.flatMap(row => cardsByName.get(row.required.cardName)?.elements ?? []))].sort();
  const visibleRows = rows.filter(row => {
    const total = row.entries.reduce((sum, entry) => sum + (Number(value(entry)) || 0), 0);
    const matchesOwnership = ownership === "all" || (ownership === "missing" && total < row.required.quantity)
      || (ownership === "complete" && total >= row.required.quantity)
      || (ownership === "changed" && row.entries.some(entry => value(entry) !== String(entry.ownedQuantity)));
    return matchesOwnership && row.required.cardName.toLowerCase().includes(query.trim().toLowerCase())
      && (!element || cardsByName.get(row.required.cardName)?.elements.includes(element));
  });
  function field(entry: CollectionEntry, label: string) {
    return <label key={collectionEntryKey(entry)} className="mt-2 block text-xs text-ctp-subtext1">{label} · {finishLabel(entry.finish)}<input aria-label={`${label} · ${finishLabel(entry.finish)} for ${entry.cardName}`} type="number" min={0} max={9999} step={1} inputMode="numeric" disabled={busy} value={value(entry)} onChange={event => setQuantities(current => ({ ...current, [collectionEntryKey(entry)]: event.target.value }))} className="mt-1 min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue" /></label>;
  }
  async function save() {
    if (!changed.length || invalid || busy) return;
    setBusy(true); setError(null);
    try {
      const saved = await onSave(changed.map(entry => ({ cardUuid: entry.cardUuid, cardName: entry.cardName, editionUuid: entry.editionUuid, finish: entry.finish, setPrefix: entry.setPrefix, collectorNumber: entry.collectorNumber, quantity: Number(value(entry)), proxyQuantity: entry.proxyQuantity })));
      if (saved) onDismiss();
      else setError("Your changes have not been confirmed. Try saving again; your draft is still here.");
    } catch { setError("Could not save ownership. Your draft is still here; try again."); }
    finally { setBusy(false); }
  }
  return <DialogSheet title="Edit owned quantities" onDismiss={onDismiss} dirty={changed.length > 0} dismissible={!busy} footer={<div className="space-y-2">
    {invalid && <p role="alert" className="text-sm text-ctp-red">Enter whole quantities from 0 to 9,999.</p>}
    {error && <p role="alert" className="text-sm text-ctp-red">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-ctp-subtext1">{changed.length} unsaved change{changed.length === 1 ? "" : "s"}</span><Button variant="primary" disabled={busy || invalid || !changed.length} onClick={() => void save()}>{busy ? "Saving…" : "Save changes"}</Button></div>
  </div>}>
    <p className="mb-3 text-sm text-ctp-subtext1">Edit the physical copies you own across your collection. Unspecified copies and recorded printings are added together. Proxies are kept separately.</p>
    <input type="search" aria-label="Find a deck card to update" placeholder="Find a card…" value={query} onChange={event => setQuery(event.target.value)} className="mb-4 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue" />
    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-sm">Ownership<select value={ownership} onChange={event => setOwnership(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue"><option value="all">All cards</option><option value="missing">Missing copies</option><option value="complete">Own required copies</option><option value="changed">Unsaved changes</option></select></label>
      <label className="text-sm">Element<select value={element} onChange={event => setElement(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue"><option value="">All elements</option>{elements.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <div className="mb-3 flex items-center justify-between gap-2"><p role="status" className="text-xs text-ctp-subtext1">Showing {visibleRows.length} of {rows.length} cards · filters include your draft</p>{(query || ownership !== "all" || element) && <Button onClick={() => { setQuery(""); setOwnership("all"); setElement(""); }}>Clear filters</Button>}</div>
    <div className="grid grid-cols-2 items-start gap-3">{visibleRows.map(row => {
      const total = row.entries.reduce((sum, entry) => sum + (Number(value(entry)) || 0), 0);
      return <CardResult key={row.required.cardUuid} card={cardsByName.get(row.required.cardName)} name={row.required.cardName} newTab>
        <p className="text-xs text-ctp-subtext1">{total} owned · {row.required.quantity} needed</p>
        {field(row.entries[0], "Unspecified copies")}
        {row.entries.length > 1 && <details className="group mt-2"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-1 rounded text-xs focus-visible:outline-2 focus-visible:outline-ctp-blue">Edit printings<DisclosureChevron className="shrink-0 group-open:rotate-180" /></summary>{row.entries.slice(1).map(entry => field(entry, `${entry.setPrefix ?? "Printing"} #${entry.collectorNumber ?? "?"}`))}</details>}
        <Button className="mt-2 w-full" disabled={busy || total >= row.required.quantity || invalid} onClick={() => setQuantities(current => ({ ...current, [collectionEntryKey(row.entries[0])]: String(Number(value(row.entries[0])) + Math.max(0, row.required.quantity - total)) }))}>Own required copies</Button>
      </CardResult>;
    })}</div>
    {visibleRows.length === 0 && <p className="p-4 text-sm text-ctp-subtext1">No deck cards match these filters. Your unsaved changes are kept when cards are hidden.</p>}
  </DialogSheet>;
}
