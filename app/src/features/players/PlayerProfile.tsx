import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER, type AchievementDefinition, type AchievementUnlock } from "@gatcg/shared";
import { useOmnidexIndex, useOmnidexJudges, useOmnidexPlayers } from "../tournaments/data";
import { useEloData, useEloHistoryData, useHipsterData, usePlayerDecksData, useRivalsData } from "./data";
import HistoryChart from "../../components/HistoryChart";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useAchievementsData } from "../achievements/data";
import { useCardsByNames } from "../events/useCardsByNames";
import { useChampionCardImages } from "./useChampionCardImages";
import PlayerEventDecklistRow from "./PlayerEventDecklistRow";
import EventRow from "../tournaments/EventRow";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import TopCardsSections from "../../components/TopCardsSections";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { formatCountry } from "../../lib/format";
import { isProvisionalRating } from "../../lib/eloProvisional";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import { EmptyState } from "../../components/ui/ContentState";

type PlayerTab = "overview" | "events" | "judged";
const PAGE_SIZE = 50;

export default function PlayerProfile() {
  const { id = "" } = useParams<{ id: string }>();
  const playerId = Number(id);

  const playersData = useOmnidexPlayers();
  const judgesData = useOmnidexJudges();
  const eloData = useEloData();
  const eloHistoryData = useEloHistoryData();
  const hipsterData = useHipsterData();
  const playerDecksData = usePlayerDecksData();
  const rivalsData = useRivalsData();
  const index = useOmnidexIndex();
  const popularityIndexData = useDeckPopularityIndexData();
  const achievementsData = useAchievementsData();

  const player = playersData?.players.find((p) => p.id === playerId);
  const judge = judgesData?.judges.find((j) => j.id === playerId);
  useDocumentTitle(
    player?.username ?? judge?.username,
    (player || judge) && `Grand Archive TCG tournament history and stats for ${player?.username ?? judge?.username}.`,
  );
  const rating = eloData?.ratings.find((r) => r.playerId === playerId);
  const ratingHistory = eloHistoryData?.history[String(playerId)];
  const hipster = hipsterData?.playerScores.find((p) => p.playerId === playerId);
  const deckProfile = playerDecksData?.players.find((p) => p.playerId === playerId);
  const rivalsProfile = rivalsData?.players.find((p) => p.playerId === playerId);
  const upsets = useMemo(
    () => eloData?.upsets.filter((u) => u.winnerId === playerId || u.loserId === playerId) ?? [],
    [eloData, playerId],
  );
  const playerAchievements = useMemo(() => {
    if (!achievementsData) return [];
    const definitionsById = new Map(achievementsData.definitions.map((d) => [d.id, d]));
    return achievementsData.unlocks
      .filter((u) => u.playerId === playerId)
      .map((u) => ({ unlock: u, definition: definitionsById.get(u.achievementId) }))
      .filter((a): a is { unlock: AchievementUnlock; definition: AchievementDefinition } => !!a.definition);
  }, [achievementsData, playerId]);
  const allEvents = useMemo(
    () =>
      (player && index ? index.events.filter((e) => player.eventIds.includes(e.id)) : []).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [player, index],
  );

  // A player's champion for a given event only exists if that event had a public decklist —
  // sourced from the lean deck-popularity index (already keyed by player+event, same fields
  // deck-sightings would give us here) rather than lazily fetching every event's full decklist
  // bundle just to build a filter list, or pulling in deck-sightings' full ~43MB dataset for
  // three fields.
  const championByEventId = useMemo(() => {
    const map = new Map<number, string>();
    if (!popularityIndexData) return map;
    for (const entry of popularityIndexData.entries) {
      if (entry.player === playerId && entry.championName) map.set(entry.eventId, entry.championName);
    }
    return map;
  }, [popularityIndexData, playerId]);

  const [eventCategory, setEventCategory] = useState<string | null>(null);
  const [eventChampion, setEventChampion] = useState<string | null>(null);
  const [eventSeasonId, setEventSeasonId] = useState<number | null>(null);
  const [manualTab, setManualTab] = useState<PlayerTab | null>(null);
  const [eventsVisibleCount, setEventsVisibleCount] = useState(PAGE_SIZE);
  const [judgedVisibleCount, setJudgedVisibleCount] = useState(PAGE_SIZE);

  const categoriesPresent = useMemo(() => {
    const present = new Set(allEvents.map((e) => e.category));
    return EVENT_CATEGORY_ORDER.filter((c) => present.has(c));
  }, [allEvents]);

  const championsPresent = useMemo(
    () => Array.from(new Set(allEvents.map((e) => championByEventId.get(e.id)).filter((n): n is string => !!n))).sort(),
    [allEvents, championByEventId],
  );

  const seasonsPresent = useMemo(() => {
    const bySeasonId = new Map<number, string>();
    for (const e of allEvents) {
      if (e.seasonId !== null && e.seasonName) bySeasonId.set(e.seasonId, e.seasonName);
    }
    return Array.from(bySeasonId.entries()).sort((a, b) => a[0] - b[0]);
  }, [allEvents]);

  const events = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          (!eventCategory || e.category === eventCategory) &&
          (!eventChampion || championByEventId.get(e.id) === eventChampion) &&
          (eventSeasonId === null || e.seasonId === eventSeasonId),
      ),
    [allEvents, eventCategory, eventChampion, eventSeasonId, championByEventId],
  );

  useEffect(() => {
    setEventsVisibleCount(PAGE_SIZE);
  }, [eventCategory, eventChampion, eventSeasonId]);

  const visibleEvents = events.slice(0, eventsVisibleCount);

  const judgedEvents = useMemo(
    () =>
      (judge && index ? index.events.filter((e) => judge.eventIds.includes(e.id)) : []).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [judge, index],
  );

  useEffect(() => {
    setEventsVisibleCount(PAGE_SIZE);
    setJudgedVisibleCount(PAGE_SIZE);
  }, [playerId]);

  const visibleJudgedEvents = judgedEvents.slice(0, judgedVisibleCount);

  const availableTabs = useMemo(() => {
    const list: { key: PlayerTab; label: string }[] = [];
    if (player) {
      list.push({ key: "overview", label: "Overview" });
      list.push({ key: "events", label: `Events (${events.length})` });
    }
    if (judge) list.push({ key: "judged", label: `Judged (${judgedEvents.length})` });
    return list;
  }, [player, judge, events.length, judgedEvents.length]);
  const tab = manualTab ?? availableTabs[0]?.key ?? "overview";

  const championImages = useChampionCardImages(deckProfile?.topChampions.map((c) => c.name) ?? []);
  const allTopCardNames = useMemo(() => {
    if (!deckProfile) return [];
    return [...deckProfile.topCards.main, ...deckProfile.topCards.material, ...deckProfile.topCards.sideboard].map(
      (c) => c.name,
    );
  }, [deckProfile]);
  const cardImages = useCardsByNames(allTopCardNames);

  if (playersData && judgesData && !player && !judge) {
    return (
      <PageLayout>
        <EmptyState
          title="Player not found"
          description={`Player ${playerId} isn't in the ingested roster yet.`}
          action={<Link to="/players" className="text-ctp-blue hover:underline">&larr; All players</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Link to="/players" className="text-sm text-ctp-blue hover:underline">
        &larr; All players
      </Link>

      {(player || judge) && (
        <>
          <h1 className="mt-2 text-2xl font-bold text-ctp-blue">{player?.username ?? judge?.username}</h1>
          {(() => {
            const code = player?.country ?? judge?.country ?? "";
            const region = formatCountry(code);
            return (
              region && (
                <p className="mt-1 text-sm text-ctp-subtext0">
                  <Link to={`/regions?group=country&region=${code}`} className="hover:text-ctp-blue hover:underline">
                    {region}
                  </Link>
                </p>
              )
            );
          })()}
          {rating && (
            <p className="mt-1 text-sm text-ctp-subtext1">
              Rating {Math.round(rating.rating)} · {rating.wins}-{rating.losses}-{rating.ties} across{" "}
              {rating.matches} matches
              {isProvisionalRating(rating.matches) && (
                <span className="ml-1.5 text-xs text-ctp-yellow">
                  (provisional — too few matches for the rating to have converged)
                </span>
              )}
            </p>
          )}
          {ratingHistory && ratingHistory.length >= 2 && (
            <div className="mt-2 max-w-sm rounded-md border border-ctp-surface1 p-3">
              <p className="text-xs text-ctp-subtext0">Rating over time, {ratingHistory.length} events</p>
              <HistoryChart points={ratingHistory.map((p) => ({ date: p.date, value: p.rating, detail: `${new Date(p.date).toLocaleDateString()}: ${Math.round(p.rating)} rating` }))} label="Rating" formatValue={(value) => Math.round(value).toString()} compact />
              <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
                <span>{new Date(ratingHistory[0].date).toLocaleDateString()}</span>
                <span>{new Date(ratingHistory[ratingHistory.length - 1].date).toLocaleDateString()}</span>
              </div>
            </div>
          )}
          {hipster && (
            <p className="mt-1 text-sm text-ctp-subtext1">
              Novelty score {(hipster.avgScore * 100).toFixed(0)}
              <span className="text-ctp-subtext0">
                {" "}
                — how unusual their builds are relative to other decks of the same Champion, averaged
                across {hipster.deckCount} deck{hipster.deckCount === 1 ? "" : "s"}
              </span>
            </p>
          )}
          {judge && (
            <p className="mt-1 text-sm text-ctp-subtext1">
              Judge level {judge.judgeLevel} · {judge.judgeExperience.toLocaleString()} experience
            </p>
          )}
          {!player && judge && (
            <p className="mt-1 text-sm text-ctp-subtext0">Not in the ingested player roster — judge only.</p>
          )}
          {playerAchievements.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {playerAchievements.map(({ unlock, definition }) => (
                <span
                  key={definition.id}
                  title={`${definition.description} (${unlock.context})`}
                  className="rounded-full border border-ctp-yellow px-2 py-0.5 text-xs text-ctp-yellow"
                >
                  {definition.name}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {availableTabs.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2 border-b border-ctp-surface1 pb-2">
          {availableTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setManualTab(t.key)}
              aria-pressed={tab === t.key}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                tab === t.key ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "overview" && upsets.length > 0 && (
        <Section className="mt-6" heading="compact" title="Notable upsets">
          <div className="mt-2 space-y-1 text-sm">
            {upsets.map((u, i) => (
              <div key={i} className="text-ctp-subtext1">
                {u.winnerId === playerId ? (
                  <span className="text-ctp-green">Won</span>
                ) : (
                  <span className="text-ctp-red">Lost</span>
                )}{" "}
                a {Math.abs(u.eloSwing).toFixed(0)}-point swing at{" "}
                <Link to={`/events/${u.eventId}`} className="text-ctp-blue hover:underline">
                  {u.eventName}
                </Link>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "overview" && rivalsProfile && rivalsProfile.rivals.length > 0 && (
        <Section className="mt-6" heading="compact" title="Rivals" description="Most-played opponents, worst matchup first.">
          <div className="mt-2 space-y-1">
            {rivalsProfile.rivals.map((r) => {
              const opponent = playersData?.players.find((p) => p.id === r.opponentId);
              return (
                <Link
                  key={r.opponentId}
                  to={`/players/${r.opponentId}`}
                  className="flex items-center gap-2 text-sm hover:text-ctp-blue"
                >
                  <span className="flex-1 truncate text-ctp-text">{opponent?.username ?? `Player #${r.opponentId}`}</span>
                  <span className="text-ctp-subtext0">
                    {r.wins}-{r.losses}
                    {r.ties > 0 ? `-${r.ties}` : ""}
                  </span>
                  <span className={r.winRate < 0.5 ? "text-ctp-red" : r.winRate > 0.5 ? "text-ctp-green" : "text-ctp-subtext1"}>
                    {(r.winRate * 100).toFixed(0)}%
                  </span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {tab === "overview" && deckProfile && deckProfile.topChampions.length > 0 && (
        <Section className="mt-6" heading="compact" title={`Most played champions (${deckProfile.totalDecks} decks)`}>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {deckProfile.topChampions.map((c) => {
              const card = championImages.get(c.name);
              return (
                <CardHoverPreview key={c.name} image={card?.editions[0]?.image} alt={c.name}>
                  <Link
                    to={`/champions/${encodeURIComponent(c.name)}`}
                    className="flex items-center gap-2 text-sm hover:text-ctp-blue"
                  >
                    {card?.editions[0] ? (
                      <CardImage
                        image={card.editions[0].image}
                        alt={c.name}
                        className="h-14 w-10 rounded object-cover object-top"
                      />
                    ) : (
                      <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />
                    )}
                    <span className="flex-1 text-ctp-text">{c.name}</span>
                    <span className="text-ctp-subtext0">{c.deckCount} decks</span>
                  </Link>
                </CardHoverPreview>
              );
            })}
          </div>
        </Section>
      )}

      {tab === "overview" && allTopCardNames.length > 0 && deckProfile && (
        <Section className="mt-6" heading="compact" title="Most played cards">
          <div className="mt-2">
            <TopCardsSections topCards={deckProfile.topCards} cardImages={cardImages} />
          </div>
        </Section>
      )}

      {tab === "events" && player && (
        <Section
          className="mt-6"
          heading="compact"
          title={`Events (${events.length}${events.length !== allEvents.length ? ` of ${allEvents.length}` : ""})`}
        >
          {(categoriesPresent.length > 1 || championsPresent.length > 1 || seasonsPresent.length > 1) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {categoriesPresent.length > 1 && (
                <>
                  <span className="text-ctp-subtext0">Type:</span>
                  <select
                    value={eventCategory ?? ""}
                    aria-label="Type"
                    onChange={(e) => setEventCategory(e.target.value || null)}
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

              {championsPresent.length > 1 && (
                <>
                  <span className="ml-2 text-ctp-subtext0">Champion:</span>
                  <select
                    value={eventChampion ?? ""}
                    aria-label="Champion"
                    onChange={(e) => setEventChampion(e.target.value || null)}
                    className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
                  >
                    <option value="">All champions</option>
                    {championsPresent.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {seasonsPresent.length > 1 && (
                <>
                  <span className="ml-2 text-ctp-subtext0">Season:</span>
                  <select
                    value={eventSeasonId ?? ""}
                    aria-label="Season"
                    onChange={(e) => setEventSeasonId(e.target.value ? Number(e.target.value) : null)}
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

          <div className="mt-2 space-y-2">
            {visibleEvents.map((event) => (
              <PlayerEventDecklistRow key={event.id} event={event} playerId={playerId} />
            ))}
          </div>

          <LoadMore remaining={events.length - eventsVisibleCount} onLoadMore={() => setEventsVisibleCount((v) => v + PAGE_SIZE)} />
        </Section>
      )}

      {tab === "judged" && judge && (
        <Section className="mt-6" heading="compact" title={`Judged events (${judgedEvents.length})`}>
          <div className="mt-2 space-y-2">
            {visibleJudgedEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>

          <LoadMore
            remaining={judgedEvents.length - judgedVisibleCount}
            onLoadMore={() => setJudgedVisibleCount((v) => v + PAGE_SIZE)}
          />
        </Section>
      )}
    </PageLayout>
  );
}
