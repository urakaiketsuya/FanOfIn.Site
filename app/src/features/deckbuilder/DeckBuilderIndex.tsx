import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CompositionWinRateData, CompositionWinRateStat, OmnidexDecklist } from "@gatcg/shared";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useArchetypeTaxonomyData, useCardQuantityStatsData, useCardStatsData, useCompositionWinRateData } from "../archetypes/data";
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
import { useAllDecodedDecks } from "../../lib/decodedDecks";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useDeckBuilderPopulation } from "./useDeckBuilderPopulation";
import { usePoolPopulation, type CrossChampionPool } from "./usePoolPopulation";
import { useNearestDecks, type NearestDeck } from "./useNearestDecks";
import { useGlobalElementSuggestions } from "./useGlobalElementSuggestions";
import { computeIdentityElements, findChampionCard, useSuggestedBuild, type SuggestedCard } from "./useSuggestedBuild";
import { useBuddyCards, type BuddyCard } from "./useBuddyCards";

/**
 * Which population the ranking is computed against. "default" is today's existing behavior
 * (Champion + whatever the Spirit dropdown says, including "Any Spirit") — everything else is an
 * explicit alternative for when that combo has too little (or no) real data, rather than an
 * automatic fallback cascade. `nearestDecks` and `globalElements` aren't routed through the same
 * ranking at all (see `useNearestDecks`/`useGlobalElementSuggestions`'s doc comments for why) and
 * get their own render sections below instead of feeding `useSuggestedBuild`.
 */
type SuggestionPool = "default" | CrossChampionPool | "nearestDecks" | "globalElements";

const POOL_LABELS: Record<SuggestionPool, string> = {
  default: "This Champion + Spirit (or Any Spirit)",
  spiritAnyChampion: "Same Spirit, any Champion",
  closestCluster: "Closest matching archetype, different Champion",
  sameClass: "Same Class combination, any element",
  nearestDecks: "Nearest similar real decks",
  globalElements: "Cards matching these elements (global stats)",
};

type BuilderTab = "build" | "stats" | "buddies" | "log";
const TAB_KEYS: BuilderTab[] = ["build", "stats", "buddies", "log"];

type LockedSection = "main" | "material" | "sideboard";

/** Packs locked cards into one URL-safe query param for sharing — `section:qty:name` entries joined
 * by `;`. Real card names haven't been seen using either separator, and a stray one just produces a
 * slightly malformed shared link rather than breaking anything, so no escaping beyond what
 * URLSearchParams already does for the param value as a whole. */
function encodeLockedCards(lockedCards: Map<string, number>, lockedSections: Map<string, LockedSection>): string {
  return Array.from(lockedCards.entries())
    .map(([name, qty]) => `${lockedSections.get(name) ?? "main"}:${qty}:${name}`)
    .join(";");
}

function decodeLockedCards(encoded: string): { lockedCards: Map<string, number>; lockedSections: Map<string, LockedSection> } {
  const lockedCards = new Map<string, number>();
  const lockedSections = new Map<string, LockedSection>();
  for (const entry of encoded.split(";")) {
    if (!entry) continue;
    const [section, qtyStr, ...nameParts] = entry.split(":");
    const name = nameParts.join(":");
    const qty = Number(qtyStr);
    if (!name || !Number.isFinite(qty) || qty < 1) continue;
    lockedCards.set(name, qty);
    if (section === "main" || section === "material" || section === "sideboard") lockedSections.set(name, section);
  }
  return { lockedCards, lockedSections };
}

interface UrlSeed {
  championName: string;
  spiritFilter: string | null;
  pool: string | null;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
}

/**
 * Parses a shared link's ?champion=&spirit=&locked= params, for use as the *initial* state itself
 * (see the useState calls below) rather than seeding via an effect after mount. An effect-based
 * approach was tried first and had a real bug: the champion-reset effect (keyed on championName)
 * and a "seed from URL" effect both run on mount, in declaration order, and the reset effect's
 * very first run has no way to know a seed is coming a moment later — it queues a transition that
 * clears lockedCards, which then lands *after* the seed effect's own (higher-priority) update,
 * silently wiping the shared cards back out. Computing the seed before first render sidesteps the
 * race entirely: there's no reset-then-reseed dance because the state is correct from render one.
 */
