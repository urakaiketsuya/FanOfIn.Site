import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAchievementsData } from "./data";
import { useOmnidexIndex, useOmnidexPlayers } from "../tournaments/data";
import { buildCompareLink } from "../compare/deepLink";
import PlayerLink from "../players/PlayerLink";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import { EmptyState, InlineState } from "../../components/ui/ContentState";

const PAGE_SIZE = 50;

export default function AchievementDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const achievementsData = useAchievementsData();
  const playersData = useOmnidexPlayers();
  const index = useOmnidexIndex();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const definition = achievementsData?.definitions.find((d) => d.id === id);
  useDocumentTitle(definition?.name, definition?.description);

  const usernameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of playersData?.players ?? []) map.set(p.id, p.username);
    return map;
  }, [playersData]);

  const eventNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of index?.events ?? []) map.set(e.id, e.name);
    return map;
  }, [index]);

  const unlocks = useMemo(
    () => achievementsData?.unlocks.filter((u) => u.achievementId === id) ?? [],
    [achievementsData, id],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [id]);

  const visibleUnlocks = unlocks.slice(0, visibleCount);

  if (achievementsData && !definition) {
    return (
      <PageLayout>
        <EmptyState
          title="Achievement not found"
          description={`There's no achievement with id "${id}".`}
          action={<Link to="/achievements" className="text-ctp-blue hover:underline">&larr; All achievements</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Link to="/achievements" className="text-sm text-ctp-blue hover:underline">
        &larr; All achievements
      </Link>

      {definition && (
        <>
          <h1 className="mt-2 text-2xl font-bold text-ctp-blue">{definition.name}</h1>
          <p className="mt-1 text-sm text-ctp-subtext1">{definition.description}</p>

          <Section className="mt-6" heading="compact" title={`${unlocks.length} player${unlocks.length === 1 ? "" : "s"}`}>

          {unlocks.length === 0 && <InlineState className="mt-2 text-sm">No one has earned this achievement yet.</InlineState>}

          <div className="mt-2 space-y-1.5">
            {visibleUnlocks.map((u, i) => {
              const eventName = u.eventId !== undefined ? eventNameById.get(u.eventId) ?? `Event #${u.eventId}` : null;
              return (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-sm"
                >
                  <PlayerLink
                    id={u.playerId}
                    username={usernameById.get(u.playerId) ?? `Player #${u.playerId}`}
                    className="font-medium text-ctp-text hover:text-ctp-blue"
                  />
                  <span className="text-ctp-subtext0">{u.context}</span>
                  <span className="text-xs text-ctp-subtext0">{new Date(u.earnedAt).toLocaleDateString()}</span>
                  <div className="ml-auto flex shrink-0 gap-2 text-xs">
                    {u.eventId !== undefined && (
                      <Link to={`/events/${u.eventId}`} className="text-ctp-blue hover:underline">
                        {eventName}
                      </Link>
                    )}
                    {u.opponentPlayerId !== undefined && u.eventId !== undefined && (
                      <Link
                        to={buildCompareLink([
                          { eventId: u.eventId, player: u.playerId },
                          { eventId: u.eventId, player: u.opponentPlayerId },
                        ])}
                        className="text-ctp-blue hover:underline"
                      >
                        Compare match &rarr;
                      </Link>
                    )}
                    {u.opponentPlayerId === undefined && u.deckId !== undefined && u.eventId !== undefined && (
                      <Link to={`/events/${u.eventId}?player=${u.playerId}`} className="text-ctp-blue hover:underline">
                        View deck &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <LoadMore remaining={unlocks.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
          </Section>
        </>
      )}
    </PageLayout>
  );
}
