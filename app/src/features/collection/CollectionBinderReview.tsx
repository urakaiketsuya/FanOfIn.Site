import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tradeAvailability, type BinderItem, type BinderItemKind, type Card, type CollectionCardTracking, type CollectionEntry } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import CardArtTile from "../../components/CardArtTile";
import { playsetTarget } from "./collectionPlaysets";
import type { ShoppingChoice } from "./collectionShopping";

export default function CollectionBinderReview({kind,choices,cards,onDismiss}: {
  kind: BinderItemKind; choices: Record<string,ShoppingChoice>; cards: Card[]; onDismiss:()=>void;
}) {
  const [entries,setEntries]=useState<CollectionEntry[]>([]);
  const [records,setRecords]=useState<CollectionCardTracking[]>([]);
  const [items,setItems]=useState<BinderItem[]>([]);
  const [isPublic,setIsPublic]=useState(false);
  const [ready,setReady]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState("");
  const [rows,setRows]=useState(()=>Object.entries(choices).map(([uuid,choice])=>({uuid,name:choice.name,quantity:choice.quantity,edition:"",done:false})));
  const load = useCallback(async () => {
    setError(""); setReady(false);
    try {const [collection,tracking,binder]=await Promise.all([accountApi.collection(),accountApi.collectionTracking(),accountApi.binder()]);
      setEntries(collection.entries);setRecords(tracking.cards);setItems(binder.items);setIsPublic(binder.settings.public);setReady(true);
      setRows(current=>current.map(row=>({...row,edition:kind === "available" ? collection.entries.find(entry=>entry.cardUuid===row.uuid&&entry.ownedQuantity>0)?.editionUuid ?? "" : ""})));
    } catch(reason){setError(reason instanceof Error?reason.message:"Could not load saved availability.");}
  }, [kind]);
  useEffect(()=>{void load();},[load]);
  function capacity(uuid:string,edition:string) {
    if(kind==='wanted')return 999;
    const state=tradeAvailability(uuid,entries,records.find(record=>record.cardUuid===uuid),items);
    const pool=entries.find(entry=>entry.cardUuid===uuid&&(entry.editionUuid??"")===edition)?.ownedQuantity??0;
    const published=items.filter(item=>item.kind==='available'&&item.cardUuid===uuid&&(item.editionUuid??"")===edition).reduce((sum,item)=>sum+item.quantity,0);
    return Math.max(0,Math.min(state.listable,pool-published,999));
  }
  function applyExtras() {
    setRows(current=>current.map(row=>{
      if(row.done) return row;
      if(kind==='wanted') return {...row,quantity:1};
      const card=cards.find(card=>card.uuid===row.uuid);
      const owned=entries.filter(entry=>entry.cardUuid===row.uuid).reduce((sum,entry)=>sum+entry.ownedQuantity,0);
      const published=items.filter(item=>item.kind==='available'&&item.cardUuid===row.uuid).reduce((sum,item)=>sum+item.quantity,0);
      return {...row,quantity:Math.min(capacity(row.uuid,row.edition),Math.max(0,owned-(card?playsetTarget(card):4)-published))};
    }));
  }
  const invalid=rows.some(row=>!row.done&&(row.quantity<0||!Number.isInteger(row.quantity)||row.quantity>capacity(row.uuid,row.edition)));
  async function save() {
    setBusy(true);setError("");
    try {for(const row of rows.filter(row=>!row.done&&row.quantity>0)) {
      const card=cards.find(card=>card.uuid===row.uuid), edition=card?.editions.find(edition=>edition.uuid===row.edition);
      const source=entries.find(entry=>entry.cardUuid===row.uuid&&(entry.editionUuid??"")===row.edition);
      await accountApi.addBinderItem({kind,cardUuid:row.uuid,cardName:row.name,editionUuid:row.edition||null,setPrefix:source?.setPrefix??edition?.set.prefix??null,collectorNumber:source?.collectorNumber??edition?.collector_number??null,quantity:row.quantity,condition:"Any",language:"Any",acceptsAlternatives:true});
      setRows(current=>current.map(item=>item.uuid===row.uuid?{...item,done:true}:item));
    }}catch(reason){setError(`${reason instanceof Error?reason.message:"Could not add cards."} Completed rows are saved; only remaining rows will be retried.`);}finally{setBusy(false);}
  }
  return <EditorDialog title={kind==='available'?'Review cards for trade':'Review wants'} doneLabel="Done" dismissible={!busy} onDismiss={onDismiss}>
    <p className="text-sm text-ctp-subtext1">{kind==='available'?'Uses saved physical quantities. Assigned and lent copies must be released or returned first.':'Choose the quantities you want; nothing is added automatically.'} {ready && (isPublic?'Your binder is public: adding these cards will publish them.':'Your binder is private. Adding cards does not publish it.')}</p>
    {!ready&&!error&&<p role="status" className="my-3">Loading saved availability…</p>}
    {error&&<p role="alert" className="my-3 text-sm text-ctp-yellow">{error}</p>}
    {!ready&&error&&<button type="button" onClick={()=>void load()} className="min-h-12 px-3 text-ctp-blue">Retry</button>}
    {ready&&<><div className="my-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={applyExtras} className="min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm">{kind==='available'?'Only copies beyond my playset':'One of each'}</button><Link to="/card-locations" className="inline-flex min-h-12 items-center px-3 text-sm text-ctp-blue">Manage locations & loans</Link></div>
    <div className="space-y-3">{rows.map(row=>{const card=cards.find(card=>card.uuid===row.uuid);const max=capacity(row.uuid,row.edition);return <article key={row.uuid} className="flex gap-3 rounded-xl border border-ctp-surface1 p-3"><div className="w-20 shrink-0"><CardArtTile card={card} name={row.name}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{row.name}</p>{row.done?<p role="status" className="mt-2 text-sm text-ctp-green">Added to binder</p>:<><select disabled={busy} aria-label={`Printing for ${row.name}`} value={row.edition} onChange={event=>setRows(current=>current.map(item=>item.uuid===row.uuid?{...item,edition:event.target.value}:item))} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-sm"><option value="">{kind==='available'?'Unspecified copies':'Any printing'}</option>{(kind==='available'?entries.filter(entry=>entry.cardUuid===row.uuid&&entry.editionUuid&&entry.ownedQuantity>0).map(entry=>({uuid:entry.editionUuid!,label:`${entry.setPrefix} #${entry.collectorNumber}`})):card?.editions.map(edition=>({uuid:edition.uuid,label:`${edition.set.prefix} #${edition.collector_number}`}))??[]).map(edition=><option key={edition.uuid} value={edition.uuid}>{edition.label}</option>)}</select><label className="mt-2 block text-xs">Quantity (0 skips)<input aria-label={`Binder quantity for ${row.name}`} type="number" min={0} max={max} disabled={busy} value={row.quantity} onChange={event=>setRows(current=>current.map(item=>item.uuid===row.uuid?{...item,quantity:Number(event.target.value)}:item))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-base"/></label>{kind==='available'&&<p className={`mt-1 text-xs ${row.quantity>max?'text-ctp-yellow':'text-ctp-subtext1'}`}>{max} available to list from this pool</p>}</>}</div></article>;})}</div>
    <button type="button" disabled={busy||invalid||!rows.some(row=>!row.done&&row.quantity>0)} onClick={()=>void save()} className="mt-4 min-h-12 w-full rounded-lg bg-ctp-blue px-3 text-sm text-ctp-base disabled:opacity-40">{busy?'Adding…':isPublic?'Publish selected cards':'Add selected cards to private binder'}</button><Link to="/looking-for" className="mt-3 inline-flex min-h-12 items-center text-ctp-blue">Open trading binder →</Link></>}
  </EditorDialog>;
}
