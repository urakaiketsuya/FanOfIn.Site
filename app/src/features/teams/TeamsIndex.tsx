import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import { useOmnidexTeams, usePlayerNameById } from "../tournaments/data";
import { useCompetition } from "../competition/data";
import type { CompetitionTeam } from "@gatcg/shared";
import { MatchRecord } from "../competition/ReportValues";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { CardIdentity } from "../events/EventReportVisuals";
import { useChampionCardImages } from "../players/useChampionCardImages";
import PlayerLink from "../players/PlayerLink";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";

const PAGE_SIZE = 50;

export default function TeamsIndex() {
  useDocumentTitle(
    "Teams",
    "Grand Archive TCG team registrations from 3v3 team-format events, searchable by team name or player.",
  );
  const teamsData = useOmnidexTeams();
  const teamsStatus = usePublishedDataStatus("omnidex-teams", "/data/omnidex/teams.json");
  const playerName = usePlayerNameById();
  const { data: reports, status: reportStatus } = useCompetition<CompetitionTeam>("teams");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const reportByTeam = useMemo(() => {
    const map = new Map<string, CompetitionTeam[]>();
    for (const row of reports?.rows ?? []) { const key = JSON.stringify([row.eventId, row.teamName]); const group = map.get(key) ?? []; group.push(row); map.set(key, group); }
    return map;
  }, [reports]);
  const reportFor = (eventId: number, name: string) => { const rows = reportByTeam.get(JSON.stringify([eventId, name])); return rows?.length === 1 ? rows[0] : undefined; };

  const categoriesPresent = useMemo(() => {
    const present = new Set((teamsData?.teams ?? []).map((t) => t.eventCategory));
    return EVENT_CATEGORY_ORDER.filter((c) => present.has(c));
  }, [teamsData]);

  const seasonsPresent = useMemo(() => {
    const bySeasonId = new Map<number, string>();
    for (const t of teamsData?.teams ?? []) {
      if (t.seasonId !== null && t.seasonName) bySeasonId.set(t.seasonId, t.seasonName);
    }
    return Array.from(bySeasonId.entries()).sort((a, b) => a[0] - b[0]);
  }, [teamsData]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const teams = teamsData?.teams ?? [];
    return teams.filter((t) => {
      if (category && t.eventCategory !== category) return false;
      if (seasonId !== null && t.seasonId !== seasonId) return false;
      if (!needle) return true;
      return t.teamName.toLowerCase().includes(needle) || t.players.some((p) => playerName(p.id).toLowerCase().includes(needle));
    });
  }, [teamsData, search, category, seasonId, playerName]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, category, seasonId]);

  const visibleRows = rows.slice(0, visibleCount);
  const championImages = useChampionCardImages(
    Array.from(
      new Set(
        visibleRows.flatMap((t) => reportFor(t.eventId, t.teamName)?.players.map(p => p.champion).filter((n): n is string => !!n) ?? []),
      ),
    ),
  );

  return (
    <PageLayout data-component="TeamsIndex">
      <PageHeader
        title="Teams"
        description="Event-date rosters, results, and champion lineups."

      />

      <PublishedSourceStatus label="Team registrations" status={teamsStatus} hasData={!!teamsData} />
      <PublishedSourceStatus label="Team reports" status={reportStatus} hasData={!!reports} />

      <input
        type="text"
        aria-label="Search by team or player"
        placeholder="Search by team or player…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 min-h-control w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />

      {(categoriesPresent.length > 1 || seasonsPresent.length > 1) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {categoriesPresent.length > 1 && (
            <>
              <span className="text-ctp-subtext0">Type:</span>
              <select
                value={category ?? ""}
                aria-label="Type"
                onChange={(e) => setCategory(e.target.value || null)}
                className="min-h-control min-w-0 max-w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
              >
                <option value="">All types</option>
                {categoriesPresent.map((c) => (
                  <option key={c} value={c}>
                    {EVENT_CATEGORY_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
            </>
          )}

          {seasonsPresent.length > 1 && (
            <>
              <span className="ml-2 text-ctp-subtext0">Season:</span>
              <select
                value={seasonId ?? ""}
                aria-label="Season"
                onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : null)}
                className="min-h-control min-w-0 max-w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
              >
                <option value="">All seasons</option>
                {seasonsPresent.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {teamsData && rows.length === 0 && <InlineState className="mt-6">No teams match this filter.</InlineState>}
      {teamsData && rows.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          {rows.length}
          {rows.length !== teamsData.teams.length && ` of ${teamsData.teams.length}`} team registration
          {rows.length === 1 ? "" : "s"}
        </p>
      )}

      <div className="mt-2 space-y-2">
        {visibleRows.map((t, i) => (
          <div key={i} className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="font-medium text-ctp-text">{t.teamName.trim() || "(unnamed team)"}</span>
              {t.finalPlacement !== null && <span className="text-xs text-ctp-subtext0">Placed #{t.finalPlacement}</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-ctp-subtext1">
              <Link to={`/events/${t.eventId}`} className="inline-flex min-h-control items-center text-ctp-blue hover:underline">
                {t.eventName}
              </Link>
              <span className="text-xs text-ctp-subtext0">
                {EVENT_CATEGORY_LABELS[t.eventCategory] ?? t.eventCategory} · {new Date(t.eventDate).toLocaleDateString()}
              </span>
            </div>
            {(() => {
              const report = reportFor(t.eventId, t.teamName);
              const known = report?.players.filter(p => p.champion).length ?? 0;
              return <div className="mt-4 space-y-3">
                {report?.record ? <MatchRecord record={report.record} /> : <p className="text-xs text-ctp-subtext1">Team record unavailable.</p>}
                <p className="text-xs text-ctp-subtext1">{known}/{t.players.length} event champions known · {report?.distinct === null || !report ? 'Lineup diversity unavailable' : `${report.distinct} distinct champions`}</p>
                <div className="grid gap-4 sm:grid-cols-3">{t.players.map(p => {
                  const champion = report?.players.find(member => member.id === p.id)?.champion;
                  return <div key={p.id} className="min-w-0"><CardIdentity name={champion ?? 'Champion unavailable'} card={champion ? championImages.get(champion) : undefined} /><PlayerLink id={p.id} username={playerName(p.id)} className="flex min-h-control items-center break-words text-ctp-blue focus-visible:outline-2" /></div>;
                })}</div>
              </div>;
            })()}
          </div>
        ))}
      </div>

      <LoadMore remaining={rows.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </PageLayout>
  );
}
