import { useMemo, useState } from "react";
import DeckSearchByCards from "./DeckSearchByCards";
import ImportByPlayer from "./ImportByPlayer";
import PasteDecklist from "./PasteDecklist";
import ComparisonGrid from "./ComparisonGrid";
import { useComparedDecklists } from "./useComparedDecklists";
import type { ComparedDeck } from "./types";

type SourceTab = "cards" | "player" | "paste";

const TAB_LABELS: Record<SourceTab, string> = {
  cards: "Search by cards",
  player: "Import by player",
  paste: "Paste a decklist",
};

export default function CompareIndex() {
  const [decks, setDecks] = useState<ComparedDeck[]>([]);
  const [tab, setTab] = useState<SourceTab>("cards");

  const comparedKeys = useMemo(() => new Set(decks.map((d) => d.key)), [decks]);
  const decklists = useComparedDecklists(decks);

  function toggleDeck(deck: ComparedDeck) {
    setDecks((prev) => (prev.some((d) => d.key === deck.key) ? prev.filter((d) => d.key !== deck.key) : [...prev, deck]));
  }

  function addDeck(deck: ComparedDeck) {
    setDecks((prev) => [...prev, deck]);
  }

  function removeDeck(key: string) {
    setDecks((prev) => prev.filter((d) => d.key !== key));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Compare Decks</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Add any number of decks, then see exactly where they overlap and diverge.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {(Object.keys(TAB_LABELS) as SourceTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md border px-2 py-1 text-xs ${
              tab === t ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
        {tab === "cards" && <DeckSearchByCards comparedKeys={comparedKeys} onToggle={toggleDeck} />}
        {tab === "player" && <ImportByPlayer comparedKeys={comparedKeys} onToggle={toggleDeck} />}
        {tab === "paste" && <PasteDecklist onAdd={addDeck} />}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">
            Comparing {decks.length} deck{decks.length === 1 ? "" : "s"}
          </h2>
          {decks.length > 0 && (
            <button type="button" onClick={() => setDecks([])} className="text-xs text-ctp-subtext0 hover:text-ctp-text">
              Clear all
            </button>
          )}
        </div>

        {decks.length === 0 && <p className="mt-2 text-sm text-ctp-subtext1">Add decks above to start comparing.</p>}

        {decks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {decks.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => removeDeck(d.key)}
                className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-blue"
              >
                {d.label}
                <span aria-hidden="true">&times;</span>
              </button>
            ))}
          </div>
        )}

        {decks.length > 0 && (
          <div className="mt-4">
            <ComparisonGrid decks={decks} decklists={decklists} />
          </div>
        )}
      </div>
    </div>
  );
}
