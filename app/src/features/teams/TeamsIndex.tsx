import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import { useOmnidexTeams, useOmnidexPlayers } from "../tournaments/data";
import { usePlayerDecksData } from "../players/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import PlayerLink from "../players/PlayerLink";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";

const PAGE_SIZE = 50;

export default function TeamsIndex() {
  useDocumentTitle(
    "Teams",
    "Grand Archive TCG team registrations from 3v3 team-format events, searchable by team name or player.",
  );
  const teamsData = useOmnidexTeams();
  const playersData = useOmnidexPlayers();
  const playerDecksData = usePlayerDecksData();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const usernameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of playersData?.players ?? []) map.set(p.id, p.username);
    return map;
  }, [playersData]);

  const topChampionById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of playerDecksData?.players ?? []) {
      const top = p.topChampions[0];
      if (top) map.set(p.playerId, top.name);
    }
    return map;
  }, [playerDecksData]);

  function playerName(id: number): string {
    return usernameById.get(id) ?? `Player #${id}`;
  }

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
  }, [teamsData, search, category, seasonId, usernameById]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, category, seasonId]);

  const visibleRows = rows.slice(0, visibleCount);
  const championImages = useChampionCardImages(
    Array.from(
      new Set(
        visibleRows.flatMap((t) => t.players.map((p) => topChampionById.get(p.id)).filter((n): n is string => n !== undefined)),
      ),
    ),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Teams"
        description={`Team registrations from 3v3 team-format events. Each row is one team at one event — team names aren't a reliable identity (the same name can belong to unrelated teams, and generic names like "Team 1" repeat across unrelated local events), so this isn't deduplicated into one profile per team.`}
      />

      <input
        type="text"
        aria-label="Search by team or player"
        placeholder="Search by team or player…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
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
                className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
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
                className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
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

      {!teamsData && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {teamsData && rows.length === 0 && <p className="mt-6 text-ctp-subtext1">No teams match this filter.</p>}
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
              <Link to={`/events/${t.eventId}`} className="text-ctp-blue hover:underline">
                {t.eventName}
              </Link>
              <span className="text-xs text-ctp-subtext0">
                {EVENT_CATEGORY_LABELS[t.eventCategory] ?? t.eventCategory} · {new Date(t.eventDate).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ctp-subtext1">
              {t.players.map((p) => {
                const topChampion = topChampionById.get(p.id);
                const card = topChampion ? championImages.get(topChampion) : undefined;
                return (
                  <span key={p.id} className="inline-flex items-center gap-1.5">
                    {topChampion && (
                      <CardHoverPreview image={card?.editions[0]?.image} alt={topChampion}>
                        <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-ctp-surface0">
                          {card?.editions[0] && (
                            <CardImage
                              image={card.editions[0].image}
                              alt={topChampion}
                              className="h-full w-full origin-[50%_20%] scale-[3] object-cover object-top"
                            />
                          )}
                        </div>
                      </CardHoverPreview>
                    )}
                    <PlayerLink id={p.id} username={playerName(p.id)} className="hover:text-ctp-blue" />
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <LoadMore remaining={rows.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </PageLayout>
  );
}
