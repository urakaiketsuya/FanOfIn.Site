import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";
import DonutChart, { buildChartSegments } from "../../components/DonutChart";
import BarChart from "../../components/BarChart";
import { computeDeckComposition, computeDeckIdentity, computeDeckRating, computeMemoryCostCurve, computeReserveCostCurve, type RatingPillar } from "../../lib/deckIdentity";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { useDeckBuilderPopulation } from "./useDeckBuilderPopulation";
import { useSuggestedBuild, type SuggestedCard } from "./useSuggestedBuild";
import { useBuddyCards, type BuddyCard } from "./useBuddyCards";

type BuilderTab = "build" | "stats" | "buddies" | "log";
const TAB_KEYS: BuilderTab[] = ["build", "stats", "buddies", "log"];

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

function BuddyCardsList({
  lockedNames,
  buddyCards,
  cardsByName,
  onAdd,
}: {
  lockedNames: string[];
  buddyCards: Map<string, BuddyCard[]>;
  cardsByName: ReturnType<typeof useCardsByNames>;
  onAdd: (name: string) => void;
}) {
  const groups = lockedNames.map((name) => ({ name, buddies: buddyCards.get(name) ?? [] })).filter((g) => g.buddies.length > 0);
  if (groups.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Buddy cards</h2>
      <p className="mt-1 text-xs text-ctp-subtext0">
        Cards most often run alongside a locked-in pick, regardless of win rate — add one straight from here even if
        it never shows up in the ranked suggestions above.
      </p>
      <div className="mt-2 space-y-3">
        {groups.map(({ name, buddies }) => (
          <div key={name}>
            <p className="text-xs text-ctp-subtext1">
              With <span className="text-ctp-text">{name}</span>:
            </p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {buddies.map((b) => {
                const cardInfo = cardsByName.get(b.cardName);
                return (
                  <li key={b.cardName} className="flex items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm">
                    <CardHoverPreview image={cardInfo?.editions[0]?.image} alt={b.cardName}>
                      {cardInfo ? (
                        <Link to={`/cards/${cardInfo.slug}`} className="text-ctp-text hover:text-ctp-blue">
                          {b.cardName}
                        </Link>
                      ) : (
                        <span className="text-ctp-text">{b.cardName}</span>
                      )}
                    </CardHoverPreview>
                    <span className="text-xs text-ctp-subtext0">{Math.round(b.coOccurrenceRate * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => onAdd(b.cardName)}
                      className="rounded-md border border-ctp-surface1 px-1.5 py-0.5 text-[10px] text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                    >
                      Add
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Same composition/rating stats as a deck's own dedicated page (DeckDetail.tsx), recomputed live from whatever's currently assembled — updates as cards get locked, added, or removed. */
function StatsPanel({
  lines,
  cardsByName,
  championName,
}: {
  lines: { name: string; quantity: number }[];
  cardsByName: ReturnType<typeof useCardsByNames>;
  championName: string | null;
}) {
  const identity = useMemo(() => computeDeckIdentity(lines, cardsByName), [lines, cardsByName]);
  const composition = useMemo(() => computeDeckComposition(lines, cardsByName), [lines, cardsByName]);
  const rating = useMemo(() => computeDeckRating(lines, cardsByName, championName, identity.classes), [lines, cardsByName, championName, identity.classes]);
  const memoryCurve = useMemo(() => computeMemoryCostCurve(lines, cardsByName), [lines, cardsByName]);
  const reserveCurve = useMemo(() => computeReserveCostCurve(lines, cardsByName), [lines, cardsByName]);

  if (lines.length === 0) return <p className="mt-6 text-sm text-ctp-subtext1">Nothing in the build yet.</p>;

  return (
    <div className="mt-6">
      <div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Power Rating</h2>
          <span className="text-2xl font-bold text-ctp-blue">{rating.composite.toFixed(2)}</span>
        </div>
        <div className="mt-3 space-y-2">
          {(["aggro", "consistency", "interaction", "resilience"] as RatingPillar[]).map((pillar) => (
            <div key={pillar} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 capitalize text-ctp-subtext1">{pillar}</span>
              <div className="h-2 flex-1 rounded-full bg-ctp-surface0">
                <div className="h-2 rounded-full bg-ctp-blue" style={{ width: `${(rating.scores[pillar] / 10) * 100}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right text-ctp-subtext0">{rating.scores[pillar]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <BarChart title="Memory Cost Curve" bars={memoryCurve} />
        <BarChart title="Reserve Cost Curve" bars={reserveCurve} />
        <DonutChart title="Card Types" segments={buildChartSegments(composition.types)} />
        <DonutChart title="Elements" segments={buildChartSegments(composition.elements)} />
        <DonutChart title="Card Subtypes" segments={buildChartSegments(composition.subtypes)} />
      </div>
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
  const [tab, setTab] = useTabParam<BuilderTab>("tab", TAB_KEYS, "build");
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
  const placedNames = useMemo(() => new Set(allNames), [allNames]);
  const buddyCards = useBuddyCards(rows, spiritFilter, lockedCards, placedNames);
  const buddyNames = useMemo(() => Array.from(buddyCards.values()).flatMap((list) => list.map((b) => b.cardName)), [buddyCards]);
  const cardsByName = useCardsByNames(useMemo(() => [...allNames, ...buddyNames], [allNames, buddyNames]));

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
  const buildLines = useMemo(
    () => [...build.material, ...build.main].map((c) => ({ name: c.cardName, quantity: c.quantity })),
    [build.material, build.main],
  );

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

          <div className="mt-4 flex flex-wrap gap-2 border-b border-ctp-surface1 pb-2">
            {(
              [
                { key: "build", label: "Build" },
                { key: "stats", label: "Stats" },
                { key: "buddies", label: "Buddy Cards" },
                { key: "log", label: `Log (${changeLog.length})` },
              ] as { key: BuilderTab; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-md border px-2.5 py-1 text-xs ${
                  tab === t.key ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "build" && (
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
            </div>
          )}

          {tab === "stats" && <StatsPanel lines={buildLines} cardsByName={cardsByName} championName={championName} />}

          {tab === "buddies" && (
            <BuddyCardsList lockedNames={Array.from(lockedCards.keys())} buddyCards={buddyCards} cardsByName={cardsByName} onAdd={addCard} />
          )}

          {tab === "log" && <ChangeLogList entries={changeLog} />}
        </>
      )}
    </div>
  );
}
