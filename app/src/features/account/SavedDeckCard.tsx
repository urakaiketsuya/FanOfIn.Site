import type { SavedDeck } from "@gatcg/shared";
import { Link } from "react-router-dom";
import DeckVisualStrip from "./DeckVisualStrip";
import Panel from "../../components/ui/Panel";

export default function SavedDeckCard({ deck, onRename, onDelete }: { deck: SavedDeck; onRename: () => void; onDelete: () => void }) {
  const main = deck.decklist.main.reduce((sum, line) => sum + line.quantity, 0);
  const material = deck.decklist.material.reduce((sum, line) => sum + line.quantity, 0);
  const deckPath = `/my-decks/${encodeURIComponent(deck.id)}`;
  return <Panel as="article" className="group relative transition-colors hover:border-ctp-blue">
    <Link to={deckPath} aria-label={`Open ${deck.title}`} className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ctp-blue" />
    <div className="pointer-events-none relative flex items-start justify-between gap-3">
      <div className="min-w-0"><span className="font-semibold text-ctp-blue group-hover:underline">{deck.title}</span><p className="mt-1 text-xs text-ctp-subtext1">{deck.championName ?? "Unknown champion"} · {deck.format}</p></div>
      <span className="shrink-0 rounded-full border border-ctp-surface1 px-2 py-0.5 text-[10px] text-ctp-subtext0">Editable</span>
    </div>
    <div className="relative"><DeckVisualStrip decklist={deck.decklist} championName={deck.championName} /></div>
    <div className="pointer-events-none relative mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-md bg-ctp-base p-2"><p className="text-ctp-subtext0">Main deck</p><p className="mt-1 font-semibold text-ctp-text">{main} cards</p></div><div className="rounded-md bg-ctp-base p-2"><p className="text-ctp-subtext0">Material</p><p className="mt-1 font-semibold text-ctp-text">{material} cards</p></div></div>
    <div className="relative mt-3 flex items-center justify-between gap-3"><p className="pointer-events-none text-xs text-ctp-subtext0">{deck.sources.length} source{deck.sources.length === 1 ? "" : "s"} · Updated {new Date(deck.updatedAt).toLocaleDateString()}</p><details className="relative"><summary className="cursor-pointer list-none rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text" aria-label={`More actions for ${deck.title}`}>More</summary><div className="absolute bottom-full right-0 z-20 mb-2 w-36 rounded-lg border border-ctp-surface1 bg-ctp-base p-1 shadow-xl"><button type="button" onClick={onRename} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-ctp-surface0">Rename</button><button type="button" onClick={onDelete} className="block w-full rounded px-3 py-2 text-left text-sm text-ctp-red hover:bg-ctp-red/10">Delete deck</button></div></details></div>
  </Panel>;
}
