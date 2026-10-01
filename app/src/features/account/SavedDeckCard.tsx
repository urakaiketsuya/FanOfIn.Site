import DisclosureChevron from "../../components/DisclosureChevron";
import Button from "../../components/ui/Button";
import type { SavedDeck } from "@gatcg/shared";
import { Link } from "react-router-dom";
import DeckVisualStrip from "./DeckVisualStrip";
import Panel from "../../components/ui/Panel";
import { encodeCustomDecks } from "../../lib/compareShareLink";

export default function SavedDeckCard({ deck, onRename, onDelete, onFolders, folderNames = [], foldersReady = false }: { onFolders?: () => void; folderNames?: string[]; foldersReady?: boolean; deck: SavedDeck; onRename: () => void; onDelete: () => void }) {
  const main = deck.decklist.main.reduce((sum, line) => sum + line.quantity, 0);
  const material = deck.decklist.material.reduce((sum, line) => sum + line.quantity, 0);
  const deckPath = `/decks/${encodeURIComponent(deck.id)}`;
  const comparePath = `/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: deck.title, decklist: deck.decklist, format: deck.format }]))}`;
  return <Panel data-component="SavedDeckCard" as="article" className="min-w-0">
    <DeckVisualStrip decklist={deck.decklist} championName={deck.championName} />
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ctp-subtext1"><span className="rounded-full bg-ctp-surface0 px-2 py-1">{deck.format === "STANDARD" ? "Standard" : deck.format === "PANTHEON" ? "Pantheon" : "Format unknown"}</span><span>Editable build</span></div>
    <h2 className="mt-2 break-words text-xl font-bold leading-snug">{deck.title}</h2>
    <p className="mt-2 text-sm text-ctp-subtext1">{main} main · {material} material · {deck.decklist.sideboard.reduce((sum, line) => sum + line.quantity, 0)} sideboard</p>
    {folderNames.length > 0 && <p className="mt-2 break-words text-xs text-ctp-subtext1">Folders: {folderNames.join(" · ")}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Link to={deckPath} className="inline-flex min-h-control items-center rounded-lg bg-ctp-blue px-3 text-sm font-medium text-ctp-base" aria-label={`Open ${deck.title}`}>Open deck</Link>{onFolders && <Button disabled={!foldersReady} onClick={onFolders}>Folders{folderNames.length ? ` · ${folderNames.length}` : ""}</Button>}</div>
    <p className="mt-3 text-xs text-ctp-subtext0">{deck.sources.length} source{deck.sources.length === 1 ? "" : "s"} · Updated {new Date(deck.updatedAt).toLocaleDateString()}</p>
    <details className="group mt-2 border-t border-ctp-surface1"><summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 text-sm" aria-label={`More actions for ${deck.title}`}>More actions<DisclosureChevron className="group-open:rotate-180" /></summary><div className="grid gap-1 [&>a]:flex [&>a]:min-h-control [&>a]:items-center [&>a]:rounded-lg [&>a]:px-3 [&>a]:text-sm [&>a]:text-ctp-blue">
      <Link to={`${deckPath}?tab=decklist`}>Edit deck</Link><Link to={`/deck-analysis?deck=${encodeURIComponent(deck.id)}`}>Analyze deck</Link><Link to={`/deck-review?deck=${encodeURIComponent(deck.id)}`}>Review suggestions</Link><Link to={`/deck-builder?improveDeck=${encodeURIComponent(deck.id)}`}>Tune in builder</Link><Link to={comparePath}>Compare deck</Link><Button onClick={onRename}>Rename</Button><Button variant="danger" onClick={onDelete}>Delete deck</Button>
    </div></details>
  </Panel>;
}
