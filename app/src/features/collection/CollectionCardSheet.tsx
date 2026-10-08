import { CARD_FINISHES, collectionEntryKey, finishLabel, type CardFinish } from "@gatcg/shared";
import { identifyCollectionFinishes } from "./collectionFinishes";
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
  const canonical = cardEntries.find(entry => !entry.editionUuid && (!entry.finish || entry.finish === "unspecified"));
  const [finish, setFinish] = useState<CardFinish>("unspecified");
  const finishEntries = cardEntries.filter(entry => (entry.finish ?? "unspecified") === finish);
  const finishQuantity = finishEntries.reduce((sum, entry) => sum + entry.ownedQuantity, 0);
  const [finishDraft, setFinishDraft] = useState<Record<string, number>>({});
  const quantity = cardEntries.reduce((sum, entry) => sum + entry.ownedQuantity, 0);
  const quantityRef = useChangeMotion<HTMLParagraphElement>(quantity, "highlight");
  const completionLine = completePlaysetLine(card, entries);
  const [mode, setMode] = useState<"identify" | "add" | "finish" | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const identifyRef = useRef<HTMLButtonElement>(null);
  const previousMode = useRef(mode);
  useEffect(() => { if (mode && contentRef.current) { contentRef.current.focus({ preventScroll: true }); if (contentRef.current.parentElement) contentRef.current.parentElement.scrollTop = 0; } else if (previousMode.current) identifyRef.current?.focus(); previousMode.current = mode; }, [mode]);
  const [count, setCount] = useState(1);
  const [allocations, setAllocations] = useState<CardPrintingAllocation[]>([]);
  const originalAllocations = finishEntries.filter(entry => entry.editionUuid && entry.ownedQuantity).map(entry => ({ editionUuid: entry.editionUuid!, quantity: entry.ownedQuantity }));
  const dirty = mode === "finish" ? Object.keys(finishDraft).length > 0 : mode === "add" ? allocations.length > 0 || count !== 1 || finish !== "unspecified" : mode === "identify" && JSON.stringify(mergePrintingAllocations(allocations)) !== JSON.stringify(mergePrintingAllocations(originalAllocations));
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const update = (owned: number, proxies = canonical?.proxyQuantity ?? 0) => onUpdate?.([{ cardUuid: card.uuid, cardName: card.name, quantity: Math.max(0, Math.min(9999, Math.floor(owned))), proxyQuantity: proxies }], "Collection adjustment");
  function begin(next: "identify" | "add" | "finish") {
    setMode(next); setError(null); setCount(1); setFinish("unspecified"); setFinishDraft({});
    setAllocations(next === "identify" ? cardEntries.filter(entry => (!entry.finish || entry.finish === "unspecified") && entry.editionUuid && entry.ownedQuantity).map(entry => ({ editionUuid: entry.editionUuid!, quantity: entry.ownedQuantity })) : []);
  }
  async function apply() {
    if (!mode || !onUpdate) return;
    if (mode === "finish") {
      setApplying(true); setError(null);
      try { await onUpdate(identifyCollectionFinishes(cardEntries, finishDraft), "Identify card finishes"); setMode(null); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "Could not apply finishes."); }
      finally { setApplying(false); }
      return;
    }
    const total = mode === "identify" ? finishQuantity : count;
    if (!validPrintingAllocations(allocations, total)) return;
    const byId = new Map(allocations.map(item => [item.editionUuid, item.quantity]));
    const ids = new Set(["", ...byId.keys(), ...(mode === "identify" ? finishEntries.map(entry => entry.editionUuid ?? "") : [])]);
    const lines: CollectionUpdateLine[] = [...ids].map(id => {
      const existing = finishEntries.find(entry => (entry.editionUuid ?? "") === id);
      const edition = card.editions.find(item => item.uuid === id);
      const selected = id ? byId.get(id) ?? 0 : total - allocations.reduce((sum, p) => sum + p.quantity, 0);
      return { cardUuid: card.uuid, cardName: card.name, finish, ...(id ? { editionUuid: id, setPrefix: edition?.set.prefix ?? existing?.setPrefix, collectorNumber: edition?.collector_number ?? existing?.collectorNumber } : {}), quantity: selected + (mode === "add" ? existing?.ownedQuantity ?? 0 : 0), proxyQuantity: existing?.proxyQuantity ?? 0 };
    });
    if (lines.some(line => line.quantity > 9999)) { setError("A printing can hold at most 9,999 copies."); return; }
    setApplying(true); setError(null);
    try { await onUpdate(lines, mode === "identify" ? "Identify existing printings" : "Add printed copies"); setMode(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not apply these quantities. Your choices are kept; try again."); }
    finally { setApplying(false); }
  }
  return <EditorDialog doneLabel="Close" title={mode ? `${mode === "finish" ? "Identify finishes" : mode === "identify" ? "Identify copies" : "Add copies"} · ${card.name}` : card.name} onDismiss={onDismiss} dirty={dirty} footer={mode ? <div className="space-y-2">{error && <p role="alert" className="text-sm text-ctp-red">{error}</p>}<p className="text-xs text-ctp-subtext1">{mode !== "add" ? `Total stays ${quantity} owned. ` : `${count} ${count === 1 ? "copy" : "copies"} will be added. `}Changes stay in your collection draft until saved.</p><div className="flex flex-wrap gap-2"><Button aria-label="Cancel printing changes" disabled={applying} onClick={() => setMode(null)}>Cancel</Button><Button variant="primary" disabled={busy || applying || (mode !== "finish" && !validPrintingAllocations(allocations, mode === "identify" ? finishQuantity : count))} onClick={() => void apply()}>Apply to collection draft</Button></div></div> : <div className="space-y-2"><p className="text-xs text-ctp-subtext1">Changes stay in your quantity draft until saved.</p>{onReviewDraft && <Button variant="primary" onClick={onReviewDraft}>Review quantities</Button>}</div>}>
    {mode ? <div ref={contentRef} tabIndex={-1} className="space-y-3">{mode === "finish" ? [...new Map(cardEntries.map(entry => [entry.editionUuid ?? "", entry])).values()].map(sample => <div key={sample.editionUuid ?? ""} className="rounded-xl border border-ctp-surface1 p-3"><div className="flex items-center gap-3"><div className="w-20 shrink-0"><CardArtTile card={card} name={card.name} editionUuid={sample.editionUuid} /></div><p className="text-sm">{sample.setPrefix ? `${sample.setPrefix} #${sample.collectorNumber}` : "Unspecified printing"} · {cardEntries.filter(entry => entry.editionUuid === sample.editionUuid).reduce((sum, entry) => sum + entry.ownedQuantity, 0)} owned</p></div>{CARD_FINISHES.map(value => { const key = collectionEntryKey({ ...sample, finish: value }); return <label key={value} className="mt-3 block text-sm">{finishLabel(value)}<input type="number" min={0} max={9999} disabled={busy || applying} value={finishDraft[key] ?? cardEntries.find(entry => collectionEntryKey(entry) === key)?.ownedQuantity ?? 0} onChange={event => setFinishDraft(current => ({ ...current, [key]: Number(event.target.value) }))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label>; })}</div>) : <>
      {mode === "add" && <label className="block text-sm">Copies to add<input type="number" min={1} max={9999} value={count} onChange={event => { const value = Number(event.target.value); if (Number.isSafeInteger(value) && value > 0 && value <= 9999) setCount(value); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label>}
      <label className="block text-sm">Finish<select value={finish} disabled={busy || applying || (mode === "identify" && dirty)} onChange={event => { const next = event.target.value as CardFinish; setFinish(next); setAllocations(mode === "identify" ? cardEntries.filter(entry => (entry.finish ?? "unspecified") === next && entry.editionUuid && entry.ownedQuantity).map(entry => ({ editionUuid: entry.editionUuid!, quantity: entry.ownedQuantity })) : allocations); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3">{CARD_FINISHES.map(value => <option key={value} value={value}>{finishLabel(value)}</option>)}</select></label>
      <PrintingChoices card={card} quantity={mode === "identify" ? finishQuantity : count} value={allocations} onChange={setAllocations} entries={finishEntries} disabled={busy || applying} />
    </>}</div> : <>
      <div className="identity-surface rounded-2xl p-4"><div className="mx-auto w-40"><CardArtTile card={card} name={card.name} /></div><p className="mt-3 text-xs text-ctp-subtext1">Physical copies in this draft</p><p ref={quantityRef} className="rounded text-3xl font-semibold tabular-nums">{quantity} owned</p><p className="text-sm text-ctp-subtext1">{cardEntries.filter(entry => entry.editionUuid && entry.ownedQuantity).length} printing pools · {cardEntries.filter(entry => entry.finish === "foil").reduce((sum, entry) => sum + entry.ownedQuantity, 0)} foil</p><Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center text-sm text-ctp-blue">Card details (new tab)</Link></div>
      <div className="my-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => begin("add")}>Add copies</Button><Button disabled={busy || quantity === 0} onClick={() => begin("finish")}>Identify finishes</Button><Button ref={identifyRef} disabled={busy || quantity === 0} onClick={() => begin("identify")}>Identify existing copies</Button></div>
      <label className="block text-sm">Unspecified copies<input aria-label={`Owned quantity for ${card.name}`} type="number" min={0} max={9999} disabled={busy} value={canonical?.ownedQuantity ?? 0} onChange={event => void update(Number(event.target.value) || 0)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /></label>
      {cardEntries.filter(entry => entry.editionUuid || (entry.finish && entry.finish !== "unspecified")).map(entry => <div key={collectionEntryKey(entry)} className="mt-3 flex items-start gap-3 rounded-xl border border-ctp-surface1 p-3"><div className="w-20 shrink-0"><CardArtTile card={card} name={card.name} editionUuid={entry.editionUuid} /></div><label className="min-w-0 flex-1 text-sm">{entry.setPrefix ? `${entry.setPrefix} #${entry.collectorNumber}` : "Unspecified printing"} · {finishLabel(entry.finish)}<input aria-label={`Quantity for ${entry.setPrefix ?? "unspecified printing"} ${entry.collectorNumber ?? ""} ${finishLabel(entry.finish)}`} type="number" min={0} max={9999} disabled={busy} value={entry.ownedQuantity} onChange={event => void onUpdate?.([{ ...entry, quantity: Math.max(0, Math.min(9999, Math.floor(Number(event.target.value) || 0))) }], "Printing adjustment")} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /></label></div>)}
      <details className="group mt-3"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm">More options<DisclosureChevron className="group-open:rotate-180" /></summary>{completionLine && <Button disabled={busy} onClick={() => void onUpdate?.([completionLine], `Complete playset: ${card.name}`)}>Complete playset with unspecified copies</Button>}<label className="mt-2 block text-sm">Proxies<input aria-label={`Proxy quantity for ${card.name}`} type="number" min={0} max={9999} disabled={busy} value={canonical?.proxyQuantity ?? 0} onChange={event => void update(canonical?.ownedQuantity ?? 0, Math.max(0, Math.min(9999, Math.floor(Number(event.target.value) || 0))))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label></details>
      <div onClick={event => { if ((event.target as HTMLElement).closest("button:not(:disabled)")) onDismiss(); }}>{renderTracking?.(card.uuid, card.name)}</div>
    </>}
  </EditorDialog>;
}
