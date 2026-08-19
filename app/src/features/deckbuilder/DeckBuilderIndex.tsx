import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useDeckBuilderPopulation } from "./useDeckBuilderPopulation";
import { useSuggestedBuild, type SuggestedCard } from "./useSuggestedBuild";

interface ChangeLogEntry {
  label: string;
  added: string[];
  removed: string[];
}

function ChangeLogList({ entries }: { entries: ChangeLogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Suggestion changes</h2>
      <ul className="mt-2 space-y-1 text-xs text-ctp-subtext1">
        {entries.map((e, i) => (
          <li key={i}>
            <span className="text-ctp-text">{e.label}</span>
            {e.added.length === 0 && e.removed.length === 0 ? (
              <span className="text-ctp-subtext0"> — no change to the rest of the suggestions</span>
            ) : (
              <>
                {e.added.map((name) => (
                  <span key={`+${name}`} className="ml-1.5 text-ctp-green">
                    +{name}
                  </span>
                ))}
                {e.removed.map((name) => (
                  <span key={`-${name}`} className="ml-1.5 text-ctp-red">
                    −{name}
                  </span>
                ))}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardRow({
  card,
  onToggleLock,
  onRemove,
  cardsByName,
}: {
  card: SuggestedCard;
  onToggleLock: () => void;
  onRemove: () => void;
  cardsByName: ReturnType<typeof useCardsByNames>;
}) {
  const cardInfo = cardsByName.get(card.cardName);
  return (
    <li className="flex flex-wrap items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm">
      <span className="w-6 shrink-0 text-right text-ctp-subtext0">{card.quantity}x</span>
      <CardHoverPreview image={cardInfo?.editions[0]?.image} alt={card.cardName}>
        {cardInfo ? (
          <Link to={`/cards/${cardInfo.slug}`} className="text-ctp-text hover:text-ctp-blue">
            {card.cardName}
          </Link>
        ) : (
          <span className="text-ctp-text">{card.cardName}</span>
        )}
      </CardHoverPreview>
      {card.adjustedLift !== null ? (
        <span className={`text-xs font-semibold ${card.adjustedLift >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
          {card.adjustedLift >= 0 ? "+" : ""}
          {(card.adjustedLift * 100).toFixed(1)}pp
        </span>
      ) : (
        <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">
          {card.reason === "spirit" ? "your pick" : card.reason === "staple" ? "staple" : "locked"}
        </span>
      )}
      {card.sample && <span className="text-xs text-ctp-subtext0">({card.sample.with} vs {card.sample.without})</span>}
      <div className="ml-auto flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={onToggleLock}
          className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
            card.locked ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          {card.locked ? "Locked" : "Lock"}
        </button>
        <button type="button" onClick={onRemove} className="rounded-md border border-ctp-surface1 px-1.5 py-0.5 text-[10px] text-ctp-subtext1 hover:text-ctp-red">
          Remove
        </button>
      </div>
    </li>
  );
}

export default function DeckBuilderIndex() {
  useDocumentTitle(
    "Guided Deck Builder",
    "Pick a Champion and Spirit and see a suggested build assembled from the highest win-rate cards in real decks, then lock in your own picks for updated suggestions.",
  );
  const [championName, setChampionName] = useState<string | null>(null);
  const [spiritFilter, setSpiritFilter] = useState<string | null>(null);
  const [lockedCards, setLockedCards] = useState<Map<string, number>>(new Map());
  const [rejectedCards, setRejectedCards] = useState<Set<string>>(new Set());
  const [cardInput, setCardInput] = useState("");
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  // Set right before a state change that'll cause a recompute, read (and cleared) by the effect
  // below once that recompute lands — pairs the resulting suggestion diff with the action that
  // caused it. `subject` is excluded from the diff itself since "I locked X" already says X
  // changed; the log is about the ripple effect on everything else.
  const pendingActionRef = useRef<{ label: string; subject: string | null } | null>(null);
  const prevSuggestedRef = useRef<Set<string> | null>(null);

  const popularityIndexData = useDeckPopularityIndexData();
  const cardCatalog = useCardCatalog();
  const { rows, spiritsPresent, loading: populationLoading } = useDeckBuilderPopulation(championName);
  const build = useSuggestedBuild(rows, spiritFilter, lockedCards, rejectedCards, populationLoading);

  useEffect(() => {
    const current = new Set(
      [...build.material, ...build.main].filter((c) => !c.locked).map((c) => c.cardName),
    );
    const pending = pendingActionRef.current;
    const prev = prevSuggestedRef.current;
    if (prev && pending) {
      const subject = pending.subject;
      const added = Array.from(current).filter((n) => !prev.has(n) && n !== subject);
      const removed = Array.from(prev).filter((n) => !current.has(n) && n !== subject);
      setChangeLog((log) => [{ label: pending.label, added, removed }, ...log].slice(0, 25));
    }
    prevSuggestedRef.current = current;
    pendingActionRef.current = null;
  }, [build]);

  const championsPresent = useMemo(() => {
    if (!popularityIndexData) return [];
    return Array.from(new Set(popularityIndexData.entries.map((s) => s.championName).filter((n): n is string => n !== null))).sort();
  }, [popularityIndexData]);

  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((c) => c.name))).sort(), [cardCatalog]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);

  const allNames = useMemo(
    () => [...build.material.map((c) => c.cardName), ...build.main.map((c) => c.cardName)],
    [build.material, build.main],
  );
  const cardsByName = useCardsByNames(allNames);

  useEffect(() => {
    startTransition(() => {
      setSpiritFilter(null);
      setLockedCards(new Map());
      setRejectedCards(new Set());
      setChangeLog([]);
    });
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [championName]);

  function toggleLock(name: string, quantity: number) {
    const willLock = !lockedCards.has(name);
    pendingActionRef.current = { label: willLock ? `Locked ${name}` : `Unlocked ${name}`, subject: name };
    startTransition(() =>
      setLockedCards((prev) => {
        const next = new Map(prev);
        if (next.has(name)) next.delete(name);
        else next.set(name, quantity);
        return next;
      }),
    );
  }

  /** Locked cards are dropped from the deck entirely; a non-locked (suggested) card is instead excluded from future suggestions, so a different card fills that slot. */
  function removeCard(name: string, locked: boolean) {
    pendingActionRef.current = { label: locked ? `Removed ${name}` : `Excluded ${name} from suggestions`, subject: name };
    startTransition(() => {
      if (locked) {
        setLockedCards((prev) => {
          const next = new Map(prev);
          next.delete(name);
          return next;
        });
      } else {
        setRejectedCards((prev) => new Set(prev).add(name));
      }
    });
  }

  function addCard(name: string) {
    if (!cardNameSet.has(name) || lockedCards.has(name)) return;
    const card = cardCatalog.find((c) => c.name === name);
    const defaultQty = card?.types.includes("UNIQUE") ? 1 : 4;
    pendingActionRef.current = { label: `Added ${name}`, subject: name };
    startTransition(() =>
      setLockedCards((prev) => {
        const next = new Map(prev);
        next.set(name, defaultQty);
        return next;
      }),
    );
    setCardInput("");
  }

  const mainTotal = build.main.reduce((sum, c) => sum + c.quantity, 0);
  const materialTotal = build.material.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Guided Deck Builder</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Pick a Champion and Spirit — the build below is assembled from the highest win-rate cards across real decks
        matching that pair, not a single example decklist. Lock in cards of your own choosing and the rest re-ranks
        based on what you've picked. Correlational, not causal, same as every Card Impact number on this site.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Champion:</span>
        <select
          value={championName ?? ""}
          onChange={(e) => setChampionName(e.target.value || null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">Choose a Champion…</option>
          {championsPresent.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {championName && (
          <>
            <span className="ml-2 text-ctp-subtext0">Spirit:</span>
            <select
              value={spiritFilter ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                pendingActionRef.current = { label: `Set Spirit to ${value ?? "Any Spirit"}`, subject: null };
                startTransition(() => setSpiritFilter(value));
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              <option value="">Any Spirit</option>
              {spiritsPresent.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {!championName && <p className="mt-6 text-ctp-subtext1">Choose a Champion to see a suggested build.</p>}

      {championName && populationLoading && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      {championName && !populationLoading && rows.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">No decks found for {championName}.</p>
      )}

      {championName && !populationLoading && rows.length > 0 && (
        <>
          <div className="mt-4">
            <span className="text-sm text-ctp-subtext0">Add a card:</span>
            <input
              type="text"
              list="deck-builder-card-options"
              value={cardInput}
              onChange={(e) => {
                setCardInput(e.target.value);
                if (cardNameSet.has(e.target.value)) addCard(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && cardNameSet.has(cardInput)) addCard(cardInput);
              }}
              placeholder="Type a card name to lock it in…"
              className="mt-1 block w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
            />
            <datalist id="deck-builder-card-options">
              {cardNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <p className="mt-4 text-xs text-ctp-subtext0">
            Ranking suggestions against {build.rankingPopulationSize} matching deck{build.rankingPopulationSize === 1 ? "" : "s"}
            {isPending && " — recalculating…"}
            {rejectedCards.size > 0 && (
              <>
                {" · "}
                {rejectedCards.size} card{rejectedCards.size === 1 ? "" : "s"} excluded from suggestions —{" "}
                <button
                  type="button"
                  onClick={() => {
                    pendingActionRef.current = { label: "Reset excluded cards", subject: null };
                    startTransition(() => setRejectedCards(new Set()));
                  }}
                  className="hover:text-ctp-blue hover:underline"
                >
                  reset
                </button>
              </>
            )}
          </p>
          {build.usedFallback && (
            <p className="mt-1 text-xs text-ctp-yellow">
              Not enough decks have every card you've locked in — remaining suggestions are based on the broader{" "}
              {spiritFilter ?? "any Spirit"} {championName} population instead.
            </p>
          )}

          <div className={`mt-3 grid gap-4 sm:grid-cols-2 transition-opacity ${isPending ? "opacity-50" : ""}`}>
            <div>
              <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Material ({materialTotal})</h2>
              <ul className="mt-2 space-y-1">
                {build.material.map((c) => (
                  <CardRow
                    key={c.cardName}
                    card={c}
                    cardsByName={cardsByName}
                    onToggleLock={() => toggleLock(c.cardName, c.quantity)}
                    onRemove={() => removeCard(c.cardName, c.locked)}
                  />
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Main ({mainTotal})</h2>
              <ul className="mt-2 space-y-1">
                {build.main.map((c) => (
                  <CardRow
                    key={c.cardName}
                    card={c}
                    cardsByName={cardsByName}
                    onToggleLock={() => toggleLock(c.cardName, c.quantity)}
                    onRemove={() => removeCard(c.cardName, c.locked)}
                  />
                ))}
              </ul>
            </div>
          </div>

          <ChangeLogList entries={changeLog} />
        </>
      )}
    </div>
  );
}
