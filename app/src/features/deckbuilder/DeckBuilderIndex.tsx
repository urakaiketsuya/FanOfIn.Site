import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Card, CardInclusionEntry, CommunityCoOccurrenceEntry, CompositionWinRateData, CompositionWinRateStat, OmnidexDecklist } from "@gatcg/shared";
import { championToSlug, useCommunityCardInclusion, useCommunityCoOccurrence } from "../community/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardQuantityStatsData, useCompositionWinRateData } from "../archetypes/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardsByNames } from "../events/useCardsByNames";
import { buildDecklistText } from "../events/DecklistView";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import CardHoverPreview from "../../components/CardHoverPreview";
import CostIcon from "../../components/CostIcon";
import StaleDataNotice from "../../components/StaleDataNotice";
import DecklistCoverageNotice from "../../components/DecklistCoverageNotice";
import ElementIcon from "../../components/ElementIcon";
import { buildChartSegments } from "../../components/DonutChart";
import BarChart from "../../components/BarChart";
import RankedCompositionChart from "../../components/RankedCompositionChart";
import { computeDeckComposition, computeDeckIdentity, computeDeckRating, computeMemoryCostCurve, computeReserveCostCurve, type RatingPillar } from "../../lib/deckIdentity";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { buildTtsSaveFile, downloadJsonFile, slugifyFilename } from "../../lib/ttsExport";
import { formatUsd } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { useAllDecodedDecks } from "../../lib/decodedDecks";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useDeckBuilderPopulation, type DeckBuilderRow } from "./useDeckBuilderPopulation";
import { useNearestDecks, type NearestDeck } from "./useNearestDecks";
import { computeIdentityElements, findChampionCard, useSuggestedBuild, type SuggestedCard } from "./useSuggestedBuild";
import { useCommunitySuggestedBuild } from "./useCommunitySuggestedBuild";
import { useBuddyCards, type BuddyCard } from "./useBuddyCards";
import { validateDeck } from "./validateDeck";
import { computeDependencyReadiness, computeSynergyReadiness } from "./synergyReadiness";
import { similarCards } from "../../lib/cardSimilarity";
import ThemaSparkline from "../thema/ThemaSparkline";

type BuilderTab = "build" | "stats" | "buddies" | "log";
const TAB_KEYS: BuilderTab[] = ["build", "stats", "buddies", "log"];

type LockedSection = "main" | "material" | "sideboard";

const ELEMENT_RAIL_COLORS: Record<string, string> = {
  // Saturation-weighted colors sampled from the official 50×50 CDN element icons. The small
  // white mix offsets the icons' dark shading/metal rims so a 4px rail remains legible here.
  ARCANE: "color-mix(in srgb, #1c73b7 78%, white)",
  ASTRA: "color-mix(in srgb, #353367 72%, white)",
  CRUX: "color-mix(in srgb, #2462a2 74%, white)",
  EXALTED: "color-mix(in srgb, #c8af8c 86%, white)",
  EXIA: "color-mix(in srgb, #7b1a19 68%, white)",
  FIRE: "color-mix(in srgb, #93412c 72%, white)",
  LUXEM: "color-mix(in srgb, #ba9141 82%, white)",
  NEOS: "color-mix(in srgb, #bb893a 80%, white)",
  NORM: "#8b8988",
  TERA: "color-mix(in srgb, #256050 70%, white)",
  UMBRA: "color-mix(in srgb, #3d2a5c 68%, white)",
  WATER: "color-mix(in srgb, #236fb6 76%, white)",
  WIND: "color-mix(in srgb, #4e9343 78%, white)",
};

