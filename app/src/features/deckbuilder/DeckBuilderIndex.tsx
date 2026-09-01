import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Card, CardInclusionEntry, CollectionEntry, CommunityCoOccurrenceEntry, CompositionWinRateData, CompositionWinRateStat, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { championToSlug, useCommunityBlendedCardInclusion, useCommunityBlendedCoOccurrence, useCommunityCardInclusion, useCommunityCoOccurrence } from "../community/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useArchetypeTaxonomyData, useCardQuantityStatsData, useCompositionWinRateData } from "../archetypes/data";
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
import { computeDeckComposition, computeDeckIdentity, computeDeckRating, computeMemoryCostCurve, computeReserveCostCurve, type DeckRating, type RatingPillar } from "../../lib/deckIdentity";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { buildClarentPlaytestUrl } from "../../lib/clarentPlaytest";
import { copyDecklistAndOpen, deckBuilderDestinations } from "../../lib/deckBuilderDestinations";
import { buildTtsSaveFile, downloadJsonFile, slugifyFilename } from "../../lib/ttsExport";
import { formatUsd } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import { useTabParam } from "../../lib/useTabParam";
import { useAllDecodedDecks } from "../../lib/decodedDecks";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { encodeCustomDecks } from "../../lib/compareShareLink";
import { buildSpiritCanonicalNames, useDeckBuilderPopulation, type DeckBuilderRow } from "./useDeckBuilderPopulation";
import { useNearestDecks, type NearestDeck } from "./useNearestDecks";
import { computeIdentityElements, findChampionCard, useSuggestedBuild, type SuggestedCard } from "./useSuggestedBuild";
import { useCommunitySuggestedBuild } from "./useCommunitySuggestedBuild";
import { useSimulatorSuggestedBuild, type SimulatorCardEvidence } from "./useSimulatorSuggestedBuild";
import { useSimulatorSummaryData } from "../simulator/data";
import { useCardFieldVisibility, type CardFieldVisibility } from "./useCardFieldVisibility";
import { useBuddyCards, type BuddyCard } from "./useBuddyCards";
import { SIDEBOARD_POINT_BUDGET, sideboardPointCost, validateDeck, type DeckValidationResult } from "./validateDeck";
import { computeDependencyReadiness, computeSynergyReadiness, type DependencyReadiness, type SynergyReadiness } from "./synergyReadiness";
import { computeNewReleaseCards, type NewReleaseCard } from "./newReleaseCards";
import HypergeometricCalculator from "./HypergeometricCalculator";
import { similarCards } from "../../lib/cardSimilarity";
import ThemaSparkline from "../thema/ThemaSparkline";
import ElementRail from "../../components/ElementRail";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import DeckCollectionTools from "../collection/DeckCollectionTools";

type BuilderTab = "build" | "review" | "stats" | "tools" | "buddies" | "copy" | "log";
const TAB_KEYS: BuilderTab[] = ["build", "review", "stats", "tools", "buddies", "copy", "log"];

type LockedSection = "main" | "material" | "sideboard";
type BuilderIntent = "seed" | "scratch";

const BUILDER_INTENTS: { key: BuilderIntent; title: string; description: string }[] = [
  { key: "seed", title: "Build around cards", description: "Choose a Champion and Spirit, lock the cards you care about, and fill the rest." },
  { key: "scratch", title: "Start from scratch", description: "Choose a Champion and Spirit, then optimize a full suggested list." },
];

interface ArchetypeTuningOption {
  id: string;
  name: string;
  routeName: string;
  routeDeckCount: number;
  deckCount: number;
  confidence: "established" | "emerging";
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
  archetypeId: string | null;
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
    archetypeId: searchParams.get("archetype"),
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

const SESSION_STORAGE_KEY = "deckbuilder-session-v1";

interface SessionSeed {
  championName: string;
  spiritFilter: string | null;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
  rejectedCards: Set<string>;
  pillarBias: RatingPillar | null;
  archetypeId: string | null;
  populationSource: PopulationSource;
  changeLog: ChangeLogEntry[];
  maybeboard: Map<string, number>;
}

/** Plain-JSON shape written to sessionStorage — Maps/Sets aren't JSON.stringify-able, so lockedCards/
 * lockedSections reuse the exact compact string encoding encodeLockedCards/decodeLockedCards already
 * use for share links, and rejectedCards becomes a plain array. */
interface StoredSession {
  championName: string;
  spiritFilter: string | null;
  locked: string;
  rejectedCards: string[];
  pillarBias: RatingPillar | null;
  archetypeId: string | null;
  populationSource: PopulationSource;
  changeLog: ChangeLogEntry[];
  maybeboard?: string;
}

/**
 * Restores the last in-progress session from this browser tab, so navigating away (e.g. clicking
 * a suggested card's own page) and back via the browser Back button doesn't reset every choice —
 * sessionStorage survives that unmount/remount, unlike plain component state. Scoped to the tab
 * (cleared when it closes) — distinct from the deliberate, on-demand "Copy share link" snapshot
 * (handleCopyShareLink below), which stays untouched. Wrapped in try/catch: a corrupted or
 * outdated-shape blob (e.g. from a future version of this file) should read as "no saved session,"
 * never crash the page — same defensive posture parseUrlSeed's callers already get from a missing
 * `?champion=` param.
 */
function loadSessionSeed(): SessionSeed | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<StoredSession>;
    if (!stored.championName) return null;
    const { lockedCards, lockedSections } = stored.locked ? decodeLockedCards(stored.locked) : { lockedCards: new Map<string, number>(), lockedSections: new Map<string, LockedSection>() };
    return {
      championName: stored.championName,
      spiritFilter: stored.spiritFilter ?? null,
      lockedCards,
      lockedSections,
      rejectedCards: new Set(stored.rejectedCards ?? []),
      pillarBias: stored.pillarBias ?? null,
      archetypeId: stored.archetypeId ?? null,
      populationSource:
        stored.populationSource === "community" || stored.populationSource === "simulator" || stored.populationSource === "tournament"
          ? stored.populationSource
          : "balanced",
      changeLog: Array.isArray(stored.changeLog) ? stored.changeLog : [],
      maybeboard: stored.maybeboard ? decodeLockedCards(stored.maybeboard).lockedCards : new Map<string, number>(),
    };
  } catch {
    return null;
  }
}

function saveSessionSeed(seed: {
  championName: string | null;
  spiritFilter: string | null;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
  rejectedCards: Set<string>;
  pillarBias: RatingPillar | null;
  archetypeId: string | null;
  populationSource: PopulationSource;
  changeLog: ChangeLogEntry[];
  maybeboard: Map<string, number>;
}): void {
  try {
    if (!seed.championName) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    const stored: StoredSession = {
      championName: seed.championName,
      spiritFilter: seed.spiritFilter,
      locked: encodeLockedCards(seed.lockedCards, seed.lockedSections),
      rejectedCards: Array.from(seed.rejectedCards),
      pillarBias: seed.pillarBias,
      archetypeId: seed.archetypeId,
      populationSource: seed.populationSource,
      changeLog: seed.changeLog,
      maybeboard: encodeLockedCards(seed.maybeboard, new Map()),
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Private-browsing/storage-full edge cases can throw here — losing autosave silently is
    // strictly better than crashing the page over it.
  }
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
                {(e.winRateDelta * 100).toFixed(1)}%)
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

interface BuddyGroup {
  cardName: string;
  /** Which of the viewer's locked cards this card pairs with, each with its own co-occurrence rate, best first. */
  withLocked: { name: string; coOccurrenceRate: number; count: number }[];
}

/**
 * Inverts the per-locked-card buddy lists (`{lockedName: BuddyCard[]}`) into one entry per
 * recommended card, so a card that pairs well with several of the viewer's locks is shown once —
 * not duplicated under each lock — and sorted with the strongest multi-lock signals first.
 */
function groupBuddiesByCard(
  groups: { name: string; buddies: { cardName: string; coOccurrenceRate: number; count: number }[] }[],
): BuddyGroup[] {
  const byCard = new Map<string, { name: string; coOccurrenceRate: number; count: number }[]>();
  for (const { name, buddies } of groups) {
    for (const b of buddies) {
      const list = byCard.get(b.cardName);
      const entry = { name, coOccurrenceRate: b.coOccurrenceRate, count: b.count };
      if (list) list.push(entry);
      else byCard.set(b.cardName, [entry]);
    }
  }
  return Array.from(byCard.entries())
    .map(([cardName, withLocked]) => ({
      cardName,
      withLocked: withLocked.sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate),
    }))
    .sort((a, b) => b.withLocked.length - a.withLocked.length || b.withLocked[0].coOccurrenceRate - a.withLocked[0].coOccurrenceRate);
}

interface BuddyConnectionPath {
  key: string;
  d: string;
  rate: number;
  candidateName: string;
}

const INITIAL_BUDDY_CANDIDATES = 5;
const INITIAL_DESKTOP_CONNECTIONS = 3;

/** Responsive relationship view: a bipartite map on desktop and expandable candidate cards on
 * mobile. Both encode the same rates/counts; neither calls co-occurrence causal synergy. */