function parseUrlSeed(searchParams: URLSearchParams): UrlSeed | null {
  const championName = searchParams.get("champion");
  if (!championName) return null;
  const lockedParam = searchParams.get("locked");
  const { lockedCards, lockedSections } = lockedParam
    ? decodeLockedCards(lockedParam)
    : { lockedCards: new Map<string, number>(), lockedSections: new Map<string, LockedSection>() };
  return { championName, spiritFilter: searchParams.get("spirit"), pool: searchParams.get("pool"), lockedCards, lockedSections };
}

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

// Mirrors pipeline/src/analysis/deckCompositionStats.ts's bucketing exactly, so a build's own
// composition lands in the same bucket the published win-rate data was computed against.
const COMPOSITION_MIN_BUCKET_SAMPLE = 30;
const COMPOSITION_GAP_FLOOR = 0.02;

function compositionBucketLabel(pct: number): string {
  const lower = Math.min(90, Math.floor(pct / 10) * 10);
  return `${lower}-${lower + 10}%`;
}

interface CompositionGap {
  type: string;
  currentPct: number;
  currentBucket: string;
  currentWinRate: number;
  bestBucket: string;
  bestWinRate: number;
  gap: number;
}

/**
 * Compares the build's own main-deck type ratios against the global composition-win-rate data —
 * main deck only, weighted by copies, same scope the pipeline computed it at. Only flags a type
 * when its current bucket has a real sample of its own (not just the best bucket) and the gap to
 * the best-performing bucket for that type clears a real margin, not shrinkage noise.
 */
function computeCompositionGaps(
  mainLines: { name: string; quantity: number }[],
  cardsByName: ReturnType<typeof useCardsByNames>,
  compositionWinRateData: CompositionWinRateData | undefined,
): CompositionGap[] {
  if (!compositionWinRateData || mainLines.length === 0) return [];

  const typeCounts = new Map<string, number>();
  let total = 0;
  for (const line of mainLines) {
    const card = cardsByName.get(line.name);
    if (!card) continue;
    total += line.quantity;
    for (const t of card.types) typeCounts.set(t, (typeCounts.get(t) ?? 0) + line.quantity);
  }
  if (total === 0) return [];

  const byType = new Map<string, CompositionWinRateStat[]>();
  for (const s of compositionWinRateData.stats) {
    const list = byType.get(s.type) ?? [];
    list.push(s);
    byType.set(s.type, list);
  }

  const gaps: CompositionGap[] = [];
  for (const [type, buckets] of byType) {
    const eligible = buckets.filter((b) => b.deckCount >= COMPOSITION_MIN_BUCKET_SAMPLE);
    if (eligible.length === 0) continue;
    const pct = ((typeCounts.get(type) ?? 0) / total) * 100;
    const currentBucketLabel = compositionBucketLabel(pct);
    const currentBucket = eligible.find((b) => b.bucket === currentBucketLabel);
    if (!currentBucket) continue;
    const best = eligible.reduce((a, b) => (b.adjustedWinRate > a.adjustedWinRate ? b : a));
    const gap = best.adjustedWinRate - currentBucket.adjustedWinRate;
    if (gap >= COMPOSITION_GAP_FLOOR && best.bucket !== currentBucketLabel) {
      gaps.push({
        type,
        currentPct: pct,
        currentBucket: currentBucketLabel,
        currentWinRate: currentBucket.adjustedWinRate,
        bestBucket: best.bucket,
        bestWinRate: best.adjustedWinRate,
        gap,
      });
    }
  }
  return gaps.sort((a, b) => b.gap - a.gap);
}

