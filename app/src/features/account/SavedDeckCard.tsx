import Button from "../../components/ui/Button";
import type { SavedDeck } from "@gatcg/shared";
import { Link } from "react-router-dom";
import DeckPreviewCard, { deckPreviewActionClass } from "../../components/DeckPreviewCard";
import { encodeCustomDecks } from "../../lib/compareShareLink";

export default function SavedDeckCard({ deck, onRename, onDelete, onFolders, folderNames = [], foldersReady = false }: { onFolders?: () => void; folderNames?: string[]; foldersReady?: boolean; deck: SavedDeck; onRename: () => void; onDelete: () => void }) {
  const material = deck.decklist.material.reduce((sum, line) => sum + line.quantity, 0);
  const deckPath = `/decks/${encodeURIComponent(deck.id)}`;
  const comparePath = `/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: deck.title, decklist: deck.decklist, format: deck.format }]))}`;
  return <DeckPreviewCard presentation="library" model={{
    id: deck.id, title: deck.title, decklist: deck.decklist, championName: deck.championName, format: deck.format,
    source: { kind: "community", label: "Editable build" },
    metadata: <><p>{material} material · {deck.sources.length} source{deck.sources.length === 1 ? "" : "s"} · Updated {new Date(deck.updatedAt).toLocaleDateString()}</p>{folderNames.length > 0 && <p className="mt-2">Folders: {folderNames.join(" · ")}</p>}</>,
    actions: <>
      {onFolders && <Button disabled={!foldersReady} onClick={onFolders}>Folders{folderNames.length ? ` · ${folderNames.length}` : ""}</Button>}
      <Link className={deckPreviewActionClass} to={`${deckPath}?tab=decklist`}>Edit deck</Link>
      <Link className={deckPreviewActionClass} to={`/deck-analysis?deck=${encodeURIComponent(deck.id)}`}>Analyze deck</Link>
      <Link className={deckPreviewActionClass} to={`/deck-review?deck=${encodeURIComponent(deck.id)}`}>Review suggestions</Link>
      <Link className={deckPreviewActionClass} to={`/deck-builder?improveDeck=${encodeURIComponent(deck.id)}`}>Tune in builder</Link>
      <Link className={deckPreviewActionClass} to={comparePath}>Compare deck</Link>
      <Button onClick={onRename}>Rename</Button><Button variant="danger" onClick={onDelete}>Delete deck</Button>
    </>,
  }} view={{ to: deckPath }} />;
}