function ElementRail({ elements = [] }: { elements?: string[] }) {
  const colored = elements.filter((element) => element !== "NORM");
  const visible = colored.length > 0 ? colored : elements.length > 0 ? elements : ["NORM"];
  const colors = Array.from(new Set(visible.map((element) => ELEMENT_RAIL_COLORS[element] ?? "var(--color-ctp-overlay1)")));
  const background = colors.length === 1
    ? colors[0]
    : `linear-gradient(to bottom, ${colors.map((color, index) => `${color} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`).join(", ")})`;
  return <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background }} />;
}

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
  return {
    championName,
    spiritFilter: searchParams.get("spirit"),
    lockedCards,
    lockedSections,
  };
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
                (observed matching-deck rate {e.winRateDelta >= 0 ? "+" : ""}
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

/** Shared by both the tournament (client-computed BuddyCard) and community (pipeline-computed CommunityCoOccurrenceEntry) lenses — same {cardName, count, coOccurrenceRate} shape. */
function BuddyRow({
  buddy,
  cardsByName,
  onAdd,
}: {
  buddy: { cardName: string; coOccurrenceRate: number };
  cardsByName: ReturnType<typeof useCardsByNames>;
  onAdd: (name: string) => void;
}) {
  const cardInfo = cardsByName.get(buddy.cardName);
  return (
    <li className="relative flex items-center gap-1.5 overflow-hidden rounded-md border border-ctp-surface1 py-1 pl-3 pr-2 text-sm">
      <ElementRail elements={cardInfo?.elements} />
      <CardHoverPreview image={cardInfo?.editions[0]?.image} alt={buddy.cardName}>
        {cardInfo ? (
          <Link to={`/cards/${cardInfo.slug}`} className="text-ctp-text hover:text-ctp-blue">
            {buddy.cardName}
          </Link>
        ) : (
          <span className="text-ctp-text">{buddy.cardName}</span>
        )}
      </CardHoverPreview>
      <span className="text-xs text-ctp-subtext0">{Math.round(buddy.coOccurrenceRate * 100)}%</span>
      <button
        type="button"
        onClick={() => onAdd(buddy.cardName)}
        className="rounded-md border border-ctp-surface1 px-1.5 py-0.5 text-[10px] text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
      >
        Add
      </button>
    </li>
  );
}

function BuddyCardsList({
  lockedNames,
  buddyCards,
  communityBuddyCards,
  cardsByName,
  onAdd,
}: {
  lockedNames: string[];
  buddyCards: Map<string, BuddyCard[]>;
  communityBuddyCards: Map<string, CommunityCoOccurrenceEntry[]>;
  cardsByName: ReturnType<typeof useCardsByNames>;
  onAdd: (name: string) => void;
}) {
  const groups = lockedNames.map((name) => ({ name, buddies: buddyCards.get(name) ?? [] })).filter((g) => g.buddies.length > 0);
  const communityGroups = lockedNames
    .map((name) => ({ name, buddies: communityBuddyCards.get(name) ?? [] }))
    .filter((g) => g.buddies.length > 0);
  if (groups.length === 0 && communityGroups.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Buddy cards</h2>
        <p className="mt-1 text-xs text-ctp-subtext0">
          {lockedNames.length === 0
            ? "Pin a card to see what's most often run alongside it."
            : "No buddy suggestions right now — either everything commonly run alongside your choices is already in the build, or this Champion/Spirit population is too thin to say (a build with many user choices often narrows it down to just a few decks)."}
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6">
      <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Buddy cards</h2>
      <p className="mt-1 text-xs text-ctp-subtext0">
        Cards most often run alongside one of your choices, regardless of win rate — add one straight from here even if
        it never shows up in the ranked suggestions above.
      </p>
      <div className="mt-2 space-y-3">
        {groups.map(({ name, buddies }) => (
          <div key={name}>
            <p className="text-xs text-ctp-subtext1">
              With <span className="text-ctp-text">{name}</span>:
            </p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {buddies.map((b) => (
                <BuddyRow key={b.cardName} buddy={b} cardsByName={cardsByName} onAdd={onAdd} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {communityGroups.length > 0 && (
        <div className="mt-4 border-t border-ctp-surface0 pt-3">
          <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Community buddy cards</h3>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Same idea, from Shout At Your Decks' full deck list instead of tournament data — real co-occurrence, no win
            rate involved either way.
          </p>
          <div className="mt-2 space-y-3">
            {communityGroups.map(({ name, buddies }) => (
              <div key={name}>
                <p className="text-xs text-ctp-subtext1">
                  With <span className="text-ctp-text">{name}</span>:
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {buddies.map((b) => (
                    <BuddyRow key={b.cardName} buddy={b} cardsByName={cardsByName} onAdd={onAdd} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
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
const PILLAR_OPTIONS: RatingPillar[] = ["aggro", "consistency", "interaction", "resilience"];
/** "tournament" ranks by real Omnidex win-rate lift (useSuggestedBuild); "community" ranks by
 * Shout At Your Decks' popularity (useCommunitySuggestedBuild) — no win/loss data, so pillar
 * tuning and lift-specific UI are unavailable in this mode. See docs/CALCULATIONS.md, "Community
 * population". */
type PopulationSource = "tournament" | "community";

interface CardDecayReplacement {
  cardName: string;
  priorRate: number;
  recentRate: number;
  rise: number;
}

interface CardDecaySignal {
  cardName: string;
  priorRate: number;
  recentRate: number;
  decay: number;
  deckCount: number;
  adjustedWinRate: number;
  /** A same-effect-shape sibling (see cardSimilarity.ts's similarCards) whose own inclusion rate
   * rose over the same two windows — a candidate for "this is probably what replaced it," not a
   * claim (two cards' adoption can move together for unrelated reasons, e.g. a whole archetype
   * rotating out). Null when no sibling exists or none of them rose. */
  replacement: CardDecayReplacement | null;
}

interface CardDecayReport {
  signals: CardDecaySignal[];
  recentDeckCount: number;
  priorDeckCount: number;
  recentStart: string;
  latestDate: string;
}

/**
 * Finds cards whose adoption fell in the latest 90-day window versus the preceding 90 days.
 * Inclusion rate (not raw appearances) removes tournament-volume bias; the win rate is shrunk
 * toward 50% so a tiny undefeated sample cannot outrank a broadly successful card.
 */
function computeCardDecay(
  rows: DeckBuilderRow[],
  spiritName: string | null,
  catalogByName: Map<string, Card>,
): CardDecayReport | null {
  const population = spiritName ? rows.filter((row) => row.spiritName === spiritName) : rows;
  if (population.length === 0) return null;
  const latestMs = Math.max(...population.map((row) => row.eventDate ? Date.parse(row.eventDate) : NaN).filter(Number.isFinite));
  if (!Number.isFinite(latestMs)) return null;
  const dayMs = 86_400_000;
  const recentStartMs = latestMs - 89 * dayMs;
  const priorStartMs = latestMs - 179 * dayMs;
  const priorEndMs = recentStartMs - dayMs;
  const recentRows = population.filter((row) => row.eventDate && Date.parse(row.eventDate) >= recentStartMs);
  const priorRows = population.filter((row) => {
    const date = row.eventDate ? Date.parse(row.eventDate) : NaN;
    return date >= priorStartMs && date <= priorEndMs;
  });
  if (recentRows.length < 10 || priorRows.length < 10) return null;

  const cardNames = (row: DeckBuilderRow) => {
    const names = new Set([...row.main.keys(), ...row.material.keys()]);
    for (const name of names) {
      const card = catalogByName.get(name);
      if (card?.types.includes("CHAMPION")) names.delete(name);
    }
    return names;
  };
  const priorCounts = new Map<string, number>();
  const recentCounts = new Map<string, number>();
  const wins = new Map<string, { sum: number; count: number }>();
  for (const row of priorRows) {
    for (const name of cardNames(row)) priorCounts.set(name, (priorCounts.get(name) ?? 0) + 1);
  }
  for (const row of recentRows) {
    for (const name of cardNames(row)) recentCounts.set(name, (recentCounts.get(name) ?? 0) + 1);
  }
  for (const row of population) {
    for (const name of cardNames(row)) {
      const current = wins.get(name) ?? { sum: 0, count: 0 };
      current.sum += row.winRate;
      current.count += 1;
      wins.set(name, current);
    }
  }

  type Signal = Omit<CardDecaySignal, "replacement">;
  const signals: Signal[] = [];
  for (const [cardName, priorCount] of priorCounts) {
    const recentCount = recentCounts.get(cardName) ?? 0;
    const performance = wins.get(cardName);
    if (!performance || priorCount < 5 || performance.count < 10) continue;
    const priorRate = priorCount / priorRows.length;
    const recentRate = recentCount / recentRows.length;
    const decay = priorRate - recentRate;
    const adjustedWinRate = (performance.sum + 10 * 0.5) / (performance.count + 10);
    if (decay < 0.08 || adjustedWinRate < 0.53) continue;
    signals.push({ cardName, priorRate, recentRate, decay, deckCount: performance.count, adjustedWinRate });
  }
  signals.sort((a, b) => {
    const score = (signal: Signal) => signal.decay * Math.sqrt(signal.deckCount) * Math.max(0.01, signal.adjustedWinRate - 0.5);
    return score(b) - score(a);
  });

  // For each shown decay signal, look for a same-effect-shape sibling (cardSimilarity.ts) whose
  // own inclusion rate rose over the same two windows — the best-rising sibling becomes the
  // "possibly replaced by" suggestion. Only run against the top 6 (not every candidate signal)
  // since similarCards scans the whole catalog per call.
  const RISE_THRESHOLD = 0.05;
  const MIN_RISE_DECK_COUNT = 5;
  const catalogArray = Array.from(catalogByName.values());
  function findReplacement(cardName: string): CardDecayReplacement | null {
    const card = catalogByName.get(cardName);
    if (!card) return null;
    let best: CardDecayReplacement | null = null;
    for (const sibling of similarCards(card, catalogArray)) {
      const recentCount = recentCounts.get(sibling.name) ?? 0;
      if (recentCount < MIN_RISE_DECK_COUNT) continue;
      const priorRate = (priorCounts.get(sibling.name) ?? 0) / priorRows.length;
      const recentRate = recentCount / recentRows.length;
      const rise = recentRate - priorRate;
      if (rise < RISE_THRESHOLD) continue;
      if (!best || rise > best.rise) best = { cardName: sibling.name, priorRate, recentRate, rise };
    }
    return best;
  }

  return {
    signals: signals.slice(0, 6).map((signal) => ({ ...signal, replacement: findReplacement(signal.cardName) })),
    recentDeckCount: recentRows.length,
    priorDeckCount: priorRows.length,
    recentStart: new Date(recentStartMs).toISOString().slice(0, 10),
    latestDate: new Date(latestMs).toISOString().slice(0, 10),
  };
}

function StatsPanel({
  lines,
  mainLines,
  cardsByName,
  catalogByName,
  identityElements,
  preferredSuggestions,
  championName,
  compositionWinRateData,
  pillarBias,
  onPillarBiasChange,
  onAddCard,
  populationSource,
  onPopulationSourceChange,
  decayReport,
}: {
  lines: { name: string; quantity: number }[];
  mainLines: { name: string; quantity: number }[];
  cardsByName: ReturnType<typeof useCardsByNames>;
  catalogByName: Map<string, Card>;
  identityElements: Set<string>;
  preferredSuggestions: string[];
  championName: string | null;
  compositionWinRateData: CompositionWinRateData | undefined;
  pillarBias: RatingPillar | null;
  onPillarBiasChange: (pillar: RatingPillar | null) => void;
  onAddCard: (name: string) => void;
  populationSource: PopulationSource;
  onPopulationSourceChange: (source: PopulationSource) => void;
  decayReport: CardDecayReport | null;
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
  const synergyReadiness = useMemo(
    () => computeSynergyReadiness(mainLines, catalogByName, catalogByName.values(), identityElements, preferredSuggestions),
    [mainLines, catalogByName, identityElements, preferredSuggestions],
  );
  const dependencyReadiness = useMemo(
    () => computeDependencyReadiness(mainLines, catalogByName, catalogByName.values(), identityElements, preferredSuggestions),
    [mainLines, catalogByName, identityElements, preferredSuggestions],
  );
  // Cross-references between the two independently-computed readiness engines above, keyed by
  // card name — kept as a pure UI lookup here rather than baked into synergyReadiness.ts, so
  // Synergy readiness (Imbue) and Package balance (Token/Subtype/Empower) stay decoupled and this
  // is purely "which of my cards also show up over there," not a new coupling between the modules.
  const crossLinks = useMemo(() => {
    const map = new Map<string, { synergy: { key: string; label: string }[]; dependency: { key: string; label: string }[] }>();
    const ensure = (name: string) => map.get(name) ?? map.set(name, { synergy: [], dependency: [] }).get(name)!;
    for (const synergy of synergyReadiness) {
      for (const line of [...synergy.payoffCards, ...synergy.enablerCards]) {
        const entry = ensure(line.name);
        if (!entry.synergy.some((s) => s.key === synergy.key)) entry.synergy.push({ key: synergy.key, label: synergy.label });
      }
    }
    for (const dependency of dependencyReadiness) {
      for (const line of [...dependency.producers, ...dependency.consumers]) {
        const entry = ensure(line.name);
        if (!entry.dependency.some((d) => d.key === dependency.key)) entry.dependency.push({ key: dependency.key, label: dependency.label });
      }
    }
    return map;
  }, [synergyReadiness, dependencyReadiness]);
  /** Union of the other engine's groups touched by any card in `names` — group-level, not a badge per card mention, since payoff/enabler/producer/consumer lists already render as one joined string. */
  function otherEngineLinks(names: string[], side: "synergy" | "dependency"): { key: string; label: string }[] {
    const seen = new Map<string, string>();
    for (const name of names) {
      const entry = crossLinks.get(name);
      if (!entry) continue;
      for (const ref of entry[side]) seen.set(ref.key, ref.label);
    }
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
  }

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

      <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Tuning</h2>
        <p className="mt-1 text-xs text-ctp-subtext0">
          Data source for every suggestion below: real tournament win rates, or Shout At Your Decks' full community
          deck list (popularity, not performance — see the note below).
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onPopulationSourceChange("tournament")}
            className={`rounded-md border px-2 py-1 text-xs ${
              populationSource === "tournament" ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Tournament data
          </button>
          <button
            type="button"
            onClick={() => onPopulationSourceChange("community")}
            className={`rounded-md border px-2 py-1 text-xs ${
              populationSource === "community" ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Community decks
          </button>
        </div>
        {populationSource === "tournament" ? (
          <>
            <p className="mt-3 text-xs text-ctp-subtext0">
              Bias ranked suggestions toward one Power Rating pillar — a small nudge among cards that already clear the
              real win-rate bar below, never a filter or override, so it never surfaces a card the data doesn't support.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onPillarBiasChange(null)}
                className={`rounded-md border px-2 py-1 text-xs capitalize ${
                  pillarBias === null ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                }`}
              >
                Balanced
              </button>
              {PILLAR_OPTIONS.map((pillar) => (
                <button
                  key={pillar}
                  type="button"
                  onClick={() => onPillarBiasChange(pillar)}
                  className={`rounded-md border px-2 py-1 text-xs capitalize ${
                    pillarBias === pillar ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                  }`}
                >
                  {pillar}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 text-xs text-ctp-subtext0">
            Community decks carry no win/loss data, so suggestions here rank by how often a card shows up across the
            full Shout At Your Decks deck list, not by how it performs — playstyle tuning and win-rate figures are
            unavailable in this mode. Switch back to Tournament data to use them.
          </p>
        )}
      </div>

      {decayReport && decayReport.signals.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-mauve/50 bg-ctp-mantle p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-mauve">Potential meta gaps</h2>
            <span className="text-[10px] text-ctp-subtext0">
              {decayReport.recentStart}–{decayReport.latestDate}
            </span>
          </div>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Successful cards whose inclusion rate fell in the latest 90 days versus the preceding 90 days. Rates are
            normalized by deck count; win rates are sample-adjusted. A gap is a prompt to investigate, not proof the
            metagame is wrong.
          </p>
          <div className="mt-3 space-y-2">
            {decayReport.signals.map((signal) => {
              const card = catalogByName.get(signal.cardName);
              const replacementCard = signal.replacement ? catalogByName.get(signal.replacement.cardName) : undefined;
              return (
                <div key={signal.cardName}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-ctp-surface1 px-3 py-2 text-xs">
                    {card ? (
                      <CardHoverPreview image={card.editions[0]?.image} alt={signal.cardName}>
                        <Link to={`/cards/${card.slug}`} className="font-semibold text-ctp-text hover:text-ctp-blue">
                          {signal.cardName}
                        </Link>
                      </CardHoverPreview>
                    ) : (
                      <span className="font-semibold text-ctp-text">{signal.cardName}</span>
                    )}
                    <span className="text-ctp-subtext1">
                      {(signal.priorRate * 100).toFixed(0)}% → {(signal.recentRate * 100).toFixed(0)}%
                    </span>
                    <span className="font-semibold text-ctp-red">−{(signal.decay * 100).toFixed(1)}pp</span>
                    <span className="text-ctp-green">{(signal.adjustedWinRate * 100).toFixed(0)}% adjusted win rate</span>
                    <span className="text-ctp-subtext0">{signal.deckCount} decks</span>
                    <button
                      type="button"
                      onClick={() => onAddCard(signal.cardName)}
                      className="ml-auto rounded border border-ctp-blue/40 px-1.5 py-0.5 text-ctp-blue hover:bg-ctp-blue/10"
                    >
                      + Add
                    </button>
                  </div>
                  {signal.replacement && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-3 text-[11px] text-ctp-subtext0">
                      <span>possibly replaced by</span>
                      {replacementCard ? (
                        <CardHoverPreview image={replacementCard.editions[0]?.image} alt={signal.replacement.cardName}>
                          <Link to={`/cards/${replacementCard.slug}`} className="font-medium text-ctp-text hover:text-ctp-blue">
                            {signal.replacement.cardName}
                          </Link>
                        </CardHoverPreview>
                      ) : (
                        <span className="font-medium text-ctp-text">{signal.replacement.cardName}</span>
                      )}
                      <span className="text-ctp-green">
                        {(signal.replacement.priorRate * 100).toFixed(0)}% → {(signal.replacement.recentRate * 100).toFixed(0)}%
                      </span>
                      <span>· same effect shape, not proof of a swap</span>
                      <button
                        type="button"
                        onClick={() => onAddCard(signal.replacement!.cardName)}
                        className="ml-auto rounded border border-ctp-surface1 px-1.5 py-0.5 text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-ctp-subtext0">
            Compared {decayReport.recentDeckCount} recent decks with {decayReport.priorDeckCount} prior-period decks
            for this Champion and Spirit.
          </p>
        </div>
      )}

      {synergyReadiness.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Synergy readiness</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Probability of seeing enough eligible cards at several cards-seen checkpoints. This measures availability,
            not guaranteed activation—timing, reserve decisions, and spent cards can lower the real rate.
          </p>
          <div className="mt-3 space-y-3">
            {synergyReadiness.map((synergy) => {
              const shortfall = Math.max(0, synergy.targetEnablers - synergy.enablerCopies);
              const statusColor = synergy.status === "Reliable" ? "text-ctp-green" : synergy.status === "Playable" ? "text-ctp-blue" : synergy.status === "Fragile" ? "text-ctp-yellow" : "text-ctp-red";
              const tenPoint = synergy.curve.find((c) => c.seen === 10);
              const firstPoint = synergy.curve[0];
              const lastPoint = synergy.curve[synergy.curve.length - 1];
              const relatedDependencies = otherEngineLinks(
                [...synergy.payoffCards, ...synergy.enablerCards].map((c) => c.name),
                "dependency",
              );
              return (
                <div key={synergy.key} id={`synergy-${synergy.key}`} className="rounded-md border border-ctp-surface1 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-ctp-text">{synergy.label}</p>
                    <p className={`text-sm font-semibold ${statusColor}`}>{synergy.status} · {(synergy.probabilityByTen * 100).toFixed(0)}%</p>
                  </div>
                  {synergy.curve.length >= 2 && (
                    <div className="mt-2">
                      <ThemaSparkline values={synergy.curve.map((c) => c.probability)} height={36} />
                      <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
                        <span>{firstPoint.seen} seen: {(firstPoint.probability * 100).toFixed(0)}%</span>
                        {tenPoint && (
                          <span className="font-semibold text-ctp-text">{tenPoint.seen} seen: {(tenPoint.probability * 100).toFixed(0)}%</span>
                        )}
                        <span>{lastPoint.seen} seen: {(lastPoint.probability * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-ctp-subtext1">
                    {synergy.enablerCopies}/{synergy.deckSize} eligible cards ({synergy.enablerCards.map((card) => `${card.quantity}× ${card.name}`).join(", ")}) · {synergy.payoffCopies} payoff cop{synergy.payoffCopies === 1 ? "y" : "ies"} ({synergy.payoffCards.map((card) => `${card.quantity}× ${card.name}`).join(", ")})
                  </p>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    {shortfall > 0 ? `Add about ${shortfall} eligible card${shortfall === 1 ? "" : "s"} to reach 80% theoretical availability.` : "Meets the 80% theoretical-availability target."} {synergy.note} · {synergy.confidence}
                  </p>
                  {synergy.competingPayoffCopies > 0 && (
                    <p className="mt-1 text-xs text-ctp-yellow">
                      Shared resource pool: {synergy.competingPayoffCopies} other payoff cop{synergy.competingPayoffCopies === 1 ? "y" : "ies"} can compete for these enablers.
                    </p>
                  )}
                  {synergy.recommendations.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ctp-subtext0">
                      <span>Compatible options:</span>
                      {synergy.recommendations.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => onAddCard(name)}
                          className="rounded border border-ctp-blue/40 px-1.5 py-0.5 text-ctp-blue hover:bg-ctp-blue/10"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  )}
                  {relatedDependencies.length > 0 && (
                    <p className="mt-1 text-xs text-ctp-mauve">
                      Also tracked in Package balance:{" "}
                      {relatedDependencies.map((ref, i) => (
                        <span key={ref.key}>
                          {i > 0 && ", "}
                          <a href={`#dependency-${ref.key}`} className="hover:underline">{ref.label}</a>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dependencyReadiness.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Package balance</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Explicit producer/consumer relationships found in card text. Copy counts are a structural warning, not an activation forecast.
          </p>
          <div className="mt-3 space-y-2">
            {dependencyReadiness.map((dependency) => {
              const color = dependency.status === "Supported" ? "text-ctp-green" : dependency.status === "Thin" ? "text-ctp-yellow" : "text-ctp-red";
              const relatedSynergies = otherEngineLinks(
                [...dependency.producers, ...dependency.consumers].map((c) => c.name),
                "synergy",
              );
              // Subtype "producers" are every card in the deck carrying that subtype — can run into
              // the dozens, unlike Token/Empower producers which are usually a small, specific
              // handful — so this caps the visible list rather than dumping every name.
              const PRODUCER_NAMES_SHOWN = 5;
              const shownProducers = dependency.producers.slice(0, PRODUCER_NAMES_SHOWN);
              const hiddenProducerCount = dependency.producers.length - shownProducers.length;
              const firstPoint = dependency.producerCurve[0];
              const tenPoint = dependency.producerCurve.find((c) => c.seen === 10);
              const lastPoint = dependency.producerCurve[dependency.producerCurve.length - 1];
              return (
                <div key={dependency.key} id={`dependency-${dependency.key}`} className="rounded-md border border-ctp-surface1 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold capitalize text-ctp-text">{dependency.label}</p>
                    <p className={`text-sm font-semibold ${color}`}>{dependency.status}</p>
                  </div>
                  {dependency.producerCurve.length >= 2 && (
                    <div className="mt-2">
                      <ThemaSparkline values={dependency.producerCurve.map((c) => c.probability)} height={36} />
                      <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
                        <span>{firstPoint.seen} seen: {(firstPoint.probability * 100).toFixed(0)}%</span>
                        {tenPoint && (
                          <span className="font-semibold text-ctp-text">{tenPoint.seen} seen: {(tenPoint.probability * 100).toFixed(0)}%</span>
                        )}
                        <span>{lastPoint.seen} seen: {(lastPoint.probability * 100).toFixed(0)}%</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-ctp-subtext0">Chance you've drawn at least one producer copy — sequencing, not the copy-count warning below.</p>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-ctp-subtext1">
                    {dependency.producerCopies} producer copies ({shownProducers.map((card) => `${card.quantity}× ${card.name}`).join(", ")}
                    {hiddenProducerCount > 0 ? `, +${hiddenProducerCount} more` : ""}) · {dependency.consumerCopies} consumer copies · {dependency.kind}
                  </p>
                  <p className="mt-1 text-xs text-ctp-subtext1">
                    Used by {dependency.consumers.map((card) => `${card.quantity}× ${card.name}`).join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-ctp-subtext0">{dependency.note} · {dependency.confidence}</p>
                  {dependency.recommendations.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ctp-subtext0">
                      <span>Compatible support:</span>
                      {dependency.recommendations.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => onAddCard(name)}
                          className="rounded border border-ctp-blue/40 px-1.5 py-0.5 text-ctp-blue hover:bg-ctp-blue/10"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  )}
                  {relatedSynergies.length > 0 && (
                    <p className="mt-1 text-xs text-ctp-mauve">
                      Also tracked in Synergy readiness:{" "}
                      {relatedSynergies.map((ref, i) => (
                        <span key={ref.key}>
                          {i > 0 && ", "}
                          <a href={`#synergy-${ref.key}`} className="hover:underline">{ref.label}</a>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
        <RankedCompositionChart title="Card Types" segments={buildChartSegments(composition.types)} />
        <RankedCompositionChart title="Elements" segments={buildChartSegments(composition.elements)} />
        <RankedCompositionChart title="Card Subtypes" segments={buildChartSegments(composition.subtypes)} />
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
  communityInclusion,
  communityMode = false,
}: {
  card: SuggestedCard;
  onToggleLock: () => void;
  onRemove: () => void;
  /** User-choice quantities are editable; recommendation-owned quantities remain derived from the ranking. */
  onChangeQuantity?: (quantity: number) => void;
  cardsByName: ReturnType<typeof useCardsByNames>;
  priceByName: Map<string, number>;
  showLockToggle?: boolean;
  /** % of Shout At Your Decks community decks (for this Champion) that include this card — a second, clearly-separate data point, never blended into adjustedLift. */
  communityInclusion?: Map<string, CardInclusionEntry>;
  /** True when `card` came from useCommunitySuggestedBuild — an unlocked card here was placed by
   * popularity, not chosen by the viewer, so the no-lift fallback badge shouldn't say "your choice". */
  communityMode?: boolean;
}) {
  const cardInfo = cardsByName.get(card.cardName);
  const unitPrice = priceByName.get(card.cardName);
  const maxQuantity = Math.max(1, Math.min(cardInfo?.types.includes("UNIQUE") ? 1 : 4, cardInfo?.legality?.STANDARD?.limit ?? 4));
  return (
    <li className={`relative flex flex-wrap items-center gap-1.5 overflow-hidden rounded-md border py-1 pl-3 pr-2 text-sm ${card.locked ? "border-ctp-blue/70 bg-ctp-blue/5" : "border-ctp-surface1"}`}>
      <ElementRail elements={cardInfo?.elements} />
      {card.locked && onChangeQuantity ? (
        <input
          type="number"
          min={1}
          max={maxQuantity}
          value={card.quantity}
          aria-label={`Copies of ${card.cardName}`}
          title="Adjust copies while keeping this card as your choice"
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isInteger(next) && next >= 1) onChangeQuantity(Math.min(next, maxQuantity));
          }}
          className="w-11 shrink-0 rounded border border-ctp-surface1 bg-ctp-mantle px-1 py-0.5 text-right text-xs text-ctp-text focus:border-ctp-blue focus:outline-none"
        />
      ) : (
        <span
          className="w-6 shrink-0 text-right text-ctp-subtext0"
          title={card.optimizedFrom !== null ? `Quantity changed from ${card.optimizedFrom}x using ${card.quantityEvidence.source} evidence (n=${card.quantityEvidence.sampleSize})` : undefined}
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
          {communityMode && !card.locked
            ? "popular pick"
            : card.reason === "spirit"
              ? "your pick"
              : card.reason === "staple"
                ? "staple"
                : "your choice"}
        </span>
      )}
      {card.sample && <span className="text-xs text-ctp-subtext0">({card.sample.with} vs {card.sample.without})</span>}
      {communityInclusion?.get(card.cardName) && (
        <span className="text-xs text-ctp-mauve" title="Share of Shout At Your Decks community decks for this Champion that include this card">
          {Math.round(communityInclusion.get(card.cardName)!.percentOfDecks * 100)}% community
        </span>
      )}
      <div className="ml-auto flex shrink-0 gap-1.5">
        {showLockToggle && (
          <button
            type="button"
            onClick={onToggleLock}
            className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
              card.locked ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {card.locked ? "Pinned" : "Pin"}
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
  communityInclusion,
}: {
  card: SuggestedCard;
  onAdd: () => void;
  cardsByName: ReturnType<typeof useCardsByNames>;
  priceByName: Map<string, number>;
  communityInclusion?: Map<string, CardInclusionEntry>;
}) {
  const cardInfo = cardsByName.get(card.cardName);
  const unitPrice = priceByName.get(card.cardName);
  return (
    <li className="relative flex flex-wrap items-center gap-1.5 overflow-hidden rounded-md border border-ctp-surface1 py-1 pl-3 pr-2 text-sm">
      <ElementRail elements={cardInfo?.elements} />
      <span
        className="w-6 shrink-0 text-right text-ctp-subtext0"
        title={card.optimizedFrom !== null ? `Quantity changed from ${card.optimizedFrom}x using ${card.quantityEvidence.source} evidence (n=${card.quantityEvidence.sampleSize})` : undefined}
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
      {communityInclusion?.get(card.cardName) && (
        <span className="text-xs text-ctp-mauve" title="Share of Shout At Your Decks community decks for this Champion that include this card">
          {Math.round(communityInclusion.get(card.cardName)!.percentOfDecks * 100)}% community
        </span>
      )}
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
    "Pick a Champion and Spirit and see a suggested build assembled from the highest win-rate cards in real decks, then mark your own choices for updated suggestions.",
  );
  const [searchParams, setSearchParams] = useSearchParams();
  // Computed fresh each render (cheap — parsing a couple of query params), but only its value on
  // the very first render actually matters: every useState below that reads from it only consults
  // its initializer once, on mount, same as React already guarantees for lazy useState.
  const urlSeed = parseUrlSeed(searchParams);

  const [championName, setChampionName] = useState<string | null>(urlSeed?.championName ?? null);
  const [spiritFilter, setSpiritFilter] = useState<string | null>(urlSeed?.spiritFilter ?? null);
  const [lockedCards, setLockedCards] = useState<Map<string, number>>(() => urlSeed?.lockedCards ?? new Map());
  // Section a lock is known to belong to (from where it was locked, or from a pasted decklist's
  // own Main/Material headers) — see useSuggestedBuild's lockedSections param doc for why this
  // beats guessing from population presence for a card the current population barely plays.
  const [lockedSections, setLockedSections] = useState<Map<string, LockedSection>>(() => urlSeed?.lockedSections ?? new Map());
  const [rejectedCards, setRejectedCards] = useState<Set<string>>(new Set());
  const [cardInput, setCardInput] = useState("");
  /** Tuning: nudges useSuggestedBuild's ranking toward a chosen Power Rating pillar (see its own
   * pillarBias doc comment) — null ("Balanced") reproduces the original unbiased lift-only order. */
  const [pillarBias, setPillarBias] = useState<RatingPillar | null>(null);
  /** Tuning: swaps the assembled suggestions between real Omnidex win-rate data and Shout At Your
   * Decks' community popularity data — see useCommunitySuggestedBuild's own doc comment. */
  const [populationSource, setPopulationSource] = useState<PopulationSource>("tournament");
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
  // catalogByName feeds Champion/Spirit identity and legality checks,
  // all of which would otherwise recompute (and re-render the whole page) on every sync write.
  const cardCatalog = useDebouncedValue(useCardCatalog(), 500);
  const catalogByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);
  // "default" pool's population — this Champion's decks, further narrowed by the Spirit dropdown
  // inside useSuggestedBuild itself (pool 1/2 combined; there's no separate state for them, since
  // the existing Spirit dropdown's own "Any Spirit" option already covers pool 2).
  const { rows, spiritsPresent, loading: populationLoading } = useDeckBuilderPopulation(championName);
  const cardQuantityStatsData = useCardQuantityStatsData();
  const compositionWinRateData = useCompositionWinRateData();
  // Similar real decks become useful only once the viewer has expressed enough intent through
  // locks. Keep the expensive all-deck decode off the default path until then.
  const showNearestDecks = lockedCards.size >= 2;
  const { decks: allDecks } = useAllDecodedDecks(showNearestDecks);

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

  const communityCardInclusion = useCommunityCardInclusion();
  const communityChampData = useMemo(() => {
    if (!communityCardInclusion || !championName) return undefined;
    return communityCardInclusion.byChampion[championToSlug(championName)];
  }, [communityCardInclusion, championName]);
  const communityInclusionByName = useMemo(() => {
    if (!communityChampData) return undefined;
    return new Map(communityChampData.cards.map((c) => [c.name, c]));
  }, [communityChampData]);

  const tournamentBuild = useSuggestedBuild(
    rows,
    spiritFilter,
    lockedCards,
    rejectedCards,
    populationLoading,
    lockedSections,
    cardQuantityStatsData,
    undefined,
    pillarBias,
  );
  const communityBuild = useCommunitySuggestedBuild(communityChampData, lockedCards, rejectedCards, catalogByName, !communityCardInclusion);
  const build = populationSource === "community" ? communityBuild : tournamentBuild;

  const nearestDecks = useNearestDecks(allDecks, lockedCards);
  const gateLoading = populationLoading;
  const gateHasData = rows.length > 0;

  const spiritStats = useMemo(() => {
    const stats = new Map<string, { decks: number; winRate: number }>();
    for (const spirit of spiritsPresent) {
      const matching = rows.filter((row) => row.spiritName === spirit);
      stats.set(spirit, {
        decks: matching.length,
        winRate: matching.length > 0 ? matching.reduce((sum, row) => sum + row.winRate, 0) / matching.length : 0,
      });
    }
    return stats;
  }, [rows, spiritsPresent]);
  const sortedSpirits = useMemo(
    () => [...spiritsPresent].sort((a, b) => (spiritStats.get(b)?.decks ?? 0) - (spiritStats.get(a)?.decks ?? 0) || a.localeCompare(b)),
    [spiritsPresent, spiritStats],
  );
  const decayReport = useMemo(
    () => computeCardDecay(rows, spiritFilter, catalogByName),
    [rows, spiritFilter, catalogByName],
  );
  function spiritOptionLabel(name: string): string {
    const stats = spiritStats.get(name);
    if (!stats) return name;
    return `${name} — ${stats.decks} ${stats.decks === 1 ? "deck" : "decks"} · ${(stats.winRate * 100).toFixed(0)}% observed`;
  }

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
  const communityCoOccurrence = useCommunityCoOccurrence();
  const communityBuddyCards = useMemo(() => {
    const result = new Map<string, CommunityCoOccurrenceEntry[]>();
    if (!communityCoOccurrence || !championName) return result;
    const champData = communityCoOccurrence.byChampion[championToSlug(championName)];
    if (!champData) return result;
    for (const name of lockedCards.keys()) result.set(name, champData[name] ?? []);
    return result;
  }, [communityCoOccurrence, championName, lockedCards]);
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
        next.delete("pillar");
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

  /** Loads a `useNearestDecks` result as the new starting point — same shape as `loadPastedDecklist`, just sourced from an already-decoded real deck instead of re-parsing text. */
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
    pendingActionRef.current = { label: willLock ? `Chose ${name}` : `Released ${name}`, subject: name };
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
  const validation = useMemo(
    () => validateDeck({ main: build.main, material: build.material, sideboard: build.sideboard }, catalogByName, identityElements),
    [build.main, build.material, build.sideboard, catalogByName, identityElements],
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
        Choose an identity, review its data-supported core, then mark your choices and resolve the remaining flex slots.
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
              <option value="">Choose a Spirit…</option>
              {sortedSpirits.map((name) => (
                <option key={name} value={name}>
                  {spiritOptionLabel(name)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      {championName && spiritFilter === null && (
        <p className="mt-2 text-xs text-ctp-yellow">
          Choose a Spirit to define a coherent recommendation population. Deck counts and observed win rates in the
          picker show how much evidence each option has.
        </p>
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
          No decks found for {championName}.
        </p>
      )}

      {championName && !gateLoading && gateHasData && !spiritFilter && (
        <p className="mt-6 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm text-ctp-subtext1">
          Select a Spirit above to generate a coherent core. The builder will keep unsupported slots unresolved
          instead of mixing this Champion's different strategies.
        </p>
      )}

      {championName && spiritFilter && !gateLoading && gateHasData && (
        <>
          <div className="mt-4 grid overflow-hidden rounded-lg border border-ctp-surface1 bg-ctp-mantle sm:grid-cols-4">
            <div className="border-b border-ctp-surface1 px-3 py-2 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Evidence</p>
              <p className="mt-0.5 text-sm font-semibold text-ctp-text">{build.matchingDeckCount} decks</p>
              <p className="text-[10px] text-ctp-subtext0">{build.matchingDeckCount >= 30 ? "Strong sample" : build.matchingDeckCount >= 10 ? "Limited sample" : "Exploratory"}</p>
            </div>
            <div className="border-b border-ctp-surface1 px-3 py-2 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Performance</p>
              <p className="mt-0.5 text-sm font-semibold text-ctp-text">{build.conditionalWinRate === null ? "—" : `${(build.conditionalWinRate * 100).toFixed(0)}% observed`}</p>
              {build.baselineWinRate !== null && lockedCards.size > 0 && <p className="text-[10px] text-ctp-subtext0">{build.conditionalWinRate !== null && build.conditionalWinRate - build.baselineWinRate >= 0 ? "+" : ""}{build.conditionalWinRate === null ? "" : `${((build.conditionalWinRate - build.baselineWinRate) * 100).toFixed(1)}pp`} vs. baseline</p>}
            </div>
            <div className="border-b border-ctp-surface1 px-3 py-2 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Completion</p>
              <p className="mt-0.5 text-sm font-semibold text-ctp-text">{mainTotal}/{mainTotal + build.unresolved.main} main</p>
              <p className="text-[10px] text-ctp-subtext0">{build.unresolved.main} flex slot{build.unresolved.main === 1 ? "" : "s"} open</p>
            </div>
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Cost</p>
              <p className="mt-0.5 text-sm font-semibold text-ctp-text">{formatUsd(totalPrice.sum)}</p>
              <p className="text-[10px] text-ctp-subtext0">{sideboardPrice.sum > 0 ? `+ ${formatUsd(sideboardPrice.sum)} sideboard` : totalPrice.missing > 0 ? `${totalPrice.missing} price${totalPrice.missing === 1 ? "" : "s"} missing` : "Main + material"}</p>
            </div>
          </div>

          <details className={`mt-2 rounded-md border px-3 py-2 text-sm ${validation.status === "Legal" ? "border-ctp-green" : validation.status === "Illegal" ? "border-ctp-red" : "border-ctp-yellow"}`}>
            <summary className="flex cursor-pointer items-center justify-between gap-3">
              <span className="font-semibold">{validation.status === "Incomplete" && build.unresolved.main > 0 ? `${build.unresolved.main} main-deck slots remaining` : validation.status}</span>
              <span className="text-xs font-normal text-ctp-subtext0">View validation</span>
            </summary>
            {validation.reasons.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-ctp-subtext1">{validation.reasons.slice(0, 8).map((reason) => <li key={reason}>{reason}</li>)}</ul>}
            <p className="mt-2 text-xs text-ctp-subtext0">Standard construction checks only; not tournament certification.</p>
          </details>

          {isPending && <p className="mt-1 text-xs text-ctp-subtext0">Recalculating suggestions…</p>}
          {rejectedCards.size > 0 && <p className="mt-1 text-xs text-ctp-subtext0">{rejectedCards.size} card{rejectedCards.size === 1 ? "" : "s"} excluded · <button type="button" onClick={() => { pendingActionRef.current = { label: "Reset excluded cards", subject: null }; startTransition(() => setRejectedCards(new Set())); }} className="hover:text-ctp-blue hover:underline">reset</button></p>}
          {build.usedSpiritElementFallback && (
            <p className="mt-1 text-xs text-ctp-yellow">
              Too few {championName} decks run {spiritFilter} specifically — suggestions also draw on other{" "}
              {championName} decks with a same-element Spirit ({build.spiritElementFallbackSpirits.join(", ")}).
            </p>
          )}
          {build.usedFallback && (
            <p className="mt-1 text-xs text-ctp-yellow">
              Not enough decks have every card you've chosen — remaining suggestions are based on the broader{" "}
              {spiritFilter ?? "any Spirit"} {championName} population instead.
            </p>
          )}
          {build.matchingDeckCount > 0 && build.matchingDeckCount < 10 && (
            <p className="mt-1 text-xs text-ctp-yellow">
              Insufficient sample for a stable summary (n={build.matchingDeckCount}). Treat this as a statistical shell;
              the observed rate and card ordering may be highly sensitive to a few decks.
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
              title="Copies a link that reopens this Champion/Spirit and every user-choice card"
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
                placeholder="Type a card name to add as your choice…"
                className="mt-1 block w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
              />
              <datalist id="deck-builder-card-options">
                {cardNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <>
              <div className={`mt-3 grid gap-4 sm:grid-cols-2 transition-opacity ${isPending ? "opacity-50" : ""}`}>
                <div>
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Material Deck ({materialTotal})</h2>
                  <ul className="mt-2 space-y-1">
                    {build.material.map((c) => (
                      <CardRow
                        key={c.cardName}
                        card={c}
                        cardsByName={cardsByName}
                        priceByName={priceByName}
                        communityInclusion={communityInclusionByName}
                        communityMode={populationSource === "community"}
                        onToggleLock={() => toggleLock(c.cardName, c.quantity, "material")}
                        onRemove={() => removeCard(c.cardName, c.locked)}
                      />
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Main Deck ({mainTotal})</h2>
                  <ul className="mt-2 space-y-1">
                    {build.main.map((c) => (
                      <CardRow
                        key={c.cardName}
                        card={c}
                        cardsByName={cardsByName}
                        priceByName={priceByName}
                        communityInclusion={communityInclusionByName}
                        communityMode={populationSource === "community"}
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
                    Common successful sideboard options in this population, not matchup-specific advice. Empty or
                    unresolved slots are preferred when the data cannot support a confident option.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {build.sideboard.map((c) => (
                      <CardRow
                        key={c.cardName}
                        card={c}
                        cardsByName={cardsByName}
                        priceByName={priceByName}
                        communityInclusion={communityInclusionByName}
                        communityMode={populationSource === "community"}
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
                      <SuggestionRow
                        key={c.cardName}
                        card={c}
                        cardsByName={cardsByName}
                        priceByName={priceByName}
                        communityInclusion={communityInclusionByName}
                        onAdd={() => addSuggestion(c)}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {build.removalSuggestions.length > 0 ? (
                <div className="mt-4">
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Cards that might hurt</h2>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    User-choice cards whose own win rate (with vs. without, independent of your other choices) came out
                    meaningfully negative — candidates to cut, not proof they're bad in every build.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {build.removalSuggestions.map((c) => (
                      <CardRow
                        key={c.cardName}
                        card={c}
                        cardsByName={cardsByName}
                        priceByName={priceByName}
                        communityInclusion={communityInclusionByName}
                        showLockToggle={false}
                        onToggleLock={() => {}}
                        onRemove={() => removeCard(c.cardName, c.locked)}
                      />
                    ))}
                  </ul>
                </div>
              ) : (
                populationSource === "community" &&
                championName && (
                  <p className="mt-4 text-xs text-ctp-subtext0">
                    Cards that might hurt isn't available in Community mode — Shout At Your Decks has no win/loss data
                    to flag underperforming choices from.
                  </p>
                )
              )}
                </>

              {showNearestDecks && (
                <div className="mt-4">
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Nearest similar real decks</h2>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    Real decklists most similar to your accepted cards, shown automatically after two choices. These
                    are references, not a replacement recommendation population. Click "Load" to use one as a new
                    starting point.
                  </p>
                  {nearestDecks.length === 0 ? (
                    <p className="mt-3 text-sm text-ctp-subtext1">No similar decks found for your choices so far.</p>
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
            </div>
          )}

          {tab === "stats" && (
            <StatsPanel
              lines={buildLines}
              mainLines={mainOnlyLines}
              cardsByName={cardsByName}
              catalogByName={catalogByName}
              identityElements={identityElements}
              preferredSuggestions={build.suggestions.map((card) => card.cardName)}
              championName={championName}
              compositionWinRateData={compositionWinRateData}
              pillarBias={pillarBias}
              onPillarBiasChange={setPillarBias}
              onAddCard={addCard}
              populationSource={populationSource}
              onPopulationSourceChange={setPopulationSource}
              decayReport={decayReport}
            />
          )}

          {tab === "buddies" && (
            <BuddyCardsList
              lockedNames={Array.from(lockedCards.keys())}
              buddyCards={buddyCards}
              communityBuddyCards={communityBuddyCards}
              cardsByName={cardsByName}
              onAdd={addCard}
            />
          )}

          {tab === "log" && <ChangeLogList entries={changeLog} />}

          <details className="mt-8 border-t border-ctp-surface1 pt-3 text-xs text-ctp-subtext0">
            <summary className="cursor-pointer font-medium hover:text-ctp-text">Data &amp; methodology</summary>
            <div className="mt-2 space-y-2">
              <DecklistCoverageNotice />
              <StaleDataNotice generatedAt={[popularityIndexData?.generatedAt]} />
              <p>Suggestions are correlations from public tournament decklists, not causal or predictive claims.</p>
              {build.hasQuantityOptimizations && <p>Starred quantities use global copy-count evidence only when at least 30 decks support a meaningful difference; each affected card shows its source and sample.</p>}
              <p>Validation does not cover {validation.unsupportedRules.join("; ")}.</p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