/** Same composition/rating stats as a deck's own dedicated page (DeckDetail.tsx), recomputed live from whatever's currently assembled — updates as cards get locked, added, or removed. */
function StatsPanel({
  lines,
  mainLines,
  cardsByName,
  championName,
  compositionWinRateData,
}: {
  lines: { name: string; quantity: number }[];
  mainLines: { name: string; quantity: number }[];
  cardsByName: ReturnType<typeof useCardsByNames>;
  championName: string | null;
  compositionWinRateData: CompositionWinRateData | undefined;
}) {
  const identity = useMemo(() => computeDeckIdentity(lines, cardsByName), [lines, cardsByName]);
  const composition = useMemo(() => computeDeckComposition(lines, cardsByName), [lines, cardsByName]);
  const rating = useMemo(() => computeDeckRating(lines, cardsByName, championName, identity.classes), [lines, cardsByName, championName, identity.classes]);
  const memoryCurve = useMemo(() => computeMemoryCostCurve(lines, cardsByName), [lines, cardsByName]);
  const reserveCurve = useMemo(() => computeReserveCostCurve(lines, cardsByName), [lines, cardsByName]);
  const compositionGaps = useMemo(
    () => computeCompositionGaps(mainLines, cardsByName, compositionWinRateData),
    [mainLines, cardsByName, compositionWinRateData],
  );

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

      {compositionGaps.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
          <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Composition suggestions</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Across every public main deck (not scoped to this Champion), win rate by what share of the deck each
            card type makes up — correlational, not causal, same as everywhere else on this site.
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {compositionGaps.map((g) => (
              <li key={g.type} className="text-ctp-subtext1">
                <span className="font-semibold text-ctp-text capitalize">{g.type.toLowerCase()}</span> is {g.currentBucket} of your main deck
                ({(g.currentWinRate * 100).toFixed(0)}% win rate) — decks at {g.bestBucket} average{" "}
                <span className="font-semibold text-ctp-green">{(g.bestWinRate * 100).toFixed(0)}%</span>.
              </li>
            ))}
          </ul>
        </div>
      )}

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
  onChangeQuantity,
  cardsByName,
  priceByName,
  showLockToggle = true,
}: {
  card: SuggestedCard;
  onToggleLock: () => void;
  onRemove: () => void;
  /** Only meaningful (and only rendered as an editable input) for a locked card — an unlocked/suggested card's quantity comes from the ranking and would just get overwritten on the next recompute, so it stays plain text. */
  onChangeQuantity?: (quantity: number) => void;
  cardsByName: ReturnType<typeof useCardsByNames>;
  priceByName: Map<string, number>;
  showLockToggle?: boolean;
}) {
  const cardInfo = cardsByName.get(card.cardName);
  const unitPrice = priceByName.get(card.cardName);
  const maxQuantity = cardInfo?.types.includes("UNIQUE") ? 1 : 4;
  return (
    <li className="flex flex-wrap items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm">
      {card.locked && onChangeQuantity ? (
        <input
          type="number"
          min={1}
          max={maxQuantity}
          value={card.quantity}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isInteger(next) && next >= 1) onChangeQuantity(Math.min(next, maxQuantity));
          }}
          className="w-11 shrink-0 rounded border border-ctp-surface1 bg-ctp-mantle px-1 py-0.5 text-right text-xs text-ctp-text focus:border-ctp-blue focus:outline-none"
        />
      ) : (
        <span
          className="w-6 shrink-0 text-right text-ctp-subtext0"
          title={card.optimizedFrom !== null ? `Quantity optimized from ${card.optimizedFrom}x — this card's global win rate is higher at ${card.quantity}x` : undefined}
        >
          {card.quantity}x{card.optimizedFrom !== null && <span className="text-ctp-blue">*</span>}
        </span>
      )}
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

