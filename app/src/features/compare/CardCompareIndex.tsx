import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCardCatalog } from "../cards/useCardCatalog";
import CardComparisonTable from "./CardComparisonTable";

/** Individual-card comparison — any number of cards (including just one, which still shows that card's own stats), unlike the deck-vs-deck mode which needs 2+ decklists to say anything about overlap. */
export default function CardCompareIndex() {
  const cardCatalog = useCardCatalog();
  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((c) => c.name))).sort(), [cardCatalog]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);

  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [input, setInput] = useState("");

  // Seeds from a `?cards=Name1,Name2` deep link (e.g. from a card detail page's quick-compare
  // widget) once the catalog is loaded — mirrors CompareIndex's `?add=` seeding for decks.
  const seededRef = useRef(false);
  useEffect(() => {
    const raw = searchParams.get("cards");
    if (!raw || seededRef.current || cardNameSet.size === 0) return;
    seededRef.current = true;
    const names = raw.split(",").filter((n) => cardNameSet.has(n));
    if (names.length > 0) setSelected((prev) => Array.from(new Set([...prev, ...names])));
  }, [searchParams, cardNameSet]);

  function addCard(name: string) {
    if (!cardNameSet.has(name) || selected.includes(name)) return;
    setSelected((prev) => [...prev, name]);
    setInput("");
  }

  function removeCard(name: string) {
    setSelected((prev) => prev.filter((n) => n !== name));
  }

  return (
    <div>
      <p className="text-sm text-ctp-subtext1">Add any number of cards to compare their usage, win rate, and price side by side.</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {selected.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => removeCard(name)}
            className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-blue"
          >
            {name}
            <span aria-hidden="true">&times;</span>
          </button>
        ))}
      </div>

      <input
        type="text"
        list="card-compare-options"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          if (cardNameSet.has(e.target.value)) addCard(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && cardNameSet.has(input)) addCard(input);
        }}
        placeholder="Type a card name…"
        className="mt-2 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />
      <datalist id="card-compare-options">
        {cardNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {selected.length === 0 && <p className="mt-3 text-sm text-ctp-subtext1">Add cards above to start comparing.</p>}

      {selected.length > 0 && (
        <div className="mt-4">
          <CardComparisonTable names={selected} onRemove={removeCard} />
        </div>
      )}
    </div>
  );
}
