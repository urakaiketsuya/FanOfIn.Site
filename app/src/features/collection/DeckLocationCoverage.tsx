import {useMemo} from 'react';
import {findDeckChampionName} from '../../lib/ttsExport';
import {Link} from 'react-router-dom';
import {deckLocationSummary,type Card,type CollectionEntry,type CollectionCardTracking,type SavedDeck} from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
export default function DeckLocationCoverage({decks,cards,entries,records,onAssign,disabled}: {decks:SavedDeck[];cards:Card[];entries:CollectionEntry[];records:CollectionCardTracking[];onAssign:(deck:SavedDeck)=>void;disabled?:boolean}) {
 const byName=useMemo(()=>new Map(cards.map(card=>[card.name,card])),[cards]);
 return <section className="mt-4"><h2 className="text-xl font-semibold">Build a deck with your cards</h2><p className="mt-1 text-sm text-ctp-subtext1">Each deck is checked individually. Copies can move between decks; you don’t need a separate playset for every list.</p>{!decks.length && <p className="mt-3">Save a deck to check coverage.</p>}
 <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{decks.map(deck=>{
  const summary=deckLocationSummary(deck.decklist,cards,entries,records,true,deck.id);
  const {missing,blocked:lent,move}=summary;
  const champion=findDeckChampionName(deck.decklist.material,byName);
  const art=byName.get(champion ?? deck.championName ?? '') ?? byName.get(deck.decklist.material[0]?.card ?? summary.lines[0]?.name);
  const artName=art?.name ?? deck.championName ?? deck.title;
  return <article key={deck.id} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3"><div className="flex gap-3"><div className="w-20 shrink-0"><CardArtTile card={art} name={artName}/><p className="mt-1 break-words text-xs">{art ? <Link to={`/cards/${art.slug}`} className="flex min-h-control items-center text-ctp-blue underline">{artName}</Link> : artName}</p></div><div className="min-w-0 break-words"><h3 className="font-semibold">{deck.title}</h3><p className="mt-2 text-sm">{!summary.required ? 'No cards in this list' : missing ? `${missing} copies not owned` : 'All required copies owned'}{lent ? ` · ${lent} lent or trade-reserved` : ''}</p>{summary.unresolved > 0 && <p className="text-sm text-ctp-yellow">{summary.unresolved} card names need catalog data.</p>}{move>0 && <p className="mt-1 text-sm text-ctp-blue">{move} available in other decks</p>}{summary.reconcile && <p className="text-sm text-ctp-yellow">Some card locations need reconciliation.</p>}</div></div><button type="button" disabled={disabled || !summary.required} onClick={()=>onAssign(deck)} className="mt-3 min-h-12 w-full rounded-lg border border-ctp-blue px-3 text-sm text-ctp-blue">Assign deck cards here</button><Link to={deck.id.startsWith("official-product:") ? "/official-decks" : `/decks/${encodeURIComponent(deck.id)}`} className="mt-1 flex min-h-12 items-center justify-center text-sm text-ctp-blue underline">Open deck</Link></article>;
 })}</div></section>;
}