function BuddyRelationshipView({
  title,
  description,
  groups,
  cardsByName,
  onAdd,
}: {
  title: string;
  description: string;
  groups: BuddyGroup[];
  cardsByName: ReturnType<typeof useCardsByNames>;
  onAdd: (name: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleGroups = useMemo(
    () => showAll ? groups : groups.slice(0, INITIAL_BUDDY_CANDIDATES),
    [groups, showAll],
  );
  const [selectedName, setSelectedName] = useState<string | null>(visibleGroups[0]?.cardName ?? null);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(visibleGroups[0]?.cardName ?? null);
  const mapRef = useRef<HTMLDivElement>(null);
  const lockedRefs = useRef(new Map<string, HTMLDivElement>());
  const candidateRefs = useRef(new Map<string, HTMLDivElement>());
  const [paths, setPaths] = useState<BuddyConnectionPath[]>([]);
  const selected = visibleGroups.find((group) => group.cardName === selectedName) ?? visibleGroups[0];
  const selectedRelationships = useMemo(
    () => selected ? (showAllConnections ? selected.withLocked : selected.withLocked.slice(0, INITIAL_DESKTOP_CONNECTIONS)) : [],
    [selected, showAllConnections],
  );

  useEffect(() => {
    if (!visibleGroups.some((group) => group.cardName === selectedName)) setSelectedName(visibleGroups[0]?.cardName ?? null);
  }, [visibleGroups, selectedName]);

  useEffect(() => setShowAllConnections(false), [selectedName]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = () => {
      const bounds = map.getBoundingClientRect();
      if (!selected) {
        setPaths([]);
        return;
      }
      setPaths(selectedRelationships.flatMap((relationship) => {
        const from = lockedRefs.current.get(relationship.name)?.getBoundingClientRect();
        const to = candidateRefs.current.get(selected.cardName)?.getBoundingClientRect();
        if (!from || !to) return [];
        const x1 = from.right - bounds.left;
        const y1 = from.top + from.height / 2 - bounds.top;
        const x2 = to.left - bounds.left;
        const y2 = to.top + to.height / 2 - bounds.top;
        const bend = Math.max(28, (x2 - x1) * 0.4);
        return [{
          key: `${relationship.name}:${selected.cardName}`,
          d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
          rate: relationship.coOccurrenceRate,
          candidateName: selected.cardName,
        }];
      }));
    };
    const frame = requestAnimationFrame(draw);
    const observer = new ResizeObserver(draw);
    observer.observe(map);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [visibleGroups, selected, selectedRelationships]);

  return (
    <section className="mt-4 border-t border-ctp-surface0 pt-3 first:mt-2 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{title}</h3>
      <p className="mt-1 text-xs text-ctp-subtext0">{description}</p>

      <div ref={mapRef} className="relative mt-3 hidden grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] gap-24 sm:grid">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
          {paths.map((path) => (
            <path
              key={path.key}
              d={path.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={1 + path.rate * 5}
              className="text-ctp-blue opacity-80"
            />
          ))}
        </svg>
        <div className="relative z-10">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Linked to selected candidate</p>
          <div className="space-y-2">
            {selectedRelationships.map((relationship) => (
              <div
                key={relationship.name}
                ref={(node) => { if (node) lockedRefs.current.set(relationship.name, node); else lockedRefs.current.delete(relationship.name); }}
                className="flex items-center justify-between gap-2 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-xs font-medium text-ctp-text"
              >
                <span className="truncate">{relationship.name}</span>
                <span className="shrink-0 text-[10px] font-semibold text-ctp-green">{Math.round(relationship.coOccurrenceRate * 100)}% · n={relationship.count}</span>
              </div>
            ))}
          </div>
          {selected && selected.withLocked.length > INITIAL_DESKTOP_CONNECTIONS && (
            <button type="button" onClick={() => setShowAllConnections((value) => !value)} className="mt-2 min-h-9 text-xs text-ctp-blue hover:underline">
              {showAllConnections ? "Show strongest 3" : `Show ${selected.withLocked.length - INITIAL_DESKTOP_CONNECTIONS} more connections`}
            </button>
          )}
        </div>
        <div className="relative z-10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Best shared relationships</p>
            <span className="text-[10px] text-ctp-subtext0">Line thickness = pairing rate</span>
          </div>
          <div className="space-y-2">
            {visibleGroups.map((group) => {
              const cardInfo = cardsByName.get(group.cardName);
              return (
                <div
                  key={group.cardName}
                  ref={(node) => { if (node) candidateRefs.current.set(group.cardName, node); else candidateRefs.current.delete(group.cardName); }}
                  className={`relative flex items-center gap-2 overflow-hidden rounded-md border bg-ctp-base py-2 pl-3 pr-2 ${selected?.cardName === group.cardName ? "border-ctp-blue ring-1 ring-inset ring-ctp-blue/30" : "border-ctp-surface1"}`}
                >
                  <ElementRail elements={cardInfo?.elements} />
                  <button type="button" aria-pressed={selected?.cardName === group.cardName} onClick={() => setSelectedName(group.cardName)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-xs font-semibold text-ctp-text">{group.cardName}</span>
                    <span className="block text-[10px] text-ctp-subtext0">
                      <span className="font-semibold text-ctp-green">{Math.round(group.withLocked[0].coOccurrenceRate * 100)}%</span>
                      {" strongest · "}{group.withLocked.length} locked card{group.withLocked.length === 1 ? "" : "s"} · n={group.withLocked[0].count}
                    </span>
                  </button>
                  <button type="button" onClick={() => onAdd(group.cardName)} className="min-h-9 rounded-md border border-ctp-surface1 px-2 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue">+ Add</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && (
        <p className="mt-2 hidden text-[11px] text-ctp-subtext0 sm:block">
          <span className="font-semibold text-ctp-text">{selected.cardName}</span>{" pairs with "}
          {selectedRelationships.map((relationship) => `${relationship.name} in ${Math.round(relationship.coOccurrenceRate * 100)}% (n=${relationship.count})`).join(", ")} of supported decks
          {!showAllConnections && selected.withLocked.length > INITIAL_DESKTOP_CONNECTIONS ? ` · ${selected.withLocked.length - INITIAL_DESKTOP_CONNECTIONS} more hidden` : ""}.
        </p>
      )}

      <div className="mt-3 space-y-2 sm:hidden">
        {visibleGroups.map((group) => {
          const cardInfo = cardsByName.get(group.cardName);
          const expanded = expandedMobile === group.cardName;
          return (
            <div key={group.cardName} className="relative overflow-hidden rounded-md border border-ctp-surface1 bg-ctp-base py-2 pl-3 pr-2">
              <ElementRail elements={cardInfo?.elements} />
              <div className="flex items-center gap-2">
                <button type="button" aria-expanded={expanded} onClick={() => setExpandedMobile(expanded ? null : group.cardName)} className="min-h-9 min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-ctp-text">{group.cardName}</span>
                  <span className="block text-[10px] text-ctp-subtext0">
                    <span className="font-semibold text-ctp-green">{Math.round(group.withLocked[0].coOccurrenceRate * 100)}%</span>
                    {" strongest · "}{group.withLocked.length} locked card{group.withLocked.length === 1 ? "" : "s"} · n={group.withLocked[0].count}
                  </span>
                </button>
                <button type="button" onClick={() => onAdd(group.cardName)} className="min-h-11 rounded-md border border-ctp-surface1 px-3 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue">+ Add</button>
              </div>
              {expanded && (
                <div className="mt-2 space-y-2 border-t border-ctp-surface0 pt-2">
                  {group.withLocked.map((relationship) => (
                    <div key={relationship.name}>
                      <div className="flex justify-between gap-3 text-[11px]">
                        <span className="truncate text-ctp-subtext1">{relationship.name}</span>
                        <span className="shrink-0 text-ctp-subtext0">{Math.round(relationship.coOccurrenceRate * 100)}% · n={relationship.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ctp-surface1">
                        <div className="h-full rounded-full bg-ctp-blue" style={{ width: `${relationship.coOccurrenceRate * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {groups.length > INITIAL_BUDDY_CANDIDATES && (
        <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-2 min-h-9 text-xs text-ctp-blue hover:underline">
          {showAll ? "Show fewer" : `Show ${groups.length - INITIAL_BUDDY_CANDIDATES} more`}
        </button>
      )}
    </section>
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
            ? "Keep a card to see what's most often run alongside it."
            : "No buddy suggestions right now — either everything commonly run alongside your choices is already in the build, or this Champion/Spirit population is too thin to say (a build with many user choices often narrows it down to just a few decks)."}
        </p>
      </div>
    );
  }
  const merged = groupBuddiesByCard(groups);
  const communityMerged = groupBuddiesByCard(communityGroups);
  return (
    <div className="mt-6">
      <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Buddy cards</h2>
      <p className="mt-1 text-xs text-ctp-subtext0">
        Cards most often run alongside your choices, regardless of win rate. Thicker connections and longer
        mobile bars mean a higher pairing rate; sample counts show how many decks contained both cards. Frequent
        pairing is a lead to investigate, not proof of synergy.
      </p>
      {merged.length > 0 && (
        <BuddyRelationshipView
          title="Tournament relationships"
          description="Drawn from matching tournament decklists; no win-rate filter is applied."
          groups={merged}
          cardsByName={cardsByName}
          onAdd={onAdd}
        />
      )}

      {communityMerged.length > 0 && (
        <BuddyRelationshipView
          title="Community relationships"
          description="The same co-occurrence view using community decklists instead of tournament data."
          groups={communityMerged}
          cardsByName={cardsByName}
          onAdd={onAdd}
        />
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
const PILLAR_OPTIONS: RatingPillar[] = ["durability", "interaction", "aggro", "opportunity"];
/** "tournament" ranks by real Omnidex win-rate lift (useSuggestedBuild); "community" ranks by
 * the blended community population's popularity (useCommunitySuggestedBuild) — no win/loss data, so pillar
 * tuning and lift-specific UI are unavailable in this mode. "balanced" is still useSuggestedBuild's
 * real lift-ranked build — same adjustedLift/conditionalWinRate numbers as "tournament" — just with
 * community popularity nudging the ranking order alongside any pillar bias, so it keeps full
 * lift-specific UI (pillar tuning, removal suggestions) unlike "community". The default source. See
 * docs/CALCULATIONS.md, "Community population" and "Balanced source". */
type PopulationSource = "tournament" | "community" | "simulator" | "balanced";
type CollectionMode = "all" | "prioritize" | "owned-only";

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
  synergyReadiness,
  dependencyReadiness,
  newReleaseCards,
  compositionWinRateData,
  onAddCard,
  decayReport,
}: {
  lines: { name: string; quantity: number }[];
  mainLines: { name: string; quantity: number }[];
  cardsByName: ReturnType<typeof useCardsByNames>;
  catalogByName: Map<string, Card>;
  synergyReadiness: SynergyReadiness[];
  dependencyReadiness: DependencyReadiness[];
  newReleaseCards: NewReleaseCard[];
  compositionWinRateData: CompositionWinRateData | undefined;
  onAddCard: (name: string) => void;
  decayReport: CardDecayReport | null;
}) {
  const composition = useMemo(() => computeDeckComposition(lines, cardsByName), [lines, cardsByName]);
  const memoryCurve = useMemo(() => computeMemoryCostCurve(lines, cardsByName), [lines, cardsByName]);
  const reserveCurve = useMemo(() => computeReserveCostCurve(lines, cardsByName), [lines, cardsByName]);
  const compositionGaps = useMemo(
    () => computeCompositionGaps(mainLines, cardsByName, compositionWinRateData),
    [mainLines, cardsByName, compositionWinRateData],
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
                    <span className="font-semibold text-ctp-red">−{(signal.decay * 100).toFixed(1)}%</span>
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

      {newReleaseCards.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">New from {newReleaseCards[0].setName}</h2>
            <span className="text-[10px] text-ctp-subtext0">{newReleaseCards[0].releaseDate}</span>
          </div>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Cards from the newest set with a designed connection — shared token economy, tribal reference, or named
            reference — to a card already in this build. Too new for tournament data, so this isn't ranked or
            scored, just worth a look.
          </p>
          <div className="mt-3 space-y-2">
            {newReleaseCards.map(({ card, combos }) => (
              <div key={card.name} className="rounded-md border border-ctp-surface1 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <CardHoverPreview image={card.editions[0]?.image} alt={card.name}>
                    <Link to={`/cards/${card.slug}`} className="font-semibold text-ctp-text hover:text-ctp-blue">
                      {card.name}
                    </Link>
                  </CardHoverPreview>
                  <button
                    type="button"
                    onClick={() => onAddCard(card.name)}
                    className="ml-auto rounded border border-ctp-blue/40 px-1.5 py-0.5 text-ctp-blue hover:bg-ctp-blue/10"
                  >
                    + Add
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-1 text-[11px] text-ctp-subtext0">
                  {combos.map((combo) => (
                    <span key={`${combo.with.uuid}-${combo.via}`}>
                      combos with{" "}
                      <Link to={`/cards/${combo.with.slug}`} className="text-ctp-subtext1 hover:text-ctp-blue">
                        {combo.with.name}
                      </Link>{" "}
                      via {combo.via}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
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

function ToolsPanel({
  rating,
  mainLines,
  materialLines,
  catalogByName,
  pillarBias,
  onPillarBiasChange,
  archetypeId,
  archetypeOptions,
  onArchetypeChange,
  championLevelCap,
  onChampionLevelCapChange,
  validation,
  unresolvedMain,
  deckFormat,
  populationSource,
  onChangePopulationSource,
  collectionMode,
  onCollectionModeChange,
}: {
  rating: DeckRating;
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
  pillarBias: RatingPillar | null;
  onPillarBiasChange: (pillar: RatingPillar | null) => void;
  archetypeId: string | null;
  archetypeOptions: ArchetypeTuningOption[];
  onArchetypeChange: (archetypeId: string | null) => void;
  championLevelCap: number | null;
  onChampionLevelCapChange: (cap: number | null) => void;
  validation: DeckValidationResult;
  unresolvedMain: number;
  deckFormat: DeckFormat;
  populationSource: PopulationSource;
  onChangePopulationSource: (source: PopulationSource, label: string) => void;
  collectionMode: CollectionMode;
  onCollectionModeChange: (mode: CollectionMode) => void;
}) {
  return (
    <div className="mt-6">
      <div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">DIAO Score</h2>
          <span className="text-2xl font-bold text-ctp-blue">{rating.composite.toFixed(2)}</span>
        </div>
        <div className="mt-3 space-y-2">
          {(["durability", "interaction", "aggro", "opportunity"] as RatingPillar[]).map((pillar) => (
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

      <details className={`mt-4 rounded-md border px-3 py-2 text-sm ${validation.status === "Legal" ? "border-ctp-green" : validation.status === "Illegal" ? "border-ctp-red" : "border-ctp-yellow"}`}>
        <summary className="flex cursor-pointer items-center justify-between gap-3">
          <span className="font-semibold">{validation.status === "Incomplete" && unresolvedMain > 0 ? `${unresolvedMain} main-deck slots remaining` : validation.status}</span>
          <span className="text-xs font-normal text-ctp-subtext0">View validation</span>
        </summary>
        {validation.reasons.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-ctp-subtext1">{validation.reasons.slice(0, 8).map((reason) => <li key={reason}>{reason}</li>)}</ul>}
        <p className="mt-2 text-xs text-ctp-subtext0">Standard construction checks only; not tournament certification.</p>
      </details>

      <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Tuning</h2>
        <p className="mt-1 text-xs text-ctp-subtext0">
          Bias the Build tab's ranked suggestions toward one DIAO Score pillar — a small nudge among cards that
          already clear the real win-rate bar, never a filter or override, so it never surfaces a card the data
          doesn't support. Applies to Tournament and Balanced data only; Community decks carry no win rates to bias.
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
        <div className="mt-4 border-t border-ctp-surface1 pt-3">
          <label htmlFor="archetype-inspiration" className="text-xs font-semibold text-ctp-subtext1">
            Build path
          </label>
          <select
            id="archetype-inspiration"
            value={archetypeId ?? ""}
            onChange={(e) => onArchetypeChange(e.target.value || null)}
            disabled={deckFormat !== "STANDARD" || archetypeOptions.length === 0}
            className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs text-ctp-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">None — use the full Champion/Spirit evidence</option>
            {archetypeOptions.map((option) => {
              const isEstablished = option.confidence === "established";
              return (
                <option key={option.id} value={option.id}>
                  {option.routeName} → {option.name}
                  {isEstablished ? ` · ${option.deckCount} established decks` : ` · ${option.deckCount} emerging build`}
                  {option.routeDeckCount > 0 && ` (${option.routeDeckCount} route matches)`}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-[11px] text-ctp-subtext0">
            {deckFormat !== "STANDARD"
              ? "Archetype taxonomy is based on Standard tournament decklists."
              : populationSource === "community" || populationSource === "simulator"
                ? "Your choice is saved, but only affects Tournament and Balanced suggestions."
                : "Filters suggestions to decks matching this archetype's card combinations. Your Spirit selection still remains a hard boundary."}
          </p>
          <p className="mt-0.5 text-[10px] text-ctp-subtext1">
            An archetype groups decks that run similar card combinations. The "route" represents a specific play pattern within the archetype. Selecting an archetype filters suggestions toward cards commonly run in that build path.
          </p>
        </div>
        <div className="mt-4 border-t border-ctp-surface1 pt-3">
          <label htmlFor="champion-level-cap" className="text-xs font-semibold text-ctp-subtext1">Champion progression</label>
          <select
            id="champion-level-cap"
            value={championLevelCap ?? ""}
            onChange={(e) => onChampionLevelCapChange(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs text-ctp-text"
          >
            <option value="">Auto — use this evidence pool&apos;s common progression</option>
            <option value="1">Level 1 only</option>
            <option value="2">Up to Level 2</option>
            <option value="3">Up to Level 3</option>
          </select>
          <p className="mt-1 text-[11px] text-ctp-subtext0">This controls which Champion levels are proposed. Remove a proposed print to reject that specific version; choose a lower cap to omit higher levels entirely.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-start gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Data source</span>
        <p className="text-xs text-ctp-subtext0 max-w-xs">
          {populationSource === "tournament"
            ? "Real tournament win-rate data. Most reliable for meta analysis."
            : populationSource === "balanced"
              ? "Tournament win rates nudged by community popularity. Good all-rounder."
              : populationSource === "community"
                ? "Community popularity (Shout At Your Decks). No win/loss data, just play frequency."
                : "Simulator (Experimental). Community-built legal shell with card-level evidence."}
          {collectionMode === "owned-only" && " Suggestions are limited to cards in your collection."}
        </p>
        <div role="group" aria-label="Data source" className="inline-flex max-w-full flex-wrap rounded-md border border-ctp-surface1 bg-ctp-base p-0.5">
          <button
            type="button"
            aria-pressed={collectionMode === "owned-only"}
            onClick={() => onCollectionModeChange("owned-only")}
            className={`rounded px-3 py-1 text-xs font-medium ${collectionMode === "owned-only" ? "bg-ctp-green text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}
          >
            My collection
          </button>
          <button
            type="button"
            aria-pressed={populationSource === "balanced"}
            onClick={() => onChangePopulationSource("balanced", "Balanced")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              populationSource === "balanced" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Balanced
          </button>
          <button
            type="button"
            aria-pressed={populationSource === "tournament"}
            onClick={() => onChangePopulationSource("tournament", "Tournament")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              populationSource === "tournament" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Tournament
          </button>
          <button
            type="button"
            aria-pressed={populationSource === "community"}
            onClick={() => onChangePopulationSource("community", "Community")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              populationSource === "community" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Community
          </button>
          {deckFormat === "STANDARD" && <button
            type="button"
            aria-pressed={populationSource === "simulator"}
            onClick={() => onChangePopulationSource("simulator", "Simulator")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              populationSource === "simulator" ? "bg-ctp-mauve text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Simulator <span className="font-normal">(Experimental)</span>
          </button>}
        </div>
      </div>

      <HypergeometricCalculator mainLines={mainLines} materialLines={materialLines} catalogByName={catalogByName} />
    </div>
  );
}

function CardRow({
  card,
  onToggleLock,
  onRemove,
  onDismiss,
  onChangeQuantity,
  cardsByName,
  priceByName,
  showLockToggle = true,
  communityInclusion,
  communityMode = false,
  simulatorEvidence,
  visibleFields,
  needsReview = false,
}: {
  card: SuggestedCard;
  onToggleLock: () => void;
  onRemove: () => void;
  onDismiss?: () => void;
  /** User-choice quantities are editable; recommendation-owned quantities remain derived from the ranking. */
  onChangeQuantity?: (quantity: number) => void;
  cardsByName: ReturnType<typeof useCardsByNames>;
  priceByName: Map<string, number>;
  showLockToggle?: boolean;
  /** % of blended community decks (Shout At Your Decks + Sleeved, for this Champion) that include this card — a second, clearly-separate data point, never blended into adjustedLift. */
  communityInclusion?: Map<string, CardInclusionEntry>;
  /** True when `card` came from useCommunitySuggestedBuild — an unlocked card here was placed by
   * popularity, not chosen by the viewer, so the no-lift fallback badge shouldn't say "your choice". */
  communityMode?: boolean;
  /** Sample-gated Clarent telemetry for this card, only supplied in the experimental source. */
  simulatorEvidence?: SimulatorCardEvidence;
  /** Which optional data fields (Cost/Price/Win rate/Sample size/Community usage) to render — the viewer's own Customize panel preference. */
  visibleFields: CardFieldVisibility;
  /** Marks a placed card that has a data-backed cut recommendation in the Review tab. */
  needsReview?: boolean;
}) {
  const cardInfo = cardsByName.get(card.cardName);
  const unitPrice = priceByName.get(card.cardName);
  const maxQuantity = Math.max(1, Math.min(cardInfo?.legality?.STANDARD?.limit ?? 4, 4));
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
      {visibleFields.cost && cardInfo && cardInfo.cost.type !== "none" && cardInfo.cost.value !== null && (
        <span className="flex shrink-0 items-center gap-0.5 text-xs text-ctp-subtext0">
          <CostIcon kind={cardInfo.cost.type} size={12} />
          {cardInfo.cost.value}
        </span>
      )}
      {visibleFields.price && unitPrice !== undefined && <span className="shrink-0 text-xs text-ctp-subtext0">{formatUsd(unitPrice * card.quantity)}</span>}
      {visibleFields.winRate && (card.adjustedLift !== null ? (
        <span className={`text-xs font-semibold ${card.adjustedLift >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
          {card.adjustedLift >= 0 ? "+" : ""}
          {(card.adjustedLift * 100).toFixed(1)}%
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
      ))}
      {visibleFields.sample && card.sample && <span className="text-xs text-ctp-subtext0">({card.sample.with} vs {card.sample.without})</span>}
      {simulatorEvidence && <span className="text-xs text-ctp-mauve" title="Anonymous Clarent simulator telemetry; experimental and not Champion-scoped">
        {simulatorEvidence.games} sim game{simulatorEvidence.games === 1 ? "" : "s"}{simulatorEvidence.winRate === null ? "" : ` · ${(simulatorEvidence.winRate * 100).toFixed(0)}% wins`}
      </span>}
      {visibleFields.community && communityInclusion?.get(card.cardName) && (
        <span className="text-xs text-ctp-mauve" title="Share of community decks for this Champion that include this card">
          {Math.round(communityInclusion.get(card.cardName)!.percentOfDecks * 100)}% brewed
        </span>
      )}
      {needsReview && <span className="rounded-full border border-ctp-yellow/60 bg-ctp-yellow/10 px-1.5 text-[10px] font-medium text-ctp-yellow">Review</span>}
      <div className="ml-auto flex shrink-0 gap-1.5">
        {showLockToggle && (
          <button
            type="button"
            onClick={onToggleLock}
            className={`rounded-md border px-2 py-1 text-xs ${
              card.locked ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {card.locked ? "Kept" : "Keep"}
          </button>
        )}
        <button type="button" onClick={onRemove} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-red">
          Remove
        </button>
        {onDismiss && <button type="button" onClick={onDismiss} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text">Dismiss</button>}
      </div>
    </li>
  );
}

/** Not-yet-placed ranked cards ("cards that might help") — same info as CardRow but a single "Add" action instead of Lock/Remove, since these aren't in the build at all yet. */
function DiaoMetricBadges({ card }: { card: SuggestedCard }) {
  const changes = Object.entries(card.diaoMetricChanges ?? {}) as [RatingPillar, number][];
  return changes
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([pillar, delta]) => (
      <span
        key={pillar}
        className={`rounded-full border px-1.5 text-[10px] font-medium ${delta > 0 ? "border-ctp-mauve/50 bg-ctp-mauve/10 text-ctp-mauve" : "border-ctp-yellow/50 bg-ctp-yellow/10 text-ctp-yellow"}`}
        title={`Projected ${pillar} pillar-point change from adding ${card.quantity}x ${card.cardName}; separate from observed win rate`}
      >
        {pillar[0].toUpperCase() + pillar.slice(1)} {delta > 0 ? "+" : ""}{delta.toFixed(2)}
      </span>
    ));
}

function SuggestionRow({
  card,
  onAdd,
  onDismiss,
  cardsByName,
  priceByName,
  communityInclusion,
  simulatorEvidence,
  visibleFields,
}: {
  card: SuggestedCard;
  onAdd: () => void;
  onDismiss?: () => void;
  cardsByName: ReturnType<typeof useCardsByNames>;
  priceByName: Map<string, number>;
  communityInclusion?: Map<string, CardInclusionEntry>;
  simulatorEvidence?: SimulatorCardEvidence;
  /** Which optional data fields (Price/Win rate/Sample size/Community usage) to render — the viewer's own Customize panel preference. */
  visibleFields: CardFieldVisibility;
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
      {visibleFields.price && unitPrice !== undefined && <span className="shrink-0 text-xs text-ctp-subtext0">{formatUsd(unitPrice * card.quantity)}</span>}
      {visibleFields.winRate && card.adjustedLift !== null && (
        <span className={`text-xs font-semibold ${card.adjustedLift >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
          {card.adjustedLift >= 0 ? "+" : ""}
          {(card.adjustedLift * 100).toFixed(1)}%
        </span>
      )}
      {visibleFields.sample && card.sample && <span className="text-xs text-ctp-subtext0">({card.sample.with} vs {card.sample.without})</span>}
      {simulatorEvidence && <span className="text-xs text-ctp-mauve" title="Anonymous Clarent simulator telemetry; experimental and not Champion-scoped">
        {simulatorEvidence.games} sim game{simulatorEvidence.games === 1 ? "" : "s"}{simulatorEvidence.winRate === null ? "" : ` · ${(simulatorEvidence.winRate * 100).toFixed(0)}% wins`}
      </span>}
      {visibleFields.community && communityInclusion?.get(card.cardName) && (
        <span className="text-xs text-ctp-mauve" title="Share of community decks for this Champion that include this card">
          {Math.round(communityInclusion.get(card.cardName)!.percentOfDecks * 100)}% brewed
        </span>
      )}
      {card.readinessReasons?.map((reason) => (
        <span key={reason} className="rounded-full border border-ctp-teal/50 bg-ctp-teal/10 px-1.5 text-[10px] font-medium text-ctp-teal" title="Deterministic synergy-readiness signal; separate from observed win rate">
          {reason}
        </span>
      ))}
      <DiaoMetricBadges card={card} />
      <div className="ml-auto flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
        >
          Add
        </button>
        {onDismiss && <button type="button" onClick={onDismiss} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text">Dismiss</button>}
      </div>
    </li>
  );
}

export default function DeckBuilderIndex() {
  useDocumentTitle(
    "Guided Deck Builder",
    "Build a Grand Archive deck from tournament win-rate, blended community-usage, or balanced recommendations, then tune, validate, share, buy, export, or playtest it.",
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const improveDeckId = searchParams.get("improveDeck");
  const isImproving = Boolean(improveDeckId);
  const intentParam = searchParams.get("intent");
  const builderIntent: BuilderIntent | null = intentParam === "seed" || intentParam === "scratch" ? intentParam : null;
  const [deckFormat, setDeckFormat] = useState<DeckFormat>(() => searchParams.get("format")?.toUpperCase() === "PANTHEON" ? "PANTHEON" : "STANDARD");
  // Computed fresh each render (cheap — parsing a couple of query params), but only its value on
  // the very first render actually matters: every useState below that reads from it only consults
  // its initializer once, on mount, same as React already guarantees for lazy useState.
  const urlSeed = parseUrlSeed(searchParams);
  // An explicit shared link always wins over a leftover session — someone opening a shared link
  // wants *that* state, not whatever this tab happened to have saved from before. Only consulted
  // once (mount), same as urlSeed itself — see loadSessionSeed's own doc comment for why a lazy
  // initializer, not an effect, is what avoids the reset-then-reseed race parseUrlSeed warns about.
  const sessionSeed = urlSeed ? null : loadSessionSeed();

  const [championName, setChampionName] = useState<string | null>(urlSeed?.championName ?? sessionSeed?.championName ?? null);
  const [spiritFilter, setSpiritFilter] = useState<string | null>(urlSeed?.spiritFilter ?? sessionSeed?.spiritFilter ?? null);
  const [spiritElement, setSpiritElement] = useState<string | null>(null);
  const [lockedCards, setLockedCards] = useState<Map<string, number>>(() => urlSeed?.lockedCards ?? sessionSeed?.lockedCards ?? new Map());
  // A private parking lot for cards worth testing later. Unlike locked cards, these do not feed
  // recommendations, totals, validation, exports, or saved decklists.
  const [maybeboard, setMaybeboard] = useState<Map<string, number>>(() => sessionSeed?.maybeboard ?? new Map());
  // Section a lock is known to belong to (from where it was locked, or from a pasted decklist's
  // own Main/Material headers) — see useSuggestedBuild's lockedSections param doc for why this
  // beats guessing from population presence for a card the current population barely plays.
  const [lockedSections, setLockedSections] = useState<Map<string, LockedSection>>(() => urlSeed?.lockedSections ?? sessionSeed?.lockedSections ?? new Map());
  const [rejectedCards, setRejectedCards] = useState<Set<string>>(() => sessionSeed?.rejectedCards ?? new Set());
  const [cardInput, setCardInput] = useState("");
  const [addDestination, setAddDestination] = useState<"automatic" | "sideboard" | "maybeboard">("automatic");
  /** Tuning: nudges useSuggestedBuild's ranking toward a chosen DIAO Score pillar (see its own
   * pillarBias doc comment) — null ("Balanced") reproduces the original unbiased lift-only order. */
  const [pillarBias, setPillarBias] = useState<RatingPillar | null>(sessionSeed?.pillarBias ?? null);
  const [archetypeId, setArchetypeId] = useState<string | null>(urlSeed?.archetypeId ?? sessionSeed?.archetypeId ?? null);
  const [championLevelCap, setChampionLevelCap] = useState<number | null>(null);
  /** Tuning: swaps the assembled suggestions between real Omnidex win-rate data and Shout At Your
   * Decks' community popularity data — see useCommunitySuggestedBuild's own doc comment. Defaults
   * to "balanced" (real tournament lift, nudged by community popularity) — see PopulationSource. */
  const [populationSource, setPopulationSource] = useState<PopulationSource>(sessionSeed?.populationSource ?? "balanced");
  const [collectionMode, setCollectionMode] = useState<CollectionMode>("all");
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>(sessionSeed?.changeLog ?? []);
  const [visibleFields, setVisibleField] = useCardFieldVisibility();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [dismissedReviewCards, setDismissedReviewCards] = useState<Set<string>>(new Set());
  const [showProtectedCuts, setShowProtectedCuts] = useState(false);
  const [tab, setTab] = useTabParam<BuilderTab>("tab", TAB_KEYS, "build");
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
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
  const lastResetChampionRef = useRef(urlSeed?.championName ?? sessionSeed?.championName ?? null);

  function chooseIntent(intent: BuilderIntent) {
    const next = new URLSearchParams(searchParams);
    next.set("intent", intent);
    next.set("tab", "build");
    setSearchParams(next, { replace: true });
  }

  const popularityIndexData = useDeckPopularityIndexData();
  // Debounced against the catalog sync's own write batches (app/src/lib/sync/cards.ts writes ~50
  // cards per bulkPut, and useCardCatalog's useLiveQuery emits a new array on every one) — same
  // CATALOG_SETTLE_MS reasoning as useAllDecodedDecks/useSuggestedBuild, needed here too since
  // catalogByName feeds Champion/Spirit identity and legality checks,
  // all of which would otherwise recompute (and re-render the whole page) on every sync write.
  const cardCatalog = useDebouncedValue(useCardCatalog(), 500);
  const catalogByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);
  const spiritCanonicalNames = useMemo(() => buildSpiritCanonicalNames(cardCatalog), [cardCatalog]);
  // Shared links and pasted decks can name a cosmetic equivalent. Store the canonical Spirit so
  // it uses the same population as the picker (Miao, Spirit of Water = Spirit of Water).
  useEffect(() => {
    if (!spiritFilter) return;
    const canonical = spiritCanonicalNames.get(spiritFilter);
    if (canonical && canonical !== spiritFilter) setSpiritFilter(canonical);
  }, [spiritFilter, spiritCanonicalNames]);
  useEffect(() => {
    const refreshCollection = () => { void accountApi.collection().then((result) => setCollection(result.entries)).catch(() => undefined); };
    refreshCollection();
    window.addEventListener("fanofin:collection-updated", refreshCollection);
    return () => window.removeEventListener("fanofin:collection-updated", refreshCollection);
  }, []);
  const collectionOwnedByName = useMemo(() => new Map(collection.map((entry) => [entry.cardName, entry.ownedQuantity])), [collection]);
  const collectionRejectedCards = useMemo(() => {
    if (collectionMode !== "owned-only") return rejectedCards;
    const next = new Set(rejectedCards);
    for (const card of cardCatalog) if ((collectionOwnedByName.get(card.name) ?? 0) === 0 && !lockedCards.has(card.name)) next.add(card.name);
    return next;
  }, [collectionMode, rejectedCards, cardCatalog, collectionOwnedByName, lockedCards]);
  // "default" pool's population — this Champion's decks, further narrowed by the Spirit dropdown
  // inside useSuggestedBuild itself (pool 1/2 combined; there's no separate state for them, since
  // the existing Spirit dropdown's own "Any Spirit" option already covers pool 2).
  const { rows, spiritsPresent, loading: populationLoading } = useDeckBuilderPopulation(championName);
  const cardQuantityStatsData = useCardQuantityStatsData();
  const compositionWinRateData = useCompositionWinRateData();
  const archetypeTaxonomyData = useArchetypeTaxonomyData();
  const archetypeOptions = useMemo((): ArchetypeTuningOption[] => {
    if (!championName || !archetypeTaxonomyData) return [];
    return archetypeTaxonomyData.clusters
      .filter((cluster) => cluster.championName === championName || (cluster.championBreakdown ?? []).some((entry) => entry.championName === championName))
      .map((cluster) => {
        const route = archetypeTaxonomyData.materialArchetypes?.find((candidate) => candidate.id === cluster.materialArchetypeId);
        return {
          id: cluster.id,
          name: cluster.name,
          routeName: route?.name ?? cluster.championName,
          routeDeckCount: route?.deckCount ?? cluster.deckCount,
          deckCount: cluster.deckCount,
          confidence: cluster.confidence ?? "established",
        };
      })
      .sort((a, b) => Number(b.confidence === "established") - Number(a.confidence === "established") || b.deckCount - a.deckCount || a.name.localeCompare(b.name));
  }, [championName, archetypeTaxonomyData]);
  const selectedArchetype = useMemo(
    () => archetypeOptions.some((option) => option.id === archetypeId)
      ? archetypeTaxonomyData?.clusters.find((cluster) => cluster.id === archetypeId)
      : undefined,
    [archetypeTaxonomyData, archetypeId, archetypeOptions],
  );
  const archetypePrevalence = useMemo(() => {
    if (!selectedArchetype) return undefined;
    return new Map(selectedArchetype.definingCards.map((card) => [card.name, card.prevalence]));
  }, [selectedArchetype]);
  // A selected build path is evidence, not merely decoration: keep the original Champion pool
  // but use only the path's observed decks for tournament/balanced recommendations. A Spirit
  // selection below further narrows that path, preventing a broad family from mixing Spirits.
  const recommendationRows = useMemo(() => {
    if (!selectedArchetype) return rows;
    const deckIds = new Set(selectedArchetype.deckIds);
    return rows.filter((row) => deckIds.has(row.deckId));
  }, [rows, selectedArchetype]);
  // Similar real decks become useful only once the viewer has expressed enough intent through
  // locks. Keep the expensive all-deck decode off the default path until then.
  const showNearestDecks = lockedCards.size >= 2;
  const { decks: allDecks } = useAllDecodedDecks(showNearestDecks);

  // Resolved against the *stable* single-Champion population (`rows`, not whichever pool is
  // active) — see `useSuggestedBuild`'s `championCardOverride` doc comment for why this matters
  // once a cross-Champion pool is in play: without it, the Champion-print anchor and granted
  // elements would be guessed from whichever Champion happens to be common in a borrowed
  // population, not the one the viewer actually picked.
  const championCard = useMemo(() => findChampionCard(recommendationRows, lockedCards, catalogByName), [recommendationRows, lockedCards, catalogByName]);
  const spiritCardForIdentity = spiritFilter ? catalogByName.get(spiritFilter) : undefined;
  const identityElements = useMemo(
    () => computeIdentityElements(championCard, spiritCardForIdentity),
    [championCard, spiritCardForIdentity],
  );

  const blendedCommunityCardInclusion = useCommunityBlendedCardInclusion(deckFormat);
  const standaloneCommunityCardInclusion = useCommunityCardInclusion(deckFormat);
  // A partial community refresh can temporarily contain only unclassified Sleeved lists and thus
  // no champion groups. Keep Champion-scoped tools usable with the latest standalone
  // ShoutAtYourDecks population until a complete blended generation is published.
  const communityCardInclusion = blendedCommunityCardInclusion && Object.keys(blendedCommunityCardInclusion.byChampion).length > 0
    ? blendedCommunityCardInclusion
    : standaloneCommunityCardInclusion;
  const communityChampData = useMemo(() => {
    if (!communityCardInclusion || !championName) return undefined;
    return communityCardInclusion.byChampion[championToSlug(championName)];
  }, [communityCardInclusion, championName]);
  const communityInclusionByName = useMemo(() => {
    if (!communityChampData) return undefined;
    return new Map(communityChampData.cards.map((c) => [c.name, c]));
  }, [communityChampData]);
  const communityLockedCards = useMemo(() => {
    if (deckFormat !== "PANTHEON" || !spiritFilter) return lockedCards;
    const next = new Map(lockedCards);
    next.set(spiritFilter, 1);
    return next;
  }, [deckFormat, spiritFilter, lockedCards]);

  // Computed here (rather than down with sortedSpirits/spiritStats below) so its top signals can
  // feed the "balanced" source's decay nudge right below — see DECAY_PENALTY_WEIGHT's doc comment.
  const decayReport = useMemo(
    () => computeCardDecay(recommendationRows, spiritFilter, catalogByName),
    [recommendationRows, spiritFilter, catalogByName],
  );
  const decayingCardBoost = useMemo(
    () => (decayReport ? new Map(decayReport.signals.map((s) => [s.cardName, s.decay])) : undefined),
    [decayReport],
  );

  const tournamentBuild = useSuggestedBuild(
    recommendationRows,
    spiritFilter,
    lockedCards,
    collectionRejectedCards,
    populationLoading,
    lockedSections,
    cardQuantityStatsData,
    undefined,
    pillarBias,
    undefined,
    undefined,
    archetypePrevalence,
    collectionOwnedByName,
    collectionMode,
    championLevelCap,
  );
  // Same real tournament ranking as tournamentBuild above, plus a community-popularity nudge and a
  // decay penalty — see COMMUNITY_BOOST_WEIGHT's and DECAY_PENALTY_WEIGHT's doc comments. Computed
  // unconditionally (same pattern as tournamentBuild/communityBuild/simulatorResult below) so
  // switching sources doesn't need a recompute.
  const balancedBuild = useSuggestedBuild(
    recommendationRows,
    spiritFilter,
    lockedCards,
    collectionRejectedCards,
    populationLoading,
    lockedSections,
    cardQuantityStatsData,
    undefined,
    pillarBias,
    communityInclusionByName,
    decayingCardBoost,
    archetypePrevalence,
    collectionOwnedByName,
    collectionMode,
    championLevelCap,
  );
  const communityBuild = useCommunitySuggestedBuild(communityChampData, communityLockedCards, lockedSections, collectionRejectedCards, catalogByName, !communityCardInclusion, identityElements, deckFormat);
  const simulatorSummary = useSimulatorSummaryData();
  const simulatorResult = useSimulatorSuggestedBuild(communityBuild, simulatorSummary, cardCatalog);
  const effectivePopulationSource: PopulationSource = deckFormat === "PANTHEON" ? "community" : populationSource;
  const rawBuild =
    effectivePopulationSource === "community"
      ? communityBuild
      : effectivePopulationSource === "simulator"
        ? simulatorResult.build
        : effectivePopulationSource === "balanced"
          ? balancedBuild
          : tournamentBuild;
  const build = useMemo(() => {
    if (collectionMode !== "owned-only") return rawBuild;
    const cap = (cards: SuggestedCard[]) => cards.flatMap((card) => {
      if (card.locked) return [card];
      const quantity = Math.min(card.quantity, collectionOwnedByName.get(card.cardName) ?? 0);
      return quantity > 0 ? [{ ...card, quantity }] : [];
    });
    const material = cap(rawBuild.material); const main = cap(rawBuild.main); const sideboard = cap(rawBuild.sideboard);
    return {
      ...rawBuild,
      material,
      main,
      sideboard,
      suggestions: cap(rawBuild.suggestions),
      unresolved: {
        main: rawBuild.unresolved.main + rawBuild.main.reduce((sum, card) => sum + card.quantity, 0) - main.reduce((sum, card) => sum + card.quantity, 0),
        material: rawBuild.unresolved.material + rawBuild.material.reduce((sum, card) => sum + card.quantity, 0) - material.reduce((sum, card) => sum + card.quantity, 0),
        sideboard: rawBuild.unresolved.sideboard + rawBuild.sideboard.reduce((sum, card) => sum + card.quantity, 0) - sideboard.reduce((sum, card) => sum + card.quantity, 0),
      },
    };
  }, [rawBuild, collectionMode, collectionOwnedByName]);

  const reviewSuggestions = useMemo(
    () => build.suggestions.filter((card) => !dismissedReviewCards.has(card.cardName)),
    [build.suggestions, dismissedReviewCards],
  );
  const reviewRemovals = useMemo(
    () => [...build.removalSuggestions, ...(showProtectedCuts ? build.protectedRemovalSuggestions : [])]
      .filter((card) => !dismissedReviewCards.has(card.cardName)),
    [build.removalSuggestions, build.protectedRemovalSuggestions, dismissedReviewCards, showProtectedCuts],
  );
  const reviewGroups = useMemo(() => {
    const available = [...reviewSuggestions];
    const pairs: { removal: SuggestedCard; addition: SuggestedCard }[] = [];
    const unpairedRemovals: SuggestedCard[] = [];
    for (const removal of reviewRemovals) {
      const contextualName = removal.contextualReplacement?.cardName;
      const matchIndex = contextualName
        ? available.findIndex((addition) => addition.cardName === contextualName)
        : available.findIndex((addition) => addition.section === removal.section);
      if (matchIndex < 0) unpairedRemovals.push(removal);
      else pairs.push({ removal, addition: available.splice(matchIndex, 1)[0] });
    }
    return { pairs, unpairedRemovals, unpairedSuggestions: available };
  }, [reviewRemovals, reviewSuggestions]);
  const reviewItemCount = reviewGroups.pairs.length + reviewGroups.unpairedRemovals.length + reviewGroups.unpairedSuggestions.length;
  const reviewRemovalNames = useMemo(() => new Set(reviewRemovals.map((card) => card.cardName)), [reviewRemovals]);

  // A dismissal belongs to the current recommendation lens. Changing the Spirit, source, or
  // tuning can produce materially different evidence for the same card, so surface it again.
  useEffect(() => {
    setDismissedReviewCards(new Set());
    setShowProtectedCuts(false);
  }, [championName, spiritFilter, effectivePopulationSource, pillarBias, archetypeId]);

  const nearestDecks = useNearestDecks(allDecks, lockedCards);
  const gateLoading = deckFormat === "PANTHEON"
    ? !communityCardInclusion
    : effectivePopulationSource === "community"
      ? !communityCardInclusion
      : effectivePopulationSource === "simulator"
        ? !communityCardInclusion || !simulatorSummary
        : populationLoading;
  const gateHasData = deckFormat === "PANTHEON" || effectivePopulationSource === "community" || effectivePopulationSource === "simulator"
    ? Boolean(communityChampData)
    : rows.length > 0;

  const spiritStats = useMemo(() => {
    const stats = new Map<string, { decks: number }>();
    for (const spirit of spiritsPresent) {
      const matching = rows.filter((row) => row.spiritName === spirit);
      stats.set(spirit, { decks: matching.length });
    }
    return stats;
  }, [rows, spiritsPresent]);
  const sortedSpirits = useMemo(
    () => [...spiritsPresent].sort((a, b) => (spiritStats.get(b)?.decks ?? 0) - (spiritStats.get(a)?.decks ?? 0) || a.localeCompare(b)),
    [spiritsPresent, spiritStats],
  );
  const spiritElements = useMemo(
    () => Array.from(new Set(sortedSpirits.flatMap((name) => catalogByName.get(name)?.elements ?? [])))
      .filter((element) => element !== "NORM")
      .sort(),
    [sortedSpirits, catalogByName],
  );
  const spiritsForElement = useMemo(
    () => spiritElement ? sortedSpirits.filter((name) => catalogByName.get(name)?.elements.includes(spiritElement)) : sortedSpirits,
    [spiritElement, sortedSpirits, catalogByName],
  );
  function spiritOptionLabel(name: string): string {
    const stats = spiritStats.get(name);
    if (!stats) return name;
    return `${name} — ${stats.decks} ${stats.decks === 1 ? "deck" : "decks"}`;
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
  // Buddy Cards' own exclusion set — everything actually in the deck, plus everything already
  // recommended under "Cards that might help" (build.suggestions). Not the same as allNames (the
  // real decklist used for price/export/etc.): a card only suggested, not yet added, shouldn't be
  // hidden from the export, but showing it again as a "buddy" is redundant with a suggestion the
  // tool is already making through the ranked lens.
  const placedNames = useMemo(
    () => new Set([...allNames, ...build.suggestions.map((c) => c.cardName)]),
    [allNames, build.suggestions],
  );
  const buddyCards = useBuddyCards(rows, spiritFilter, lockedCards, placedNames);
  const blendedCommunityCoOccurrence = useCommunityBlendedCoOccurrence(deckFormat);
  const standaloneCommunityCoOccurrence = useCommunityCoOccurrence(deckFormat);
  const communityCoOccurrence = blendedCommunityCoOccurrence && Object.keys(blendedCommunityCoOccurrence.byChampion).length > 0
    ? blendedCommunityCoOccurrence
    : standaloneCommunityCoOccurrence;
  const communityBuddyCards = useMemo(() => {
    const result = new Map<string, CommunityCoOccurrenceEntry[]>();
    if (!communityCoOccurrence || !championName) return result;
    const champData = communityCoOccurrence.byChampion[championToSlug(championName)];
    if (!champData) return result;
    // Same exclusion as useBuddyCards's own excludeNames — a card already in the assembled build
    // isn't a useful "buddy" suggestion (there's nowhere to add it).
    for (const name of lockedCards.keys()) result.set(name, (champData[name] ?? []).filter((b) => !placedNames.has(b.cardName)));
    return result;
  }, [communityCoOccurrence, championName, lockedCards, placedNames]);
  const buddyNames = useMemo(() => Array.from(buddyCards.values()).flatMap((list) => list.map((b) => b.cardName)), [buddyCards]);
  const suggestionNames = useMemo(() => build.suggestions.map((c) => c.cardName), [build.suggestions]);
  const cardsByName = useCardsByNames(useMemo(() => [...allNames, ...buddyNames, ...suggestionNames, ...maybeboard.keys()], [allNames, buddyNames, suggestionNames, maybeboard]));
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
        setSpiritElement(null);
        // A seed-card build intentionally starts with cards before its identity. Preserve those
        // choices while the user tries compatible Champions; all other workflows reset normally.
        if (builderIntent !== "seed") {
          setLockedCards(new Map());
          setLockedSections(new Map());
        }
        setMaybeboard(new Map());
        setRejectedCards(new Set());
        setDismissedReviewCards(new Set());
        setArchetypeId(null);
        setChangeLog([]);
      });
    }
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [championName, builderIntent]);

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
        next.delete("archetype");
        next.delete("locked");
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosaves this session on every meaningful state change — see loadSessionSeed's doc comment
  // for why (surviving a click-into-a-card-and-Back round trip). Deliberately excludes ephemeral
  // UI state (cardInput, pasteOpen/pasteText, tab — the last already survives via useTabParam's
  // own URL sync) since none of that is "my session," just in-progress typing/navigation.
  useEffect(() => {
    saveSessionSeed({ championName, spiritFilter, lockedCards, lockedSections, rejectedCards, pillarBias, archetypeId, populationSource, changeLog, maybeboard });
  }, [championName, spiritFilter, lockedCards, lockedSections, rejectedCards, pillarBias, archetypeId, populationSource, changeLog, maybeboard]);

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
    setSpiritFilter(detectedSpirit ? (spiritCanonicalNames.get(detectedSpirit) ?? detectedSpirit) : null);
    setLockedCards(newLocked);
    setLockedSections(newSections);
    setMaybeboard(new Map());
    setRejectedCards(new Set());
    setDismissedReviewCards(new Set());
    setChangeLog([]);
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;

    setPasteText("");
    setPasteError(null);
    setPasteOpen(false);
    setTab("review");
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
    setSpiritFilter(deck.spiritName ? (spiritCanonicalNames.get(deck.spiritName) ?? deck.spiritName) : null);
    setLockedCards(newLocked);
    setLockedSections(newSections);
    setMaybeboard(new Map());
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
          const removed = catalogByName.get(name);
          // Champion levels are a progression: removing level 2 must also remove any later
          // locked levels for that same Champion, otherwise the material deck is invalid.
          if (removed?.types.includes("CHAMPION") && !removed.subtypes.includes("SPIRIT") && removed.level !== null && removed.level !== undefined) {
            const identity = removed.name.split(",")[0].trim();
            for (const lockedName of next.keys()) {
              const candidate = catalogByName.get(lockedName);
              if (candidate?.types.includes("CHAMPION") && !candidate.subtypes.includes("SPIRIT") && candidate.level !== null && candidate.level !== undefined && candidate.level > removed.level && candidate.name.split(",")[0].trim() === identity) next.delete(lockedName);
            }
          }
          next.delete(name);
          return next;
        });
        setLockedSections((prev) => {
          const next = new Map(prev);
          const removed = catalogByName.get(name);
          if (removed?.types.includes("CHAMPION") && !removed.subtypes.includes("SPIRIT") && removed.level !== null && removed.level !== undefined) {
            const identity = removed.name.split(",")[0].trim();
            for (const lockedName of next.keys()) {
              const candidate = catalogByName.get(lockedName);
              if (candidate?.types.includes("CHAMPION") && !candidate.subtypes.includes("SPIRIT") && candidate.level !== null && candidate.level !== undefined && candidate.level > removed.level && candidate.name.split(",")[0].trim() === identity) next.delete(lockedName);
            }
          }
          next.delete(name);
          return next;
        });
      } else {
        setRejectedCards((prev) => new Set(prev).add(name));
      }
    });
  }

  function addCard(name: string) {
    if (!cardNameSet.has(name) || (lockedCards.has(name) && addDestination !== "maybeboard")) return;
    const card = cardCatalog.find((c) => c.name === name);
    // Champion/Regalia cards are Material-deck-only and capped at 1 copy there regardless of the
    // card's own UNIQUE/Standard limit (see useSuggestedBuild.ts's build-time precheck for the
    // real-data verification) — computed here too so the stored quantity starts correct instead of
    // only getting clamped once the build assembles.
    const isMaterialOnly = card ? card.types.includes("CHAMPION") || card.types.includes("REGALIA") : false;
    const defaultQty = isMaterialOnly ? 1 : 4;
    const currentSideboardPoints = build.sideboard.reduce(
      (sum, entry) => sum + entry.quantity * sideboardPointCost(catalogByName.get(entry.cardName)),
      0,
    );
    const fitsSideboard = currentSideboardPoints + defaultQty * sideboardPointCost(card) <= SIDEBOARD_POINT_BUDGET;
    if (addDestination === "maybeboard") {
      setMaybeboard((previous) => new Map(previous).set(name, defaultQty));
      setCardInput("");
      setAddDestination("automatic");
      return;
    }
    const placeInSideboard = addDestination === "sideboard" && fitsSideboard;
    pendingActionRef.current = { label: `Added ${name}`, subject: name };
    startTransition(() => {
      setLockedCards((prev) => {
        const next = new Map(prev);
        next.set(name, defaultQty);
        return next;
      });
      if (placeInSideboard) {
        setLockedSections((prev) => new Map(prev).set(name, "sideboard"));
      }
    });
    setCardInput("");
    setAddDestination("automatic");
  }

  function removeMaybeCard(name: string) {
    setMaybeboard((previous) => {
      const next = new Map(previous);
      next.delete(name);
      return next;
    });
  }

  function setMaybeQuantity(name: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    setMaybeboard((previous) => new Map(previous).set(name, Math.min(quantity, 4)));
  }

  function promoteMaybeCard(name: string) {
    const quantity = maybeboard.get(name);
    if (!quantity || lockedCards.has(name)) return;
    const card = catalogByName.get(name);
    const section: LockedSection = card?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ? "material" : "main";
    pendingActionRef.current = { label: `Added ${name} from maybeboard`, subject: name };
    startTransition(() => {
      setLockedCards((previous) => new Map(previous).set(name, quantity));
      setLockedSections((previous) => new Map(previous).set(name, section));
      setMaybeboard((previous) => {
        const next = new Map(previous);
        next.delete(name);
        return next;
      });
    });
  }

  /** "Add" from the "Cards that might help" list — same as toggleLock, just with the section/quantity the suggestion already carries instead of guessing. */
  function addSuggestion(card: SuggestedCard) {
    toggleLock(card.cardName, card.quantity, card.section);
  }

  function dismissReview(...cardNames: string[]) {
    setDismissedReviewCards((previous) => {
      const next = new Set(previous);
      for (const name of cardNames) next.add(name);
      return next;
    });
  }

  function applyRecommendationSwap(removal: SuggestedCard, addition: SuggestedCard) {
    pendingActionRef.current = { label: `Swapped ${removal.cardName} for ${addition.cardName}`, subject: null };
    startTransition(() => {
      setLockedCards((previous) => {
        const next = new Map(previous);
        next.delete(removal.cardName);
        next.set(addition.cardName, addition.quantity);
        return next;
      });
      setLockedSections((previous) => {
        const next = new Map(previous);
        next.delete(removal.cardName);
        next.set(addition.cardName, addition.section);
        return next;
      });
      setRejectedCards((previous) => new Set(previous).add(removal.cardName));
      setDismissedReviewCards((previous) => {
        const next = new Set(previous);
        next.add(removal.cardName);
        next.add(addition.cardName);
        return next;
      });
    });
  }

  /** Re-ranking the suggested build by switching data source or tuning bias is itself a
   * suggestion-changing action, same as locking/excluding a card — logged the same way so the
   * change log reflects what actually moved instead of only crediting direct card clicks. Guarded
   * on an actual value change so clicking the already-selected tab/pillar doesn't leave a stale
   * pendingActionRef for the next real change to pick up. */
  function changePopulationSource(source: PopulationSource, label: string) {
    if (source !== populationSource) pendingActionRef.current = { label: `Switched to ${label} data`, subject: null };
    setPopulationSource(source);
  }

  function changePillarBias(pillar: RatingPillar | null) {
    if (pillar !== pillarBias) {
      pendingActionRef.current = {
        label: pillar === null ? "Reset tuning to Balanced" : `Tuned toward ${pillar[0].toUpperCase()}${pillar.slice(1)}`,
        subject: null,
      };
    }
    setPillarBias(pillar);
  }

  function changeArchetype(archetype: string | null) {
    if (archetype !== archetypeId) {
      const selected = archetypeOptions.find((option) => option.id === archetype);
      pendingActionRef.current = {
        label: selected ? `Inspired by ${selected.name}` : "Removed archetype inspiration",
        subject: null,
      };
    }
    startTransition(() => setArchetypeId(archetype));
  }

  function changeChampionLevelCap(cap: number | null) {
    if (cap !== championLevelCap) {
      pendingActionRef.current = { label: cap === null ? "Restored automatic Champion progression" : `Set Champion progression through Level ${cap}`, subject: null };
    }
    startTransition(() => setChampionLevelCap(cap));
  }

  const mainTotal = build.main.reduce((sum, c) => sum + c.quantity, 0);
  const materialTotal = build.material.reduce((sum, c) => sum + c.quantity, 0);
  const sideboardTotal = build.sideboard.reduce((sum, c) => sum + c.quantity, 0);
  const selectedAddCard = cardNameSet.has(cardInput) && !lockedCards.has(cardInput)
    ? catalogByName.get(cardInput)
    : undefined;
  const selectedAddQuantity = selectedAddCard?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ? 1 : 4;
  const currentSideboardPoints = build.sideboard.reduce(
    (sum, card) => sum + card.quantity * sideboardPointCost(catalogByName.get(card.cardName)),
    0,
  );
  const selectedSideboardPoints = selectedAddCard ? selectedAddQuantity * sideboardPointCost(selectedAddCard) : 0;
  const canAddToSideboard = Boolean(selectedAddCard) && currentSideboardPoints + selectedSideboardPoints <= SIDEBOARD_POINT_BUDGET;
  const sideboardDestinationSelected = addDestination === "sideboard" && canAddToSideboard;
  // Deck price/Stats stay scoped to material+main — same "sideboard is situational tech, not part
  // of deck identity" convention as everywhere else in this codebase (Popular Decks, Archetypes,
  // etc.); sideboard gets its own separate price line below instead, matching DecklistView.tsx.
  const buildLines = useMemo(
    () => [...build.material, ...build.main].map((c) => ({ name: c.cardName, quantity: c.quantity })),
    [build.material, build.main],
  );
  const mainOnlyLines = useMemo(() => build.main.map((c) => ({ name: c.cardName, quantity: c.quantity })), [build.main]);
  const materialOnlyLines = useMemo(() => build.material.map((c) => ({ name: c.cardName, quantity: c.quantity })), [build.material]);
  const sideboardLines = useMemo(() => build.sideboard.map((c) => ({ name: c.cardName, quantity: c.quantity })), [build.sideboard]);

  // Lifted out of StatsPanel (rather than computed only when that tab is active) so a tab-label
  // badge can reflect these findings even while the user is looking at the Build tab — otherwise
  // discovery-worthy signals (a card decaying out of the meta, a new-set combo, an under-supported
  // package) stay invisible behind a tab most users never click.
  const preferredSuggestionNames = useMemo(() => build.suggestions.map((card) => card.cardName), [build.suggestions]);
  const synergyReadiness = useMemo(
    () => computeSynergyReadiness(mainOnlyLines, catalogByName, catalogByName.values(), identityElements, preferredSuggestionNames),
    [mainOnlyLines, catalogByName, identityElements, preferredSuggestionNames],
  );
  const dependencyReadiness = useMemo(
    () => computeDependencyReadiness(mainOnlyLines, catalogByName, catalogByName.values(), identityElements, preferredSuggestionNames),
    [mainOnlyLines, catalogByName, identityElements, preferredSuggestionNames],
  );
  const newReleaseCards = useMemo(() => {
    const includedNames = new Set(buildLines.map((line) => line.name));
    const deckCards = buildLines.map((line) => catalogByName.get(line.name)).filter((c): c is Card => c !== undefined);
    return computeNewReleaseCards(catalogByName.values(), deckCards, identityElements, includedNames);
  }, [buildLines, catalogByName, identityElements]);
  const statsSignalCount = buildLines.length === 0 ? 0 :
    (decayReport?.signals.length ?? 0) + newReleaseCards.length +
    synergyReadiness.filter((s) => s.recommendations.length > 0).length +
    dependencyReadiness.filter((d) => d.recommendations.length > 0).length;

  const decklist: OmnidexDecklist = useMemo(
    () => ({
      main: build.main.map((c) => ({ card: c.cardName, quantity: c.quantity })),
      material: build.material.map((c) => ({ card: c.cardName, quantity: c.quantity })),
      sideboard: build.sideboard.map((c) => ({ card: c.cardName, quantity: c.quantity })),
    }),
    [build.main, build.material, build.sideboard],
  );
  const keptDecklist: OmnidexDecklist = useMemo(() => ({
    main: build.main.filter((card) => card.locked).map((card) => ({ card: card.cardName, quantity: card.quantity })),
    material: build.material.filter((card) => card.locked).map((card) => ({ card: card.cardName, quantity: card.quantity })),
    sideboard: build.sideboard.filter((card) => card.locked).map((card) => ({ card: card.cardName, quantity: card.quantity })),
  }), [build.main, build.material, build.sideboard]);
  /** Link to `/compare` seeding the current in-progress build (as a `?custom=` deck) alongside one
   * real deck (as a `?add=eventId:player`, reusing `NearestDeck.deckId`'s existing format) — lets the
   * viewer see exactly where their build overlaps/diverges from a real result, not just the
   * similarity percentage `useNearestDecks` already scores it with. */
  function nearestDeckCompareLink(d: NearestDeck): string {
    const label = `${championName ?? "My build"}${spiritFilter ? ` (${spiritFilter})` : ""}`;
    const params = new URLSearchParams();
    params.set("add", d.deckId);
    params.set("custom", encodeCustomDecks([{ label, decklist, format: deckFormat }]));
    return `/compare?${params.toString()}`;
  }
  const validation = useMemo(
    () => validateDeck({ main: build.main, material: build.material, sideboard: build.sideboard }, catalogByName, identityElements, deckFormat),
    [build.main, build.material, build.sideboard, catalogByName, identityElements, deckFormat],
  );
  const deckIdentity = useMemo(() => computeDeckIdentity(buildLines, cardsByName), [buildLines, cardsByName]);
  const rating = useMemo(
    () => computeDeckRating(buildLines, cardsByName, championName, deckIdentity.classes),
    [buildLines, cardsByName, championName, deckIdentity.classes],
  );
  function resetBuilder(): void {
    // Clear the persisted snapshot as well as component state. This matters when the user resets
    // and immediately navigates away before React's autosave effect gets a chance to run.
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* storage can be unavailable */ }
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;
    skipNextResetRef.current = false;
    lastResetChampionRef.current = null;
    startTransition(() => {
      setChampionName(null);
      setSpiritFilter(null);
      setSpiritElement(null);
      setLockedCards(new Map());
      setLockedSections(new Map());
      setRejectedCards(new Set());
      setCardInput("");
      setAddDestination("automatic");
      setMaybeboard(new Map());
      setPillarBias(null);
      setArchetypeId(null);
      setPopulationSource("balanced");
      setChangeLog([]);
      setDismissedReviewCards(new Set());
      setShowProtectedCuts(false);
      setPasteOpen(false);
      setPasteText("");
      setPasteError(null);
    });
  }
  // Buying/exporting covers the whole deck including sideboard tech, same as DecklistView.tsx.
  const massEntryUrl = useMemo(() => buildTcgplayerMassEntryUrl([...buildLines, ...sideboardLines]), [buildLines, sideboardLines]);
  const clarentUrl = useMemo(() => buildClarentPlaytestUrl(decklist), [decklist]);
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
  const [copyState, setCopyState] = useState<"idle" | "full-copied" | "kept-copied" | "full-failed" | "kept-failed">("idle");
  const [shareCopyState, setShareCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [saveTitle, setSaveTitle] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [saveKeptOnly, setSaveKeptOnly] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "sign-in" | "failed">("idle");
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null);
  const fullCopyCount = [...build.main, ...build.material, ...build.sideboard].reduce((sum, card) => sum + card.quantity, 0);
  const keptCopyCount = [...build.main, ...build.material, ...build.sideboard]
    .filter((card) => card.locked)
    .reduce((sum, card) => sum + card.quantity, 0);
  const importedCardCount = Array.from(lockedCards.values()).reduce((sum, quantity) => sum + quantity, 0);
  const identityComplete = Boolean(championName && spiritFilter);
  const startingCardsComplete = isImproving ? importedCardCount > 0 : builderIntent === "seed" ? lockedCards.size > 0 : identityComplete;
  const buildComplete = identityComplete && mainTotal > 0;
  const reviewComplete = buildComplete && reviewItemCount === 0;
  const validationComplete = validation.status === "Legal";
  function focusBuilderStep(id: string, destination?: BuilderTab) {
    if (destination) setTab(destination);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const deckToSave = saveKeptOnly ? keptDecklist : decklist;
  const saveCopyCount = saveKeptOnly ? keptCopyCount : fullCopyCount;

  /** "Kept only" copies just the viewer's own choices (`card.locked`), skipping every
   * auto-suggested slot — for pasting a partial want-list rather than the full assembled deck. */
  async function handleCopy(keptOnly: boolean) {
    const source = keptOnly
      ? { main: build.main.filter((c) => c.locked), material: build.material.filter((c) => c.locked), sideboard: build.sideboard.filter((c) => c.locked) }
      : { main: build.main, material: build.material, sideboard: build.sideboard };
    const text = buildDecklistText({
      main: source.main.map((c) => ({ card: c.cardName, quantity: c.quantity })),
      material: source.material.map((c) => ({ card: c.cardName, quantity: c.quantity })),
      sideboard: source.sideboard.map((c) => ({ card: c.cardName, quantity: c.quantity })),
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(keptOnly ? "kept-copied" : "full-copied");
    } catch {
      setCopyState(keptOnly ? "kept-failed" : "full-failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  async function handleCopyAndOpen(url: string) {
    try {
      await copyDecklistAndOpen(buildDecklistText(decklist), url);
      setCopyState("full-copied");
    } catch {
      setCopyState("full-failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  /** Shares the Champion/Spirit/archetype/locked-cards *input*, not a snapshot of the assembled output —
   * opening the link re-runs the same suggestion logic, so it stays a live recipe rather than a
   * stale copy that drifts from the site's own numbers as data regenerates. */
  async function handleCopyShareLink() {
    const params = new URLSearchParams();
    if (championName) params.set("champion", championName);
    if (deckFormat === "PANTHEON") params.set("format", "pantheon");
    if (spiritFilter) params.set("spirit", spiritFilter);
    if (archetypeId) params.set("archetype", archetypeId);
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

  useEffect(() => {
    setSaveState("idle");
    setSavedDeckId(null);
  }, [decklist]);

  async function handleSaveToMyDecks() {
    if (!championName || saveCopyCount === 0) return;
    setSaveState("saving");
    try {
      if (improveDeckId) {
        await accountApi.createDeckVersion(improveDeckId, {
          format: deckFormat,
          championName,
          decklist: deckToSave,
          changeNote: saveNote.trim() || "Improved in Guided Deck Builder",
        });
        setSavedDeckId(improveDeckId);
        setSaveState("saved");
        return;
      }
      const result = await accountApi.saveDeck({
        title: saveTitle.trim() || `${championName} guided build`,
        format: deckFormat,
        championName,
        decklist: deckToSave,
        source: { provider: "manual", externalDeckId: crypto.randomUUID(), label: "Guided Deck Builder" },
      });
      setSavedDeckId(result.id);
      setSaveState("saved");
    } catch (reason) {
      setSaveState(reason instanceof AccountApiError && reason.status === 401 ? "sign-in" : "failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={isImproving ? "Improve your deck" : "Guided Deck Builder"}
        description={(
          isImproving
            ? <>Your saved list is the baseline. Review evidence-backed changes, keep only the ones you want, then save a new version when you are ready.</>
            : <>Start from a Champion, an Element, and a Spirit to generate a suggested deck from real decklists. You can also paste a list to tune cards you already have.</>
        )}
      />

      <nav className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3" aria-label="Guided deck-building steps">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Your deck-building path</p>
        <ol className="mt-2 grid gap-1 sm:grid-cols-5">
          {[
            { label: "Identity", summary: identityComplete ? `${championName} · ${spiritFilter}` : "Choose Champion and Spirit", complete: identityComplete, id: "deck-builder-identity" },
            { label: "Starting cards", summary: startingCardsComplete ? (isImproving ? `${importedCardCount} baseline cards` : builderIntent === "seed" ? `${lockedCards.size} cards locked` : "Fresh suggested shell") : "Choose your starting point", complete: startingCardsComplete, id: "deck-builder-starting" },
            { label: "Build", summary: buildComplete ? `${mainTotal} main cards` : "Shape your deck", complete: buildComplete, id: "deck-builder-panel-build", tab: "build" as BuilderTab },
            { label: "Review", summary: reviewComplete ? "Changes reviewed" : reviewItemCount > 0 ? `${reviewItemCount} changes to review` : "Review recommendations", complete: reviewComplete, id: "deck-builder-panel-review", tab: "review" as BuilderTab },
            { label: "Validate & save", summary: validationComplete ? "Ready to save" : validation.status, complete: validationComplete, id: "deck-builder-panel-copy", tab: "copy" as BuilderTab },
          ].map((step, index) => (
            <li key={step.label}>
              <button type="button" onClick={() => focusBuilderStep(step.id, step.tab)} className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors ${step.tab === tab ? "bg-ctp-blue/10" : "hover:bg-ctp-surface0"}`}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${step.complete ? "bg-ctp-green text-ctp-base" : step.tab === tab ? "bg-ctp-blue text-ctp-base" : "border border-ctp-surface1 text-ctp-subtext0"}`}>{step.complete ? "✓" : index + 1}</span>
                <span className="min-w-0"><span className="block text-xs font-semibold text-ctp-text">{step.label}</span><span className="mt-0.5 block truncate text-[10px] text-ctp-subtext0">{step.summary}</span></span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {!isImproving && <section className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" aria-labelledby="builder-start">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="builder-start" className="font-semibold text-ctp-text">What do you want to do?</h2>
            <p className="mt-1 text-sm text-ctp-subtext1">Pick a starting point. You can change direction without losing your current build.</p>
          </div>
          <Link to="/my-decks" className="text-sm text-ctp-blue hover:underline">Improve a saved deck →</Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Link to="/card-discovery" className="rounded-lg border border-ctp-surface1 bg-ctp-base p-3 text-left transition-colors hover:border-ctp-blue/60">
            <span className="text-sm font-semibold text-ctp-text">Find new cards</span>
            <span className="mt-1 block text-xs leading-5 text-ctp-subtext1">Explore new-release cards that connect to a Champion, Spirit, or cards you already play.</span>
          </Link>
          {BUILDER_INTENTS.map((intent) => <button
            key={intent.key}
            type="button"
            onClick={() => chooseIntent(intent.key)}
            aria-pressed={builderIntent === intent.key}
            className={`rounded-lg border p-3 text-left transition-colors ${builderIntent === intent.key ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 bg-ctp-base hover:border-ctp-blue/60"}`}
          >
            <span className={`text-sm font-semibold ${builderIntent === intent.key ? "text-ctp-blue" : "text-ctp-text"}`}>{intent.title}</span>
            <span className="mt-1 block text-xs leading-5 text-ctp-subtext1">{intent.description}</span>
          </button>)}
        </div>
        {builderIntent === "seed" && <p className="mt-3 rounded-md border border-ctp-green/40 bg-ctp-green/10 px-3 py-2 text-xs text-ctp-subtext1">Choose your Champion and Spirit, then add the cards you already want to play. They stay locked while recommendations fill the remaining slots.</p>}
        {builderIntent === "scratch" && <p className="mt-3 rounded-md border border-ctp-blue/40 bg-ctp-blue/10 px-3 py-2 text-xs text-ctp-subtext1">Choose a Champion, Element, and Spirit to generate an evidence-backed shell. Use the Review tab to decide which changes to keep.</p>}
      </section>}

      {isImproving && <section className="mt-4 rounded-xl border border-ctp-blue/40 bg-ctp-blue/10 p-4" aria-labelledby="improvement-workflow">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="improvement-workflow" className="font-semibold text-ctp-blue">Improvement review</h2>
            <p className="mt-1 text-sm text-ctp-subtext1">{importedCardCount} imported card{importedCardCount === 1 ? "" : "s"} are protected as your baseline. Your existing version will not change.</p>
          </div>
          <button type="button" onClick={() => setTab("review")} className="rounded-md bg-ctp-blue px-3 py-1.5 text-sm font-medium text-ctp-base">
            Review {reviewItemCount} change{reviewItemCount === 1 ? "" : "s"}
          </button>
        </div>
        <ol className="mt-3 grid gap-2 text-xs text-ctp-subtext1 sm:grid-cols-3">
          <li><span className="font-semibold text-ctp-text">1. Baseline loaded</span><br />Your cards remain locked until you change them.</li>
          <li><span className="font-semibold text-ctp-text">2. Review changes</span><br />Accept additions and cuts selectively.</li>
          <li><span className="font-semibold text-ctp-text">3. Save a version</span><br />Create a snapshot only when you choose.</li>
        </ol>
      </section>}

      <div id="deck-builder-starting" className="mt-4 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1 text-sm" role="group" aria-label="Deck format">
        {(["STANDARD", "PANTHEON"] as const).map((format) => <button key={format} type="button" aria-pressed={deckFormat === format} onClick={() => { setDeckFormat(format); if (format === "PANTHEON") setPopulationSource("community"); const next = new URLSearchParams(searchParams); if (format === "PANTHEON") next.set("format", "pantheon"); else next.delete("format"); setSearchParams(next, { replace: true }); }} className={`rounded-md px-3 py-1.5 ${deckFormat === format ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>{format === "PANTHEON" ? "Pantheon" : "Standard"}</button>)}
      </div>
      {deckFormat === "PANTHEON" && <p className="mt-2 text-xs text-ctp-subtext0">Pantheon recommendations use format-separated community adoption and singleton legality. They do not use Standard tournament win rates.</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-ctp-green/30 bg-ctp-green/5 p-3 text-xs"><span className="font-medium text-ctp-text">Build from collection:</span>{([['all', 'All cards'], ['prioritize', 'Prioritize owned'], ['owned-only', 'Owned only']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={collectionMode === value} onClick={() => startTransition(() => setCollectionMode(value))} className={`rounded px-2.5 py-1.5 ${collectionMode === value ? "bg-ctp-green text-ctp-base" : "border border-ctp-surface1 text-ctp-subtext1"}`}>{label}</button>)}<Link to="/collection" className="ml-auto text-ctp-blue hover:underline">Manage collection</Link><p className="w-full text-ctp-subtext0">{collectionMode === "owned-only" ? "Auto-suggestions are capped to physical copies you own. Locked cards remain, and shortages stay visible as unresolved slots." : collectionMode === "prioritize" ? "Owned cards win close recommendation ties; performance evidence still leads." : `${collection.length} owned card ${collection.length === 1 ? "entry" : "entries"} loaded.`}</p></div>

      <div id="deck-builder-identity" className={isImproving ? "mt-4" : "mt-4 flex flex-wrap items-center gap-2 text-sm"}>
        {isImproving && championName && <>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm">
            <span className="text-ctp-subtext0">Reviewing:</span>
            <span className="font-medium text-ctp-text">{championName}</span>
            <span className="text-ctp-subtext0">·</span>
            <span className={spiritFilter ? "text-ctp-green" : "text-ctp-yellow"}>{spiritFilter ?? "Spirit required"}</span>
            <button type="button" onClick={() => setIdentityEditorOpen((open) => !open)} className="ml-auto text-xs text-ctp-blue hover:underline">
              {identityEditorOpen ? "Done changing identity" : "Change identity"}
            </button>
          </div>
          {identityEditorOpen && <p className="mt-2 text-xs text-ctp-yellow">Changing Champion clears the imported baseline. Changing Spirit keeps the baseline but changes the recommendation lens.</p>}
        </>}
        {(!isImproving || identityEditorOpen) && <>
        <label htmlFor="deck-builder-champion" className="text-ctp-subtext0">Champion:</label>
        <select
          id="deck-builder-champion"
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

        {championName && (!isImproving || identityEditorOpen) && (
          <>
            <label htmlFor="deck-builder-element" className="ml-2 text-ctp-subtext0">Element:</label>
            <select
              id="deck-builder-element"
              value={spiritElement ?? catalogByName.get(spiritFilter ?? "")?.elements.find((element) => element !== "NORM") ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                setSpiritElement(value);
                if (spiritFilter && value && !catalogByName.get(spiritFilter)?.elements.includes(value)) setSpiritFilter(null);
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              <option value="">Choose an element…</option>
              {spiritElements.map((element) => <option key={element} value={element}>{element}</option>)}
            </select>
            {(spiritElement || spiritFilter) && <>
            <label htmlFor="deck-builder-spirit" className="ml-2 text-ctp-subtext0">Spirit:</label>
            <select
              id="deck-builder-spirit"
              value={spiritFilter ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                pendingActionRef.current = { label: `Set Spirit to ${value ?? "Any Spirit"}`, subject: null };
                startTransition(() => setSpiritFilter(value));
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              <option value="">Choose a Spirit…</option>
              {spiritsForElement.map((name) => (
                <option key={name} value={name}>
                  {spiritOptionLabel(name)}
                </option>
              ))}
            </select>
            </>}
          </>
        )}
        </>}
        {championName && (
          <button
            type="button"
            onClick={resetBuilder}
            className="ml-1 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-red hover:text-ctp-red"
          >
            Reset builder
          </button>
        )}
      </div>
      {!isImproving && <div className="mt-2">
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
              {deckFormat === "STANDARD" && <button
                type="button"
                onClick={loadPastedDecklist}
                disabled={pasteText.trim().length === 0}
                className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Load decklist
              </button>}
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
      </div>}

      {builderIntent === "seed" && (!championName || !spiritFilter || gateLoading || !gateHasData || lockedCards.size === 0) && <section className="mt-5 rounded-lg border border-ctp-green/40 bg-ctp-green/5 p-3" aria-labelledby="seed-cards">
        <h2 id="seed-cards" className="text-sm font-semibold text-ctp-text">Start with your cards</h2>
        <p className="mt-1 text-xs text-ctp-subtext1">Add one or more cards, then choose the Champion and Spirit that should support them. Your selected cards stay locked as the deck fills in.</p>
        <div className="mt-3 flex max-w-xl flex-wrap gap-2">
          <input
            type="text"
            list="deck-builder-card-options"
            value={cardInput}
            onChange={(event) => setCardInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && cardNameSet.has(cardInput)) addCard(cardInput); }}
            placeholder="Type a card name…"
            className="min-w-52 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
          />
          <button type="button" disabled={!cardNameSet.has(cardInput) || lockedCards.has(cardInput)} onClick={() => addCard(cardInput)} className="rounded-md border border-ctp-green/60 px-3 py-1.5 text-sm text-ctp-green hover:bg-ctp-green/10 disabled:cursor-not-allowed disabled:opacity-50">Add card</button>
        </div>
        <datalist id="deck-builder-card-options">{cardNames.map((name) => <option key={name} value={name} />)}</datalist>
        {lockedCards.size > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{Array.from(lockedCards.keys()).map((name) => <button key={name} type="button" onClick={() => removeCard(name, true)} className="rounded-full border border-ctp-green/40 px-2 py-0.5 text-xs text-ctp-green hover:border-ctp-red hover:text-ctp-red" title="Remove seed card">{name} ×</button>)}</div>}
      </section>}

      {!championName && <p className="mt-6 text-ctp-subtext1">Choose a Champion to see a suggested build.</p>}

      {builderIntent === "seed" && championName && spiritFilter && lockedCards.size === 0 && !gateLoading && gateHasData && <p className="mt-6 rounded-lg border border-ctp-green/40 bg-ctp-green/5 px-4 py-3 text-sm text-ctp-subtext1">Add at least one card you want to build around. We’ll use it with {championName} and {spiritFilter} to shape the suggested deck.</p>}

      {championName && gateLoading && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      {championName && !gateLoading && !gateHasData && (
        <p className="mt-6 text-ctp-subtext1">
          No decks found for {championName}.
        </p>
      )}

      {championName && !gateLoading && gateHasData && !spiritFilter && (
        <p className="mt-6 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm text-ctp-subtext1">
          Select an element and Spirit above to generate a coherent core. The builder will keep unsupported slots unresolved
          instead of mixing this Champion's different strategies.
        </p>
      )}

      {championName && spiritFilter && !gateLoading && gateHasData && (builderIntent !== "seed" || lockedCards.size > 0) && (
        <>
          {effectivePopulationSource === "simulator" && <div className="mt-2 rounded-lg border border-ctp-mauve/50 bg-ctp-mauve/10 px-3 py-2 text-xs text-ctp-subtext1">
            <span className="font-semibold text-ctp-mauve">Experimental:</span>{" "}
            Clarent currently reports {simulatorSummary?.games ?? 0} game{simulatorSummary?.games === 1 ? "" : "s"} and {simulatorResult.matchedCards} catalog-resolved card sample{simulatorResult.matchedCards === 1 ? "" : "s"}. Simulator telemetry does not contain complete Champion-scoped decklists, so community construction supplies the legal shell; qualifying simulator rows only change card priority. No simulator evidence means the shell stays unchanged.
          </div>}

          <div className="mt-2 grid overflow-hidden rounded-lg border border-ctp-surface1 bg-ctp-mantle sm:grid-cols-4">
            <div className="border-b border-ctp-surface1 px-3 py-2 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Evidence</p>
              <p className="mt-0.5 text-sm font-semibold text-ctp-text">
                {build.matchingDeckCount} {effectivePopulationSource === "simulator"
                  ? `game${build.matchingDeckCount === 1 ? "" : "s"}`
                  : `deck${build.matchingDeckCount === 1 ? "" : "s"}`}
              </p>
              <p className="text-[10px] text-ctp-subtext0">{effectivePopulationSource === "simulator" ? `${simulatorResult.matchedCards} qualifying cards` : build.matchingDeckCount >= 30 ? "Strong sample" : build.matchingDeckCount >= 10 ? "Limited sample" : "Exploratory"}</p>
            </div>
            <div className="border-b border-ctp-surface1 px-3 py-2 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Performance</p>
              <p className="mt-0.5 text-sm font-semibold text-ctp-text">{effectivePopulationSource === "simulator" ? "Experimental" : build.conditionalWinRate === null ? "—" : `${(build.conditionalWinRate * 100).toFixed(0)}% observed`}</p>
              {build.baselineWinRate !== null && lockedCards.size > 0 && <p className="text-[10px] text-ctp-subtext0">{build.conditionalWinRate !== null && build.conditionalWinRate - build.baselineWinRate >= 0 ? "+" : ""}{build.conditionalWinRate === null ? "" : `${((build.conditionalWinRate - build.baselineWinRate) * 100).toFixed(1)}%`} vs. baseline</p>}
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

          {isPending && <p role="status" className="mt-1 text-xs text-ctp-subtext0">Recalculating suggestions…</p>}
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

          <section className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3" aria-labelledby="deck-builder-checklist">
            <h2 id="deck-builder-checklist" className="text-sm font-semibold text-ctp-text">Deck-building checklist</h2>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
              {isImproving && <p className={importedCardCount > 0 ? "text-ctp-green" : "text-ctp-yellow"}>{importedCardCount > 0 ? `✓ ${importedCardCount} baseline cards loaded` : "○ Imported deck is empty"}</p>}
              <p className={championName ? "text-ctp-green" : "text-ctp-subtext1"}>{championName ? "✓ Champion selected" : "○ Choose a Champion"}</p>
              <p className={spiritFilter ? "text-ctp-green" : "text-ctp-subtext1"}>{spiritFilter ? "✓ Spirit selected" : "○ Choose an element and Spirit"}</p>
              <p className={validation.status === "Legal" ? "text-ctp-green" : "text-ctp-yellow"}>{validation.status === "Legal" ? "✓ Construction checks pass" : `○ ${validation.status}: review deck size and legality`}</p>
            </div>
          </section>

          <div className="mt-4">
            <Tabs<BuilderTab>
              tabs={[
                { key: "build", label: "Build" },
                { key: "review", label: reviewItemCount > 0 ? `Review & decide (${reviewItemCount})` : "Review & decide" },
                { key: "stats", label: statsSignalCount > 0 ? `Stats (${statsSignalCount})` : "Stats" },
                { key: "tools", label: "Advanced" },
                { key: "buddies", label: "Buddy Cards" },
                { key: "copy", label: "Validate & save" },
                { key: "log", label: `Log (${changeLog.length})` },
              ]}
              active={tab}
              onChange={setTab}
              label="Deck builder sections"
              baseId="deck-builder"
            />
          </div>

          {tab === "build" && newReleaseCards.length > 0 && (
            <div className="mb-4 rounded-lg border border-ctp-mauve/50 bg-ctp-mauve/10 px-3 py-2 text-xs text-ctp-subtext1">
              <span className="font-medium">New cards available</span>
              <span className="ml-auto">({newReleaseCards.length} new cards from recent sets)</span>
              <Link to="/card-discovery" className="ml-3 text-ctp-mauve hover:underline">Explore new cards →</Link>
            </div>
          )}
          {tab === "build" && (
            <div role="tabpanel" id="deck-builder-panel-build" aria-labelledby="deck-builder-tab-build" className="mt-4">
              {reviewItemCount > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-ctp-yellow/50 bg-ctp-yellow/10 px-3 py-2 text-sm">
                  <span className="font-medium text-ctp-text">
                    {reviewItemCount} recommendation{reviewItemCount === 1 ? "" : "s"} ready
                  </span>
                  <span className="text-xs text-ctp-subtext1">Review suggested additions, cuts, and section-compatible swaps.</span>
                  <button type="button" onClick={() => setTab("review")} className="ml-auto rounded-md border border-ctp-yellow/60 px-2 py-1 text-xs text-ctp-yellow hover:bg-ctp-yellow/10">
                    Review recommendations →
                  </button>
                </div>
              )}
              <span className="text-sm text-ctp-subtext0">{builderIntent === "seed" ? "Cards to build around:" : "Add a card:"}</span>
              <input
                type="text"
                list="deck-builder-card-options"
                value={cardInput}
                onChange={(e) => {
                  setCardInput(e.target.value);
                  setAddDestination("automatic");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && cardNameSet.has(cardInput)) addCard(cardInput);
                }}
                placeholder={builderIntent === "seed" ? "Type a card you want to keep in the deck…" : "Type a card name to add as your choice…"}
                className="mt-1 block w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
              />
              <datalist id="deck-builder-card-options">
                {cardNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-ctp-subtext1">Destination:</span>
                <div role="group" aria-label="Card destination" className="inline-flex rounded-md border border-ctp-surface1 bg-ctp-mantle p-0.5">
                  <button
                    type="button"
                    aria-pressed={addDestination === "automatic"}
                    onClick={() => setAddDestination("automatic")}
                    className={`rounded px-2.5 py-1 text-xs ${addDestination === "automatic" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}
                  >
                    Automatic
                  </button>
                  <button
                    type="button"
                    aria-pressed={addDestination === "sideboard"}
                    disabled={!canAddToSideboard}
                    onClick={() => setAddDestination("sideboard")}
                    title={!selectedAddCard ? "Choose a card first" : !canAddToSideboard ? `This card would exceed the ${SIDEBOARD_POINT_BUDGET}-point sideboard budget` : undefined}
                    className={`rounded px-2.5 py-1 text-xs ${addDestination === "sideboard" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 enabled:hover:text-ctp-text disabled:cursor-not-allowed disabled:opacity-40"}`}
                  >
                    Sideboard
                  </button>
                  <button
                    type="button"
                    aria-pressed={addDestination === "maybeboard"}
                    onClick={() => setAddDestination("maybeboard")}
                    className={`rounded px-2.5 py-1 text-xs ${addDestination === "maybeboard" ? "bg-ctp-yellow text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}
                  >
                    Maybeboard
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!cardNameSet.has(cardInput) || (lockedCards.has(cardInput) && addDestination !== "maybeboard")}
                  onClick={() => addCard(cardInput)}
                  className="rounded-md border border-ctp-blue px-3 py-1 text-xs text-ctp-blue enabled:hover:bg-ctp-surface0 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {addDestination === "maybeboard" ? "Add to maybeboard" : sideboardDestinationSelected ? "Add to sideboard" : "Add card"}
                </button>
                <span className="text-xs text-ctp-subtext0">
                  {addDestination === "maybeboard"
                    ? "Doesn't affect the deck until you promote it."
                    : sideboardDestinationSelected
                    ? `Uses ${selectedSideboardPoints} points; ${SIDEBOARD_POINT_BUDGET - currentSideboardPoints} available.`
                    : "Automatic places the card in Main or Material."}
                </span>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setCustomizeOpen((v) => !v)}
                  className="text-xs text-ctp-subtext0 hover:text-ctp-text"
                >
                  Customize card info {customizeOpen ? "▴" : "▾"}
                </button>
                {customizeOpen && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(
                      [
                        ["cost", "Cost"],
                        ["price", "Price"],
                        ["winRate", "Win rate"],
                        ["sample", "Sample size"],
                        ["community", "Community usage"],
                      ] as [keyof CardFieldVisibility, string][]
                    ).map(([field, label]) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => setVisibleField(field, !visibleFields[field])}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          visibleFields[field] ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {pillarBias !== null && (effectivePopulationSource === "tournament" || effectivePopulationSource === "balanced") && (
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-ctp-blue/40 bg-ctp-blue/5 px-3 py-2 text-xs text-ctp-subtext1">
                  <span className="font-semibold text-ctp-blue">Tuning active:</span>
                  <span>{pillarBias} bias</span>
                  <span className="text-ctp-subtext0">— nudging suggestions toward one DIAO Score pillar.</span>
                  <button
                    type="button"
                    onClick={() => setTab("tools")}
                    className="ml-auto shrink-0 rounded border border-ctp-blue/40 px-1.5 py-0.5 text-ctp-blue hover:bg-ctp-blue/10"
                  >
                    Adjust in Tools →
                  </button>
                </div>
              )}
              <>
              {build.hasQuantityOptimizations && (
                <p className="mt-3 text-[11px] text-ctp-subtext0">
                  A <span className="text-ctp-blue">*</span> next to a copy count marks a quantity tuned by global
                  copy-count evidence (hover the count for its source).
                </p>
              )}
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
                        simulatorEvidence={effectivePopulationSource === "simulator" ? simulatorResult.evidenceByName.get(c.cardName) : undefined}
                        visibleFields={visibleFields}
                        needsReview={reviewRemovalNames.has(c.cardName)}
                        communityMode={effectivePopulationSource !== "tournament" && effectivePopulationSource !== "balanced"}
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
                        simulatorEvidence={effectivePopulationSource === "simulator" ? simulatorResult.evidenceByName.get(c.cardName) : undefined}
                        visibleFields={visibleFields}
                        needsReview={reviewRemovalNames.has(c.cardName)}
                        communityMode={effectivePopulationSource !== "tournament" && effectivePopulationSource !== "balanced"}
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
                        simulatorEvidence={effectivePopulationSource === "simulator" ? simulatorResult.evidenceByName.get(c.cardName) : undefined}
                        visibleFields={visibleFields}
                        needsReview={reviewRemovalNames.has(c.cardName)}
                        communityMode={effectivePopulationSource !== "tournament" && effectivePopulationSource !== "balanced"}
                        onToggleLock={() => toggleLock(c.cardName, c.quantity, "sideboard")}
                        onChangeQuantity={(qty) => setLockedQuantity(c.cardName, qty)}
                        onRemove={() => removeCard(c.cardName, c.locked)}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {maybeboard.size > 0 && (
                <div className="mt-4 rounded-lg border border-dashed border-ctp-yellow/60 bg-ctp-yellow/5 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-yellow">Maybeboard ({maybeboard.size})</h2>
                      <p className="mt-1 text-xs text-ctp-subtext0">Cards you are considering. They are not part of the deck, so they do not affect legality, stats, exports, or saved versions.</p>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {Array.from(maybeboard.entries()).map(([name, quantity]) => {
                      const card = catalogByName.get(name);
                      return <li key={name} className="relative flex flex-wrap items-center gap-1.5 overflow-hidden rounded-md border border-ctp-yellow/30 bg-ctp-base py-1 pl-3 pr-2 text-sm">
                        <ElementRail elements={card?.elements} />
                        <input type="number" min={1} max={4} value={quantity} aria-label={`Copies of ${name} in maybeboard`} onChange={(event) => setMaybeQuantity(name, Number(event.target.value))} className="w-11 rounded border border-ctp-surface1 bg-ctp-mantle px-1 py-0.5 text-right text-xs text-ctp-text" />
                        {card && card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
                        <CardHoverPreview image={card?.editions[0]?.image} alt={name}>{card ? <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">{name}</Link> : <span className="text-ctp-text">{name}</span>}</CardHoverPreview>
                        <div className="ml-auto flex gap-1.5"><button type="button" disabled={lockedCards.has(name)} onClick={() => promoteMaybeCard(name)} className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue disabled:opacity-40">Add to deck</button><button type="button" onClick={() => removeMaybeCard(name)} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-red">Remove</button></div>
                      </li>;
                    })}
                  </ul>
                </div>
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
                          <Link
                            to={nearestDeckCompareLink(d)}
                            className="ml-auto shrink-0 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                          >
                            Compare
                          </Link>
                          <button
                            type="button"
                            onClick={() => loadNearestDeck(d)}
                            className="shrink-0 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
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

          {tab === "review" && (
            <div role="tabpanel" id="deck-builder-panel-review" aria-labelledby="deck-builder-tab-review" className="mt-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-ctp-text">Review recommendations</h2>
                  <p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">
                    Suggestions are correlations from the selected evidence source. Swaps pair a card to review with the highest-ranked addition for the same deck section; they are starting points, not proof that one card directly replaces the other.
                  </p>
                </div>
                {dismissedReviewCards.size > 0 && (
                  <button type="button" onClick={() => setDismissedReviewCards(new Set())} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text">
                    Restore dismissed
                  </button>
                )}
              </div>

              {build.protectedPackages.length > 0 && (
                <div className="mt-4 rounded-lg border border-ctp-teal/40 bg-ctp-teal/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ctp-teal">Protected packages</p>
                  <ul className="mt-1 space-y-1.5">
                    {build.protectedPackages.map((deckPackage) => (
                      <li key={deckPackage.id} className="text-xs text-ctp-subtext1">
                        <span className="font-medium text-ctp-text">{deckPackage.label}</span>
                        {" — "}{deckPackage.explanation} Individual cuts are hidden for {deckPackage.protectedCards.join(", ")}.
                      </li>
                    ))}
                  </ul>
                  {build.protectedRemovalSuggestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowProtectedCuts((shown) => !shown)}
                      className="mt-2 rounded-md border border-ctp-teal/50 px-2 py-1 text-xs text-ctp-teal hover:bg-ctp-teal/10"
                      aria-pressed={showProtectedCuts}
                    >
                      {showProtectedCuts ? "Hide protected cuts" : `Review anyway (${build.protectedRemovalSuggestions.length})`}
                    </button>
                  )}
                </div>
              )}

              <details className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ctp-subtext1 hover:text-ctp-text">
                  Package catalog ({build.packageCatalog.filter((entry) => entry.active).length}/{build.packageCatalog.length} active)
                </summary>
                <p className="mt-2 text-xs text-ctp-subtext0">
                  Construction packages are explicit review guardrails and do not define the deck&apos;s archetype.
                  {" "}<Link to="/cards/packages" className="text-ctp-blue hover:underline">Browse package definitions.</Link>
                </p>
                <ul className="mt-3 space-y-2">
                  {build.packageCatalog.map((entry) => (
                    <li key={entry.id} className="rounded-md border border-ctp-surface1 px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ctp-text">{entry.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${entry.active ? "bg-ctp-teal/15 text-ctp-teal" : "bg-ctp-surface0 text-ctp-subtext0"}`}>
                          {entry.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-1 text-ctp-subtext1"><span className="font-medium text-ctp-text">Activates:</span> {entry.activation}</p>
                      <p className="mt-1 text-ctp-subtext0">{entry.explanation}</p>
                      {entry.active && entry.protectedCards.length > 0 && (
                        <p className="mt-1 text-ctp-teal"><span className="font-medium">Protecting:</span> {entry.protectedCards.join(", ")}</p>
                      )}
                      {entry.observedSupport && (
                        <p className="mt-1 text-[10px] text-ctp-overlay1">
                          Observed in {entry.observedSupport.matchingDecks.toLocaleString()} of {entry.observedSupport.populationDecks.toLocaleString()} decks ({entry.observedSupport.auditLabel}).
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </details>

              {reviewItemCount === 0 ? (
                <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm text-ctp-subtext1">
                  {effectivePopulationSource === "community" || effectivePopulationSource === "simulator"
                    ? `No additions to review right now. Cut recommendations are unavailable in ${effectivePopulationSource === "simulator" ? "Simulator" : "Community"} mode because this source cannot support Champion-scoped with-versus-without comparisons.`
                    : "No recommendations to review right now. The current build already contains the ranked core, or the available evidence is too thin to support a change."}
                </div>
              ) : (
                <>
                  {reviewGroups.pairs.length > 0 && (
                    <section className="mt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Suggested swaps</h3>
                      <ul className="mt-2 space-y-2">
                        {reviewGroups.pairs.map(({ removal, addition }) => {
                          const removalInfo = cardsByName.get(removal.cardName);
                          const additionInfo = cardsByName.get(addition.cardName);
                          return (
                            <li key={`${removal.cardName}:${addition.cardName}`} className="grid gap-2 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center">
                              <div className="min-w-0">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-ctp-red">Review</span>
                                <CardHoverPreview image={removalInfo?.editions[0]?.image} alt={removal.cardName}>
                                  {removalInfo ? <Link to={`/cards/${removalInfo.slug}`} className="block truncate text-sm text-ctp-text hover:text-ctp-blue">{removal.cardName}</Link> : <span className="block truncate text-sm text-ctp-text">{removal.cardName}</span>}
                                </CardHoverPreview>
                                <span className="text-xs text-ctp-subtext0">{removal.adjustedLift === null ? "Limited performance evidence" : `${(removal.adjustedLift * 100).toFixed(1)}% observed lift`}</span>
                                {removal.contextualReplacement && <span className="mt-0.5 block text-[10px] text-ctp-teal">Contextual swap · {removal.contextualReplacement.peerDecks} similar decks</span>}
                              </div>
                              <span className="hidden text-ctp-subtext0 sm:inline" aria-hidden="true">→</span>
                              <div className="min-w-0">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-ctp-green">Suggested addition</span>
                                <CardHoverPreview image={additionInfo?.editions[0]?.image} alt={addition.cardName}>
                                  {additionInfo ? <Link to={`/cards/${additionInfo.slug}`} className="block truncate text-sm text-ctp-text hover:text-ctp-blue">{addition.cardName}</Link> : <span className="block truncate text-sm text-ctp-text">{addition.cardName}</span>}
                                </CardHoverPreview>
                                <span className="text-xs text-ctp-subtext0">{addition.adjustedLift === null ? "Ranked candidate" : `+${(addition.adjustedLift * 100).toFixed(1)}% observed lift`} · {addition.quantity}x {addition.section}</span>
                                {addition.readinessReasons?.map((reason) => <span key={reason} className="ml-1 inline-block rounded-full border border-ctp-teal/50 bg-ctp-teal/10 px-1.5 text-[10px] font-medium text-ctp-teal">{reason}</span>)}
                                <span className="ml-1 inline-flex flex-wrap gap-1"><DiaoMetricBadges card={addition} /></span>
                              </div>
                              <div className="flex gap-1.5 sm:justify-end">
                                <button type="button" onClick={() => applyRecommendationSwap(removal, addition)} className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-blue/10">Swap</button>
                                <button type="button" onClick={() => dismissReview(removal.cardName, addition.cardName)} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text">Dismiss</button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    {reviewGroups.unpairedSuggestions.length > 0 && (
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Suggested additions</h3>
                        <p className="mt-1 text-xs text-ctp-subtext0">Adding one keeps it as your choice and may grow the deck beyond its usual size.</p>
                        <ul className="mt-2 space-y-1.5">
                          {reviewGroups.unpairedSuggestions.map((card) => (
                            <SuggestionRow
                              key={card.cardName}
                              card={card}
                              cardsByName={cardsByName}
                              priceByName={priceByName}
                              communityInclusion={communityInclusionByName}
                              simulatorEvidence={effectivePopulationSource === "simulator" ? simulatorResult.evidenceByName.get(card.cardName) : undefined}
                              visibleFields={visibleFields}
                              onAdd={() => addSuggestion(card)}
                              onDismiss={() => dismissReview(card.cardName)}
                            />
                          ))}
                        </ul>
                      </section>
                    )}
                    {reviewGroups.unpairedRemovals.length > 0 && (
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Cards to review</h3>
                        <p className="mt-1 text-xs text-ctp-subtext0">These user choices have meaningfully negative independent evidence; that does not prove they are wrong for this build.</p>
                        <ul className="mt-2 space-y-1.5">
                          {reviewGroups.unpairedRemovals.map((card) => (
                            <CardRow
                              key={card.cardName}
                              card={card}
                              cardsByName={cardsByName}
                              priceByName={priceByName}
                              communityInclusion={communityInclusionByName}
                              simulatorEvidence={effectivePopulationSource === "simulator" ? simulatorResult.evidenceByName.get(card.cardName) : undefined}
                              visibleFields={visibleFields}
                              showLockToggle={false}
                              onToggleLock={() => {}}
                              onRemove={() => removeCard(card.cardName, card.locked)}
                              onDismiss={() => dismissReview(card.cardName)}
                            />
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                </>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ctp-surface1 pt-3">
                <button type="button" onClick={() => setTab("build")} className="text-xs text-ctp-blue hover:underline">← Back to build</button>
                <button type="button" onClick={() => setTab("copy")} className="rounded-md bg-ctp-blue px-3 py-1.5 text-xs font-medium text-ctp-base">{reviewComplete ? "Continue to validation" : "Validate current deck"} →</button>
              </div>
            </div>
          )}

          {tab === "stats" && (
            <div role="tabpanel" id="deck-builder-panel-stats" aria-labelledby="deck-builder-tab-stats">
              <StatsPanel
                lines={buildLines}
                mainLines={mainOnlyLines}
                cardsByName={cardsByName}
                catalogByName={catalogByName}
                synergyReadiness={synergyReadiness}
                dependencyReadiness={dependencyReadiness}
                newReleaseCards={newReleaseCards}
                compositionWinRateData={compositionWinRateData}
                onAddCard={addCard}
                decayReport={decayReport}
              />
            </div>
          )}

          {tab === "tools" && (
            <div role="tabpanel" id="deck-builder-panel-tools" aria-labelledby="deck-builder-tab-tools">
              <ToolsPanel
                rating={rating}
                mainLines={mainOnlyLines}
                materialLines={materialOnlyLines}
                catalogByName={catalogByName}
                pillarBias={pillarBias}
                onPillarBiasChange={changePillarBias}
                archetypeId={archetypeId}
                archetypeOptions={archetypeOptions}
                onArchetypeChange={changeArchetype}
                championLevelCap={championLevelCap}
                onChampionLevelCapChange={changeChampionLevelCap}
                validation={validation}
                unresolvedMain={build.unresolved.main}
                deckFormat={deckFormat}
                populationSource={effectivePopulationSource}
                onChangePopulationSource={(source, label) => {
                  startTransition(() => setCollectionMode("all"));
                  changePopulationSource(source, label);
                }}
                collectionMode={collectionMode}
                onCollectionModeChange={(mode) => startTransition(() => setCollectionMode(mode))}
              />
            </div>
          )}

          {tab === "buddies" && (
            <div role="tabpanel" id="deck-builder-panel-buddies" aria-labelledby="deck-builder-tab-buddies">
              <BuddyCardsList
                lockedNames={Array.from(lockedCards.keys())}
                buddyCards={buddyCards}
                communityBuddyCards={communityBuddyCards}
                cardsByName={cardsByName}
                onAdd={addCard}
              />
            </div>
          )}

          {tab === "copy" && (
            <div role="tabpanel" id="deck-builder-panel-copy" aria-labelledby="deck-builder-tab-copy" className="mt-4">
              <section className={`mb-4 rounded-lg border p-4 ${validationComplete ? "border-ctp-green/50 bg-ctp-green/5" : "border-ctp-yellow/50 bg-ctp-yellow/5"}`} aria-labelledby="validate-and-save">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="validate-and-save" className="font-semibold text-ctp-text">Validate & save</h2>
                    <p className={`mt-1 text-sm ${validationComplete ? "text-ctp-green" : "text-ctp-yellow"}`}>{validationComplete ? "Construction checks pass. This version is ready to save, export, or playtest." : `${validation.status}: ${validation.reasons[0] ?? "review the deck before saving."}`}</p>
                  </div>
                  {!reviewComplete && <button type="button" onClick={() => setTab("review")} className="rounded-md border border-ctp-yellow/60 px-3 py-1.5 text-xs font-medium text-ctp-yellow hover:bg-ctp-yellow/10">Review changes first</button>}
                </div>
                {validation.reasons.length > 1 && <ul className="mt-2 list-disc pl-5 text-xs text-ctp-subtext1">{validation.reasons.slice(1, 4).map((reason) => <li key={reason}>{reason}</li>)}</ul>}
              </section>
              <div className="mb-4 rounded-lg border border-ctp-blue/40 bg-ctp-blue/5 p-4">
                <h3 className="font-semibold text-ctp-text">{improveDeckId ? "Save improved version" : "Save this build"}</h3>
                <p className="mt-1 text-sm text-ctp-subtext1">{improveDeckId ? "Save the accepted changes as a new version. Your previous deck version remains available." : "Add the current Main, Material, and Sideboard to your private editable decks."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {improveDeckId ? <input value={saveNote} onChange={(event) => setSaveNote(event.target.value)} maxLength={240} placeholder="What changed? (optional)" aria-label="Version change note" className="min-w-56 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" /> : <input value={saveTitle} onChange={(event) => setSaveTitle(event.target.value)} maxLength={160} placeholder={championName ? `${championName} guided build` : "Deck name"} aria-label="Saved deck name" className="min-w-56 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" />}
                  <button type="button" disabled={!championName || saveCopyCount === 0 || saveState === "saving"} onClick={() => void handleSaveToMyDecks()} className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base disabled:cursor-not-allowed disabled:opacity-50">{saveState === "saving" ? "Saving…" : savedDeckId ? "Saved" : improveDeckId ? "Save new version" : "Save to My Decks"}</button>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-ctp-subtext1"><input type="checkbox" checked={saveKeptOnly} onChange={(event) => setSaveKeptOnly(event.target.checked)} /> Save only kept cards ({keptCopyCount})</label>
                {saveKeptOnly && <p className="mt-1 text-xs text-ctp-yellow">This saves your explicit choices only; it can be a partial decklist.</p>}
                {saveState === "saved" && savedDeckId && <p className="mt-2 text-sm text-ctp-green">{improveDeckId ? "New version saved." : "Deck saved."} <Link to={`/my-decks/${savedDeckId}`} className="font-medium underline">Open deck →</Link></p>}
                {saveState === "sign-in" && <p className="mt-2 text-sm text-ctp-yellow">Sign in from <Link to="/my-decks" className="font-medium underline">My Decks</Link>, then return to save this build. Your builder choices are kept in this browser.</p>}
                {saveState === "failed" && <p className="mt-2 text-sm text-ctp-red">The deck could not be saved. Please try again.</p>}
              </div>
              <DeckCollectionTools decklist={decklist} cardsByName={catalogByName} source={`${championName ?? "Guided"} deck builder`} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(false)}
                  aria-live="polite"
                  className={`rounded-md border px-2 py-1 text-xs ${
                    copyState === "full-failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                  }`}
                >
                  {copyState === "full-copied" ? "Copied!" : copyState === "full-failed" ? "Couldn't copy" : `Copy full deck (${fullCopyCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(true)}
                  disabled={keptCopyCount === 0}
                  aria-live="polite"
                  title={keptCopyCount === 0 ? "Keep at least one card to copy your choices" : "Copies your explicitly kept cards and skips auto-suggested slots"}
                  className={`rounded-md border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                    copyState === "kept-failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 enabled:hover:text-ctp-text"
                  }`}
                >
                  {copyState === "kept-copied" ? "Copied!" : copyState === "kept-failed" ? "Couldn't copy" : `Copy kept cards (${keptCopyCount})`}
                </button>
                {deckBuilderDestinations.map((destination) => (
                  <button
                    key={destination.id}
                    type="button"
                    disabled={fullCopyCount === 0}
                    onClick={() => void handleCopyAndOpen(destination.url)}
                    title={`Copies the full deck, then opens ${destination.label} so you can paste it into a new deck`}
                    className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 enabled:hover:text-ctp-text disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Copy & open {destination.label} &rarr;
                  </button>
                ))}
                <a
                  href={massEntryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0"
                >
                  Buy on TCGplayer &rarr;
                </a>
                <a
                  href={clarentUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Opens this deck in Clarent's solo Goldfish playtest mode"
                  className="rounded-md border border-ctp-green px-2 py-1 text-xs text-ctp-green hover:bg-ctp-surface0"
                >
                  Playtest in Clarent &rarr;
                </a>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
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
                  aria-live="polite"
                  title="Copies a link that reopens this Champion/Spirit and every user-choice card"
                  className={`rounded-md border px-2 py-1 text-xs ${
                    shareCopyState === "failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                  }`}
                >
                  {shareCopyState === "copied" ? "Copied!" : shareCopyState === "failed" ? "Couldn't copy" : "Copy share link"}
                </button>
              </div>
            </div>
          )}

          {tab === "log" && (
            <div role="tabpanel" id="deck-builder-panel-log" aria-labelledby="deck-builder-tab-log">
              <ChangeLogList entries={changeLog} />
            </div>
          )}

          <details className="mt-8 border-t border-ctp-surface1 pt-3 text-xs text-ctp-subtext0">
            <summary className="cursor-pointer font-medium hover:text-ctp-text">Data &amp; methodology</summary>
            <div className="mt-2 space-y-2">
              <DecklistCoverageNotice />
              <StaleDataNotice generatedAt={[popularityIndexData?.generatedAt, effectivePopulationSource === "simulator" ? simulatorSummary?.generatedAt : undefined]} />
              <p>{effectivePopulationSource === "simulator" ? "Simulator ordering is an experimental overlay on a community-built legal shell. Telemetry is anonymous, sample-gated, and not Champion-scoped." : "Suggestions are correlations from public tournament decklists, not causal or predictive claims."}</p>
              {build.hasQuantityOptimizations && <p>Starred quantities use global copy-count evidence only when at least 30 decks support a meaningful difference; each affected card shows its source and sample.</p>}
              <p>Validation does not cover {validation.unsupportedRules.join("; ")}.</p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
