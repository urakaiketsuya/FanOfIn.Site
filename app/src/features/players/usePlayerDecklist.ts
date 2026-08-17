import { useEffect, useState } from "react";
import type { OmnidexDecklist } from "@gatcg/shared";
import { gatcgApi, isApiErrorBody } from "../../lib/api/client";

interface PlayerDecklistState {
  loading: boolean;
  decklist: OmnidexDecklist | null;
  error: string | null;
}

/** Fetches a single player's decklist for one event, only once `enabled` (lazy — avoids fetching for every event on a profile page). */
export function usePlayerDecklist(eventId: number, playerId: number, enabled: boolean): PlayerDecklistState {
  const [state, setState] = useState<PlayerDecklistState>({ loading: false, decklist: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState({ loading: true, decklist: null, error: null });

    gatcgApi
      .getOmnidexDecklists(eventId)
      .then((res) => {
        if (cancelled) return;
        if (isApiErrorBody(res)) {
          setState({ loading: false, decklist: null, error: res.error });
          return;
        }
        const entry = res.find((d) => d.player === playerId);
        setState({
          loading: false,
          decklist: entry?.decklist ?? null,
          error: entry ? null : "This player's decklist isn't public for this event.",
        });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, decklist: null, error: "Failed to load decklist." });
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, playerId, enabled]);

  return state;
}
