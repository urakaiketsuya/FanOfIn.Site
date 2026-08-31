import type { BookmarkedDeck, PublicDeckSummary } from "@gatcg/shared";
import { Link } from "react-router-dom";
import DeckVisualStrip from "./DeckVisualStrip";

export function PublicDeckCard({ deck }: { deck: PublicDeckSummary | BookmarkedDeck }) {
  return <article className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
    <Link to={`/decklists/${deck.publicSlug}`} className="font-semibold text-ctp-blue hover:underline">{deck.title}</Link>
    <p className="mt-1 text-xs text-ctp-subtext1">{deck.championName ?? "Unknown champion"} · {deck.format} · v{deck.versionNumber}</p>
    {"decklist" in deck && <DeckVisualStrip decklist={deck.decklist} championName={deck.championName} />}
    {deck.description && <p className="mt-2 line-clamp-2 text-sm text-ctp-subtext1">{deck.description}</p>}
    <p className="mt-3 text-xs text-ctp-subtext0"><Link to={`/users/${deck.owner.profileSlug}`} className="hover:text-ctp-blue">by {deck.owner.displayName}</Link> · {deck.likeCount} like{deck.likeCount === 1 ? "" : "s"}</p>
  </article>;
}
