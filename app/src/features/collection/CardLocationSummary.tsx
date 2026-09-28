import type { CollectionCardTracking, CollectionEntry, SavedDeck } from '@gatcg/shared';
import { cardLocationState } from '@gatcg/shared';
export default function CardLocationSummary({cardUuid, record, entries, decks, onClick, disabled}: {cardUuid: string; record?: CollectionCardTracking; entries: CollectionEntry[]; decks: SavedDeck[]; onClick:()=>void; disabled?: boolean}) {
 const state=cardLocationState(cardUuid,entries,record);
 const assignments=record?.assignments ?? [];
 const text=state.excess ? 'Needs reconciliation' : assignments.length===1 ? `In: ${decks.find(deck=>deck.id===assignments[0].deckId)?.title ?? 'Unavailable deck'}` : assignments.length>1 ? `Split across ${assignments.length} decks` : state.lent ? `${state.lent} lent out` : 'Unassigned';
 if (!state.excess && !state.lent && !assignments.length && !record?.mightOwn) return null;
 return <button type="button" disabled={disabled} onClick={onClick} className="min-h-12 w-full break-words rounded text-left text-xs text-ctp-blue disabled:opacity-40">{text}{assignments.length>0 && state.lent ? ` · ${state.lent} lent out` : ''}{record?.mightOwn ? ' · Needs checking' : ''}</button>;
}
