import { useState } from "react";
import type { Card } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { shoppingBatches, shoppingLines, type ShoppingChoice } from "./collectionShopping";

/** Explicit shopping draft, independent of ownership and the current filter results. */
export default function MissingCardShopping({ cards }: { cards: Card[] }) {
  const [choices, setChoices] = useState<Record<string, ShoppingChoice>>({});
  const [message, setMessage] = useState("");
  const [limit, setLimit] = useState(24);
  const lines = shoppingLines(choices);
  const batches = shoppingBatches(lines);
  const list = lines.map(line=>`${line.quantity} ${line.name}`).join("\n");
  const selected = Object.entries(choices).filter(([,choice])=>choice.quantity>0);
  const visibleIds = new Set(cards.map(card=>card.uuid));
  const hidden = selected.filter(([id])=>!visibleIds.has(id)).length;
  const control = "inline-flex min-h-12 items-center justify-center rounded-lg border border-ctp-surface1 px-3 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue";
  function choose(id: string, name: string, quantity: number) {
    setChoices(current=>{const next={...current};if(quantity>0) next[id]={name,quantity};else delete next[id];return next;});setMessage("");
  }
  async function copy() {
    try { await navigator.clipboard.writeText(list); setMessage("Shopping list copied."); }
    catch { setMessage("Could not copy. Select and copy the list below."); }
  }
  return <details className="my-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm text-ctp-blue">Buy cards · {lines.length} selected<DisclosureChevron /></summary>
    <p className="mt-2 text-sm text-ctp-subtext1">Select from these {cards.length} filtered results, then review quantities for TCGplayer Mass Entry. Owned cards can be selected too. Nothing is selected automatically.</p>
    <p className="mt-2 text-xs text-ctp-subtext0">Selections stay in this shopping list when filters change. Any printing is fine; choose printing and condition at TCGplayer. This does not change your collection. Check ownership reminders before buying.</p>
    <div className="my-3 flex flex-wrap gap-2"><button type="button" disabled={!cards.length} onClick={()=>{setChoices(current=>({...current,...Object.fromEntries(cards.map(card=>[card.uuid,current[card.uuid] ?? {name:card.name,quantity:1}]))}));setMessage("");}} className={control}>Select all {cards.length} results</button><button type="button" disabled={!selected.length} onClick={()=>{setChoices({});setMessage("");}} className={control}>Clear selection</button></div>
    {!cards.length && <p role="status" className="my-3 text-sm">No cards match these filters. Existing selections are still available below.</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.slice(0,limit).map(card=><article key={card.uuid} className={`min-w-0 rounded-lg border bg-ctp-base p-2 ${choices[card.uuid] ? "border-ctp-blue ring-2 ring-ctp-blue/30" : "border-ctp-surface1"}`}>
      <button type="button" aria-label={`${choices[card.uuid] ? "Deselect" : "Select"} ${card.name} to buy`} aria-pressed={Boolean(choices[card.uuid])} onClick={()=>choose(card.uuid,card.name,choices[card.uuid] ? 0 : 1)} className="block w-full rounded text-left focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={card} name={card.name} /><span className="flex min-h-12 items-center break-words text-sm">{card.name}</span><span className="flex min-h-12 items-center text-sm text-ctp-blue">{choices[card.uuid] ? "✓ Selected" : "Select to buy"}</span></button>
      {choices[card.uuid] && <label className="block text-xs">Copies<input aria-label={`Shopping quantity for ${card.name}`} type="number" min={0} max={99} step={1} value={choices[card.uuid].quantity} onChange={event=>choose(card.uuid,card.name,Math.max(0,Math.min(99,Math.floor(Number(event.target.value)||0))))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-base" /></label>}
    </article>)}</div>
    {cards.length>limit && <button type="button" onClick={()=>setLimit(value=>value+24)} className={`${control} mt-3`}>Show more results</button>}
    <p role="status" className="mt-3 text-sm">{lines.length} cards selected · {lines.reduce((sum,line)=>sum+line.quantity,0)} copies{hidden ? ` · ${hidden} selections outside current filters` : ""}</p>
    {!!lines.length && <>
      <div className="mt-2"><h3 className="py-2 text-sm font-medium">Selected cards</h3><div className="max-h-72 overflow-y-auto">{selected.map(([id,choice])=><div key={id} className="flex flex-wrap items-center justify-between gap-2 border-t border-ctp-surface1 py-2 text-sm"><span className="min-w-0 break-words">{choice.quantity}× {choice.name}</span><button type="button" onClick={()=>choose(id,choice.name,0)} aria-label={`Remove ${choice.name} from shopping list`} className={control}>Remove</button></div>)}</div></div>
      {batches.length>1 && <p className="mt-2 text-xs text-ctp-subtext1">Your selection is split into {batches.length} links to keep each Mass Entry list manageable. Open each batch.</p>}
      <div className="mt-3 flex flex-wrap gap-2">{batches.map((batch,index)=><a key={index} href={buildTcgplayerMassEntryUrl(batch)} target="_blank" rel="noreferrer" className={control}>TCGplayer Mass Entry{batches.length>1 ? ` · batch ${index+1} (${batch.length} cards)` : ""} ↗</a>)}<button type="button" onClick={()=>void copy()} className={control}>Copy list</button></div>
      <textarea aria-label="Shopping list" readOnly value={list} rows={4} className="mt-3 w-full rounded-lg border border-ctp-surface1 bg-ctp-base p-2 text-sm" />
    </>}
    {message && <p role="status" className="mt-2 text-sm text-ctp-subtext1">{message}</p>}
  </details>;
}
