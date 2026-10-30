import PlayerCompetitionReport from "../competition/PlayerCompetitionReport";
import DeckSearchFilters from "../../components/deck-search/DeckSearchFilters";
import { useDeckSearch } from "../../components/deck-search/useDeckSearch";
import { useTournamentCardMatches } from "../../components/deck-search/useTournamentCardMatches";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EVENT_CATEGORY_ORDER, type AchievementDefinition, type AchievementUnlock } from "@gatcg/shared";
import { useOmnidexIndex, useOmnidexJudges, useOmnidexPlayers } from "../tournaments/data";
import { useEloData, useEloHistoryData, useHipsterData, usePlayerDecksData, useRivalsData } from "./data";
import HistoryChart from "../../components/HistoryChart";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useAchievementsData } from "../achievements/data";
import { useCardsByNames } from "../events/useCardsByNames";
import { useChampionCardImages } from "./useChampionCardImages";
import PlayerEventDecklistRow from "./PlayerEventDecklistRow";
import { championNameToSlug } from "../../lib/championSlug";
import EventRow from "../tournaments/EventRow";
import CardArtTile from "../../components/CardArtTile";
import Button from "../../components/ui/Button";
import { Bar } from "../events/EventReportVisuals";
import PlayerCardUsage from "./PlayerCardUsage";
import { useTabParam } from "../../lib/useTabParam";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { formatCountry } from "../../lib/format";
import { isProvisionalRating } from "../../lib/eloProvisional";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { EmptyState } from "../../components/ui/ContentState";
import PlayerEventFilters from "./PlayerEventFilters";

type PlayerTab = "overview" | "cards" | "events" | "opponents" | "judged";
const PAGE_SIZE = 50;

