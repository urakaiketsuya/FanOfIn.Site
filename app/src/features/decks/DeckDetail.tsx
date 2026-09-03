import { useEffect, useMemo, useState, useTransition } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { decodeCardLines, type OmnidexDecklist } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import { useDeckPopularity, buildPopularDeck } from "../popular/useDeckPopularity";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useOmnidexPlayers, useEventNameById } from "../tournaments/data";
import { useCardImpactData, useSimilarityData, useDeckCardIndexData } from "../archetypes/data";
import { useChampionCardImpact } from "./useChampionCardImpact";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { useCardsByNames } from "../events/useCardsByNames";
import { useCardCatalog } from "../cards/useCardCatalog";
import DeckDecaySignals from "../events/DeckDecaySignals";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import CardImpactTable from "../../components/CardImpactTable";
import {
  computeAllyPower,
  computeDamageComposition,
  computeDeckComposition,
  computeDeckIdentity,
  computeDeckRating,
  computeFloatingMemory,
  computeKeywordComposition,
  computeMemoryCostCurve,
  computeRarityBreakdown,
  computeReserveCostCurve,
  formatAllyPower,
} from "../../lib/deckIdentity";
import { shortHash } from "../../lib/hash";
import { formatUsd } from "../../lib/format";
import DecklistView from "../events/DecklistView";
import DeckCollectionTools from "../collection/DeckCollectionTools";
import TopDecksList from "../../components/TopDecksList";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import Tabs from "../../components/ui/Tabs";
import DonutChart, { buildChartSegments } from "../../components/DonutChart";
import BarChart from "../../components/BarChart";
import RankedCompositionChart from "../../components/RankedCompositionChart";
import CompositionChartGrid from "../../components/CompositionChartGrid";
import AggressionForecast from "./AggressionForecast";
import { computeAggressionForecast } from "../../lib/aggressionForecast";
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import DiaoScoreCard from "../../components/DiaoScoreCard";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { InlineState, EmptyState } from "../../components/ui/ContentState";

type DeckTab = "decklist" | "composition" | "history" | "similar";

const TABS: { key: DeckTab; label: string }[] = [
  { key: "decklist", label: "Decklist" },
  { key: "composition", label: "Composition" },
  { key: "history", label: "History" },
  { key: "similar", label: "Similar Decks" },
];
const TAB_KEYS = TABS.map((t) => t.key);

