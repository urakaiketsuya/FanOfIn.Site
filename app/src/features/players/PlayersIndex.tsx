import { usePlayerRegions } from "./usePlayerRegions";
import { REGION_LABELS } from "../../lib/regions";
import { useCompetition } from "../competition/data";
import { recordPercent, recordSize, type CompetitionPlayer } from "@gatcg/shared";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import { useOmnidexIndex, useOmnidexPlayers, useOmnidexJudges } from "../tournaments/data";
import { useEloData, usePlayerDecksData } from "./data";
import { useChampionCardImages, useNamelessChampionCard } from "./useChampionCardImages";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { useTabParam } from "../../lib/useTabParam";
import { isProvisionalRating } from "../../lib/eloProvisional";
import PageLayout from "../../components/layout/PageLayout";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { InlineState } from "../../components/ui/ContentState";

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
    <PageLayout data-component="PlayersIndex">
      <PageHeader
        title="Players"
        description={
          tab === "players"
            ? "Player rankings, results, and decks."
            : "Judges by level and experience."
        }
      />

      <div className="mt-4"><Tabs tabs={TABS.map(key => ({ key, label: TAB_LABELS[key] }))} active={tab} onChange={setTab} baseId="player-directory" label="Players and judges" variant="pill" /></div>
      <TabPanel baseId="player-directory" tab="players" active={tab} keepMounted><PlayerRankingView topChampionById={topChampionById} /></TabPanel>
      <TabPanel baseId="player-directory" tab="judges" active={tab} keepMounted><JudgesView topChampionById={topChampionById} /></TabPanel>
    </PageLayout>
  );
}

