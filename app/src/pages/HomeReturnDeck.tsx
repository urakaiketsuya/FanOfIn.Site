import { useEffect, useState } from "react";
import type { AccountUser, SavedDeck } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../components/CardArtTile";
import Button from "../components/ui/Button";
import { accountApi } from "../lib/accountApi";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { useChampionCardImages } from "../features/players/useChampionCardImages";
import { findDeckChampionName } from "../lib/ttsExport";

/** Mounted by account ID so a changed session never displays another account's deck. */
export default function HomeReturnDeck({ user }: { user: AccountUser }) {
  const [result, setResult] = useState<{ deck: SavedDeck | null } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void accountApi.decks().then(({ decks }) => {
      if (active) setResult({ deck: [...decks].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id))[0] ?? null });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [user.id, attempt]);
  const deck = result?.deck;
  const cards = useCardsByNames(deck?.decklist.material.map(line => line.card) ?? []);
  const champion = deck ? findDeckChampionName(deck.decklist.material, cards) ?? deck.championName : null;
  const representatives = useChampionCardImages(deck?.championName ? [deck.championName] : []);
  const card = (champion ? cards.get(champion) : undefined) ?? (deck?.championName ? representatives.get(deck.championName) : undefined);
  return <section aria-label="Continue your deck" className="mb-6 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-4">
    <p className="break-words text-sm text-ctp-subtext1">Welcome back, {user.displayName}</p>
    {deck ? <div className="mt-3 grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-4">
      <div>{card ? <Link to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={card} name={card.name} /><span className="mt-1 block break-words text-xs">{card.name}</span></Link> : <CardArtTile card={undefined} name={champion ?? "Champion not specified"} />}</div>
      <div className="min-w-0"><p className="text-xs text-ctp-subtext0">Your latest saved deck</p><h2 className="mt-1 break-words text-xl font-bold">{deck.title}</h2><Link to={`/decks/${encodeURIComponent(deck.id)}?tab=decklist`} state={{ edit: true }} className="mt-2 inline-flex min-h-12 items-center rounded-lg bg-ctp-blue px-4 font-semibold text-ctp-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Continue editing →</Link></div>
    </div> : error ? <div className="mt-2 flex flex-wrap items-center gap-3"><p role="alert">Your latest deck could not load.</p><Button onClick={() => { setError(false); setAttempt(value => value + 1); }}>Retry latest deck</Button><Link to="/decks/edit" className="inline-flex min-h-12 items-center text-ctp-blue">My decks →</Link></div> : result ? <Link to="/decks/new" className="inline-flex min-h-12 items-center font-semibold text-ctp-blue">Create your first deck →</Link> : <p role="status" className="mt-2 text-sm text-ctp-subtext1">Loading your latest deck…</p>}
  </section>;
}
