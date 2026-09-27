import {useCardCatalog} from "../cards/useCardCatalog";
import {useState} from 'react';
import type {Card,CollectionEntry,SavedDeck} from '@gatcg/shared';
import {accountApi} from '../../lib/accountApi';
import {useCardLocations} from './useCardLocations';
import DeckAssignmentReview from './DeckAssignmentReview';

/** Account orchestration stays outside the reusable transfer review. */
export default function SavedDeckLocations({deckId,cards}: {deckId:string;cards:Card[]}) {
 const catalog=useCardCatalog();
 const locations=useCardLocations(true);
 const [data,setData]=useState<{entries:CollectionEntry[];decks:SavedDeck[]}|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function open(){setBusy(true);setError('');try{await locations.refresh();const [collection,decks]=await Promise.all([accountApi.collection(),accountApi.decks()]);if(!decks.decks.some(deck=>deck.id===deckId))throw new Error('This saved deck is unavailable.');setData({entries:collection.entries,decks:decks.decks});}catch(reason){setError(reason instanceof Error ? reason.message : 'Could not load card locations.');}finally{setBusy(false);}}
 return <div className="mt-3"><button type="button" disabled={busy} onClick={()=>void open()} className="min-h-12 rounded-lg border border-ctp-blue px-3 text-sm text-ctp-blue">{busy ? 'Loading locations…' : 'Put cards in this deck'}</button>{(error||locations.error) && <p role="alert" className="mt-2 text-sm text-ctp-red">{error||locations.error}</p>}{data && locations.ready && <DeckAssignmentReview deck={data.decks.find(deck=>deck.id===deckId)!} decks={data.decks} cards={catalog.length ? catalog : cards} entries={data.entries} records={locations.records} onSave={locations.save} onDismiss={()=>setData(null)}/>}</div>;
}
