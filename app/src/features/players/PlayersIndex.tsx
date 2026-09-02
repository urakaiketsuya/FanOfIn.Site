import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import { useOmnidexPlayers, useOmnidexJudges } from "../tournaments/data";
import { useEloData, usePlayerDecksData } from "./data";
import { useChampionCardImages, useNamelessChampionCard } from "./useChampionCardImages";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { useTabParam } from "../../lib/useTabParam";
import { isProvisionalRating, PROVISIONAL_MATCH_THRESHOLD } from "../../lib/eloProvisional";
import PageLayout from "../../components/layout/PageLayout";

const PAGE_SIZE = 50;

type TabMode = "players" | "judges";
const TABS: readonly TabMode[] = ["players", "judges"];
const TAB_LABELS: Record<TabMode, string> = { players: "Players", judges: "Judges" };

function PersonAvatar({ championName, card }: { championName: string; card: Card | undefined }) {
  return (
    <CardHoverPreview image={card?.editions[0]?.image} alt={championName}>
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-ctp-surface0">
        {card?.editions[0] && (
          <CardImage
            image={card.editions[0].image}
            alt={championName}
            className="h-full w-full origin-[50%_20%] scale-[3] object-cover object-top"
          />
        )}
      </div>
    </CardHoverPreview>
  );
}

export default function PlayersIndex() {
  useDocumentTitle(
    "Players",
    "Grand Archive TCG player rankings by Elo rating, and certified judges by level and experience, across ingested tournaments.",
  );
  const [tab, setTab] = useTabParam<TabMode>("tab", TABS, "players");
  const playerDecksData = usePlayerDecksData();

  const topChampionById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of playerDecksData?.players ?? []) {
      const top = p.topChampions[0];
      if (top) map.set(p.playerId, top.name);
    }
    return map;
  }, [playerDecksData]);

  return (
    <PageLayout>
      <PageHeader
        title="Players"
        description={
          tab === "players"
            ? "Ratings are reconstructed from Omnidex's own per-match Elo deltas across every ingested event."
            : "Everyone who's judged an ingested event, sorted by judge level."
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TABS.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setTab(mode)}
            aria-pressed={tab === mode}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              tab === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {TAB_LABELS[mode]}
          </button>
        ))}
      </div>

      {tab === "players" ? <PlayerRankingView topChampionById={topChampionById} /> : <JudgesView topChampionById={topChampionById} />}
    </PageLayout>
  );
}

function PlayerRankingView({ topChampionById }: { topChampionById: Map<number, string> }) {
  const playersData = useOmnidexPlayers();
  const eloData = useEloData();
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const ranked = useMemo(() => {
    if (!playersData || !eloData) return [];
    const ratingById = new Map(eloData.ratings.map((r) => [r.playerId, r]));
    return playersData.players
      .map((p) => ({ player: p, rating: ratingById.get(p.id) }))
      .filter((r) => r.rating && r.rating.matches > 0)
      .sort((a, b) => (b.rating?.rating ?? 0) - (a.rating?.rating ?? 0))
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [playersData, eloData]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return ranked;
    return ranked.filter((r) => r.player.username.toLowerCase().includes(needle));
  }, [ranked, search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const visible = rows.slice(0, visibleCount);
  const championImages = useChampionCardImages(
    Array.from(new Set(visible.map((r) => topChampionById.get(r.player.id)).filter((n): n is string => n !== undefined))),
  );
  const namelessCard = useNamelessChampionCard();

  return (
    <>
      <input
        type="text"
        aria-label="Search by username"
        placeholder="Search by username…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:max-w-sm"
      />

      {(!playersData || !eloData) && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {playersData && eloData && rows.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">No rated players match "{search}".</p>
      )}
      {playersData && eloData && rows.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          {rows.length} rated player{rows.length === 1 ? "" : "s"}
          {" · "}
          <span className="text-ctp-yellow">*</span> provisional — fewer than {PROVISIONAL_MATCH_THRESHOLD} recorded matches
        </p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="py-1 pr-6">#</th>
              <th className="py-1 pr-6">Player</th>
              <th className="py-1 pr-6">Rating</th>
              <th className="py-1 pr-6">Record</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
            {visible.map(({ player, rating, rank }) => {
              const topChampion = topChampionById.get(player.id);
              const card = topChampion ? championImages.get(topChampion) : namelessCard;
              return (
                <tr key={player.id}>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{rank}</td>
                  <td className="py-1.5 pr-6 whitespace-nowrap">
                    <Link to={`/players/${player.id}`} className="flex items-center gap-2 text-ctp-text hover:text-ctp-blue">
                      <PersonAvatar championName={topChampion ?? "Nameless Champion"} card={card} />
                      {player.username}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">
                    {Math.round(rating?.rating ?? 0)}
                    {rating && isProvisionalRating(rating.matches) && (
                      <span className="ml-1 text-ctp-yellow" title={`Provisional — only ${rating.matches} recorded match${rating.matches === 1 ? "" : "es"}`}>
                        *
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">
                    {rating?.wins}-{rating?.losses}-{rating?.ties}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LoadMore remaining={rows.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </>
  );
}

function JudgesView({ topChampionById }: { topChampionById: Map<number, string> }) {
  const judgesData = useOmnidexJudges();
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const judges = useMemo(() => {
    if (!judgesData) return [];
    const needle = search.trim().toLowerCase();
    return [...judgesData.judges]
      .filter((j) => !needle || j.username.toLowerCase().includes(needle))
      .sort((a, b) => b.judgeLevel - a.judgeLevel || b.judgeExperience - a.judgeExperience);
  }, [judgesData, search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const visibleJudges = judges.slice(0, visibleCount);
  const championImages = useChampionCardImages(
    Array.from(new Set(visibleJudges.map((j) => topChampionById.get(j.id)).filter((n): n is string => n !== undefined))),
  );
  const namelessCard = useNamelessChampionCard();

  return (
    <>
      <input
        type="text"
        aria-label="Search by username"
        placeholder="Search by username…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:max-w-sm"
      />

      {!judgesData && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {judgesData && judges.length === 0 && <p className="mt-6 text-ctp-subtext1">No judges match "{search}".</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="py-1 pr-6">Judge</th>
              <th className="py-1 pr-6">Level</th>
              <th className="py-1 pr-6">Experience</th>
              <th className="py-1 pr-6">Events judged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
            {visibleJudges.map((judge) => {
              const topChampion = topChampionById.get(judge.id);
              const card = topChampion ? championImages.get(topChampion) : namelessCard;
              return (
                <tr key={judge.id}>
                  <td className="py-1.5 pr-6 whitespace-nowrap">
                    <Link to={`/players/${judge.id}`} className="flex items-center gap-2 text-ctp-text hover:text-ctp-blue">
                      <PersonAvatar championName={topChampion ?? "Nameless Champion"} card={card} />
                      {judge.username}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{judge.judgeLevel}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{judge.judgeExperience.toLocaleString()}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{judge.eventIds.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LoadMore remaining={judges.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </>
  );
}
