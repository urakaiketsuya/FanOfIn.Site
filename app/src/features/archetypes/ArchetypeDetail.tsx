import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CardImpactRole } from "@gatcg/shared";
import { useArchetypeTaxonomyData, useCardImpactData, useCardQuantityStatsData, useMatchupCardImpactData } from "./data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { usePlayerNameById, useEventNameById } from "../tournaments/data";
import { useSightingDecklist } from "../topdecks/useSightingDecklist";
import { useCardsByNames } from "../events/useCardsByNames";
import DecklistView from "../events/DecklistView";
import TopDecksList from "../../components/TopDecksList";
import { toTopDecksListEntry } from "../topdecks/topDecksListEntry";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImpactTable from "../../components/CardImpactTable";
import StaleDataNotice from "../../components/StaleDataNotice";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { championNameToSlug } from "../../lib/championSlug";
import Tabs from "../../components/ui/Tabs";
import { formatUsd } from "../../lib/format";
import { buildCompareLink } from "../compare/deepLink";
import { useAllDecodedDecks } from "../../lib/decodedDecks";
import { useArchetypeVariants } from "./useArchetypeVariants";
import { DefiningCardList, QuantityStatsSection, variantToDecklist } from "./ArchetypeDetailViews";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import PageHeader from "../../components/ui/PageHeader";
import { InlineState, EmptyState } from "../../components/ui/ContentState";

const ROLE_FILTERS: { key: CardImpactRole | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "main", label: "Main" },
  { key: "material", label: "Material" },
  { key: "sideboard", label: "Sideboard" },
  { key: "mixed", label: "Mixed" },
];

type DetailTab = "overview" | "impact" | "decklist" | "playedBy" | "variants";
type DetailSurface = "overview" | "decks" | "more";
const TAB_KEYS: DetailTab[] = ["overview", "impact", "decklist", "playedBy", "variants"];
const SURFACES: { key: DetailSurface; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "decks", label: "Decks" },
  { key: "more", label: "More" },
];
const OVERVIEW_TABS: DetailTab[] = ["overview", "decklist"];
const MORE_TABS: { key: Extract<DetailTab, "impact" | "variants">; label: string }[] = [
  { key: "impact", label: "Card impact" },
  { key: "variants", label: "Variants" },
];

