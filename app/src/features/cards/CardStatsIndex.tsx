import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER, type TopCardsBySection } from "@gatcg/shared";
import { useCardStatsData } from "../archetypes/data";
import { useCardsByNames } from "../events/useCardsByNames";
import { useCardCombination } from "./useCardCombination";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import TopCardsSections from "../../components/TopCardsSections";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

type SortMode = "usage" | "adjusted" | "raw" | "hot";

const SORT_LABELS: Record<SortMode, string> = {
  usage: "Usage",
  adjusted: "Win rate (adjusted)",
  raw: "Win rate (raw)",
  hot: "Hot",
};

const MIN_DECKS_OPTIONS = [0, 5, 10, 20];

export default function CardStatsIndex() {
  useDocumentTitle("Card Stats", "Card usage and win-rate stats across ranked Grand Archive TCG tournaments.");
  const cardStatsData = useCardStatsData();
  const [sortMode, setSortMode] = useState<SortMode>("usage");
  const [minDecks, setMinDecks] = useState(5);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [comboCollapsed, setComboCollapsed] = useState(false);

  const categoriesPresent = useMemo(() => {
    if (!cardStatsData) return [];
    return EVENT_CATEGORY_ORDER.filter((c) => c in cardStatsData.byCategory);
  }, [cardStatsData]);

  const rows = useMemo(() => {
    if (!cardStatsData) return [];
    const source = category ? (cardStatsData.byCategory[category] ?? []) : cardStatsData.cards;
    const query = search.trim().toLowerCase();
    const filtered = source.filter((c) => c.deckCount >= minDecks && (query === "" || c.name.toLowerCase().includes(query)));
    return [...filtered].sort((a, b) => {
      switch (sortMode) {
        case "adjusted":
          return b.adjustedWinRate - a.adjustedWinRate;
        case "raw":
          return b.avgWinRate - a.avgWinRate;
        case "hot":
          return b.recentDeckCount - b.priorDeckCount - (a.recentDeckCount - a.priorDeckCount);
        default:
          return b.deckCount - a.deckCount;
      }
    });
  }, [cardStatsData, sortMode, minDecks, category, search]);

  const cardImages = useCardsByNames(rows.map((c) => c.name));

  const combination = useCardCombination(selectedCards);
  const comboNames = useMemo(
    () => [...combination.main, ...combination.material, ...combination.sideboard].map((c) => c.name),
    [combination],
  );
  const comboCardImages = useCardsByNames(comboNames);
  const comboTopCards: TopCardsBySection = useMemo(
    () => ({
      main: combination.main.map((c) => ({ ...c, slug: comboCardImages.get(c.name)?.slug ?? null })),
      material: combination.material.map((c) => ({ ...c, slug: comboCardImages.get(c.name)?.slug ?? null })),
      sideboard: combination.sideboard.map((c) => ({ ...c, slug: comboCardImages.get(c.name)?.slug ?? null })),
    }),
    [combination, comboCardImages],
  );

  function toggleSelected(name: string) {
    setSelectedCards((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ctp-blue">Card Stats</h1>
        <Link to="/cards" className="text-sm text-ctp-blue hover:underline">
          Browse the catalog &rarr;
        </Link>
      </div>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Usage and win rate across every public decklist. "Adjusted" win rate is shrunk toward 50%
        proportional to sample size, so a card with 3 appearances at 100% doesn't outrank one with
        200 at 65%. Add cards to the filter below to see what's played alongside them.
      </p>

      {selectedCards.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-blue bg-ctp-mantle p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ctp-subtext0">Decks containing:</span>
            {selectedCards.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleSelected(name)}
                className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-blue"
              >
                {name}
                <span aria-hidden="true">&times;</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setComboCollapsed((v) => !v)}
              className="ml-auto text-xs text-ctp-subtext0 hover:text-ctp-text"
            >
              {comboCollapsed ? "Expand" : "Collapse"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedCards([])}
              className="text-xs text-ctp-subtext0 hover:text-ctp-text"
            >
              Clear
            </button>
          </div>

          <p className="mt-2 text-sm text-ctp-subtext1">
            {combination.deckCount === undefined ? "Loading deck data…" : `${combination.deckCount} decks match`}
          </p>

          {!comboCollapsed && combination.deckCount !== undefined && combination.deckCount > 0 && (
            <div className="mt-3">
              <TopCardsSections topCards={comboTopCards} cardImages={comboCardImages} />
            </div>
          )}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by card name…"
        className="mt-4 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Type:</span>
        <button
          onClick={() => setCategory(null)}
          className={`rounded-md border px-2 py-1 text-xs ${
            category === null ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          All
        </button>
        {categoriesPresent.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-md border px-2 py-1 text-xs ${
              category === c ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {EVENT_CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`rounded-md border px-2 py-1 text-xs ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {SORT_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Min decks:</span>
        {MIN_DECKS_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => setMinDecks(n)}
            className={`rounded-md border px-2 py-1 text-xs ${
              minDecks === n ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {n === 0 ? "Any" : `${n}+`}
          </button>
        ))}
      </div>

      {!cardStatsData && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {cardStatsData && rows.length === 0 && <p className="mt-6 text-ctp-subtext1">No cards match this filter yet.</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="py-1">Card</th>
              <th className="py-1">Decks</th>
              <th className="py-1">Events</th>
              <th className="py-1">Win rate</th>
              <th className="py-1">Adjusted</th>
              <th className="py-1"></th>
            </tr>
          </thead>
        <tbody className="divide-y divide-ctp-surface0">
          {rows.map((c) => {
            const card = cardImages.get(c.name);
            const isSelected = selectedCards.includes(c.name);
            return (
              <tr key={c.name}>
                <td className="py-1.5">
                  <CardHoverPreview image={card?.editions[0]?.image} alt={c.name}>
                    {c.slug ? (
                      <Link to={`/cards/${c.slug}`} className="flex items-center gap-2 text-ctp-text hover:text-ctp-blue">
                        {card?.editions[0] && (
                          <CardImage image={card.editions[0].image} alt={c.name} className="h-10 w-7 rounded object-cover object-top" />
                        )}
                        {c.name}
                      </Link>
                    ) : (
                      <span className="text-ctp-text">{c.name}</span>
                    )}
                  </CardHoverPreview>
                </td>
                <td className="py-1.5 text-ctp-subtext1">{c.deckCount}</td>
                <td className="py-1.5 text-ctp-subtext1">{c.eventCount}</td>
                <td className="py-1.5 text-ctp-subtext1">{(c.avgWinRate * 100).toFixed(0)}%</td>
                <td className="py-1.5 text-ctp-subtext1">{(c.adjustedWinRate * 100).toFixed(0)}%</td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSelected(c.name)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      isSelected
                        ? "border-ctp-blue text-ctp-blue"
                        : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                    }`}
                  >
                    {isSelected ? "− Remove" : "+ Filter"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