export default function PlayerProfile() {
  const { id = "" } = useParams<{ id: string }>();
  const playerId = Number(id);

  const playersData = useOmnidexPlayers();
  const judgesData = useOmnidexJudges();
  const playersStatus = usePublishedDataStatus("omnidex-players", "/data/omnidex/players.json");
  const judgesStatus = usePublishedDataStatus("omnidex-judges", "/data/omnidex/judges.json");
  const rivalsStatus = usePublishedDataStatus("analysis-rivals", "/data/analysis/rivals.json");
  const eloStatus = usePublishedDataStatus("analysis-elo", "/data/analysis/elo.json");
  const eventsStatus = usePublishedDataStatus("omnidex-index", "/data/omnidex/index.json");
  const decksStatus = usePublishedDataStatus("analysis-player-decks", "/data/analysis/player-decks.json");
  const eloData = useEloData();
  const eloHistoryData = useEloHistoryData();
  const hipsterData = useHipsterData();
  const playerDecksData = usePlayerDecksData();
  const rivalsData = useRivalsData();
  const index = useOmnidexIndex();
  const popularityIndexData = useDeckPopularityIndexData();
  const resultStatus = usePublishedDataStatus("analysis-deck-popularity-index", "/data/analysis/deck-popularity-index.json");
  const resultsByEvent = useMemo(() => new Map(
    popularityIndexData?.entries.filter(entry => entry.player === playerId).map(entry => [entry.eventId, entry]) ?? [],
  ), [popularityIndexData, playerId]);
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

  // A player's champion for a given event only exists if that event had a public decklist –
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

  const [deckFilter, setDeckFilter] = useDeckSearch();
  const cardMatches = useTournamentCardMatches(deckFilter.cards);
  const [eventCategory, setEventCategory] = useState<string | null>(null);
  const eventChampion = deckFilter.champion || null;
  const setEventChampion = (champion: string | null) => setDeckFilter(f => ({ ...f, champion: champion ?? "" }));
  const [eventSeasonId, setEventSeasonId] = useState<number | null>(null);
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
          (!cardMatches.ids || cardMatches.ids.has(`${e.id}:${playerId}`)) &&
          (!eventCategory || e.category === eventCategory) &&
          (!eventChampion || championByEventId.get(e.id) === eventChampion) &&
          (eventSeasonId === null || e.seasonId === eventSeasonId),
      ),
    [allEvents, eventCategory, eventChampion, eventSeasonId, championByEventId, cardMatches.ids, playerId],
  );

  useEffect(() => {
    setEventsVisibleCount(PAGE_SIZE);
  }, [eventCategory, eventChampion, eventSeasonId, deckFilter]);

  const visibleEvents = events.slice(0, eventsVisibleCount);
  const recentEvents = allEvents.slice(0, 3);

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
      list.push({ key: "overview", label: "Results" });
      list.push({ key: "cards", label: "Cards" });
      list.push({ key: "events", label: `Events (${events.length})` });
      list.push({ key: "opponents", label: "Opponents" });
    }
    if (judge) list.push({ key: "judged", label: `Judged (${judgedEvents.length})` });
    return list;
  }, [player, judge, events.length, judgedEvents.length]);
  const [tab, setManualTab] = useTabParam<PlayerTab>("tab", availableTabs.map(t => t.key), availableTabs[0]?.key ?? "overview");

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
      <PageLayout data-component="PlayerProfile">
        <EmptyState
          title="Player not found"
          description={`Player ${playerId} isn't in the ingested roster yet.`}
          action={<Link to="/players" className="text-ctp-blue hover:underline">&larr; All players</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout data-component="PlayerProfile">
      <Link to="/players" className="inline-flex min-h-control items-center rounded text-sm text-ctp-blue hover:underline focus-visible:outline-2">
        &larr; All players
      </Link>

      <PublishedSourceStatus label="Players" status={playersStatus} hasData={!!playersData} />
      {!player && <PublishedSourceStatus label="Judges" status={judgesStatus} hasData={!!judgesData} />}
      {(player || judge) && (
        <>
          <Panel elevation={1} className="mt-3 overflow-hidden border-t-4 border-t-ctp-blue">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-40">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ctp-subtext0">{player ? "Player record" : "Judge record"}</p>
                <h1 className="break-words text-3xl font-bold text-ctp-text sm:text-4xl">{player?.username ?? judge?.username}</h1>
                {(() => {
                  const code = player?.country ?? judge?.country ?? "";
                  const region = formatCountry(code);
                  return region && (
                    <Link to={`/regions?group=country&region=${code}`} className="mt-1 inline-flex min-h-control items-center text-sm text-ctp-subtext0 hover:text-ctp-blue hover:underline">
                      {region}
                    </Link>
                  );
                })()}
              </div>
              {deckProfile?.topChampions[0] && <Link to={`/champions/${championNameToSlug(deckProfile.topChampions[0].name)}`} className="w-20 shrink-0 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={championImages.get(deckProfile.topChampions[0].name)} name={deckProfile.topChampions[0].name} artworkOnly /><span className="mt-1 block text-center text-xs">{deckProfile.topChampions[0].name}</span></Link>}

            </div>

              {isProvisionalRating(rating?.matches ?? 0) && rating && (
                <Link to="/methodology#elo" className="inline-flex min-h-control items-center rounded-full bg-ctp-yellow/10 px-2.5 py-1 text-xs font-medium text-ctp-yellow hover:underline">
                  Provisional rating
                </Link>
              )}
            {player && <PublishedSourceStatus label="Ratings" status={eloStatus} hasData={!!eloData} />}
            <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))] gap-2">
              {rating && <ProfileMetric label="Rating" value={Math.round(rating.rating).toLocaleString()} />}
              {rating && <ProfileMetric label="All-time W–L–T" value={`${rating.wins}–${rating.losses}–${rating.ties}`} />}
              {player && <ProfileMetric label="Events" value={index ? allEvents.length.toLocaleString() : "—"} />}
              {judge && <ProfileMetric label="Judge level" value={judge.judgeLevel} />}
              {!player && judge && <><ProfileMetric label="Experience" value={judge.judgeExperience.toLocaleString()} /><ProfileMetric label="Judged events" value={judge.eventIds.length} /></>}
            </div>


          </Panel>
        </>
      )}

      {availableTabs.length > 0 && (
        <div className="mt-5"><Tabs tabs={availableTabs} active={tab} onChange={setManualTab} label="Player profile view" baseId="player-profile" variant="pill" wrap /></div>
      )}

      <TabPanel baseId="player-profile" tab="overview" active={tab}>
      {player && <PlayerCompetitionReport playerId={playerId} />}
      {recentEvents.length > 0 && (
        <Section className="mt-6" heading="compact" title="Recent events" actions={allEvents.length > recentEvents.length ? <Button variant="ghost" size="sm" onClick={() => setManualTab("events")}>View all {allEvents.length}</Button> : undefined}>
          <PublishedSourceStatus label="Event results" status={resultStatus} hasData={!!popularityIndexData} />
          <div className="space-y-2">{recentEvents.map((event) => <PlayerEventDecklistRow key={event.id} event={event} playerId={playerId} result={resultsByEvent.get(event.id)} resultsLoaded={!!popularityIndexData} />)}</div>
        </Section>
      )}

      {((ratingHistory?.length ?? 0) >= 2 || hipster || playerAchievements.length > 0) && <Section className="mt-6" heading="compact" title="Rating & milestones">
            {ratingHistory && ratingHistory.length >= 2 && (
              <div className="mt-4 border-t border-ctp-surface1 pt-3">
                <p className="text-xs font-medium text-ctp-subtext0">Rating trend</p>
                <HistoryChart points={ratingHistory.map((p) => ({ date: p.date, value: p.rating, detail: `${new Date(p.date).toLocaleDateString()}: ${Math.round(p.rating)} rating` }))} label="Rating" formatValue={(value) => Math.round(value).toString()} compact />
              </div>
            )}

            {(hipster || judge || playerAchievements.length > 0) && <div className="mt-4 flex flex-wrap gap-2 border-t border-ctp-surface1 pt-3 text-xs text-ctp-subtext1">
              {hipster && <span className="rounded-md bg-ctp-base/70 px-3 py-2">Build novelty {(hipster.avgScore * 100).toFixed(0)} · {hipster.deckCount} decks</span>}
              {judge && <span className="rounded-md bg-ctp-base/70 px-3 py-2">{judge.judgeExperience.toLocaleString()} judge XP</span>}
              {playerAchievements.map(({ definition }) => <span key={definition.id} className="rounded-md bg-ctp-yellow/10 px-3 py-2 text-ctp-yellow">{definition.name}</span>)}
            </div>}
      </Section>}
      </TabPanel>
      <TabPanel baseId="player-profile" tab="cards" active={tab} keepMounted>
      <Section className="mt-6" heading="compact" title="Most played champions">
        <PublishedSourceStatus label="Player decks" status={decksStatus} hasData={!!playerDecksData} />
        {deckProfile && <p className="mb-4 text-xs text-ctp-subtext1">All-time · {deckProfile.totalDecks} public decks · Deck inclusion</p>}
        {playerDecksData && !deckProfile && <p className="text-sm text-ctp-subtext1">No public decks recorded.</p>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{deckProfile?.topChampions.map(c => {
          const value = deckProfile.totalDecks ? c.deckCount / deckProfile.totalDecks * 100 : 0;
          return <article key={c.name} className="min-w-0 space-y-2"><Link to={`/champions/${championNameToSlug(c.name)}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile name={c.name} card={championImages.get(c.name)} artworkOnly /><span className="mt-2 block text-sm font-semibold">{c.name}</span></Link><div className="flex flex-wrap justify-between gap-1 text-sm"><strong>{value.toFixed(0)}%</strong><span className="text-xs text-ctp-subtext1">{c.deckCount}/{deckProfile.totalDecks} decks</span></div><Bar value={value} label={`${c.name} deck inclusion`} blue /></article>;
        })}</div>
      </Section>
      {allTopCardNames.length > 0 && deckProfile && <Section className="mt-6" heading="compact" title="Most played cards"><PlayerCardUsage topCards={deckProfile.topCards} cards={cardImages} totalDecks={deckProfile.totalDecks} /></Section>}
      </TabPanel>
      <TabPanel baseId="player-profile" tab="opponents" active={tab}>
      <PublishedSourceStatus label="Opponents" status={rivalsStatus} hasData={!!rivalsData} />
      <PublishedSourceStatus label="Ratings" status={eloStatus} hasData={!!eloData} />
      {rivalsData && eloData && upsets.length === 0 && !rivalsProfile?.rivals.length && <p className="mt-6 text-sm text-ctp-subtext1">No recorded opponents.</p>}
      {(upsets.length > 0 || (rivalsProfile && rivalsProfile.rivals.length > 0)) && (
        <Section className="mt-6" heading="compact" title="Head-to-head · All-time">
          {upsets.length > 0 && (
            <div className="space-y-1 text-sm">
              <h3 className="mb-2 font-medium text-ctp-text">Notable upsets</h3>
              {upsets.map((u, i) => <div key={i} className="text-ctp-subtext1"><span className={u.winnerId === playerId ? "text-ctp-green" : "text-ctp-red"}>{u.winnerId === playerId ? "Won" : "Lost"}</span>{" "}a {Math.abs(u.eloSwing).toFixed(0)}-point swing at <Link to={`/events/${u.eventId}`} className="text-ctp-blue hover:underline">{u.eventName}</Link></div>)}
            </div>
          )}
          {rivalsProfile && rivalsProfile.rivals.length > 0 && (
            <div className={upsets.length > 0 ? "mt-5 border-t border-ctp-surface1 pt-4" : ""}>
              <h3 className="mb-2 text-sm font-medium text-ctp-text">Rivals</h3>
              <div className="space-y-1">
                {rivalsProfile.rivals.map((r) => {
                  const opponent = playersData?.players.find((p) => p.id === r.opponentId);
                  return <Link key={r.opponentId} to={`/players/${r.opponentId}`} className="flex min-h-control flex-wrap items-center gap-2 rounded border-b border-ctp-surface1 py-2 text-sm hover:text-ctp-blue focus-visible:outline-2"><span className="min-w-0 flex-1 break-words text-ctp-text">{opponent?.username ?? `Player #${r.opponentId}`}</span><span className="text-ctp-subtext0">{r.wins}-{r.losses}{r.ties > 0 ? `-${r.ties}` : ""}</span><span className={r.winRate < 0.5 ? "text-ctp-red" : r.winRate > 0.5 ? "text-ctp-green" : "text-ctp-subtext1"}>{(r.winRate * 100).toFixed(0)}%</span></Link>;
                })}
              </div>
            </div>
          )}
        </Section>
      )}
      </TabPanel>

      <TabPanel baseId="player-profile" tab="events" active={tab} keepMounted>
      {player && (
        <Section
          className="mt-6"
          heading="compact"
          title={`Events (${events.length}${events.length !== allEvents.length ? ` of ${allEvents.length}` : ""})`}
        >
          <PublishedSourceStatus label="Event results" status={resultStatus} hasData={!!popularityIndexData} />
          <PublishedSourceStatus label="Events" status={eventsStatus} hasData={!!index} />
          <DeckSearchFilters cards={deckFilter.cards} onCardsChange={cards => setDeckFilter(f => ({ ...f, cards }))} />
          {!!deckFilter.cards.length && <PublishedSourceStatus label="Deck cards" status={cardMatches.status} hasData={cardMatches.hasData} />}
          <PlayerEventFilters categories={categoriesPresent} champions={championsPresent} seasons={seasonsPresent} category={eventCategory} champion={eventChampion} seasonId={eventSeasonId} onCategoryChange={setEventCategory} onChampionChange={setEventChampion} onSeasonChange={setEventSeasonId} />

          <div className="mt-2 space-y-2">
            {index && events.length === 0 && <p className="py-4 text-sm text-ctp-subtext1">No events match these filters.</p>}
            {visibleEvents.map((event) => (
              <PlayerEventDecklistRow key={event.id} event={event} playerId={playerId} result={resultsByEvent.get(event.id)} resultsLoaded={!!popularityIndexData} />
            ))}
          </div>

          <LoadMore remaining={events.length - eventsVisibleCount} onLoadMore={() => setEventsVisibleCount((v) => v + PAGE_SIZE)} />
        </Section>
      )}
      </TabPanel>

      <TabPanel baseId="player-profile" tab="judged" active={tab}>
      {judge && (
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
      </TabPanel>
    </PageLayout>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 rounded-lg bg-ctp-base/70 px-3 py-2"><div className="break-words text-lg font-semibold tabular-nums sm:text-2xl text-ctp-text">{value}</div><div className="text-xs text-ctp-subtext0">{label}</div></div>;
}
