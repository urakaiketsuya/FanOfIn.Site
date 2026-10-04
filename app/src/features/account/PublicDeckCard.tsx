import DeckPreviewListActions from "../../components/DeckPreviewListActions";
import { deckPreviewCards, type BookmarkedDeck, type PublicDeckSummary } from "@gatcg/shared";
import { Link } from "react-router-dom";
import DeckPreviewCard, { deckPreviewActionClass as actionClass } from "../../components/DeckPreviewCard";
import DisclosureChevron from "../../components/DisclosureChevron";

export function PublicDeckCard({ deck, onRemoveFavorite }: { deck: PublicDeckSummary | BookmarkedDeck; onRemoveFavorite?: () => void }) {
  const decklist = "decklist" in deck ? deck.decklist : null;
  const materialPreview = "materialPreview" in deck ? deck.materialPreview : undefined;
  const preview = materialPreview?.length ? materialPreview : deck.previewCards ?? (decklist ? deckPreviewCards(decklist) : []);
  return <DeckPreviewCard presentation={onRemoveFavorite ? "library" : "detail"} model={{
    id: deck.publicSlug, title: deck.title, decklist, championName: deck.championName, format: deck.format,
    source: { kind: "community", label: deck.isSeed ? "Starter Library" : "Community" },
    materialPreview,
    preview: { section: materialPreview?.length ? undefined : "main", label: materialPreview?.length ? "Featured material cards" : "From the Main deck", lines: preview.map(line => ({ name: line.card, quantity: line.quantity })) },
    mainCount: "mainCount" in deck ? deck.mainCount : undefined,
    sideboardCount: "sideboardCount" in deck ? deck.sideboardCount : undefined,
    metadata: <>
      {deck.isSeed ? <p>Curated by Fan of Insight</p> : <Link to={`/users/${deck.owner.profileSlug}`} className="inline-flex min-h-12 items-center rounded hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">by {deck.owner.displayName}</Link>}
      <p>{deck.likeCount} {deck.likeCount === 1 ? "like" : "likes"} · Version {deck.versionNumber}</p>
      {deck.description && <p className="mt-2 line-clamp-2">{deck.description}</p>}
    </>,
    actions: <>
      {onRemoveFavorite && <button type="button" onClick={onRemoveFavorite} className={`${actionClass} text-ctp-red hover:bg-ctp-red/10`}>Remove favorite</button>}
      {decklist && <DeckPreviewListActions decklist={decklist} title={deck.title} format={deck.format} />}
      {onRemoveFavorite ? <><Link to={`/deck-analysis?publicDeck=${encodeURIComponent(deck.publicSlug)}`} className={`${actionClass} text-ctp-blue`}>Analyze deck</Link><Link to={`/deck-review?publicDeck=${encodeURIComponent(deck.publicSlug)}`} className={`${actionClass} text-ctp-blue`}>Review suggestions</Link></> : <details className="group min-w-0">
        <summary className={`${actionClass} cursor-pointer list-none text-ctp-subtext1 hover:bg-ctp-surface0 [&::-webkit-details-marker]:hidden`}>Deck tools<DisclosureChevron className="group-open:rotate-180" /></summary>
        <div className="mt-2 flex flex-wrap gap-1">
          <Link to={`/deck-analysis?publicDeck=${encodeURIComponent(deck.publicSlug)}`} className={`${actionClass} text-ctp-blue hover:bg-ctp-surface0`}>Analyze deck</Link>
          <Link to={`/deck-review?publicDeck=${encodeURIComponent(deck.publicSlug)}`} className={`${actionClass} text-ctp-blue hover:bg-ctp-surface0`}>Review suggestions</Link>
        </div>
      </details>}
    </>,
  }} view={{ to: `/decks/${deck.publicSlug}` }} />;
}
