import { useMemo, useState } from "react";
import { DECK_FOLDER_ACCENTS, type DeckFolderAccent, type SavedDeck } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardResult from "../../components/CardResult";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";
import { useCardsByNames } from "../events/useCardsByNames";
import { identityStyle } from "./deckAppearance";

export default function DeckFolderAppearance({ decks, cover, accent, disabled, onCover, onAccent }: {
  decks: SavedDeck[]; cover: string | null; accent: DeckFolderAccent; disabled: boolean;
  onCover: (name: string | null) => void; onAccent: (accent: DeckFolderAccent) => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(12);
  const names = useMemo(() => [...new Set([...(cover ? [cover] : []), ...decks.flatMap(deck => [...deck.decklist.material, ...deck.decklist.main].map(line => line.card))])].sort((a,b) => a.localeCompare(b)), [decks, cover]);
  const cards = useCardsByNames(names);
  const matches = names.filter(name => name.toLowerCase().includes(query.trim().toLowerCase()));
  return <details className="group my-3 rounded-xl border border-ctp-surface1 p-3">
    <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">Personalize this folder<DisclosureChevron className="group-open:rotate-180" /></summary>
    <fieldset disabled={disabled} className="mt-2"><legend className="text-sm">Accent color</legend><div className="mt-2 grid grid-cols-2 gap-2">{DECK_FOLDER_ACCENTS.map(value => <label key={value} style={identityStyle(value)} className={`identity-surface flex min-h-control cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm capitalize ${accent === value ? "border-ctp-text" : "border-ctp-surface1"}`}><input type="radio" name="folder-accent" value={value} checked={accent === value} onChange={() => onAccent(value)} />{value}</label>)}</div></fieldset>
    <p className="mt-4 text-sm font-medium">Cover card</p><p className="mt-1 text-xs text-ctp-subtext1">Choose from the cards in your saved builds. Changing the cover never edits a deck.</p>
    <Button className="mt-2" disabled={disabled || !cover} onClick={() => onCover(null)}>Use plain cover</Button>
    <label className="mt-3 block text-sm">Find a cover card<input disabled={disabled} value={query} onChange={event => { setQuery(event.target.value); setLimit(12); }} className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" placeholder="Search card names" /></label>
    {!matches.length && <p className="my-4 text-sm text-ctp-subtext1">{names.length ? "No cover cards match this search." : "Save a deck to choose its cards as a cover. You can still choose a color now."}</p>}
    <fieldset disabled={disabled} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"><legend className="sr-only">Choose one cover card</legend>{matches.slice(0,limit).map(name => <CardResult key={name} card={cards.get(name)} name={name} selected={cover === name} onSelect={() => onCover(cover === name ? null : name)}>{cards.get(name) && <Link className="mt-1 flex min-h-control items-center justify-center text-xs text-ctp-blue underline" to={`/cards/${cards.get(name)!.slug}`} target="_blank" rel="noreferrer">Card details<span className="sr-only"> for {name}, opens in a new tab</span></Link>}</CardResult>)}</fieldset>
    {matches.length > limit && <Button disabled={disabled} className="mt-3" onClick={() => setLimit(value => value + 12)}>Show more cover cards</Button>}
  </details>;
}
