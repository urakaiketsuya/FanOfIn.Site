import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { decodeCardLines, type OmnidexDecklist } from "@gatcg/shared";
import { useDeckPopularity, buildPopularDeck } from "../popular/useDeckPopularity";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useOmnidexPlayers, useEventNameById } from "../tournaments/data";
import { useCardImpactData, useMatchupCardImpactData, useSimilarityData, useDeckCardIndexData } from "../archetypes/data";
import { useCardsByNames } from "../events/useCardsByNames";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDeckWinConditions } from "./useDeckWinConditions";
import DeckWinConditions from "./DeckWinConditions";
import { useDeckTestResult } from "./useDeckTestResult";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import CardImpactTable from "../../components/CardImpactTable";
import { shortHash } from "../../lib/hash";
import { formatUsd } from "../../lib/format";
import TopDecksList from "../../components/TopDecksList";
import CardHoverPreview from "../../components/CardHoverPreview";
import ElementIcon from "../../components/ElementIcon";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import BarChart from "../../components/BarChart";
import UserDeckHeader from "../account/UserDeckHeader";
import UserDecklistPanel from "../account/UserDecklistPanel";
import UserDeckStats, { type DeckStatsTab } from "../account/UserDeckStats";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import { InlineState, EmptyState } from "../../components/ui/ContentState";
import MethodologyNote from "../../components/ui/MethodologyNote";

type DeckTab = "decklist" | "analysis" | "history" | "similar";

const TABS: { key: DeckTab; label: string }[] = [
  { key: "decklist", label: "Decklist" },
  { key: "analysis", label: "Analysis" },
  { key: "history", label: "History" },
  { key: "similar", label: "Similar Decks" },
];
const TAB_KEYS = TABS.map((t) => t.key);

/**
 * Same shared `UserDeckHeader`/`UserDecklistPanel`/`UserDeckStats` family `MyDeckDetail.tsx`/
 * `PublicDeckDetail.tsx`/`PantheonDeckDetail.tsx` all use — composition, not parameterization,
 * per the pattern established across the account decklist pages: this page just supplies its own
 * genuinely tournament-only extras (matchup Card Impact, this build's historical performance, win
 * conditions, priciest cards, sighting history, similar decks) alongside the shared core rather
 * than each page hand-rolling its own composition/Card-Impact/Aggression-Forecast implementation.
 * Omnidex tournament decks are always Standard format (Pantheon is a separate ShoutAtYourDecks-
 * sourced page/data source entirely), so `format="STANDARD"` is passed as a constant; there is no
 * single owner or `deckId` here (`deck.deckIds` is a many-to-one aggregation of every real
 * player/event that produced this exact card signature), so `ownerDeckId`/`previousDecklist` are
 * simply omitted, same as `PublicDeckDetail.tsx` already does for a deck it doesn't own.
 */