/** Not-yet-placed ranked cards ("cards that might help") — same info as CardRow but a single "Add" action instead of Lock/Remove, since these aren't in the build at all yet. */
function SuggestionRow({
  card,
  onAdd,
  cardsByName,
  priceByName,
}: {
  card: SuggestedCard;
  onAdd: () => void;
  cardsByName: ReturnType<typeof useCardsByNames>;
  priceByName: Map<string, number>;
}) {
  const cardInfo = cardsByName.get(card.cardName);
  const unitPrice = priceByName.get(card.cardName);
  return (
    <li className="flex flex-wrap items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm">
      <span
        className="w-6 shrink-0 text-right text-ctp-subtext0"
        title={card.optimizedFrom !== null ? `Quantity optimized from ${card.optimizedFrom}x — this card's global win rate is higher at ${card.quantity}x` : undefined}
      >
        {card.quantity}x{card.optimizedFrom !== null && <span className="text-ctp-blue">*</span>}
      </span>
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
      {unitPrice !== undefined && <span className="shrink-0 text-xs text-ctp-subtext0">{formatUsd(unitPrice * card.quantity)}</span>}
      {card.adjustedLift !== null && (
        <span className={`text-xs font-semibold ${card.adjustedLift >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
          {card.adjustedLift >= 0 ? "+" : ""}
          {(card.adjustedLift * 100).toFixed(1)}pp
        </span>
      )}
      {card.sample && <span className="text-xs text-ctp-subtext0">({card.sample.with} vs {card.sample.without})</span>}
      <button
        type="button"
        onClick={onAdd}
        className="ml-auto shrink-0 rounded-md border border-ctp-surface1 px-1.5 py-0.5 text-[10px] text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
      >
        Add
      </button>
    </li>
  );
}

export default function DeckBuilderIndex() {
  useDocumentTitle(
    "Guided Deck Builder",
    "Pick a Champion and Spirit and see a suggested build assembled from the highest win-rate cards in real decks, then lock in your own picks for updated suggestions.",
  );
  const [searchParams, setSearchParams] = useSearchParams();
  // Computed fresh each render (cheap — parsing a couple of query params), but only its value on
  // the very first render actually matters: every useState below that reads from it only consults
  // its initializer once, on mount, same as React already guarantees for lazy useState.
  const urlSeed = parseUrlSeed(searchParams);

  const [championName, setChampionName] = useState<string | null>(urlSeed?.championName ?? null);
  const [spiritFilter, setSpiritFilter] = useState<string | null>(urlSeed?.spiritFilter ?? null);
  const [pool, setPool] = useState<SuggestionPool>(
    urlSeed?.pool && urlSeed.pool in POOL_LABELS ? (urlSeed.pool as SuggestionPool) : "default",
  );
  const [lockedCards, setLockedCards] = useState<Map<string, number>>(() => urlSeed?.lockedCards ?? new Map());
  // Section a lock is known to belong to (from where it was locked, or from a pasted decklist's
  // own Main/Material headers) — see useSuggestedBuild's lockedSections param doc for why this
  // beats guessing from population presence for a card the current population barely plays.
  const [lockedSections, setLockedSections] = useState<Map<string, LockedSection>>(() => urlSeed?.lockedSections ?? new Map());
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
  // clobber the Spirit/locks it just derived — a normal Champion-dropdown change still resets to a
  // blank slate as usual. (Not used for the URL-seed case below — see lastResetChampionRef.)
  const skipNextResetRef = useRef(false);
  // The championName the reset effect has already dealt with (by resetting or by skipping) —
  // starts at the seeded Champion so its very first (mount) run is a no-op. This has to be an
  // idempotent *comparison* rather than a one-shot flag: React 18 StrictMode double-invokes mount
  // effects in dev, and a flag that gets flipped inside the effect body reads as "already
  // consumed" on the second invocation, incorrectly falling through to a real reset that clobbers
  // the just-seeded lockedCards a moment later. Comparing against a ref that's never mutated
  // during a no-op run stays correct across as many redundant invocations as StrictMode throws at it.
  const lastResetChampionRef = useRef(urlSeed?.championName ?? null);

  const popularityIndexData = useDeckPopularityIndexData();
  // Debounced against the catalog sync's own write batches (app/src/lib/sync/cards.ts writes ~50
  // cards per bulkPut, and useCardCatalog's useLiveQuery emits a new array on every one) — same
  // CATALOG_SETTLE_MS reasoning as useAllDecodedDecks/useSuggestedBuild, needed here too since
  // catalogByName feeds championCard/identityElements/usePoolPopulation/useGlobalElementSuggestions,
  // all of which would otherwise recompute (and re-render the whole page) on every sync write.
  const cardCatalog = useDebouncedValue(useCardCatalog(), 500);
  const catalogByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);
  // "default" pool's population — this Champion's decks, further narrowed by the Spirit dropdown
  // inside useSuggestedBuild itself (pool 1/2 combined; there's no separate state for them, since
  // the existing Spirit dropdown's own "Any Spirit" option already covers pool 2).
  const { rows, spiritsPresent, loading: populationLoading } = useDeckBuilderPopulation(championName);
  const cardQuantityStatsData = useCardQuantityStatsData();
  const cardStatsData = useCardStatsData();
  const compositionWinRateData = useCompositionWinRateData();
  const archetypeTaxonomyData = useArchetypeTaxonomyData();

  // Every deck, any Champion — the shared universe the cross-Champion pools filter/score over.
  const { decks: allDecks, loading: allDecksLoading } = useAllDecodedDecks();

  // Resolved against the *stable* single-Champion population (`rows`, not whichever pool is
  // active) — see `useSuggestedBuild`'s `championCardOverride` doc comment for why this matters
  // once a cross-Champion pool is in play: without it, the Champion-print anchor and granted
  // elements would be guessed from whichever Champion happens to be common in a borrowed
  // population, not the one the viewer actually picked.
  const championCard = useMemo(() => findChampionCard(rows, lockedCards, catalogByName), [rows, lockedCards, catalogByName]);
  const spiritCardForIdentity = spiritFilter ? catalogByName.get(spiritFilter) : undefined;
  const identityElements = useMemo(
    () => computeIdentityElements(championCard, spiritCardForIdentity),
    [championCard, spiritCardForIdentity],
  );

  const crossChampionKind: CrossChampionPool | null =
    pool === "spiritAnyChampion" || pool === "closestCluster" || pool === "sameClass" ? pool : null;
  const poolPopulation = usePoolPopulation(crossChampionKind, allDecks, championName, spiritFilter, championCard, catalogByName, archetypeTaxonomyData);

  // Which rows actually feed the ranking, and how the existing Spirit-narrowing inside
  // useSuggestedBuild should apply to them: "spiritAnyChampion"'s rows are already exactly that
  // Spirit's decks, so passing spiritFilter through is a safe no-op (and keeps the "the Spirit
  // itself" material slot, which is still correct there) — but "closestCluster"/"sameClass"'s rows
  // don't share the current Spirit at all, so re-filtering by it there would zero out a population
  // that's already fully resolved.
  const activeRows = crossChampionKind ? poolPopulation.rows : rows;
  const effectiveSpiritFilter = crossChampionKind === "closestCluster" || crossChampionKind === "sameClass" ? null : spiritFilter;
  const activeLoading = crossChampionKind ? allDecksLoading : populationLoading;
  // Only overridden for the cross-Champion pools — omitted for "default" so pool 1/2 behavior is
  // byte-for-byte unchanged (useSuggestedBuild's own internal resolution already does the same
  // thing against the same `rows` in that case).
  const championCardOverride = crossChampionKind ? championCard : undefined;

  const build = useSuggestedBuild(
    activeRows,
    effectiveSpiritFilter,
    lockedCards,
    rejectedCards,
    activeLoading,
    lockedSections,
    cardQuantityStatsData,
    championCardOverride,
  );

  const nearestDecks = useNearestDecks(allDecks, lockedCards);
  const globalSuggestions = useGlobalElementSuggestions(cardStatsData, identityElements, catalogByName, lockedCards, rejectedCards);

  // Pool-aware version of the top-level "loading / no data / show the build" gate below —
  // `nearestDecks`/`globalElements` have their own empty states (no locks yet / no matching cards)
  // rather than a blanket "no decks found", and every non-"default" pool depends on the full
  // decoded-deck universe loading, not just this Champion's own population.
  const gateLoading = pool === "default" ? populationLoading : allDecksLoading;
  const gateHasData =
    pool === "default"
      ? rows.length > 0
      : pool === "nearestDecks" || pool === "globalElements"
        ? true
        : poolPopulation.rows.length > 0;

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
    () => [...build.material, ...build.main, ...build.sideboard].map((c) => c.cardName),
    [build.material, build.main, build.sideboard],
  );
  const placedNames = useMemo(() => new Set(allNames), [allNames]);
  const buddyCards = useBuddyCards(rows, spiritFilter, lockedCards, placedNames);
  const buddyNames = useMemo(() => Array.from(buddyCards.values()).flatMap((list) => list.map((b) => b.cardName)), [buddyCards]);
  const suggestionNames = useMemo(() => build.suggestions.map((c) => c.cardName), [build.suggestions]);
  const cardsByName = useCardsByNames(useMemo(() => [...allNames, ...buddyNames, ...suggestionNames], [allNames, buddyNames, suggestionNames]));
  const priceByName = useDeckPriceByName();

  useEffect(() => {
    if (lastResetChampionRef.current === championName) {
      // Already handled this exact championName (the seeded initial value, or a StrictMode
      // dev double-invoke re-running this same effect) — idempotent no-op.
      return;
    }
    lastResetChampionRef.current = championName;
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
    } else {
      startTransition(() => {
        setSpiritFilter(null);
        setPool("default");
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

  // The shared link's params (see handleCopyShareLink below) already did their job as the
  // *initial* state above — this just clears them once mounted, so the URL doesn't look "stuck"
  // to the original shared state once the viewer starts editing.
  useEffect(() => {
    if (!urlSeed) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("champion");
        next.delete("spirit");
        next.delete("pool");
        next.delete("locked");
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setPool("default");
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

  /** Loads a `useNearestDecks` result as the new starting point — same shape as `loadPastedDecklist`, just sourced from an already-decoded real deck instead of re-parsing text. Switches back to the "default" pool once a concrete decklist is loaded, same as pasting one. */
  function loadNearestDeck(deck: NearestDeck) {
    const newLocked = new Map<string, number>();
    const newSections = new Map<string, LockedSection>();
    for (const [section, lines] of [
      ["main", deck.main],
      ["material", deck.material],
      ["sideboard", deck.sideboard],
    ] as const) {
      for (const [name, qty] of lines) {
        newLocked.set(name, qty);
        newSections.set(name, section);
      }
    }

    if (deck.championName && deck.championName !== championName) skipNextResetRef.current = true;
    if (deck.championName) setChampionName(deck.championName);
    setSpiritFilter(deck.spiritName);
    setPool("default");
    setLockedCards(newLocked);
    setLockedSections(newSections);
    setRejectedCards(new Set());
    setChangeLog([]);
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;
  }

  /** `section` is the section this card is being locked FROM (known for sure, since it's the list the click came from) — recorded so the section survives even if the current population barely plays this card (see lockedSections' doc comment). Omitted when unlocking. */
  function toggleLock(name: string, quantity: number, section?: "main" | "material" | "sideboard") {
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

  /** Editing a locked card's own copy count — doesn't touch lock state or section, just the quantity. No changelog entry: this is a fine-tune, not a suggestion-changing action, and firing one per keystroke on the number input would spam the log. */
  function setLockedQuantity(name: string, quantity: number) {
    startTransition(() =>
      setLockedCards((prev) => {
        if (!prev.has(name)) return prev;
        const next = new Map(prev);
        next.set(name, quantity);
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

  /** "Add" from the "Cards that might help" list — same as toggleLock, just with the section/quantity the suggestion already carries instead of guessing. */
  function addSuggestion(card: SuggestedCard) {
    toggleLock(card.cardName, card.quantity, card.section);
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
  const mainOnlyLines = useMemo(() => build.main.map((c) => ({ name: c.cardName, quantity: c.quantity })), [build.main]);
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
  const [shareCopyState, setShareCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildDecklistText(decklist));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  /** Shares the Champion/Spirit/locked-cards *input*, not a snapshot of the assembled output —
   * opening the link re-runs the same suggestion logic, so it stays a live recipe rather than a
   * stale copy that drifts from the site's own numbers as data regenerates. */
  async function handleCopyShareLink() {
    const params = new URLSearchParams();
    if (championName) params.set("champion", championName);
    if (spiritFilter) params.set("spirit", spiritFilter);
    if (pool !== "default") params.set("pool", pool);
    const locked = encodeLockedCards(lockedCards, lockedSections);
    if (locked) params.set("locked", locked);
    const url = `${window.location.origin}/deck-builder?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopyState("copied");
    } catch {
      setShareCopyState("failed");
    }
    setTimeout(() => setShareCopyState("idle"), 1500);
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

            <span className="ml-2 text-ctp-subtext0">Suggest from:</span>
            <select
              value={pool}
              onChange={(e) => {
                const value = e.target.value as SuggestionPool;
                pendingActionRef.current = { label: `Suggest from: ${POOL_LABELS[value]}`, subject: null };
                startTransition(() => setPool(value));
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              {(Object.keys(POOL_LABELS) as SuggestionPool[]).map((key) => (
                <option key={key} value={key} disabled={key === "spiritAnyChampion" && !spiritFilter}>
                  {POOL_LABELS[key]}
                  {key === "spiritAnyChampion" && !spiritFilter ? " (pick a Spirit first)" : ""}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {championName && pool !== "default" && pool !== "nearestDecks" && pool !== "globalElements" && poolPopulation.label && (
        <p className="mt-2 text-xs text-ctp-yellow">{poolPopulation.label}</p>
      )}

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

      {championName && gateLoading && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      {championName && !gateLoading && !gateHasData && (
        <p className="mt-6 text-ctp-subtext1">
          {pool === "default" ? `No decks found for ${championName}.` : "No decks found for this pool — try a different one."}
        </p>
      )}

      {championName && !gateLoading && gateHasData && (
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
            <button
              type="button"
              onClick={handleCopyShareLink}
              title="Copies a link that reopens this Champion/Spirit and every locked-in card"
              className={`rounded-md border px-2 py-1 text-xs ${
                shareCopyState === "failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {shareCopyState === "copied" ? "Copied!" : shareCopyState === "failed" ? "Couldn't copy" : "Copy share link"}
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
              {pool !== "nearestDecks" && pool !== "globalElements" && (
                <>
              {build.hasQuantityOptimizations && (
                <p className="mt-2 text-xs text-ctp-subtext0">
                  <span className="text-ctp-blue">*</span> quantity adjusted from what this population usually runs — this card's own
                  global win rate is meaningfully higher at that count, regardless of Champion.
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
                        priceByName={priceByName}
                        onToggleLock={() => toggleLock(c.cardName, c.quantity, "material")}
                        onChangeQuantity={(qty) => setLockedQuantity(c.cardName, qty)}
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
                        onChangeQuantity={(qty) => setLockedQuantity(c.cardName, qty)}
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
                    Situational tech — locked-in picks (e.g. from a pasted decklist) first, then ranked suggestions
                    for the rest, same win-rate-lift ranking as Material/Main. Kept separate from Deck price/Stats,
                    same "sideboard isn't part of deck identity" convention as everywhere else on this site.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {build.sideboard.map((c) => (
                      <CardRow
                        key={c.cardName}
                        card={c}
                        cardsByName={cardsByName}
                        priceByName={priceByName}
                        onToggleLock={() => toggleLock(c.cardName, c.quantity, "sideboard")}
                        onChangeQuantity={(qty) => setLockedQuantity(c.cardName, qty)}
                        onRemove={() => removeCard(c.cardName, c.locked)}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {build.suggestions.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Cards that might help</h2>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    Top ranked cards that aren't in the build above — either every slot in their section is already
                    full (common for a fully-locked paste), or they just missed the cut. Adding one grows the build
                    past its usual size on purpose.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {build.suggestions.map((c) => (
                      <SuggestionRow key={c.cardName} card={c} cardsByName={cardsByName} priceByName={priceByName} onAdd={() => addSuggestion(c)} />
                    ))}
                  </ul>
                </div>
              )}

              {build.removalSuggestions.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Cards that might hurt</h2>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    Locked-in cards whose own win rate (with vs. without, independent of your other locks) came out
                    meaningfully negative — candidates to cut, not proof they're bad in every build.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {build.removalSuggestions.map((c) => (
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
                </>
              )}

              {pool === "nearestDecks" && (
                <div className="mt-4">
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Nearest similar real decks</h2>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    Not ranked suggestions — real decklists (any Champion) most similar to whatever's currently
                    locked in, by shared main+material cards. Click "Load" to replace your current locks with one of
                    these as a new starting point.
                  </p>
                  {lockedCards.size === 0 ? (
                    <p className="mt-3 text-sm text-ctp-subtext1">Lock in a few cards first to find similar decks.</p>
                  ) : nearestDecks.length === 0 ? (
                    <p className="mt-3 text-sm text-ctp-subtext1">No similar decks found for what's locked in so far.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {nearestDecks.map((d) => (
                        <li key={d.deckId} className="flex flex-wrap items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm">
                          <span className="text-ctp-text">{d.championName ?? "Unknown Champion"}</span>
                          {d.spiritName && <span className="text-ctp-subtext1">({d.spiritName})</span>}
                          <span className="text-xs text-ctp-subtext0">{(d.similarity * 100).toFixed(0)}% similar</span>
                          <span className="text-xs text-ctp-subtext0">{(d.winRate * 100).toFixed(0)}% win rate</span>
                          <button
                            type="button"
                            onClick={() => loadNearestDeck(d)}
                            className="ml-auto shrink-0 rounded-md border border-ctp-surface1 px-1.5 py-0.5 text-[10px] text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                          >
                            Load
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {pool === "globalElements" && (
                <div className="mt-4">
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Cards matching these elements</h2>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    No deck-level data behind this list at all — just each card's own overall win rate, filtered to
                    this Champion/Spirit's granted elements. No with/without lift, no Material/Main/Sideboard split
                    (that needs real decklists to guess from), so use your own judgment on where each card goes.
                  </p>
                  {globalSuggestions.length === 0 ? (
                    <p className="mt-3 text-sm text-ctp-subtext1">No element-compatible cards with enough data yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {globalSuggestions.map((c) => (
                        <li key={c.cardName} className="flex flex-wrap items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm">
                          {catalogByName.get(c.cardName)?.element !== "NORM" && (
                            <ElementIcon element={catalogByName.get(c.cardName)?.element ?? "NORM"} size={14} />
                          )}
                          <CardHoverPreview image={catalogByName.get(c.cardName)?.editions[0]?.image} alt={c.cardName}>
                            {catalogByName.get(c.cardName) ? (
                              <Link to={`/cards/${catalogByName.get(c.cardName)!.slug}`} className="text-ctp-text hover:text-ctp-blue">
                                {c.cardName}
                              </Link>
                            ) : (
                              <span className="text-ctp-text">{c.cardName}</span>
                            )}
                          </CardHoverPreview>
                          <span className="text-xs text-ctp-subtext0">{(c.adjustedWinRate * 100).toFixed(0)}% win rate</span>
                          <span className="text-xs text-ctp-subtext0">({c.deckCount} decks)</span>
                          <button
                            type="button"
                            onClick={() => addCard(c.cardName)}
                            className="ml-auto shrink-0 rounded-md border border-ctp-surface1 px-1.5 py-0.5 text-[10px] text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                          >
                            Add
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "stats" && (
            <StatsPanel
              lines={buildLines}
              mainLines={mainOnlyLines}
              cardsByName={cardsByName}
              championName={championName}
              compositionWinRateData={compositionWinRateData}
            />
          )}

          {tab === "buddies" && (
            <BuddyCardsList lockedNames={Array.from(lockedCards.keys())} buddyCards={buddyCards} cardsByName={cardsByName} onAdd={addCard} />
          )}

          {tab === "log" && <ChangeLogList entries={changeLog} />}
        </>
      )}
    </div>
  );
}
