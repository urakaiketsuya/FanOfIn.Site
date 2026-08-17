import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type OmnidexEventBundle } from "../../lib/db";
import { gatcgApi, ApiError } from "../../lib/api/client";

interface EventBundleState {
  bundle: OmnidexEventBundle | undefined;
  loading: boolean;
  error: string | null;
}

/** Cache-first (instant render for previously-viewed events), always refreshes from the network in the background. */
export function useEventBundle(eventId: number): EventBundleState {
  const cached = useLiveQuery(() => db.omnidexEvents.get(eventId), [eventId]);
  const [error, setError] = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setRefreshed(false);

    (async () => {
      try {
        const [event, players, standings, judges, teams, decklists, statistics] = await Promise.all([
          gatcgApi.getOmnidexEvent(eventId),
          gatcgApi.getOmnidexPlayers(eventId),
          gatcgApi.getOmnidexStandings(eventId),
          gatcgApi.getOmnidexJudges(eventId),
          gatcgApi.getOmnidexTeams(eventId),
          gatcgApi.getOmnidexDecklists(eventId),
          gatcgApi.getOmnidexStatistics(eventId),
        ]);
        if (cancelled) return;
        await db.omnidexEvents.put({
          id: eventId,
          event,
          players,
          standings,
          judges,
          teams,
          decklists,
          statistics,
          fetchedAt: new Date().toISOString(),
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError && err.status === 404 ? `Event ${eventId} not found.` : "Failed to load event.");
        console.error(`failed to load omnidex event ${eventId}`, err);
      } finally {
        if (!cancelled) setRefreshed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return { bundle: cached, loading: cached === undefined && !refreshed, error };
}