export default function DeckDetail() {
  const { hash = "" } = useParams<{ hash: string }>();
  const [tab, setTab] = useTabParam<DeckTab>("tab", TAB_KEYS, "decklist");

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
  const { interactions: winConditions } = useDeckWinConditions(allNames, cardsByName);
  // "Similar Decks" is already its own tab on this page, so nearestDecks is left empty here — only
  // classification/performance (this page's one genuinely new section) are read from the result.
  const deckCardCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of [...(deck?.main ?? []), ...(deck?.material ?? [])]) counts.set(line.name, line.quantity);
    return counts;
  }, [deck]);
  const { result: deckTestResult } = useDeckTestResult({ deckCardCounts, cardsByName, deckId: deck?.deckIds[0], nearestDecks: [] });

  // Precise, cluster-scoped "What beats this build" (Phase 21) only covers the ~128 named-build
  // clusters — most decks reachable from here (especially one-offs, since All Decks stopped
  // gating deck pages behind Popular Decks' 2+-player bar) have no cluster match. `UserDeckStats`
  // below already covers the broader Champion-wide fallback via its own `useChampionCardImpact`
  // call, so this page only needs to add the matchup-scoped case on top, never both.
  const cardImpactData = useCardImpactData();
  const myClusterId = deck ? cardImpactData?.deckClusterIndex[deck.deckIds[0]] : undefined;
  const hasClusterMatch = !!myClusterId;

  // "What beats this build" — same matchup-scoped opponent-card data ArchetypeDetail's own Card
  // Impact tab shows, just pre-filtered to this one deck's cluster instead of offering a build
  // picker. Only decks with a named-cluster match have this data (see hasClusterMatch's own doc
  // comment) — a one-off decklist with no cluster has nothing to key this off of.
  const matchupCardImpactData = useMatchupCardImpactData();
  // No "all opponents" aggregate here (unlike ArchetypeDetail's own Card Impact tab): each
  // matchup's lifts are scoped to its own population and aren't comparable across opponents (see
  // ArchetypeHurtYouView.tsx's doc comment), and the same card can appear as a hurt-you signal in
  // more than one matchup, so flattening them would produce duplicate React keys. Defaults to the
  // most-played matchup instead.
  const [opponentClusterId, setOpponentClusterId] = useState<string | null>(null);
  const clusterMatchups = useMemo(
    () => (matchupCardImpactData && myClusterId ? matchupCardImpactData.matchups.filter((m) => m.clusterId === myClusterId).sort((a, b) => b.games - a.games) : []),
    [matchupCardImpactData, myClusterId],
  );
  const selectedMatchup = clusterMatchups.find((m) => m.opponentClusterId === (opponentClusterId ?? clusterMatchups[0]?.opponentClusterId));
  const hurtYouCards = selectedMatchup?.opponentCards ?? [];
  const hurtYouCardImages = useCardsByNames(useMemo(() => hurtYouCards.map((c) => c.cardName), [hurtYouCards]));

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
      <PageLayout data-component="DeckDetail">
        <InlineState className="mt-10">Loading…</InlineState>
      </PageLayout>
    );
  }

  if (!deck) {
    return (
      <PageLayout data-component="DeckDetail">
        <EmptyState
          title="Deck not found"
          description="This deck isn't in the ingested data."
          action={<Link to="/decks?view=builds&minPlayers=2plus" className="text-ctp-blue hover:underline">&larr; Browse Decks</Link>}
        />
      </PageLayout>
    );
  }

  // Tournament-only sections `UserDeckStats` itself has no equivalent for — grouped into two of
  // its tab-switcher's tabs (via `extraTabs`) instead of stacking as their own accordions below it.
  const hasHistoricalPerformance = Boolean(deckTestResult && deckTestResult.classification.status !== "unclassified" && deckTestResult.classification.cluster && deckTestResult.performance);
  const hasMatchupData = hasClusterMatch && clusterMatchups.length > 0;
  const deckStatsExtraTabs: DeckStatsTab[] = [];
  if (hasHistoricalPerformance || winConditions.length > 0 || hasMatchupData) {
    deckStatsExtraTabs.push({
      key: "matchups",
      label: "Matchups & history",
      content: (
        <>
          {hasHistoricalPerformance && deckTestResult?.classification.cluster && deckTestResult.performance && (
            <Section heading="compact" title="Historical performance" description="How this build's matched named archetype has actually performed across every recorded match — not a prediction for this exact decklist.">
              <p className="mt-2 text-xs text-ctp-subtext0">
                Matches{" "}
                <Link to={`/archetypes/${deckTestResult.classification.cluster.id}`} className="text-ctp-blue hover:underline">
                  {deckTestResult.classification.cluster.name}
                </Link>{" "}
                ({(deckTestResult.classification.similarity * 100).toFixed(0)}% similar{deckTestResult.classification.status === "borderline" ? ", borderline" : ""})
              </p>
              <p className="mt-1 text-xs text-ctp-subtext0">
                {(deckTestResult.performance.winRate * 100).toFixed(0)}% avg win rate · {(deckTestResult.performance.topCutRate * 100).toFixed(0)}% top cut rate
                {deckTestResult.performance.avgPlacement !== null && ` · avg placement #${deckTestResult.performance.avgPlacement.toFixed(0)}`}
              </p>
              <p className="mt-1 text-xs text-ctp-subtext0">
                95% win-rate interval {(deckTestResult.performance.interval95.low * 100).toFixed(1)}–{(deckTestResult.performance.interval95.high * 100).toFixed(1)}%
                {` across ${deckTestResult.performance.interval95.matches.toLocaleString()} matches`}
                {` · ${deckTestResult.performance.deckCount} decks, ${deckTestResult.performance.playerCount} players, ${deckTestResult.performance.eventCount} events`}
                {deckTestResult.performance.confidence === "emerging" ? " · emerging signal" : ""}
              </p>
              {deckTestResult.performance.trend && (
                <p className="mt-1 text-xs text-ctp-subtext0">
                  {deckTestResult.performance.trend.previousSeasonName} → {deckTestResult.performance.trend.latestSeasonName}:{" "}
                  <span
                    className={
                      deckTestResult.performance.trend.playerCountChange > 0 ? "text-ctp-green" : deckTestResult.performance.trend.playerCountChange < 0 ? "text-ctp-red" : ""
                    }
                  >
                    {deckTestResult.performance.trend.playerCountChange > 0 ? "+" : ""}
                    {deckTestResult.performance.trend.playerCountChange} players
                  </span>{" "}
                  ·{" "}
                  <span
                    className={
                      deckTestResult.performance.trend.winRateChangePct > 0 ? "text-ctp-green" : deckTestResult.performance.trend.winRateChangePct < 0 ? "text-ctp-red" : ""
                    }
                  >
                    {deckTestResult.performance.trend.winRateChangePct > 0 ? "+" : ""}
                    {deckTestResult.performance.trend.winRateChangePct.toFixed(1)}pp win rate
                  </span>
                </p>
              )}
              {deckTestResult.cautions.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-ctp-subtext0">
                  {deckTestResult.cautions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              <MethodologyNote anchor="classification">How this match and its confidence tier are determined.</MethodologyNote>
            </Section>
          )}

          {winConditions.length > 0 && (
            <Section heading="compact" className={hasHistoricalPerformance ? "mt-6" : undefined} title="How this deck wins" description="Card interactions detected from rules text and, where a real deck confirms them, cross-deck co-occurrence — not a win-rate claim, and not exclusive with the sections below.">
              <DeckWinConditions interactions={winConditions} cardsByName={cardsByName} />
            </Section>
          )}

          {hasMatchupData && (
            <Section heading="compact" className={hasHistoricalPerformance || winConditions.length > 0 ? "mt-6" : undefined} title="What beats this build" description="Opponent cards that correlate with beating this build, from real pairing outcomes — correlational, not a guarantee.">
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-ctp-subtext0">Vs:</span>
                <select
                  value={opponentClusterId ?? clusterMatchups[0]?.opponentClusterId ?? ""}
                  aria-label="Opponent build"
                  onChange={(e) => setOpponentClusterId(e.target.value)}
                  className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
                >
                  {clusterMatchups.map((m) => (
                    <option key={m.opponentClusterId} value={m.opponentClusterId}>
                      {m.opponentClusterName} ({m.games} games)
                    </option>
                  ))}
                </select>
                {selectedMatchup && (
                  <span className="text-ctp-subtext0">{(selectedMatchup.baselineWinRate * 100).toFixed(0)}% win rate in this matchup</span>
                )}
              </div>
              {hurtYouCards.length === 0 ? (
                <InlineState className="mt-3 text-sm">Not enough recorded games yet for a card-by-card breakdown.</InlineState>
              ) : (
                <CardImpactTable
                  cards={hurtYouCards}
                  cardImages={hurtYouCardImages}
                  withLabel="Your win rate (they have it)"
                  withoutLabel="Your win rate (they don't)"
                />
              )}
            </Section>
          )}
        </>
      ),
    });
  }
  if (priciestCards.length > 0) {
    deckStatsExtraTabs.push({
      key: "pricing",
      label: "Pricing",
      content: (
        <ul className="space-y-1 text-sm">
          {priciestCards.map((c) => {
            const card = cardsByName.get(c.name);
            return (
              <li key={c.name} className="flex items-baseline gap-1.5">
                <span className="w-6 shrink-0 text-right text-ctp-subtext0">{c.quantity}x</span>
                {card && card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
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
      ),
    });
  }

  return (
    <PageLayout data-component="DeckDetail">
      <Link to="/decks?view=builds&minPlayers=2plus" className="text-sm text-ctp-blue hover:underline">
        &larr; Browse Decks
      </Link>

      <UserDeckHeader
        title={deck.championName ?? "Unknown champion"}
        championName={deck.championName}
        format="STANDARD"
        statLine={
          <>
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
          </>
        }
      />

      <div className="mt-6">
        <Tabs tabs={TABS} active={tab} onChange={setTab} label="Deck data" baseId="deck-detail" />
      </div>

      <TabPanel baseId="deck-detail" tab="decklist" active={tab}>
        <UserDecklistPanel decklist={decklist} format="STANDARD" collectionSource={`Tournament build: ${deck.championName ?? "Unknown Champion"}`} />
      </TabPanel>

      <TabPanel baseId="deck-detail" tab="analysis" active={tab}>
        <UserDeckStats decklist={decklist} championName={deck.championName} format="STANDARD" title={deck.championName ?? "Deck"} extraTabs={deckStatsExtraTabs} />
      </TabPanel>

      <TabPanel baseId="deck-detail" tab="history" active={tab}>
        {sightingsByMonth.length > 1 && (
          <Section className="mt-8" heading="compact" title="Popularity Over Time">
            <div className="mt-2">
              <BarChart title="Sightings per Month" bars={sightingsByMonth} />
            </div>
          </Section>
        )}
        {instances.length > 0 && (
          <Section className="mt-8" heading="compact" title={`Played by (${instances.length})`}>
            <div className="mt-2">
              <TopDecksList decks={instancesForList} playerName={playerName} />
            </div>
          </Section>
        )}
      </TabPanel>

      <TabPanel baseId="deck-detail" tab="similar" active={tab}>
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
      </TabPanel>
    </PageLayout>
  );
}
