import { useToast } from "../../components/ui/toast/ToastContext";
import {useCardCatalog} from "../cards/useCardCatalog";
import {Link} from 'react-router-dom';
import {useState} from 'react';
import {deckCardRequirements, type OmnidexDecklist, type Card,type CollectionEntry,type SavedDeck} from '@gatcg/shared';
import {accountApi} from '../../lib/accountApi';
import {useCardLocations} from './useCardLocations';
import DeckAssignmentReview from './DeckAssignmentReview';

/** Account orchestration stays outside the reusable transfer review. */
export default function SavedDeckLocations({deckId,cards,decklist}: {deckId:string;cards:Card[];decklist:OmnidexDecklist}) {
 const { notify } = useToast();
 const catalog=useCardCatalog();
 const locations=useCardLocations(true);
 const [data,setData]=useState<{entries:CollectionEntry[];decks:SavedDeck[]}|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function open(){setBusy(true);setError('');try{await locations.refresh();const [collection,decks]=await Promise.all([accountApi.collection(),accountApi.decks()]);if(!decks.decks.some(deck=>deck.id===deckId))throw new Error('This saved deck is unavailable.');setData({entries:collection.entries,decks:decks.decks});}catch(reason){setError(reason instanceof Error ? reason.message : 'Could not load card locations.');}finally{setBusy(false);}}
 const required=[...deckCardRequirements(decklist).values()].reduce((sum,line)=>sum+line.quantity,0);
 const assigned=locations.records.reduce((sum,record)=>sum+(record.assignments?.find(row=>row.deckId===deckId)?.quantity ?? 0),0);
 return <div className="mt-3 rounded-lg border border-ctp-surface1 p-3"><h4 className="text-sm font-semibold">Cards in this deck</h4><p className="mt-1 text-sm text-ctp-subtext1">{locations.ready ? `${assigned} copies assigned · ${required} in the decklist` : locations.error ? 'Card locations unavailable.' : 'Loading card locations…'}</p><p className="mt-1 text-xs text-ctp-subtext1">Assign your available copies, including sideboard. Review transfers from other decks before saving.</p><div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" disabled={busy} onClick={()=>void open()} className="min-h-12 rounded-lg border border-ctp-blue px-3 text-sm text-ctp-blue">{busy ? 'Loading locations…' : 'Assign deck cards here'}</button><Link to={`/card-locations?deck=${encodeURIComponent(deckId)}`} className="inline-flex min-h-12 items-center px-3 text-sm text-ctp-blue underline">Where are these cards?</Link></div>{(error||locations.error) && <p role="alert" className="mt-2 text-sm text-ctp-red">{error||locations.error}</p>}{data && locations.ready && <DeckAssignmentReview deck={data.decks.find(deck=>deck.id===deckId)!} decks={data.decks} cards={catalog.length ? catalog : cards} entries={data.entries} records={locations.records} onSave={async changes => { await locations.saveBatch(changes); notify({ message: "Card locations saved.", key: "locations" }); }} onDismiss={()=>setData(null)}/>}</div>;
}
