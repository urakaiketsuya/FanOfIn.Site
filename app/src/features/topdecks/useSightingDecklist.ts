import { useEffect, useState } from "react";
import { sightingEventLoader } from "./sightingEventLoader";
import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";

interface SightingDecklistState {
  loading: boolean;
  format?: DeckFormat;
  decklist: OmnidexDecklist | null;
  error: string | null;
}

/**
 * Every deck sighting comes from an event we've already deep-fetched and published, so – unlike
 * a player-profile's arbitrary event history – this can always read the static per-event bundle
 * (data/omnidex/events/{id}.json) instead of hitting the live Omnidex API.
 */
export function useSightingDecklist(eventId: number, playerId: number, enabled: boolean): SightingDecklistState & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SightingDecklistState>({ loading: false, decklist: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState({ loading: true, decklist: null, error: null });

    sightingEventLoader.load(eventId)
      .then((bundle) => {
        if (cancelled) return;
        if (!Array.isArray(bundle.decklists)) {
          setState({ loading: false, decklist: null, error: bundle.decklists.error });
          return;
        }
        const entry = bundle.decklists.find((d) => d.player === playerId);
        setState({
          loading: false,
          format: bundle.event?.format.toLowerCase() === "standard" ? "STANDARD" : bundle.event?.format.toLowerCase() === "pantheon" ? "PANTHEON" : "UNKNOWN",
          decklist: entry?.decklist ?? null,
          error: entry?.decklist ? null : "Decklist not found for this player.",
        });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, decklist: null, error: "Failed to load decklist." });
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, playerId, enabled, attempt]);

  return { ...state, retry: () => {
    sightingEventLoader.invalidate(eventId);
    setState({ loading: true, decklist: null, error: null });
    setAttempt(value => value + 1);
  } };
}
