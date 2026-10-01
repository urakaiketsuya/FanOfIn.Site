import {useMemo,useState} from 'react';
import {cardLocationState, collectionLocationIndex, deckCardRequirements, locationCardKey, planCardTransfer, type Card, type CollectionEntry, type CollectionCardTracking, type CollectionCardTrackingUpdate, type SavedDeck} from '@gatcg/shared';
import EditorDialog from '../../components/deck-editor/EditorDialog';
import CardArtTile from '../../components/CardArtTile';

export default function DeckAssignmentReview({deck,decks,cards,entries,records,onSave,onDismiss}: {deck:SavedDeck;decks:SavedDeck[];cards:Card[];entries:CollectionEntry[];records:CollectionCardTracking[];onSave:(inputs:(CollectionCardTrackingUpdate & {cardUuid:string})[])=>Promise<void>;onDismiss:()=>void}) {
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [completed,setCompleted]=useState<string[]>([]);
 const byName=useMemo(()=>new Map(cards.map(card=>[locationCardKey(card.name),card])),[cards]);
 const byId=useMemo(()=>new Map(records.map(record=>[record.cardUuid,record])),[records]);
 const states=useMemo(()=>collectionLocationIndex(entries,records),[entries,records]);
 const requirements=deckCardRequirements(deck.decklist);
 for(const record of records) if(record.assignments?.some(row=>row.deckId===deck.id) && !requirements.has(locationCardKey(record.cardName))) requirements.set(locationCardKey(record.cardName),{name:record.cardName,quantity:0});
 const rows=[...requirements.values()].map(need=>{
  const card=byName.get(locationCardKey(need.name));
  const record=byId.get(card?.uuid ?? '');
  const owned=card ? (states.get(card.uuid) ?? cardLocationState(card.uuid,[])).owned : 0;
  return {need,card,record,plan:planCardTransfer(deck.id,need.quantity,owned,record)};
 });
 const changes=rows.filter(row=>row.card && !row.plan.reconcile && !completed.includes(row.card.uuid) && JSON.stringify(row.record?.assignments ?? [])!==JSON.stringify(row.plan.assignments));
 async function save(){
  setBusy(true);setError('');let saved=0;
  try {
   for(let offset=0;offset<changes.length;offset+=100){
    const batch=changes.slice(offset,offset+100);
    await onSave(batch.map(row=>({cardUuid:row.card!.uuid,cardName:row.card!.name,mightOwn:row.record?.mightOwn ?? false,loans:row.record?.loans ?? [],assignments:row.plan.assignments,revision:row.record?.revision ?? 0})));
    saved+=batch.length;setCompleted(current=>[...current,...batch.map(row=>row.card!.uuid)]);
   }
   onDismiss();
  } catch(reason){setError(`${saved} card locations confirmed in this attempt. ${reason instanceof Error ? reason.message : 'Try again.'}`);}
  finally{setBusy(false);}
 }

 return <EditorDialog title={`Put cards in ${deck.title}`} doneLabel="Close" dismissible={!busy} onDismiss={onDismiss}>
  <p className="text-sm text-ctp-subtext1">Review physical transfers, including sideboard. Ownership does not change. Lent and trade-reserved copies are never moved.</p>
  <div className="my-3 space-y-3">{rows.map(row=><article key={row.need.name} className="flex gap-3 rounded-lg border border-ctp-surface1 p-2"><div className="w-20 shrink-0"><CardArtTile card={row.card} name={row.need.name}/></div><div className="min-w-0 text-sm"><h3 className="font-medium">{row.need.name}</h3>{row.need.quantity===0 && <p className="text-ctp-yellow">No longer in this decklist. Assigned copies will be released.</p>}<p>{row.need.quantity} needed · {row.plan.assignments.find(a=>a.deckId===deck.id)?.quantity ?? 0} will be here</p>{!row.card && <p className="text-ctp-yellow">Not in catalog–resolve manually.</p>}{row.plan.reconcile && <p className="text-ctp-yellow">Needs reconciliation; this card will be skipped.</p>}{row.plan.missing>0 && <p>{row.plan.missing} not owned</p>}{row.plan.loanBlocked>0 && <p>{row.plan.loanBlocked} unavailable while lent or reserved for trades</p>}{row.plan.transfers.map(transfer=><p key={transfer.deckId} className="text-ctp-yellow">Move {transfer.quantity} from {decks.find(d=>d.id===transfer.deckId)?.title ?? 'unavailable deck'}</p>)}{completed.includes(row.card?.uuid ?? '') && <p>Saved</p>}</div></article>)}</div>
  {error && <p role="alert" className="my-3 text-sm text-ctp-red">{error}</p>}
  {!changes.length && <p className="my-3 text-sm">No available copies to reassign.</p>}
  <button type="button" disabled={busy || !changes.length} onClick={()=>void save()} className="min-h-12 w-full rounded-lg bg-ctp-blue px-3 font-medium text-ctp-base disabled:opacity-40">{busy ? 'Saving locations…' : `Confirm assignments (${changes.length} cards)`}</button>
 </EditorDialog>;
}
