import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CardImpactRole } from "@gatcg/shared";
import { useArchetypeTaxonomyData, useCardImpactData } from "./data";
import { useDeckSightingsData } from "../topdecks/data";
import { useOmnidexPlayers } from "../tournaments/data";
import { useSightingDecklist } from "../topdecks/useSightingDecklist";
import { useCardsByNames } from "../events/useCardsByNames";
import DecklistView from "../events/DecklistView";
import TopDecksList from "../../components/TopDecksList";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { formatUsd } from "../../lib/format";
import { buildCompareLink } from "../compare/deepLink";

const ROLE_FILTERS: { key: CardImpactRole | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "main", label: "Main" },
  { key: "sideboard", label: "Sideboard" },
  { key: "mixed", label: "Mixed" },
];

type DetailTab = "overview" | "impact" | "decklist" | "playedBy";
const TAB_KEYS: DetailTab[] = ["overview", "impact", "decklist", "playedBy"];

export default function ArchetypeDetail() {
  const { id = "" } = useParams<{ id: string }>();

  const data = useArchetypeTaxonomyData();
  const sightingsData = useDeckSightingsData();
  const playersData = useOmnidexPlayers();
  const cardImpactData = useCardImpactData();
  const [roleFilter, setRoleFilter] = useState<CardImpactRole | "all">("all");
  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "overview");
  // Only reset when navigating from one build's page to a different one (same component instance
  // reused by the router) — not on initial mount, which would otherwise clobber a `?tab=` deep link.
  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      setTab("overview");
      prevIdRef.current = id;
    }
  }, [id, setTab]);

  const cluster = data?.clusters.find((c) => c.id === id);
  const impact = cardImpactData?.clusters.find((c) => c.clusterId === id);
  const impactCards = useMemo(() => {
    if (!impact) return [];
    return roleFilter === "all" ? impact.cards : impact.cards.filter((c) => c.role === roleFilter);
  }, [impact, roleFilter]);
  const impactCardImages = useCardsByNames(useMemo(() => impact?.cards.map((c) => c.cardName) ?? [], [impact]));
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
  const sample = useSightingDecklist(sampleEventId, samplePlayer, !!cluster);

  const instances = useMemo(() => {
    if (!cluster || !sightingsData) return [];
    const deckIdSet = new Set(cluster.deckIds);
    return sightingsData.sightings
      .filter((s) => deckIdSet.has(s.deckId))
      .sort((a, b) => b.weightedScore - a.weightedScore);
  }, [cluster, sightingsData]);

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

  const definingCardNames = useMemo(() => cluster?.definingCards.map((c) => c.name) ?? [], [cluster]);
  const allSampleCardNames = useMemo(() => {
    if (!sample.decklist) return definingCardNames;
    return [...definingCardNames, ...sample.decklist.main, ...sample.decklist.material, ...sample.decklist.sideboard].map(
      (c) => (typeof c === "string" ? c : c.card),
    );
  }, [sample.decklist, definingCardNames]);
  const cardImages = useCardsByNames(allSampleCardNames);

  function playerName(pid: number): string {
    return playersData?.players.find((p) => p.id === pid)?.username ?? `Player #${pid}`;
  }

  if (data && !cluster) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ctp-red">This build isn't in the ingested data (or hasn't cleared the sample-size threshold).</p>
        <Link to="/archetypes" className="mt-2 inline-block text-ctp-blue hover:underline">
          &larr; All archetypes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/archetypes" className="text-sm text-ctp-blue hover:underline">
        &larr; All archetypes
      </Link>

      {cluster && (
        <>
          <h1 className="mt-2 text-2xl font-bold text-ctp-blue">{cluster.name}</h1>
          <p className="mt-1 text-sm text-ctp-subtext1">
            <Link to={`/champions/${encodeURIComponent(cluster.championName)}`} className="text-ctp-blue hover:underline">
              {cluster.championName}
            </Link>{" "}
            · {cluster.playerCount} player{cluster.playerCount === 1 ? "" : "s"} · {cluster.deckCount} deck
            {cluster.deckCount === 1 ? "" : "s"} across {cluster.eventCount} event{cluster.eventCount === 1 ? "" : "s"} ·{" "}
            {(cluster.avgWinRate * 100).toFixed(0)}% avg win rate
          </p>
          <p className="mt-1 text-xs text-ctp-subtext0">
            {(cluster.metaShare * 100).toFixed(1)}% meta share · {(cluster.topCutRate * 100).toFixed(0)}% top cut rate
            {cluster.avgPlacement !== null && ` · avg placement #${cluster.avgPlacement.toFixed(0)}`}
            {cluster.avgPrice !== null && ` · avg deck price ${formatUsd(cluster.avgPrice)}`}
          </p>

          {cluster.trend && (
            <p className="mt-1 text-xs text-ctp-subtext0">
              {cluster.trend.previousSeasonName} &rarr; {cluster.trend.latestSeasonName}:{" "}
              <span className={cluster.trend.playerCountChange > 0 ? "text-ctp-green" : cluster.trend.playerCountChange < 0 ? "text-ctp-red" : ""}>
                {cluster.trend.playerCountChange > 0 ? "+" : ""}
                {cluster.trend.playerCountChange} players
              </span>{" "}
              ·{" "}
              <span className={cluster.trend.winRateChangePct > 0 ? "text-ctp-green" : cluster.trend.winRateChangePct < 0 ? "text-ctp-red" : ""}>
                {cluster.trend.winRateChangePct > 0 ? "+" : ""}
                {cluster.trend.winRateChangePct.toFixed(1)}pp win rate
              </span>
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-b border-ctp-surface1 pb-2">
            {(
              [
                { key: "overview", label: "Overview" },
                { key: "impact", label: "Card Impact" },
                { key: "decklist", label: "Sample Decklist" },
                { key: "playedBy", label: `Played By (${instances.length})` },
              ] as { key: DetailTab; label: string }[]
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

          {tab === "overview" && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Defining cards</h2>
              <p className="mt-1 text-xs text-ctp-subtext0">
                Cards common in this build but not typical of other {cluster.championName} decks — what actually
                distinguishes it.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {cluster.definingCards.map((dc) => {
                  const card = cardImages.get(dc.name);
                  return (
                    <CardHoverPreview key={dc.name} image={card?.editions[0]?.image} alt={dc.name}>
                      {card ? (
                        <Link
                          to={`/cards/${card.slug}`}
                          className="rounded-md border border-ctp-surface1 px-2 py-1 text-ctp-text hover:border-ctp-blue hover:text-ctp-blue"
                        >
                          {dc.name} <span className="text-ctp-subtext0">({(dc.prevalence * 100).toFixed(0)}%)</span>
                        </Link>
                      ) : (
                        <span className="rounded-md border border-ctp-surface1 px-2 py-1 text-ctp-text">
                          {dc.name} <span className="text-ctp-subtext0">({(dc.prevalence * 100).toFixed(0)}%)</span>
                        </span>
                      )}
                    </CardHoverPreview>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "impact" && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Card Impact</h2>
              <p className="mt-1 text-xs text-ctp-subtext0">
                Decks in this build with vs. without each card, and the win-rate difference — correlational, not a
                guarantee. Filter to Sideboard to see whether sideboard tech actually moves the needle.
              </p>
              {!impact || impact.cards.length === 0 ? (
                <p className="mt-3 text-sm text-ctp-subtext1">
                  Not enough with/without samples yet for this build to say anything meaningful about individual cards.
                </p>
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
                    <p className="mt-3 text-sm text-ctp-subtext1">No {roleFilter === "all" ? "" : `${roleFilter} `}cards match this filter.</p>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-max min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                            <th className="py-1 pr-6">Card</th>
                            <th className="py-1 pr-6">Role</th>
                            <th className="py-1 pr-6">Win rate (with)</th>
                            <th className="py-1 pr-6">Win rate (without)</th>
                            <th className="py-1 pr-6">Lift</th>
                            <th className="py-1">Sample</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                          {impactCards.map((c) => {
                            const card = impactCardImages.get(c.cardName);
                            return (
                              <tr key={c.cardName}>
                                <td className="py-1.5 pr-6 whitespace-nowrap">
                                  <CardHoverPreview image={card?.editions[0]?.image} alt={c.cardName}>
                                    {card ? (
                                      <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                                        {c.cardName}
                                      </Link>
                                    ) : (
                                      <span className="text-ctp-text">{c.cardName}</span>
                                    )}
                                  </CardHoverPreview>
                                </td>
                                <td className="py-1.5 pr-6 text-ctp-subtext1 capitalize">{c.role}</td>
                                <td className="py-1.5 pr-6 text-ctp-subtext1">{(c.avgWinRateWith * 100).toFixed(0)}%</td>
                                <td className="py-1.5 pr-6 text-ctp-subtext1">{(c.avgWinRateWithout * 100).toFixed(0)}%</td>
                                <td className={`py-1.5 pr-6 font-semibold ${c.adjustedLift >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
                                  {c.adjustedLift >= 0 ? "+" : ""}
                                  {(c.adjustedLift * 100).toFixed(1)}pp
                                </td>
                                <td className="py-1.5 text-xs text-ctp-subtext0">
                                  {c.deckCountWith} vs {c.deckCountWithout}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "decklist" && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Sample decklist</h2>
              <p className="mt-1 text-xs text-ctp-subtext0">One representative instance of this build.</p>
              <div className="mt-2">
                {sample.decklist ? (
                  <DecklistView decklist={sample.decklist} cardsByName={cardImages} showThumbnails />
                ) : (
                  <p className="text-sm text-ctp-subtext1">Loading…</p>
                )}
              </div>
            </div>
          )}

          {tab === "playedBy" && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Played by ({instances.length})</h2>
                {selectedInstances.length > 0 && (
                  <Link
                    to={buildCompareLink(selectedInstances.map((s) => ({ eventId: s.eventId, player: s.player })))}
                    className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0"
                  >
                    Compare {selectedInstances.length} selected &rarr;
                  </Link>
                )}
              </div>
              <p className="mt-1 text-xs text-ctp-subtext0">Check any of these instances to compare their decklists side by side.</p>
              <div className="mt-2">
                <TopDecksList
                  decks={instances}
                  playerName={playerName}
                  onToggleSelect={toggleSelect}
                  isSelected={(s) => selectedDeckIds.has(s.deckId)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