export default function DeckDetail() {
  const { hash = "" } = useParams<{ hash: string }>();
  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "decklist");

  const popularityIndexData = useDeckPopularityIndexData();
  const eventNameById = useEventNameById();
  const playersData = useOmnidexPlayers();

  // Fast path: `deckHash` is precomputed pipeline-side for every deck with at least one duplicate
  // (see DeckPopularityEntry's own doc comment) — matching against the already-loaded lean index
  // resolves most deck pages (anything popular enough to be linked to from elsewhere) directly,
  // without decoding and grouping the full ~57k-deck universe just to find one deck by hash.
  const matchingSightings = useMemo(
    () => (popularityIndexData ? popularityIndexData.entries.filter((e) => e.deckHash === hash) : null),
    [popularityIndexData, hash],
  );
  const rawCardIndexData = useDeckCardIndexData();
  const cardIndexData = rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const catalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(catalog.map((c) => [c.name, c])), [catalog]);
  const fastDeck = useMemo(() => {
    if (!matchingSightings || matchingSightings.length === 0 || !cardIndexData) return null;
    const entry = cardIndexData.decks.find((d) => d.deckId === matchingSightings[0].deckId);
    if (!entry) return null;
    const main = decodeCardLines(entry.main, cardIndexData.cardNames);
    const material = decodeCardLines(entry.material, cardIndexData.cardNames);
    return buildPopularDeck(
      main,
      material,
      matchingSightings[0].championName,
      matchingSightings.map((s) => s.deckId),
      matchingSightings,
      catalogByName,
    );
  }, [matchingSightings, cardIndexData, catalogByName]);

  // Only decode + group the full universe when the fast path can't resolve this hash (a genuinely
  // unique, one-player decklist has no precomputed deckHash) or the Similar Decks tab needs the
  // broader universe to find other decks to compare against.
  const needsFullUniverse = matchingSightings !== null && (matchingSightings.length === 0 || tab === "similar");
  const { decks, loading: fullUniverseLoading } = useDeckPopularity(null, 1, needsFullUniverse);
  const deck = fastDeck ?? decks.find((d) => shortHash(d.signature) === hash);
  const loading =
    matchingSightings === null || (matchingSightings.length > 0 && !fastDeck) || (needsFullUniverse && fullUniverseLoading);
  useDocumentTitle(
    deck?.championName ? `${deck.championName} deck` : null,
    deck && `A popular ${deck.championName ?? "Grand Archive TCG"} decklist, independently played by ${deck.playerCount} players.`,
  );

  const championImages = useChampionCardImages(deck?.championName ? [deck.championName] : []);
  const championCard = deck?.championName ? championImages.get(deck.championName) : undefined;

  const decklist: OmnidexDecklist = useMemo(
    () => ({
      main: (deck?.main ?? []).map((l) => ({ card: l.name, quantity: l.quantity })),
      material: (deck?.material ?? []).map((l) => ({ card: l.name, quantity: l.quantity })),
      sideboard: [],
    }),
    [deck],
  );
  const allNames = useMemo(() => [...(deck?.main ?? []), ...(deck?.material ?? [])].map((l) => l.name), [deck]);
  const cardsByName = useCardsByNames(allNames);
  const displayPrefs = useDecklistDisplayPrefs();

  // Precise, cluster-scoped "Cards that might help" (Phase 21) only covers the ~128 named-build
  // clusters — most decks reachable from here (especially one-offs, since All Decks stopped
  // gating deck pages behind Popular Decks' 2+-player bar) have no cluster match. Fall back to a
  // broader Champion+Element-scoped recommendation in that case, never show both.
  const cardImpactData = useCardImpactData();
  const hasClusterMatch = !!(deck && cardImpactData?.deckClusterIndex[deck.deckIds[0]]);

  // Champion-scoped directly (same filter-before-decode pattern as useChampionCardImpact.ts)
  // rather than scanning the full cross-Champion `decks` universe, which the fast path above
  // deliberately avoids decoding for the common case.
  const championElementsPresent = useMemo(() => {
    if (!deck?.championName || !cardIndexData || !popularityIndexData) return [];
    const deckIdsForChampion = new Set(
      popularityIndexData.entries.filter((e) => e.championName === deck.championName).map((e) => e.deckId),
    );
    const elements = new Set<string>();
    for (const entry of cardIndexData.decks) {
      if (!deckIdsForChampion.has(entry.deckId)) continue;
      const main = decodeCardLines(entry.main, cardIndexData.cardNames);
      const material = decodeCardLines(entry.material, cardIndexData.cardNames);
      for (const e of computeDeckIdentity([...main, ...material], catalogByName).elements) elements.add(e);
    }
    return Array.from(elements).sort();
  }, [deck?.championName, cardIndexData, popularityIndexData, catalogByName]);

  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [isRecommendationPending, startRecommendationTransition] = useTransition();
  // Default to the viewed deck's own elements — the narrowest sensible starting point — only when
  // the viewed deck itself changes (not on every render), same reset-on-identity-change pattern
  // ArchetypeDetail/ChampionDetail already use for their own per-page state.
  useEffect(() => {
    if (deck) setSelectedElements(deck.elements);
  }, [deck?.signature]);

  function toggleElement(element: string) {
    startRecommendationTransition(() => {
      setSelectedElements((prev) => (prev.includes(element) ? prev.filter((e) => e !== element) : [...prev, element]));
    });
  }

  const excludeCardNames = useMemo(
    () => new Set([...(deck?.main ?? []), ...(deck?.material ?? [])].map((l) => l.name)),
    [deck],
  );
  const championImpact = useChampionCardImpact(hasClusterMatch ? null : (deck?.championName ?? null), selectedElements, excludeCardNames);
  const championImpactCardImages = useCardsByNames(useMemo(() => championImpact.cards.map((c) => c.cardName), [championImpact.cards]));

  const composition = useMemo(() => {
    if (!deck) return null;
    return computeDeckComposition([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const floatingMemory = useMemo(() => {
    if (!deck) return null;
    return computeFloatingMemory([...deck.main, ...deck.material], cardsByName, deck.championName, deck.classes);
  }, [deck, cardsByName]);

  const rating = useMemo(() => {
    if (!deck) return null;
    return computeDeckRating([...deck.main, ...deck.material], cardsByName, deck.championName, deck.classes);
  }, [deck, cardsByName]);

  const aggressionForecast = useMemo(() => {
    if (!deck) return null;
    return computeAggressionForecast(deck.main, cardsByName, deck.material);
  }, [deck, cardsByName]);

  const allyPower = useMemo(() => {
    if (!deck) return null;
    return computeAllyPower([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const allyPowerSegments = useMemo(() => {
    if (!allyPower) return [];
    const labeled = new Map(Array.from(allyPower.byPower.entries()).map(([power, count]) => [`Power ${power}`, count]));
    return buildChartSegments(labeled);
  }, [allyPower]);

  const keywordSegments = useMemo(() => {
    if (!deck) return [];
    return buildChartSegments(computeKeywordComposition([...deck.main, ...deck.material], cardsByName));
  }, [deck, cardsByName]);

  const damage = useMemo(() => {
    if (!deck) return null;
    return computeDamageComposition([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const damageTargetSegments = useMemo(() => (damage ? buildChartSegments(damage.targets) : []), [damage]);
  const damageTypeSegments = useMemo(() => (damage ? buildChartSegments(damage.conditionality) : []), [damage]);

  const memoryCurve = useMemo(() => {
    if (!deck) return [];
    return computeMemoryCostCurve([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const reserveCurve = useMemo(() => {
    if (!deck) return [];
    return computeReserveCostCurve([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const options = useQuery({ queryKey: ["option-definitions"], queryFn: gatcgApi.getOptionDefinitions });
  const raritySegments = useMemo(() => {
    if (!deck) return [];
    const counts = computeRarityBreakdown([...deck.main, ...deck.material], cardsByName);
    const labeled = new Map(
      Array.from(counts.entries()).map(([rarity, count]) => [
        options.data?.rarity.find((r) => r.value === String(rarity))?.display ?? `Rarity ${rarity}`,
        count,
      ]),
    );
    return buildChartSegments(labeled);
  }, [deck, cardsByName, options.data]);

  const priceByName = useDeckPriceByName();
  const priciestCards = useMemo(() => {
    if (!deck) return [];
    return [...deck.main, ...deck.material]
      .map((line) => {
        const unitPrice = priceByName.get(line.name);
        return unitPrice === undefined ? null : { name: line.name, quantity: line.quantity, total: unitPrice * line.quantity };
      })
      .filter((l): l is { name: string; quantity: number; total: number } => l !== null)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [deck, priceByName]);

  const instances = useMemo(() => {
    if (!deck || !popularityIndexData) return [];
    const deckIdSet = new Set(deck.deckIds);
    return popularityIndexData.entries
      .filter((e) => deckIdSet.has(e.deckId))
      .sort((a, b) => (a.placement ?? Infinity) - (b.placement ?? Infinity));
  }, [deck, popularityIndexData]);

  const instancesForList = useMemo(
    () =>
      instances.map((e) => ({
        deckId: e.deckId,
        player: e.player,
        eventId: e.eventId,
        eventName: eventNameById.get(e.eventId) ?? `Event #${e.eventId}`,
        placement: e.placement,
        wins: e.wins,
        losses: e.losses,
        ties: e.ties,
        underplaced: e.underplaced,
      })),
    [instances, eventNameById],
  );

  const sightingsByMonth = useMemo(() => {
    if (instances.length === 0) return [];
    const counts = new Map<string, number>();
    for (const s of instances) {
      const month = s.eventDate.slice(0, 7);
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    const months = Array.from(counts.keys()).sort();
    const [firstYear, firstMonth] = months[0].split("-").map(Number);
    const [lastYear, lastMonth] = months[months.length - 1].split("-").map(Number);
    const bars: { label: string; value: number }[] = [];
    for (let y = firstYear, m = firstMonth; y < lastYear || (y === lastYear && m <= lastMonth); m++) {
      if (m > 12) {
        m = 1;
        y++;
      }
      const key = `${y}-${String(m).padStart(2, "0")}`;
      bars.push({ label: key.slice(2), value: counts.get(key) ?? 0 });
    }
    return bars;
  }, [instances]);

  const similarityData = useSimilarityData();
  const deckIdToSignature = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of decks) {
      for (const id of d.deckIds) map.set(id, d.signature);
    }
    return map;
  }, [decks]);

  const similarDecks = useMemo(() => {
    if (!deck || !similarityData) return [];
    const bestScoreBySignature = new Map<string, number>();
    for (const deckId of deck.deckIds) {
      const entry = similarityData.decks.find((d) => d.deckId === deckId);
      if (!entry) continue;
      for (const match of entry.topMatches) {
        const targetSignature = deckIdToSignature.get(match.deckId);
        if (!targetSignature || targetSignature === deck.signature) continue;
        const existing = bestScoreBySignature.get(targetSignature);
        if (existing === undefined || match.score > existing) bestScoreBySignature.set(targetSignature, match.score);
      }
    }
    return Array.from(bestScoreBySignature.entries())
      .map(([signature, score]) => ({ deck: decks.find((d) => d.signature === signature), score }))
      .filter((s): s is { deck: (typeof decks)[number]; score: number } => !!s.deck)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [deck, similarityData, deckIdToSignature, decks]);

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  if (loading) {
    return (
      <PageLayout>
        <InlineState className="mt-10">Loading…</InlineState>
      </PageLayout>
    );
  }

  if (!deck) {
    return (
      <PageLayout>
        <EmptyState
          title="Deck not found"
          description="This deck isn't in the ingested data."
          action={<Link to="/decks?view=builds&minPlayers=2plus" className="text-ctp-blue hover:underline">&larr; Browse Decks</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Link to="/decks?view=builds&minPlayers=2plus" className="text-sm text-ctp-blue hover:underline">
        &larr; Browse Decks
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <CardHoverPreview image={championCard?.editions[0]?.image} alt={deck.championName ?? "Unknown champion"}>
          {championCard?.editions[0] ? (
            <CardImage
              image={championCard.editions[0].image}
              alt={deck.championName ?? ""}
              className="h-20 w-14 shrink-0 rounded object-cover object-top"
            />
          ) : (
            <div className="h-20 w-14 shrink-0 rounded bg-ctp-surface0" />
          )}
        </CardHoverPreview>

        <div>
          <h1 className="text-2xl font-bold text-ctp-blue">{deck.championName ?? "Unknown champion"}</h1>
          <p className="mt-1 text-sm text-ctp-subtext1">
            {deck.playerCount} player{deck.playerCount === 1 ? "" : "s"} · {deck.eventCount} event
            {deck.eventCount === 1 ? "" : "s"}
            {deck.bestPlacement !== null && ` · best finish #${deck.bestPlacement}`} ·{" "}
            {(deck.avgWinRate * 100).toFixed(0)}% avg win rate
            {deck.elements.length > 0 && ` · ${deck.elements.join("/")}`}
            {deck.classes.length > 0 && ` · ${deck.classes.join("/")}`}
            {deck.championName && (
              <>
                {" · "}
                <Link to="/regions?tab=champions" className="text-ctp-blue hover:underline">
                  Regional breakdown &rarr;
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} label="Deck data" />
      </div>

      {tab === "decklist" && rating && (
        <div className="mt-4">
          <DiaoScoreCard rating={rating}>
            {aggressionForecast && <AggressionForecast forecast={aggressionForecast} />}
          </DiaoScoreCard>
        </div>
      )}

      {tab === "decklist" && (
        <div className="mt-6">
          <DecklistView decklist={decklist} cardsByName={cardsByName} showThumbnails deckId={deck.deckIds[0]} championFallback={false} showDeckStats={false} />
          {displayPrefs.metaGaps && <DeckDecaySignals decklist={decklist} cardsByName={cardsByName} />}
          <DeckCollectionTools decklist={decklist} cardsByName={cardsByName} source={`Tournament build: ${deck.championName ?? "Unknown Champion"}`} />
        </div>
      )}

      {tab === "decklist" && !hasClusterMatch && (
        <Panel padding="sm" className="mt-6">
          <Section
            heading="dense"
            collapsible
            defaultOpen={false}
            title="Cards that might help"
            description={`Cards that correlate with a higher win rate among other ${deck.championName ?? "this Champion's"} decks — correlational, not a guarantee.`}
          >
          {championElementsPresent.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3">
              {championElementsPresent.map((element) => (
                <label key={element} className="flex items-center gap-1.5 text-xs text-ctp-subtext1">
                  <input
                    type="checkbox"
                    checked={selectedElements.includes(element)}
                    onChange={() => toggleElement(element)}
                    className="accent-ctp-blue"
                  />
                  {element}
                </label>
              ))}
            </div>
          )}
          {championImpact.cards.length === 0 ? (
            <InlineState className="mt-3 text-sm">
              {championImpact.loading
                ? "Loading…"
                : championImpact.totalDecks === 0
                  ? "No decks match these elements yet — try unchecking some."
                  : `Not enough with/without samples yet among ${championImpact.totalDecks} matching decks.`}
            </InlineState>
          ) : (
            <>
              <p className="mt-3 text-xs text-ctp-subtext0">
                Based on {championImpact.totalDecks} matching deck{championImpact.totalDecks === 1 ? "" : "s"}
                {isRecommendationPending && " — recalculating…"}
              </p>
              <CardImpactTable
                cards={championImpact.cards}
                cardImages={championImpactCardImages}
                withLabel="Win rate (with)"
                withoutLabel="Win rate (without)"
              />
            </>
          )}
          </Section>
        </Panel>
      )}

      {tab === "composition" && composition && (
        <Section className="mt-8" heading="compact" title="Composition">
          {(floatingMemory && (floatingMemory.base > 0 || floatingMemory.classBonus > 0)) ||
          (allyPower && allyPower.allyCopies > 0) ||
          (damage && (damage.championRange.max > 0 || damage.allyRange.max > 0)) ? (
            <p className="mt-1 text-sm text-ctp-subtext1">
              {floatingMemory && (floatingMemory.base > 0 || floatingMemory.classBonus > 0) && (
                <>
                  Floating Memory: {floatingMemory.base} · Class Bonus Floating Memory: {floatingMemory.classBonus}
                  {(allyPower?.allyCopies || damage) && " · "}
                </>
              )}
              {allyPower && allyPower.allyCopies > 0 && (
                <>
                  Average Ally Power: {formatAllyPower(allyPower)} (across {allyPower.allyCopies} allies)
                  {damage && (damage.championRange.max > 0 || damage.allyRange.max > 0) && " · "}
                </>
              )}
              {damage && damage.championRange.max > 0 && (
                <>
                  Direct Damage (champion): {damage.championRange.min}–{damage.championRange.max}
                  {damage.allyRange.max > 0 && " · "}
                </>
              )}
              {damage && damage.allyRange.max > 0 && (
                <>
                  Ally Damage: {damage.allyRange.min}–{damage.allyRange.max}
                </>
              )}
            </p>
          ) : null}

          <div className="mt-3">
            <CompositionChartGrid composition={composition} memoryCurve={memoryCurve} reserveCurve={reserveCurve} />
          </div>

          <Section className="mt-4" heading="dense" collapsible defaultOpen={false} title="Detailed breakdown" description="Rarity, ally power, keywords, and damage composition.">
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <RankedCompositionChart title="Rarity" segments={raritySegments} />
              <RankedCompositionChart title="Ally Power" segments={allyPowerSegments} />
              <RankedCompositionChart title="Keywords" segments={keywordSegments} />
              <DonutChart title="Damage Targets" segments={damageTargetSegments} />
              <DonutChart title="Damage Type" segments={damageTypeSegments} />
            </div>
          </Section>
        </Section>
      )}

      {tab === "decklist" && priciestCards.length > 0 && (
        <Section className="mt-8" heading="compact" collapsible defaultOpen={false} title="Priciest Cards">
          <ul className="mt-2 space-y-1 text-sm">
            {priciestCards.map((c) => {
              const card = cardsByName.get(c.name);
              return (
                <li key={c.name} className="flex items-baseline gap-1.5">
                  <span className="w-6 shrink-0 text-right text-ctp-subtext0">{c.quantity}x</span>
                  {card ? (
                    <CardHoverPreview image={card.editions[0]?.image} alt={c.name}>
                      <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                        {c.name}
                      </Link>
                    </CardHoverPreview>
                  ) : (
                    <span className="text-ctp-text">{c.name}</span>
                  )}
                  <span className="ml-auto shrink-0 text-ctp-subtext0">{formatUsd(c.total)}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {tab === "history" && sightingsByMonth.length > 1 && (
        <Section className="mt-8" heading="compact" title="Popularity Over Time">
          <div className="mt-2">
            <BarChart title="Sightings per Month" bars={sightingsByMonth} />
          </div>
        </Section>
      )}

      {tab === "similar" && (
        <Section className="mt-8" heading="compact" title="Similar Decks">
          {similarDecks.length > 0 ? (
            <div className="mt-2 space-y-1 text-sm">
              {similarDecks.map(({ deck: match, score }) => (
                <div key={match.signature} className="text-ctp-subtext1">
                  <Link to={`/decks/${shortHash(match.signature)}`} className="text-ctp-blue hover:underline">
                    {match.championName ?? "Unknown champion"}
                  </Link>
                  {match.elements.length > 0 && ` · ${match.elements.join("/")}`}
                  {match.classes.length > 0 && ` · ${match.classes.join("/")}`}{" "}
                  <span className="text-ctp-subtext0">({(score * 100).toFixed(0)}% similar)</span>
                </div>
              ))}
            </div>
          ) : (
            <InlineState className="mt-2 text-sm">
              No distinct similar decks found — every close match for this build turned out to be another copy of
              the exact same list, which doesn't count as "similar."
            </InlineState>
          )}
        </Section>
      )}

      {tab === "history" && instances.length > 0 && (
        <Section className="mt-8" heading="compact" title={`Played by (${instances.length})`}>
          <div className="mt-2">
            <TopDecksList decks={instancesForList} playerName={playerName} />
          </div>
        </Section>
      )}
    </PageLayout>
  );
}
