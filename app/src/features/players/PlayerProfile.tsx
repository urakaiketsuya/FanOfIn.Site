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
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import TopCardsSections from "../../components/TopCardsSections";
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
      <Link to="/players" className="text-sm text-ctp-blue hover:underline">
        &larr; All players
      </Link>

      {(player || judge) && (
        <>
          <Panel elevation={1} className="mt-3 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-ctp-text">{player?.username ?? judge?.username}</h1>
                {(() => {
                  const code = player?.country ?? judge?.country ?? "";
                  const region = formatCountry(code);
                  return region && (
                    <Link to={`/regions?group=country&region=${code}`} className="mt-1 inline-block text-sm text-ctp-subtext0 hover:text-ctp-blue hover:underline">
                      {region}
                    </Link>
                  );
                })()}
              </div>
              {isProvisionalRating(rating?.matches ?? 0) && rating && (
                <Link to="/methodology#elo" className="rounded-full bg-ctp-yellow/10 px-2.5 py-1 text-xs font-medium text-ctp-yellow hover:underline">
                  Provisional rating
                </Link>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {rating && <ProfileMetric label="Rating" value={Math.round(rating.rating).toLocaleString()} />}
              {rating && <ProfileMetric label="Record" value={`${rating.wins}-${rating.losses}${rating.ties ? `-${rating.ties}` : ""}`} />}
              {player && <ProfileMetric label="Events" value={allEvents.length.toLocaleString()} />}
              {judge && <ProfileMetric label="Judge level" value={judge.judgeLevel} />}
            </div>

            {ratingHistory && ratingHistory.length >= 2 && (
              <div className="mt-4 border-t border-ctp-surface1 pt-3">
                <p className="text-xs font-medium text-ctp-subtext0">Rating trend</p>
                <HistoryChart points={ratingHistory.map((p) => ({ date: p.date, value: p.rating, detail: `${new Date(p.date).toLocaleDateString()}: ${Math.round(p.rating)} rating` }))} label="Rating" formatValue={(value) => Math.round(value).toString()} compact />
              </div>
            )}

            {(hipster || judge || (!player && judge) || playerAchievements.length > 0) && (
              <details className="mt-4 border-t border-ctp-surface1 pt-3">
                <summary className="cursor-pointer text-sm font-medium text-ctp-blue">More profile details</summary>
                <div className="mt-3 space-y-2 text-sm text-ctp-subtext1">
                  {hipster && <p>Build novelty {(hipster.avgScore * 100).toFixed(0)} across {hipster.deckCount} deck{hipster.deckCount === 1 ? "" : "s"}.</p>}
                  {judge && <p>{judge.judgeExperience.toLocaleString()} judge experience.</p>}
                  {!player && judge && <p className="text-ctp-subtext0">This judge is not in the ingested player roster.</p>}
                  {playerAchievements.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {playerAchievements.map(({ unlock, definition }) => (
                        <span key={definition.id} title={`${definition.description} (${unlock.context})`} className="rounded-full border border-ctp-yellow px-2 py-0.5 text-xs text-ctp-yellow">
                          {definition.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            )}
          </Panel>
        </>
      )}

      {availableTabs.length > 1 && (
        <div className="mt-5"><Tabs tabs={availableTabs} active={tab} onChange={setManualTab} label="Player profile view" baseId="player-profile" variant="pill" /></div>
      )}

      <TabPanel baseId="player-profile" tab="overview" active={tab}>
      {recentEvents.length > 0 && (
        <Section className="mt-6" heading="compact" title="Recent events" actions={allEvents.length > recentEvents.length ? <button type="button" onClick={() => setManualTab("events")} className="text-xs font-medium text-ctp-blue hover:underline">View all {allEvents.length}</button> : undefined}>
          <div className="space-y-2">{recentEvents.map((event) => <PlayerEventDecklistRow key={event.id} event={event} playerId={playerId} />)}</div>
        </Section>
      )}

      {deckProfile && deckProfile.topChampions.length > 0 && (
        <Section className="mt-6" heading="compact" title={`Most played champions (${deckProfile.totalDecks} decks)`}>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {deckProfile.topChampions.map((c) => {
              const card = championImages.get(c.name);
              return (
                <CardHoverPreview key={c.name} image={card?.editions[0]?.image} alt={c.name}>
                  <Link
                    to={`/champions/${championNameToSlug(c.name)}`}
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

      {allTopCardNames.length > 0 && deckProfile && (
        <Section className="mt-6" heading="compact" collapsible defaultOpen={false} title="Most played cards">
          <div className="mt-2">
            <TopCardsSections topCards={deckProfile.topCards} cardImages={cardImages} />
          </div>
        </Section>
      )}

      {(upsets.length > 0 || (rivalsProfile && rivalsProfile.rivals.length > 0)) && (
        <Section className="mt-6" heading="compact" collapsible defaultOpen={false} title="Competitive context" description="Notable rating swings and frequently faced opponents.">
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
                  return <Link key={r.opponentId} to={`/players/${r.opponentId}`} className="flex items-center gap-2 text-sm hover:text-ctp-blue"><span className="flex-1 truncate text-ctp-text">{opponent?.username ?? `Player #${r.opponentId}`}</span><span className="text-ctp-subtext0">{r.wins}-{r.losses}{r.ties > 0 ? `-${r.ties}` : ""}</span><span className={r.winRate < 0.5 ? "text-ctp-red" : r.winRate > 0.5 ? "text-ctp-green" : "text-ctp-subtext1"}>{(r.winRate * 100).toFixed(0)}%</span></Link>;
                })}
              </div>
            </div>
          )}
        </Section>
      )}
      </TabPanel>

      <TabPanel baseId="player-profile" tab="events" active={tab}>
      {player && (
        <Section
          className="mt-6"
          heading="compact"
          title={`Events (${events.length}${events.length !== allEvents.length ? ` of ${allEvents.length}` : ""})`}
        >
          <PlayerEventFilters categories={categoriesPresent} champions={championsPresent} seasons={seasonsPresent} category={eventCategory} champion={eventChampion} seasonId={eventSeasonId} onCategoryChange={setEventCategory} onChampionChange={setEventChampion} onSeasonChange={setEventSeasonId} />

          <div className="mt-2 space-y-2">
            {visibleEvents.map((event) => (
              <PlayerEventDecklistRow key={event.id} event={event} playerId={playerId} />
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
  return <div className="rounded-lg bg-ctp-base/70 px-3 py-2"><div className="text-lg font-semibold tabular-nums text-ctp-text">{value}</div><div className="text-xs text-ctp-subtext0">{label}</div></div>;
}