export default function ArchetypeDetail() {
  const { id = "" } = useParams<{ id: string }>();

  const [roleFilter, setRoleFilter] = useState<CardImpactRole | "all">("all");
  const [opponentClusterId, setOpponentClusterId] = useState<string>("all");
  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "overview");
  const surface: DetailSurface = OVERVIEW_TABS.includes(tab) ? "overview" : tab === "playedBy" ? "decks" : "more";
  const moreTab = MORE_TABS.some((item) => item.key === tab) ? tab as "impact" | "variants" : "impact";
  const showOverview = surface === "overview";

  // Gate every large per-tab dataset behind the tab that actually needs it — this page used to
  // eagerly fetch playedBy's popularity-index/omnidex-index/players data (~25.7MB) and impact's
  // card-impact/matchup-card-impact/quantity-stats data (matchup-card-impact.json alone is 24MB)
  // on every visit regardless of which tab (if any) the visitor opened, same class of bug just
  // fixed on CardDetail.tsx. Same `enabled` pattern already used by useAllDecodedDecks below for
  // the Variants tab.
  const data = useArchetypeTaxonomyData();
  const popularityIndexData = useDeckPopularityIndexData(surface === "decks");
  const eventNameById = useEventNameById(surface === "decks");
  const playerName = usePlayerNameById(surface === "decks");
  const cardImpactData = useCardImpactData(surface === "more" && moreTab === "impact");
  const matchupCardImpactData = useMatchupCardImpactData(surface === "more" && moreTab === "impact");
  const cardQuantityStatsData = useCardQuantityStatsData(surface === "more" && moreTab === "impact");
  // Only reset when navigating from one build's page to a different one (same component instance
  // reused by the router) — not on initial mount, which would otherwise clobber a `?tab=` deep link.
  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      setTab("overview");
      setOpponentClusterId("all");
      setVariantMinSimilarity(0.45);
      setVariantChampionFilter("all");
      setExpandedVariantDeckId(null);
      prevIdRef.current = id;
    }
  }, [id, setTab]);

  const resolvedId = data?.aliases?.[id] ?? id;
  const cluster = data?.clusters.find((c) => c.id === resolvedId);
  const materialArchetype = data?.materialArchetypes?.find((route) => route.id === cluster?.materialArchetypeId);
  const strategyArchetype = data?.strategyArchetypes?.find((strategy) => strategy.id === cluster?.strategyArchetypeId);
  const siblingBuilds = materialArchetype
    ? materialArchetype.buildIds.map((buildId) => data?.clusters.find((candidate) => candidate.id === buildId)).filter((candidate): candidate is NonNullable<typeof cluster> => !!candidate)
    : [];
  const impact = cardImpactData?.clusters.find((c) => c.clusterId === id);
  const clusterMatchups = useMemo(() => {
    if (!matchupCardImpactData) return [];
    return matchupCardImpactData.matchups.filter((m) => m.clusterId === id).sort((a, b) => b.games - a.games);
  }, [matchupCardImpactData, id]);
  const selectedMatchup = opponentClusterId === "all" ? null : clusterMatchups.find((m) => m.opponentClusterId === opponentClusterId) ?? null;

  // "myCards" is either the general (all-opponents) table or, with a matchup selected, that
  // matchup's card breakdown — same shape, same role filter, same table component either way.
  const activeCards = useMemo(() => selectedMatchup ? selectedMatchup.myCards : (impact?.cards ?? []), [selectedMatchup, impact]);
  const hasActiveData = selectedMatchup ? selectedMatchup.games > 0 : !!impact && impact.cards.length > 0;
  const impactCards = useMemo(() => {
    return roleFilter === "all" ? activeCards : activeCards.filter((c) => c.role === roleFilter);
  }, [activeCards, roleFilter]);
  const impactCardImages = useCardsByNames(
    useMemo(() => {
      const names = new Set<string>();
      for (const c of impact?.cards ?? []) names.add(c.cardName);
      for (const m of clusterMatchups) {
        for (const c of m.myCards) names.add(c.cardName);
        for (const c of m.opponentCards) names.add(c.cardName);
        // `?? []` guards a stale IndexedDB copy from before `answers` existed on this type.
        for (const a of m.answers ?? []) for (const c of a.answers) names.add(c.cardName);
      }
      return Array.from(names);
    }, [impact, clusterMatchups]),
  );
  useDocumentTitle(
    cluster?.name,
    cluster &&
      `${cluster.name} — a ${cluster.championName} build defined by ${cluster.definingCards
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ")}, played by ${cluster.playerCount} players in Grand Archive TCG tournaments.`,
  );

  const [sampleEventId, samplePlayer] = useMemo(() => {
    const first = cluster?.deckIds[0];
    if (!first) return [0, 0];
    const [eventId, player] = first.split(":").map(Number);
    return [eventId, player];
  }, [cluster]);
  const sample = useSightingDecklist(sampleEventId, samplePlayer, !!cluster && showOverview);

  // Only decoded once the Variants tab is actually open — this is a genuinely expensive decode of
  // the full ~57k-deck universe (deck-card-index.json is 93MB+), so paying it on every archetype
  // page visit regardless of which tab is open was itself a real memory-pressure bug; see
  // useAllDecodedDecks's own doc comment.
  const allDecodedDecks = useAllDecodedDecks(surface === "more" && moreTab === "variants");
  const variants = useArchetypeVariants(cluster, allDecodedDecks.decks);
  const [expandedVariantDeckId, setExpandedVariantDeckId] = useState<string | null>(null);
  const [variantMinSimilarity, setVariantMinSimilarity] = useState(0.45);
  const [variantChampionFilter, setVariantChampionFilter] = useState<string>("all");
  const variantChampions = useMemo(
    () => Array.from(new Set(variants.map((v) => v.championName).filter((n): n is string => n !== null))).sort(),
    [variants],
  );
  const filteredVariants = useMemo(
    () =>
      variants.filter(
        (v) => v.similarity >= variantMinSimilarity && (variantChampionFilter === "all" || v.championName === variantChampionFilter),
      ),
    [variants, variantMinSimilarity, variantChampionFilter],
  );

  const instances = useMemo(() => {
    if (!cluster || !popularityIndexData) return [];
    const deckIdSet = new Set(cluster.deckIds);
    return popularityIndexData.entries
      .filter((e) => deckIdSet.has(e.deckId))
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .map((entry) => toTopDecksListEntry(entry, eventNameById));
  }, [cluster, popularityIndexData, eventNameById]);

  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  function toggleSelect(s: { deckId: string }) {
    setSelectedDeckIds((prev) => {
      const next = new Set(prev);
      if (next.has(s.deckId)) next.delete(s.deckId);
      else next.add(s.deckId);
      return next;
    });
  }
  const selectedInstances = instances.filter((s) => selectedDeckIds.has(s.deckId));

  const definingCardNames = useMemo(
    () => [...(cluster?.materialDefiningCards ?? []), ...(cluster?.definingCards ?? [])].map((c) => c.name),
    [cluster],
  );
  // This build's own defining cards, restricted to ones with a real quantity-vs-win-rate signal
  // (published only for cards run at 2+ distinct quantities across public decklists) — same
  // "Win rate by quantity" convention CardDetail.tsx already uses, just scoped to this build.
  const definingQuantityStats = useMemo(() => {
    if (!cardQuantityStatsData) return [];
    const names = new Set(definingCardNames);
    return cardQuantityStatsData.cards.filter((c) => names.has(c.name) && c.quantities.length >= 2);
  }, [cardQuantityStatsData, definingCardNames]);
  const allSampleCardNames = useMemo(() => {
    const names = new Set(definingCardNames);
    if (sample.decklist) {
      for (const c of [...sample.decklist.main, ...sample.decklist.material, ...sample.decklist.sideboard]) names.add(c.card);
    }
    for (const v of variants) {
      for (const name of v.main.keys()) names.add(name);
      for (const name of v.material.keys()) names.add(name);
      for (const name of v.sideboard.keys()) names.add(name);
    }
    return Array.from(names);
  }, [sample.decklist, definingCardNames, variants]);
  const cardImages = useCardsByNames(allSampleCardNames);

  if (data && !cluster) {
    return (
      <PageLayout data-component="ArchetypeDetail">
        <EmptyState
          title="Build not found"
          description="This build isn't in the ingested data (or hasn't cleared the sample-size threshold)."
          action={<Link to="/archetypes" className="text-ctp-blue hover:underline">&larr; All archetypes</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout data-component="ArchetypeDetail">
      {cluster && (
        <>
          <PageHeader
            title={cluster.name}
            eyebrow={<Link to="/archetypes" className="hover:underline">&larr; All archetypes</Link>}
            description={
              <span className="flex flex-wrap items-center gap-2">
                <ArchetypeElementIcon name={cluster.name} size={20} />
                <Link to={`/champions/${championNameToSlug(cluster.championName)}`} className="text-ctp-blue hover:underline">{cluster.championName}</Link>
                {cluster.confidence === "emerging" && <span className="rounded-full bg-ctp-yellow/15 px-2 py-0.5 text-xs font-medium text-ctp-yellow">Emerging</span>}
              </span>
            }
            actions={
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-ctp-mantle px-3 py-2"><strong className="block text-base text-ctp-text">{(cluster.avgWinRate * 100).toFixed(0)}%</strong><span className="text-[10px] uppercase text-ctp-subtext0">Win rate</span></div>
                <div className="rounded-lg bg-ctp-mantle px-3 py-2"><strong className="block text-base text-ctp-text">{cluster.deckCount}</strong><span className="text-[10px] uppercase text-ctp-subtext0">Decks</span></div>
                <div className="rounded-lg bg-ctp-mantle px-3 py-2"><strong className="block text-base text-ctp-text">{cluster.eventCount}</strong><span className="text-[10px] uppercase text-ctp-subtext0">Events</span></div>
              </div>
            }
          />
          <StaleDataNotice generatedAt={[data?.generatedAt]} />
          <Tabs tabs={SURFACES} active={surface} onChange={(next) => setTab(next === "overview" ? "overview" : next === "decks" ? "playedBy" : moreTab)} label={`${cluster.name} details`} variant="pill" />

          {showOverview && (
            <div className="mt-6">
              <Panel className="mb-6">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ctp-subtext1">
                  <span><strong className="text-ctp-text">{(cluster.metaShare * 100).toFixed(1)}%</strong> meta</span>
                  <span><strong className="text-ctp-text">{(cluster.topCutRate * 100).toFixed(0)}%</strong> top cut</span>
                  <span><strong className="text-ctp-text">{cluster.playerCount}</strong> players</span>
                  {cluster.avgPrice !== null && <span><strong className="text-ctp-text">{formatUsd(cluster.avgPrice)}</strong> average price</span>}
                  <Link to="/regions?tab=archetypes" className="ml-auto text-ctp-blue hover:underline">Regions &rarr;</Link>
                </div>
                {(materialArchetype || strategyArchetype || siblingBuilds.length > 1) && (
                  <details className="group mt-3 border-t border-ctp-surface0 pt-3">
                    <summary className="cursor-pointer text-xs text-ctp-blue">Build family</summary>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ctp-subtext1">
                      {materialArchetype && <span>Material: <strong className="text-ctp-text">{materialArchetype.name}</strong></span>}
                      {strategyArchetype && <span>Main: <strong className="text-ctp-text">{strategyArchetype.name}</strong></span>}
                      {siblingBuilds.length > 1 && siblingBuilds.map((build) => build.id === cluster.id ? <span key={build.id} className="font-medium text-ctp-text">{build.name}</span> : <Link key={build.id} to={`/archetypes/${build.id}`} className="text-ctp-blue hover:underline">{build.name}</Link>)}
                    </div>
                  </details>
                )}
              </Panel>
              {(cluster.materialDefiningCards ?? []).length > 0 && (
                <Section
                  heading="compact"
                  title="Material build path"
                >
                  <DefiningCardList cards={cluster.materialDefiningCards} cardImages={cardImages} tone="material" />
                </Section>
              )}
              <Section
                heading="compact"
                className={(cluster.materialDefiningCards ?? []).length > 0 ? "mt-6" : ""}
                title="Defining cards"
              >
                <DefiningCardList cards={cluster.definingCards} cardImages={cardImages} />
              </Section>
              <Section className="mt-6" heading="compact" title="Representative decklist">
                <div className="mt-2">
                  {sample.decklist ? (
                    <DecklistView decklist={sample.decklist} cardsByName={cardImages} showThumbnails />
                  ) : (
                    <InlineState className="text-sm">{sample.loading ? "Loading…" : "No representative decklist is available."}</InlineState>
                  )}
                </div>
              </Section>
            </div>
          )}

          {surface === "more" && (
            <div className="mt-5 flex flex-wrap gap-2" aria-label="More build data">
              {MORE_TABS.map((item) => <Chip key={item.key} active={moreTab === item.key} onClick={() => setTab(item.key)}>{item.label}</Chip>)}
            </div>
          )}

          {surface === "more" && moreTab === "impact" && (
            <Section
              className="mt-6"
              heading="compact"
              title="Card Impact"
              description={
                <>
                  Decks in this build with vs. without each card, and the win-rate difference. Filter to Sideboard to
                  see whether sideboard tech actually moves the needle.{" "}
                  <Link to="/methodology#classification" className="text-ctp-blue hover:underline">Learn more</Link>
                </>
              }
            >
              {clusterMatchups.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-ctp-subtext0">Vs:</span>
                  <select
                    value={opponentClusterId}
                    aria-label="Opponent build"
                    onChange={(e) => setOpponentClusterId(e.target.value)}
                    className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
                  >
                    <option value="all">All opponents</option>
                    {clusterMatchups.map((m) => (
                      <option key={m.opponentClusterId} value={m.opponentClusterId}>
                        {m.opponentClusterName} ({m.games} games)
                      </option>
                    ))}
                  </select>
                  {selectedMatchup && (
                    <span className="text-ctp-subtext0">
                      {(selectedMatchup.baselineWinRate * 100).toFixed(0)}% win rate in this matchup
                    </span>
                  )}
                </div>
              )}

              {!hasActiveData ? (
                <InlineState className="mt-3 text-sm">
                  {selectedMatchup
                    ? `No recorded games against ${selectedMatchup.opponentClusterName} yet.`
                    : "Not enough with/without samples yet for this build to say anything meaningful about individual cards."}
                </InlineState>
              ) : activeCards.length === 0 ? (
                <InlineState className="mt-3 text-sm">
                  {selectedMatchup
                    ? `${selectedMatchup.games} game${selectedMatchup.games === 1 ? "" : "s"} recorded against ${selectedMatchup.opponentClusterName}, but not enough for a card-by-card breakdown yet.`
                    : "Not enough with/without samples yet for this build to say anything meaningful about individual cards."}
                </InlineState>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ROLE_FILTERS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setRoleFilter(f.key)}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          roleFilter === f.key ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {impactCards.length === 0 ? (
                    <InlineState className="mt-3 text-sm">No {roleFilter === "all" ? "" : `${roleFilter} `}cards match this filter.</InlineState>
                  ) : (
                    <CardImpactTable
                      cards={impactCards}
                      cardImages={impactCardImages}
                      withLabel="Win rate (with)"
                      withoutLabel="Win rate (without)"
                    />
                  )}
                </>
              )}

              {selectedMatchup && selectedMatchup.opponentCards.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-ctp-red uppercase tracking-wide">Cards that hurt you</h3>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    When {selectedMatchup.opponentClusterName} plays these (any section of their deck), your win rate
                    against them tends to be worse.{" "}
                    <Link to="/methodology#classification" className="text-ctp-blue hover:underline">Learn more</Link>
                  </p>
                  <CardImpactTable
                    cards={selectedMatchup.opponentCards}
                    cardImages={impactCardImages}
                    withLabel="Your win rate (they have it)"
                    withoutLabel="Your win rate (they don't)"
                  />
                </div>
              )}

              {selectedMatchup && (selectedMatchup.answers?.length ?? 0) > 0 && (
                <details className="group mt-6">
                  <summary className="flex cursor-pointer list-none items-baseline gap-1.5 [&::-webkit-details-marker]:hidden">
                    <span aria-hidden="true" className="inline-block text-ctp-green transition-transform group-open:rotate-90">&#9656;</span>
                    <h3 className="text-sm font-semibold text-ctp-green uppercase tracking-wide">Possible answers</h3>
                  </summary>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    For each card above, cards of your own that correlate with doing better specifically in the games
                    where the opponent had it.{" "}
                    <Link to="/methodology#classification" className="text-ctp-blue hover:underline">Learn more</Link>
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-max min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                          <th className="py-1 pr-6">Their card</th>
                          <th className="py-1 pr-6">Your answer</th>
                          <th className="py-1 pr-6">Role</th>
                          <th className="py-1 pr-6">Mitigation</th>
                          <th className="py-1 pr-6">Sample</th>
                          <th className="py-1">Scope</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                        {(selectedMatchup.answers ?? []).flatMap((oa) =>
                          oa.answers.map((a) => {
                            const theirCard = impactCardImages.get(oa.opponentCardName);
                            const answerCard = impactCardImages.get(a.cardName);
                            return (
                              <tr key={`${oa.opponentCardName}::${a.cardName}`}>
                                <td className="py-1.5 pr-6 whitespace-nowrap">
                                  <CardHoverPreview image={theirCard?.editions[0]?.image} alt={oa.opponentCardName}>
                                    {theirCard ? (
                                      <Link to={`/cards/${theirCard.slug}`} className="text-ctp-text hover:text-ctp-blue">
                                        {oa.opponentCardName}
                                      </Link>
                                    ) : (
                                      <span className="text-ctp-text">{oa.opponentCardName}</span>
                                    )}
                                  </CardHoverPreview>
                                </td>
                                <td className="py-1.5 pr-6 whitespace-nowrap">
                                  <CardHoverPreview image={answerCard?.editions[0]?.image} alt={a.cardName}>
                                    {answerCard ? (
                                      <Link to={`/cards/${answerCard.slug}`} className="text-ctp-text hover:text-ctp-blue">
                                        {a.cardName}
                                      </Link>
                                    ) : (
                                      <span className="text-ctp-text">{a.cardName}</span>
                                    )}
                                  </CardHoverPreview>
                                </td>
                                <td className="py-1.5 pr-6 text-ctp-subtext1 capitalize">{a.role}</td>
                                <td className="py-1.5 pr-6 font-semibold text-ctp-green">+{(a.mitigation * 100).toFixed(1)}pp</td>
                                <td className="py-1.5 pr-6 text-xs text-ctp-subtext0">
                                  {a.sampleWithAnswer} vs {a.sampleWithoutAnswer}
                                </td>
                                <td className="py-1.5 text-xs">
                                  {a.scope === "champion" ? (
                                    <span className="text-ctp-yellow" title={`Based on the broader ${cluster.championName} matchup, not this specific build — this build's own matchup sample didn't have enough data.`}>
                                      Champion-wide
                                    </span>
                                  ) : (
                                    <span className="text-ctp-subtext0">This build</span>
                                  )}
                                </td>
                              </tr>
                            );
                          }),
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </Section>
          )}

          {surface === "more" && moreTab === "impact" && <QuantityStatsSection cards={definingQuantityStats} />}

          {surface === "decks" && (
            <Section
              className="mt-6"
              heading="compact"
              title={`Played by (${instances.length})`}
              description="Check any of these instances to compare their decklists side by side."
              actions={selectedInstances.length > 0 && (
                <Link
                  to={buildCompareLink(selectedInstances.map((s) => ({ eventId: s.eventId, player: s.player })))}
                  className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0"
                >
                  Compare {selectedInstances.length} selected &rarr;
                </Link>
              )}
            >
              <div className="mt-2">
                <TopDecksList
                  decks={instances}
                  playerName={playerName}
                  onToggleSelect={toggleSelect}
                  isSelected={(s) => selectedDeckIds.has(s.deckId)}
                />
              </div>
            </Section>
          )}

          {surface === "more" && moreTab === "variants" && (
            <Section
              className="mt-6"
              heading="compact"
              title={`Variants (${variants.length})`}
              description={<>Real decks close to this build (&ge;45% weighted overlap) but not identical to any other player's list, so they never joined this cluster's own stats. Shown separately — not blended into this build's win rate, defining cards, or meta share above.</>}
            >
              {variants.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-ctp-subtext0">Min overlap:</span>
                  <select
                    value={variantMinSimilarity}
                    aria-label="Minimum overlap"
                    onChange={(e) => setVariantMinSimilarity(Number(e.target.value))}
                    className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
                  >
                    <option value={0.45}>45%+ (all)</option>
                    <option value={0.6}>60%+</option>
                    <option value={0.75}>75%+</option>
                    <option value={0.9}>90%+</option>
                  </select>
                  {variantChampions.length > 1 && (
                    <>
                      <span className="ml-2 text-ctp-subtext0">Champion:</span>
                      <select
                        value={variantChampionFilter}
                        aria-label="Champion"
                        onChange={(e) => setVariantChampionFilter(e.target.value)}
                        className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
                      >
                        <option value="all">All ({variantChampions.length})</option>
                        {variantChampions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <span className="ml-auto text-ctp-subtext0">
                    Showing {filteredVariants.length} of {variants.length}
                  </span>
                </div>
              )}
              {allDecodedDecks.loading ? (
                <InlineState className="mt-3 text-sm">Loading…</InlineState>
              ) : variants.length === 0 ? (
                <InlineState className="mt-3 text-sm">No close variants found for this build.</InlineState>
              ) : filteredVariants.length === 0 ? (
                <InlineState className="mt-3 text-sm">No variants match these filters.</InlineState>
              ) : (
                <div className="mt-2 divide-y divide-ctp-surface0">
                  {filteredVariants.map((v) => {
                    const [variantEventId, variantPlayer] = v.deckId.split(":").map(Number);
                    const isExpanded = expandedVariantDeckId === v.deckId;
                    return (
                      <div key={v.deckId} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-ctp-text">
                            {v.championName ? (
                              <Link to={`/champions/${championNameToSlug(v.championName)}`} className="text-ctp-blue hover:underline">
                                {v.championName}
                              </Link>
                            ) : (
                              <span className="text-ctp-subtext0">Unknown Champion</span>
                            )}
                            {v.spiritName && <span className="text-ctp-subtext0"> + {v.spiritName}</span>}
                            <span className="ml-2 text-xs text-ctp-subtext0">
                              {(v.similarity * 100).toFixed(0)}% overlap · {(v.winRate * 100).toFixed(0)}% win rate
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {(v.addedCards.length > 0 || v.missingCards.length > 0) && (
                              <span>
                                {v.addedCards.length > 0 && <span className="text-ctp-green">+{v.addedCards.length}</span>}
                                {v.addedCards.length > 0 && v.missingCards.length > 0 && " / "}
                                {v.missingCards.length > 0 && <span className="text-ctp-red">-{v.missingCards.length}</span>}
                              </span>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setExpandedVariantDeckId(isExpanded ? null : v.deckId)}
                            >
                              {isExpanded ? "Hide decklist" : "View decklist"}
                            </Button>
                            {!Number.isNaN(variantEventId) && !Number.isNaN(variantPlayer) && !Number.isNaN(sampleEventId) && !Number.isNaN(samplePlayer) && (
                              <Link
                                to={buildCompareLink([
                                  { eventId: variantEventId, player: variantPlayer },
                                  { eventId: sampleEventId, player: samplePlayer },
                                ])}
                                className="rounded-md border border-ctp-blue px-2 py-1 text-ctp-blue hover:bg-ctp-surface0"
                              >
                                Compare to sample &rarr;
                              </Link>
                            )}
                          </div>
                        </div>
                        {(v.addedCards.length > 0 || v.missingCards.length > 0) && (
                          <p className="mt-1 text-xs text-ctp-subtext0">
                            {v.addedCards.length > 0 && <>Added: {v.addedCards.join(", ")}</>}
                            {v.addedCards.length > 0 && v.missingCards.length > 0 && " — "}
                            {v.missingCards.length > 0 && <>Missing: {v.missingCards.join(", ")}</>}
                          </p>
                        )}
                        {isExpanded && (
                          <div className="mt-3">
                            <DecklistView decklist={variantToDecklist(v)} cardsByName={cardImages} showThumbnails />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}
        </>
      )}
    </PageLayout>
  );
}
