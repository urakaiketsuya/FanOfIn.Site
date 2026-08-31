import type { SavedDeck } from "@gatcg/shared";
import { Link } from "react-router-dom";
import DeckVisualStrip from "./DeckVisualStrip";

export default function SavedDeckCard({ deck, onRename, onDelete }: { deck: SavedDeck; onRename: () => void; onDelete: () => void }) {
  const main = deck.decklist.main.reduce((sum, line) => sum + line.quantity, 0);
  const material = deck.decklist.material.reduce((sum, line) => sum + line.quantity, 0);
  return <article className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors hover:border-ctp-blue">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><Link to={`/my-decks/${encodeURIComponent(deck.id)}`} className="font-semibold text-ctp-blue hover:underline">{deck.title}</Link><p className="mt-1 text-xs text-ctp-subtext1">{deck.championName ?? "Unknown champion"} · {deck.format}</p></div>
      <span className="shrink-0 rounded-full border border-ctp-surface1 px-2 py-0.5 text-[10px] text-ctp-subtext0">Editable</span>
    </div>
    <DeckVisualStrip decklist={deck.decklist} championName={deck.championName} />
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-md bg-ctp-base p-2"><p className="text-ctp-subtext0">Main deck</p><p className="mt-1 font-semibold text-ctp-text">{main} cards</p></div><div className="rounded-md bg-ctp-base p-2"><p className="text-ctp-subtext0">Material</p><p className="mt-1 font-semibold text-ctp-text">{material} cards</p></div></div>
    <p className="mt-3 text-xs text-ctp-subtext0">{deck.sources.length} source{deck.sources.length === 1 ? "" : "s"} · Updated {new Date(deck.updatedAt).toLocaleDateString()}</p>
    <div className="mt-4 flex flex-wrap gap-2"><Link to={`/my-decks/${encodeURIComponent(deck.id)}`} className="rounded-md border border-ctp-blue px-2.5 py-1.5 text-xs text-ctp-blue">Open deck</Link><button type="button" onClick={onRename} className="rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs">Rename</button><button type="button" onClick={onDelete} className="rounded-md border border-ctp-red/60 px-2.5 py-1.5 text-xs text-ctp-red">Delete</button></div>
  </article>;
}
