import type { BookmarkedDeck, PublicDeckSummary } from "@gatcg/shared";
import { Link } from "react-router-dom";
import DeckVisualStrip from "./DeckVisualStrip";
import Panel from "../../components/ui/Panel";

export function PublicDeckCard({ deck }: { deck: PublicDeckSummary | BookmarkedDeck }) {
  return <Panel data-component="PublicDeckCard" as="article">
    <Link to={`/decks/${deck.publicSlug}`} className="font-semibold text-ctp-blue hover:underline">{deck.title}</Link>
    <p className="mt-1 text-xs text-ctp-subtext1">{deck.championName ?? "Unknown champion"} · {deck.format} · v{deck.versionNumber}</p>
    {"decklist" in deck && <DeckVisualStrip decklist={deck.decklist} championName={deck.championName} />}
    {deck.description && <p className="mt-2 line-clamp-2 text-sm text-ctp-subtext1">{deck.description}</p>}
    <div className="mt-3 flex flex-wrap gap-2"><Link to={`/deck-analysis?publicDeck=${encodeURIComponent(deck.publicSlug)}`} className="rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs font-medium text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Analyze</Link><Link to={`/deck-review?publicDeck=${encodeURIComponent(deck.publicSlug)}`} className="rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs font-medium text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Review suggestions</Link></div>
    <p className="mt-3 text-xs text-ctp-subtext0"><Link to={`/users/${deck.owner.profileSlug}`} className="hover:text-ctp-blue">by {deck.owner.displayName}</Link> · {deck.likeCount} like{deck.likeCount === 1 ? "" : "s"}</p>
  </Panel>;
}
