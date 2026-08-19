import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardsByNames } from "../events/useCardsByNames";
import { buildDecklistText } from "../events/DecklistView";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import CardHoverPreview from "../../components/CardHoverPreview";
import CostIcon from "../../components/CostIcon";
import ElementIcon from "../../components/ElementIcon";
import DonutChart, { buildChartSegments } from "../../components/DonutChart";
import BarChart from "../../components/BarChart";
import { computeDeckComposition, computeDeckIdentity, computeDeckRating, computeMemoryCostCurve, computeReserveCostCurve, type RatingPillar } from "../../lib/deckIdentity";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { buildTtsSaveFile, downloadJsonFile, slugifyFilename } from "../../lib/ttsExport";
import { formatUsd } from "../../lib/format";
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
  /** Change in the real (Spirit + all locks) population's average win rate this action caused — null when there's no prior value to compare against yet (the very first logged action). */
  winRateDelta: number | null;
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
            {e.winRateDelta !== null && Math.abs(e.winRateDelta) >= 0.001 && (
              <span className={`ml-1.5 font-semibold ${e.winRateDelta >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
                (expected win rate {e.winRateDelta >= 0 ? "+" : ""}
                {(e.winRateDelta * 100).toFixed(1)}pp)
              </span>
            )}
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
  if (groups.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Buddy cards</h2>
        <p className="mt-1 text-xs text-ctp-subtext0">
          {lockedNames.length === 0
            ? "Lock in a card to see what's most often run alongside it."
            : "No buddy suggestions right now — either everything commonly run alongside your locked cards is already in the build, or this Champion/Spirit population is too thin to say (a heavily-locked build from a paste often narrows it down to just a few decks)."}
        </p>
      </div>
    );
  }
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
  priceByName,
  showLockToggle = true,
}: {
  card: SuggestedCard;
  onToggleLock: () => void;
  onRemove: () => void;
  cardsByName: ReturnType<typeof useCardsByNames>;
  priceByName: Map<string, number>;
  /** Sideboard rows are locked-only with no ranked-suggestion refill to fall back to, so unlocking one would just make it vanish — hide the toggle there and leave Remove as the only way out. */
  showLockToggle?: boolean;
}) {
  const cardInfo = cardsByName.get(card.cardName);
  const unitPrice = priceByName.get(card.cardName);
  return (
    <li className="flex flex-wrap items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm">
      <span className="w-6 shrink-0 text-right text-ctp-subtext0">{card.quantity}x</span>
      {cardInfo && cardInfo.element !== "NORM" && <ElementIcon element={cardInfo.element} size={14} />}
      <CardHoverPreview image={cardInfo?.editions[0]?.image} alt={card.cardName}>
        {cardInfo ? (
          <Link to={`/cards/${cardInfo.slug}`} className="text-ctp-text hover:text-ctp-blue">
            {card.cardName}
          </Link>
        ) : (
          <span className="text-ctp-text">{card.cardName}</span>
        )}
      </CardHoverPreview>
      {cardInfo && cardInfo.cost.type !== "none" && cardInfo.cost.value !== null && (
        <span className="flex shrink-0 items-center gap-0.5 text-xs text-ctp-subtext0">
          <CostIcon kind={cardInfo.cost.type} size={12} />
          {cardInfo.cost.value}
        </span>
      )}
      {unitPrice !== undefined && <span className="shrink-0 text-xs text-ctp-subtext0">{formatUsd(unitPrice * card.quantity)}</span>}
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
        {showLockToggle && (
          <button
            type="button"
            onClick={onToggleLock}
            className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
              card.locked ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {card.locked ? "Locked" : "Lock"}
          </button>
        )}
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
  // Section a lock is known to belong to (from where it was locked, or from a pasted decklist's
  // own Main/Material headers) — see useSuggestedBuild's lockedSections param doc for why this
  // beats guessing from population presence for a card the current population barely plays.
  const [lockedSections, setLockedSections] = useState<Map<string, "main" | "material" | "sideboard">>(new Map());
  const [rejectedCards, setRejectedCards] = useState<Set<string>>(new Set());
  const [cardInput, setCardInput] = useState("");
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [tab, setTab] = useTabParam<BuilderTab>("tab", TAB_KEYS, "build");
  const [isPending, startTransition] = useTransition();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  // Set right before a state change that'll cause a recompute, read (and cleared) by the effect
  // below once that recompute lands — pairs the resulting suggestion diff with the action that
  // caused it. `subject` is excluded from the diff itself since "I locked X" already says X
  // changed; the log is about the ripple effect on everything else.
  const pendingActionRef = useRef<{ label: string; subject: string | null } | null>(null);
  const prevSuggestedRef = useRef<Set<string> | null>(null);
  const prevWinRateRef = useRef<number | null>(null);
  // Set right before setChampionName() by loadPastedDecklist() so the reset effect below doesn't
  // clobber the Spirit/locks it just derived from the paste — a normal Champion-dropdown change
  // still resets to a blank slate as usual.
  const skipNextResetRef = useRef(false);

  const popularityIndexData = useDeckPopularityIndexData();
  const cardCatalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);
  const { rows, spiritsPresent, loading: populationLoading } = useDeckBuilderPopulation(championName);
  const build = useSuggestedBuild(rows, spiritFilter, lockedCards, rejectedCards, populationLoading, lockedSections);

  useEffect(() => {
    const current = new Set(
      [...build.material, ...build.main].filter((c) => !c.locked).map((c) => c.cardName),
    );
    const pending = pendingActionRef.current;
    const prev = prevSuggestedRef.current;
    const prevWinRate = prevWinRateRef.current;
    if (prev && pending) {
      const subject = pending.subject;
      const added = Array.from(current).filter((n) => !prev.has(n) && n !== subject);
      const removed = Array.from(prev).filter((n) => !current.has(n) && n !== subject);
      const winRateDelta =
        prevWinRate !== null && build.conditionalWinRate !== null ? build.conditionalWinRate - prevWinRate : null;
      setChangeLog((log) => [{ label: pending.label, added, removed, winRateDelta }, ...log].slice(0, 25));
    }
    prevSuggestedRef.current = current;
    prevWinRateRef.current = build.conditionalWinRate;
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
  const priceByName = useDeckPriceByName();

  useEffect(() => {
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
    } else {
      startTransition(() => {
        setSpiritFilter(null);
        setLockedCards(new Map());
        setLockedSections(new Map());
        setRejectedCards(new Set());
        setChangeLog([]);
      });
    }
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [championName]);

  /**
   * Bulk equivalent of picking a Champion+Spirit then locking every remaining card by hand —
   * detects the Champion (material CHAMPION-type card, non-Spirit) and Spirit (material
   * CHAMPION+SPIRIT card, same rule useDeckBuilderPopulation uses) from the pasted list, then
   * locks everything else (including the specific Champion-level prints run, so the algorithm
   * doesn't silently swap in a different print at that level).
   */
  function loadPastedDecklist() {
    const { decklist, skippedLines } = parseDecklist(pasteText);
    const lines = [...decklist.main, ...decklist.material, ...decklist.sideboard];
    if (lines.length === 0) {
      setPasteError(skippedLines.length > 0 ? "Couldn't recognize any card lines in that paste." : "Paste a decklist first.");
      return;
    }

    let detectedChampion: string | null = null;
    let detectedSpirit: string | null = null;
    const newLocked = new Map<string, number>();
    const newSections = new Map<string, "main" | "material" | "sideboard">();

    for (const section of ["main", "material", "sideboard"] as const) {
      for (const line of decklist[section]) {
        const card = catalogByName.get(line.card);
        if (card?.types.includes("CHAMPION")) {
          if (card.subtypes.includes("SPIRIT")) {
            detectedSpirit = line.card;
            continue;
          }
          if (!detectedChampion) detectedChampion = card.name.split(",")[0].trim();
        }
        newLocked.set(line.card, (newLocked.get(line.card) ?? 0) + line.quantity);
        newSections.set(line.card, section);
      }
    }

    if (!detectedChampion) {
      setPasteError("Couldn't find a Champion card in this decklist.");
      return;
    }

    if (detectedChampion !== championName) skipNextResetRef.current = true;
    setChampionName(detectedChampion);
    setSpiritFilter(detectedSpirit);
    setLockedCards(newLocked);
    setLockedSections(newSections);
    setRejectedCards(new Set());
    setChangeLog([]);
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;

    setPasteText("");
    setPasteError(null);
    setPasteOpen(false);
  }

  /** `section` is the section this card is being locked FROM (known for sure, since it's the list the click came from) — recorded so the section survives even if the current population barely plays this card (see lockedSections' doc comment). Omitted when unlocking. */
  function toggleLock(name: string, quantity: number, section?: "main" | "material") {
    const willLock = !lockedCards.has(name);
    pendingActionRef.current = { label: willLock ? `Locked ${name}` : `Unlocked ${name}`, subject: name };
    startTransition(() => {
      setLockedCards((prev) => {
        const next = new Map(prev);
        if (next.has(name)) next.delete(name);
        else next.set(name, quantity);
        return next;
      });
      setLockedSections((prev) => {
        const next = new Map(prev);
        if (willLock && section) next.set(name, section);
        else next.delete(name);
        return next;
      });
    });
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
        setLockedSections((prev) => {
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
  const sideboardTotal = build.sideboard.reduce((sum, c) => sum + c.quantity, 0);
  // Deck price/Stats stay scoped to material+main — same "sideboard is situational tech, not part
  // of deck identity" convention as everywhere else in this codebase (Popular Decks, Archetypes,
  // etc.); sideboard gets its own separate price line below instead, matching DecklistView.tsx.
  const buildLines = useMemo(
    () => [...build.material, ...build.main].map((c) => ({ name: c.cardName, quantity: c.quantity })),
    [build.material, build.main],
  );
  const sideboardLines = useMemo(() => build.sideboard.map((c) => ({ name: c.cardName, quantity: c.quantity })), [build.sideboard]);

  const decklist: OmnidexDecklist = useMemo(
    () => ({
      main: build.main.map((c) => ({ card: c.cardName, quantity: c.quantity })),
      material: build.material.map((c) => ({ card: c.cardName, quantity: c.quantity })),
      sideboard: build.sideboard.map((c) => ({ card: c.cardName, quantity: c.quantity })),
    }),
    [build.main, build.material, build.sideboard],
  );
  // Buying/exporting covers the whole deck including sideboard tech, same as DecklistView.tsx.
  const massEntryUrl = useMemo(() => buildTcgplayerMassEntryUrl([...buildLines, ...sideboardLines]), [buildLines, sideboardLines]);
  function sumPrice(lines: { name: string; quantity: number }[]) {
    let sum = 0;
    let missing = 0;
    for (const line of lines) {
      const unit = priceByName.get(line.name);
      if (unit === undefined) missing += 1;
      else sum += unit * line.quantity;
    }
    return { sum, missing };
  }
  const totalPrice = useMemo(() => sumPrice(buildLines), [buildLines, priceByName]);
  const sideboardPrice = useMemo(() => sumPrice(sideboardLines), [sideboardLines, priceByName]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildDecklistText(decklist));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  function handleExportTts() {
    const save = buildTtsSaveFile(
      [
        { label: "Main", lines: decklist.main },
        { label: "Material", lines: decklist.material },
        { label: "Sideboard", lines: decklist.sideboard },
      ],
      cardsByName,
    );
    downloadJsonFile(`${slugifyFilename(championName ?? "decklist")}-tts.json`, save);
  }

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

      <div className="mt-2">
        {!pasteOpen ? (
          <button type="button" onClick={() => setPasteOpen(true)} className="text-xs text-ctp-blue hover:underline">
            Or paste a decklist for recommendations &rarr;
          </button>
        ) : (
          <div className="mt-1 max-w-sm">
            <p className="text-xs text-ctp-subtext0">
              Paste a decklist — one card per line, e.g. "4x Card Name", with optional "Main"/"Material" section
              headers. The Champion (and Spirit, if run) are detected automatically and everything else locks in as
              your starting point for recommendations.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Main\n4x Dungeon Guide\n...\n\nMaterial\n1x Spirit of Water"}
              rows={6}
              className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadPastedDecklist}
                disabled={pasteText.trim().length === 0}
                className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Load decklist
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasteOpen(false);
                  setPasteText("");
                  setPasteError(null);
                }}
                className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text"
              >
                Cancel
              </button>
            </div>
            {pasteError && <p className="mt-1.5 text-xs text-ctp-red">{pasteError}</p>}
          </div>
        )}
      </div>

      {!championName && <p className="mt-6 text-ctp-subtext1">Choose a Champion to see a suggested build.</p>}

      {championName && populationLoading && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      {championName && !populationLoading && rows.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">No decks found for {championName}.</p>
      )}

      {championName && !populationLoading && rows.length > 0 && (
        <>
          {build.conditionalWinRate !== null && (
            <p className="mt-4 text-sm">
              <span className="text-ctp-subtext0">Expected win rate: </span>
              <span className="font-semibold text-ctp-text">{(build.conditionalWinRate * 100).toFixed(0)}%</span>
              {build.baselineWinRate !== null && lockedCards.size > 0 && (
                <span
                  className={`ml-1.5 text-xs font-semibold ${
                    build.conditionalWinRate - build.baselineWinRate >= 0 ? "text-ctp-green" : "text-ctp-red"
                  }`}
                >
                  ({build.conditionalWinRate - build.baselineWinRate >= 0 ? "+" : ""}
                  {((build.conditionalWinRate - build.baselineWinRate) * 100).toFixed(1)}pp vs. unlocked baseline of{" "}
                  {(build.baselineWinRate * 100).toFixed(0)}%)
                </span>
              )}
            </p>
          )}

          {buildLines.length > 0 && (
            <p className="mt-1 text-sm">
              <span className="text-ctp-subtext0">Deck price: </span>
              <span className="font-semibold text-ctp-text">{formatUsd(totalPrice.sum)}</span>
              {totalPrice.missing > 0 && (
                <span className="ml-1.5 text-xs text-ctp-subtext0">
                  ({totalPrice.missing} card{totalPrice.missing === 1 ? "" : "s"} missing price data)
                </span>
              )}
              {sideboardPrice.sum > 0 && <span className="ml-1.5 text-ctp-subtext1">+ {formatUsd(sideboardPrice.sum)} sideboard</span>}
            </p>
          )}

          <p className="mt-1 text-xs text-ctp-subtext0">
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

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`rounded-md border px-2 py-1 text-xs ${
                copyState === "failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Couldn't copy" : "Copy decklist"}
            </button>
            <a
              href={massEntryUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0"
            >
              Buy on TCGplayer &rarr;
            </a>
            <button
              type="button"
              onClick={handleExportTts}
              title="Downloads a .json file — in Tabletop Simulator, use Games ▸ Save & Load ▸ Load to open it"
              className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text"
            >
              Export to TTS
            </button>
          </div>

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
                        priceByName={priceByName}
                        onToggleLock={() => toggleLock(c.cardName, c.quantity, "material")}
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
                        priceByName={priceByName}
                        onToggleLock={() => toggleLock(c.cardName, c.quantity, "main")}
                        onRemove={() => removeCard(c.cardName, c.locked)}
                      />
                    ))}
                  </ul>
                </div>
              </div>

              {build.sideboard.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Sideboard ({sideboardTotal})</h2>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    Situational tech from your pasted decklist — kept separate from the win-rate-ranked build above,
                    same as everywhere else on this site.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {build.sideboard.map((c) => (
                      <CardRow
                        key={c.cardName}
                        card={c}
                        cardsByName={cardsByName}
                        priceByName={priceByName}
                        showLockToggle={false}
                        onToggleLock={() => {}}
                        onRemove={() => removeCard(c.cardName, c.locked)}
                      />
                    ))}
                  </ul>
                </div>
              )}
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