function PlayerRankingView({ topChampionById }: { topChampionById: Map<number, string> }) {
  const { data: recent, status: recentStatus } = useCompetition<CompetitionPlayer>("players");
  const recentById = useMemo(() => new Map(recent?.rows.map(p => [p.playerId, p.formats.find(f => f.format === "standard")]) ?? []), [recent]);
  const playersData = useOmnidexPlayers();
  const events = useOmnidexIndex();
  const regions = usePlayerRegions(playersData, events);
  const regionEventsStatus = usePublishedDataStatus("omnidex-index", "/data/omnidex/index.json");
  const regionStoresStatus = usePublishedDataStatus("store-directory", "/data/omnidex/stores.json");
  const [region, setRegion] = useState("");
  const [recalculating, startTransition] = useTransition();
  const eloData = useEloData();
  const playersStatus = usePublishedDataStatus("omnidex-players", "/data/omnidex/players.json");
  const eloStatus = usePublishedDataStatus("analysis-elo", "/data/analysis/elo.json");
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
    return ranked.filter((r) => (!needle || r.player.username.toLowerCase().includes(needle)) && (!region || (region === "unassigned" ? r.player.country === "US" && regions?.get(r.player.id)?.region === null : regions?.get(r.player.id)?.region === region)));
  }, [ranked, search, region, regions]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, region]);

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
        className="mt-4 min-h-control w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:max-w-sm"
      />

      <label className="mt-4 block text-xs text-ctp-subtext1">Play region
        <select value={region} disabled={!regions} onChange={e => startTransition(() => setRegion(e.target.value))} className="mt-1 min-h-control w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 text-sm sm:max-w-sm">
          <option value="">All players</option>
          {['us-east', 'us-central', 'us-west'].map(key => <option key={key} value={key}>{REGION_LABELS[key]}</option>)}
          <option value="unassigned">US · Unassigned</option>
        </select>
      </label>
      <PublishedSourceStatus label="Region events" status={regionEventsStatus} hasData={!!events} />
      <PublishedSourceStatus label="Region stores" status={regionStoresStatus} hasData={!!regions} />
      {recalculating && <p role="status" className="text-sm">Recalculating…</p>}

      <PublishedSourceStatus label="Players" status={playersStatus} hasData={!!playersData} />
      <PublishedSourceStatus label="Ratings" status={eloStatus} hasData={!!eloData} />
      {playersData && eloData && rows.length === 0 && (
        <InlineState className="mt-6">No rated players match these filters.</InlineState>
      )}
      {playersData && eloData && rows.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          {rows.length} rated player{rows.length === 1 ? "" : "s"}

        </p>
      )}

      <PublishedSourceStatus label="Recent records" status={recentStatus} hasData={!!recent} />
      {recent && <p className="mt-4 text-xs text-ctp-subtext1">Recent record · Standard · {recent.from} – {recent.to} · Individual events · All tiers · Ranked + unranked</p>}
      <ol aria-label="Player rankings" className="mt-4 space-y-3">
        {visible.map(({ player, rating, rank }) => {
          const topChampion = topChampionById.get(player.id);
          const card = topChampion ? championImages.get(topChampion) : namelessCard;
          const recentRow = recentById.get(player.id);
          return <li key={player.id}><Link to={`/players/${player.id}`} className="grid min-h-control min-w-0 gap-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue sm:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
            <div className="flex min-w-0 items-center gap-3"><span className="text-sm tabular-nums text-ctp-subtext0">#{rank}</span><PersonAvatar championName={topChampion ?? 'Nameless Champion'} card={card} /><div className="min-w-0"><span className="block break-words font-semibold">{player.username}</span><span className="text-xs text-ctp-subtext1">{topChampion ?? 'No public decks'}</span>{regions?.get(player.id)?.region && <span className="block text-xs text-ctp-subtext1">{REGION_LABELS[regions.get(player.id)!.region!]} · inferred</span>}</div></div>
            <div className="grid grid-cols-[0.85fr_1.3fr_1fr] gap-2">
              <div><strong className="text-lg tabular-nums">{Math.round(rating?.rating ?? 0)}</strong><span className="block text-xs text-ctp-subtext1">Rating</span>{rating && isProvisionalRating(rating.matches) && <span className="block text-xs text-ctp-yellow">Provisional</span>}</div>
              <div><strong className="break-words text-sm tabular-nums">{rating?.wins}–{rating?.losses}–{rating?.ties}</strong><span className="block text-xs text-ctp-subtext1">All-time W–L–T</span></div>
              <div><strong className="text-lg tabular-nums">{recentRow && recordSize(recentRow.record) ? `${recordPercent(recentRow.record)!.toFixed(0)}%` : '—'}</strong><span className="block text-xs text-ctp-subtext1">Recent wins</span><span className="block text-xs text-ctp-subtext1">{recentRow ? `${recordSize(recentRow.record)} matches` : recent ? 'No recent record' : 'Unavailable'}</span></div>
            </div>
          </Link></li>;
        })}
      </ol>

      <LoadMore remaining={rows.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </>
  );
}

function JudgesView({ topChampionById }: { topChampionById: Map<number, string> }) {
  const judgesData = useOmnidexJudges();
  const judgesStatus = usePublishedDataStatus("omnidex-judges", "/data/omnidex/judges.json");
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
        className="mt-4 min-h-control w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:max-w-sm"
      />

      <PublishedSourceStatus label="Judges" status={judgesStatus} hasData={!!judgesData} />
      {judgesData && judges.length === 0 && <InlineState className="mt-6">No judges match "{search}".</InlineState>}

      <ul aria-label="Judges" className="mt-4 space-y-3">{visibleJudges.map(judge => {
        const topChampion = topChampionById.get(judge.id);
        return <li key={judge.id}><Link to={`/players/${judge.id}`} className="grid min-w-0 gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue sm:grid-cols-2"><div className="flex min-w-0 items-center gap-3"><PersonAvatar championName={topChampion ?? 'Nameless Champion'} card={topChampion ? championImages.get(topChampion) : namelessCard} /><span className="break-words font-semibold">{judge.username}</span></div><div className="grid grid-cols-3 gap-2 text-sm"><div><strong>{judge.judgeLevel}</strong><span className="block text-xs text-ctp-subtext1">Level</span></div><div><strong>{judge.judgeExperience.toLocaleString()}</strong><span className="block text-xs text-ctp-subtext1">Experience</span></div><div><strong>{judge.eventIds.length}</strong><span className="block text-xs text-ctp-subtext1">Events judged</span></div></div></Link></li>;
      })}</ul>

      <LoadMore remaining={judges.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </>
  );
}
