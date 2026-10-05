import { useChangeMotion } from "../../lib/useChangeMotion";
import { Link } from "react-router-dom";
import { mergePrintingAllocations, validPrintingAllocations, type CardPrintingAllocation, type Card, type CollectionEntry, type CollectionUpdateLine } from "@gatcg/shared";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "../../components/ui/Button";
import CardArtTile from "../../components/CardArtTile";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import PrintingChoices from "../../components/PrintingChoices";
import DisclosureChevron from "../../components/DisclosureChevron";
import { completePlaysetLine } from "./collectionPlaysets";

export default function CollectionCardSheet({ card, entries, busy, onUpdate, renderTracking, onReviewDraft, onDismiss }: {
  card: Card; entries: CollectionEntry[]; busy: boolean;
  onUpdate?: (lines: CollectionUpdateLine[], source: string) => Promise<void>;
  onReviewDraft?: () => void;
  renderTracking?: (uuid: string, name: string) => ReactNode; onDismiss: () => void;
}) {
  const cardEntries = entries.filter(entry => entry.cardUuid === card.uuid);
  const canonical = cardEntries.find(entry => !entry.editionUuid);
  const quantity = cardEntries.reduce((sum, entry) => sum + entry.ownedQuantity, 0);
  const quantityRef = useChangeMotion<HTMLParagraphElement>(quantity, "highlight");
  const completionLine = completePlaysetLine(card, entries);
  const [mode, setMode] = useState<"identify" | "add" | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const identifyRef = useRef<HTMLButtonElement>(null);
  const previousMode = useRef(mode);
  useEffect(() => { if (mode && contentRef.current) { contentRef.current.focus({ preventScroll: true }); if (contentRef.current.parentElement) contentRef.current.parentElement.scrollTop = 0; } else if (previousMode.current) identifyRef.current?.focus(); previousMode.current = mode; }, [mode]);
  const [count, setCount] = useState(1);
  const [allocations, setAllocations] = useState<CardPrintingAllocation[]>([]);
  const originalAllocations = cardEntries.filter(entry => entry.editionUuid && entry.ownedQuantity).map(entry => ({ editionUuid: entry.editionUuid!, quantity: entry.ownedQuantity }));
  const dirty = mode === "add" ? allocations.length > 0 || count !== 1 : mode === "identify" && JSON.stringify(mergePrintingAllocations(allocations)) !== JSON.stringify(mergePrintingAllocations(originalAllocations));
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const update = (owned: number, proxies = canonical?.proxyQuantity ?? 0) => onUpdate?.([{ cardUuid: card.uuid, cardName: card.name, quantity: Math.max(0, Math.min(9999, Math.floor(owned))), proxyQuantity: proxies }], "Collection adjustment");
  function begin(next: "identify" | "add") {
    setMode(next); setError(null); setCount(1);
    setAllocations(next === "identify" ? cardEntries.filter(entry => entry.editionUuid && entry.ownedQuantity).map(entry => ({ editionUuid: entry.editionUuid!, quantity: entry.ownedQuantity })) : []);
  }
  async function apply() {
    if (!mode || !onUpdate) return;
    const total = mode === "identify" ? quantity : count;
    if (!validPrintingAllocations(allocations, total)) return;
    const byId = new Map(allocations.map(item => [item.editionUuid, item.quantity]));
    const ids = new Set(["", ...byId.keys(), ...(mode === "identify" ? cardEntries.map(entry => entry.editionUuid ?? "") : [])]);
    const lines: CollectionUpdateLine[] = [...ids].map(id => {
      const existing = cardEntries.find(entry => (entry.editionUuid ?? "") === id);
      const edition = card.editions.find(item => item.uuid === id);
      const selected = id ? byId.get(id) ?? 0 : total - allocations.reduce((sum, p) => sum + p.quantity, 0);
      return { cardUuid: card.uuid, cardName: card.name, ...(id ? { editionUuid: id, setPrefix: edition?.set.prefix ?? existing?.setPrefix, collectorNumber: edition?.collector_number ?? existing?.collectorNumber } : {}), quantity: selected + (mode === "add" ? existing?.ownedQuantity ?? 0 : 0), proxyQuantity: existing?.proxyQuantity ?? 0 };
    });
    if (lines.some(line => line.quantity > 9999)) { setError("A printing can hold at most 9,999 copies."); return; }
    setApplying(true); setError(null);
    try { await onUpdate(lines, mode === "identify" ? "Identify existing printings" : "Add printed copies"); setMode(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not apply these quantities. Your choices are kept; try again."); }
    finally { setApplying(false); }
  }
  return <EditorDialog doneLabel="Close" title={mode ? `${mode === "identify" ? "Identify copies" : "Add copies"} · ${card.name}` : card.name} onDismiss={onDismiss} dirty={dirty} footer={mode ? <div className="space-y-2">{error && <p role="alert" className="text-sm text-ctp-red">{error}</p>}<p className="text-xs text-ctp-subtext1">{mode === "identify" ? `Total stays ${quantity} owned. ` : `${count} ${count === 1 ? "copy" : "copies"} will be added. `}Changes stay in your collection draft until saved.</p><div className="flex flex-wrap gap-2"><Button aria-label="Cancel printing changes" disabled={applying} onClick={() => setMode(null)}>Cancel</Button><Button variant="primary" disabled={busy || applying || !validPrintingAllocations(allocations, mode === "identify" ? quantity : count)} onClick={() => void apply()}>Apply to collection draft</Button></div></div> : <div className="space-y-2"><p className="text-xs text-ctp-subtext1">Changes stay in your quantity draft until saved.</p>{onReviewDraft && <Button variant="primary" onClick={onReviewDraft}>Review quantities</Button>}</div>}>
    {mode ? <div ref={contentRef} tabIndex={-1} className="space-y-3">{mode === "add" && <label className="block text-sm">Copies to add<input type="number" min={1} max={9999} value={count} onChange={event => { const value = Number(event.target.value); if (Number.isSafeInteger(value) && value > 0 && value <= 9999) setCount(value); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label>}<PrintingChoices card={card} quantity={mode === "identify" ? quantity : count} value={allocations} onChange={setAllocations} entries={cardEntries} disabled={busy || applying} /></div> : <>
      <div className="identity-surface rounded-2xl p-4"><div className="mx-auto w-40"><CardArtTile card={card} name={card.name} /></div><p className="mt-3 text-xs text-ctp-subtext1">Physical copies in this draft</p><p ref={quantityRef} className="rounded text-3xl font-semibold tabular-nums">{quantity} owned</p><p className="text-sm text-ctp-subtext1">{cardEntries.filter(entry => entry.editionUuid && entry.ownedQuantity).length} printings · {canonical?.ownedQuantity ?? 0} unspecified</p><Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center text-sm text-ctp-blue">Card details (new tab)</Link></div>
      <div className="my-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => begin("add")}>Add copies</Button><Button ref={identifyRef} disabled={busy || quantity === 0} onClick={() => begin("identify")}>Identify existing copies</Button></div>
      <label className="block text-sm">Unspecified copies<input aria-label={`Owned quantity for ${card.name}`} type="number" min={0} max={9999} disabled={busy} value={canonical?.ownedQuantity ?? 0} onChange={event => void update(Number(event.target.value) || 0)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /></label>
      {cardEntries.filter(entry => entry.editionUuid).map(entry => <div key={entry.editionUuid} className="mt-3 flex items-start gap-3 rounded-xl border border-ctp-surface1 p-3"><div className="w-20 shrink-0"><CardArtTile card={card} name={card.name} editionUuid={entry.editionUuid} /></div><label className="min-w-0 flex-1 text-sm">{entry.setPrefix ?? "Unavailable printing"} #{entry.collectorNumber}<input aria-label={`Quantity for ${entry.setPrefix} ${entry.collectorNumber}`} type="number" min={0} max={9999} disabled={busy} value={entry.ownedQuantity} onChange={event => void onUpdate?.([{ ...entry, quantity: Math.max(0, Math.min(9999, Math.floor(Number(event.target.value) || 0))) }], "Printing adjustment")} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /></label></div>)}
      <details className="group mt-3"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm">More options<DisclosureChevron className="group-open:rotate-180" /></summary>{completionLine && <Button disabled={busy} onClick={() => void onUpdate?.([completionLine], `Complete playset: ${card.name}`)}>Complete playset with unspecified copies</Button>}<label className="mt-2 block text-sm">Proxies<input aria-label={`Proxy quantity for ${card.name}`} type="number" min={0} max={9999} disabled={busy} value={canonical?.proxyQuantity ?? 0} onChange={event => void update(canonical?.ownedQuantity ?? 0, Math.max(0, Math.min(9999, Math.floor(Number(event.target.value) || 0))))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label></details>
      <div onClick={event => { if ((event.target as HTMLElement).closest("button:not(:disabled)")) onDismiss(); }}>{renderTracking?.(card.uuid, card.name)}</div>
    </>}
  </EditorDialog>;
}
