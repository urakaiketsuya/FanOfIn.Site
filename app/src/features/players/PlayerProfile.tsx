import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import { useOmnidexIndex, useOmnidexJudges, useOmnidexPlayers } from "../tournaments/data";
import { useEloData, useHipsterData, usePlayerDecksData } from "./data";
import { useDeckSightingsData } from "../topdecks/data";
import { useCardsByNames } from "../events/useCardsByNames";
import { useChampionCardImages } from "./useChampionCardImages";
import PlayerEventDecklistRow from "./PlayerEventDecklistRow";
import EventRow from "../tournaments/EventRow";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import TopCardsSections from "../../components/TopCardsSections";

export default function PlayerProfile() {
  const { id = "" } = useParams<{ id: string }>();
  const playerId = Number(id);

  const playersData = useOmnidexPlayers();
  const judgesData = useOmnidexJudges();
  const eloData = useEloData();
  const hipsterData = useHipsterData();
  const playerDecksData = usePlayerDecksData();
  const index = useOmnidexIndex();
  const sightingsData = useDeckSightingsData();

  const player = playersData?.players.find((p) => p.id === playerId);
  const judge = judgesData?.judges.find((j) => j.id === playerId);
  const rating = eloData?.ratings.find((r) => r.playerId === playerId);
  const hipster = hipsterData?.playerScores.find((p) => p.playerId === playerId);
  const deckProfile = playerDecksData?.players.find((p) => p.playerId === playerId);
  const upsets = useMemo(
    () => eloData?.upsets.filter((u) => u.winnerId === playerId || u.loserId === playerId) ?? [],
    [eloData, playerId],
  );
  const allEvents = useMemo(
    () =>
      (player && index ? index.events.filter((e) => player.eventIds.includes(e.id)) : []).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [player, index],
  );

  // A player's champion for a given event only exists if that event had a public decklist —
  // sourced from deck-sightings (already keyed by player+event) rather than lazily fetching every
  // event's full decklist bundle just to build a filter list.
  const championByEventId = useMemo(() => {
    const map = new Map<number, string>();
    if (!sightingsData) return map;
    for (const s of sightingsData.sightings) {
      if (s.player === playerId && s.championName) map.set(s.eventId, s.championName);
    }
    return map;
  }, [sightingsData, playerId]);

  const [eventCategory, setEventCategory] = useState<string | null>(null);
  const [eventChampion, setEventChampion] = useState<string | null>(null);

  const categoriesPresent = useMemo(() => {
    const present = new Set(allEvents.map((e) => e.category));
    return EVENT_CATEGORY_ORDER.filter((c) => present.has(c));
  }, [allEvents]);

  const championsPresent = useMemo(
    () => Array.from(new Set(allEvents.map((e) => championByEventId.get(e.id)).filter((n): n is string => !!n))).sort(),
    [allEvents, championByEventId],
  );

  const events = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          (!eventCategory || e.category === eventCategory) && (!eventChampion || championByEventId.get(e.id) === eventChampion),
      ),
    [allEvents, eventCategory, eventChampion, championByEventId],
  );

  const judgedEvents = useMemo(
    () =>
      (judge && index ? index.events.filter((e) => judge.eventIds.includes(e.id)) : []).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [judge, index],
  );

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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ctp-red">Player {playerId} isn't in the ingested roster yet.</p>
        <Link to="/players" className="mt-2 inline-block text-ctp-blue hover:underline">
          &larr; All players
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/players" className="text-sm text-ctp-blue hover:underline">
        &larr; All players
      </Link>

      {(player || judge) && (
        <>
          <h1 className="mt-2 text-2xl font-bold text-ctp-blue">{player?.username ?? judge?.username}</h1>
          {rating && (
            <p className="mt-1 text-sm text-ctp-subtext1">
              Rating {Math.round(rating.rating)} · {rating.wins}-{rating.losses}-{rating.ties} across{" "}
              {rating.matches} matches
            </p>
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
        </>
      )}

      {upsets.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Notable upsets</h2>
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
        </div>
      )}

      {deckProfile && deckProfile.topChampions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">
            Most played champions ({deckProfile.totalDecks} decks)
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {deckProfile.topChampions.map((c) => {
              const card = championImages.get(c.name);
              return (
                <CardHoverPreview key={c.name} image={card?.editions[0]?.image} alt={c.name}>
                  <Link
                    to={`/archetypes/${encodeURIComponent(c.name)}`}
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
        </div>
      )}

      {allTopCardNames.length > 0 && deckProfile && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Most played cards</h2>
          <div className="mt-2">
            <TopCardsSections topCards={deckProfile.topCards} cardImages={cardImages} />
          </div>
        </div>
      )}

      {player && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">
            Events ({events.length}
            {events.length !== allEvents.length && ` of ${allEvents.length}`})
          </h2>

          {(categoriesPresent.length > 1 || championsPresent.length > 1) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {categoriesPresent.length > 1 && (
                <>
                  <span className="text-ctp-subtext0">Type:</span>
                  <select
                    value={eventCategory ?? ""}
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
            </div>
          )}

          <div className="mt-2 space-y-2">
            {events.map((event) => (
              <PlayerEventDecklistRow key={event.id} event={event} playerId={playerId} />
            ))}
          </div>
        </div>
      )}

      {judge && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">
            Judged events ({judgedEvents.length})
          </h2>
          <div className="mt-2 space-y-2">
            {judgedEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
