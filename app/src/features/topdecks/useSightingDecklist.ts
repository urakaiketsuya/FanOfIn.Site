import { useEffect, useState } from "react";
import type { OmnidexDecklist, OmnidexDecklistEntry } from "@gatcg/shared";

interface SightingDecklistState {
  loading: boolean;
  decklist: OmnidexDecklist | null;
  error: string | null;
}

interface PublishedEventBundle {
  decklists: OmnidexDecklistEntry[] | { error: string };
}

const eventBundleRequests = new Map<number, Promise<PublishedEventBundle>>();
const MAX_CACHED_EVENT_BUNDLES = 12;

function loadEventBundle(eventId: number): Promise<PublishedEventBundle> {
  let request = eventBundleRequests.get(eventId);
  if (!request) {
    request = fetch(`/data/omnidex/events/${eventId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<PublishedEventBundle>;
      })
      .catch((error: unknown) => {
        eventBundleRequests.delete(eventId);
        throw error;
      });
    eventBundleRequests.set(eventId, request);
    if (eventBundleRequests.size > MAX_CACHED_EVENT_BUNDLES) {
      const oldest = eventBundleRequests.keys().next().value;
      if (oldest !== undefined) eventBundleRequests.delete(oldest);
    }
  }
  return request;
}

/**
 * Every deck sighting comes from an event we've already deep-fetched and published, so — unlike
 * a player-profile's arbitrary event history — this can always read the static per-event bundle
 * (data/omnidex/events/{id}.json) instead of hitting the live Omnidex API.
 */
export function useSightingDecklist(eventId: number, playerId: number, enabled: boolean): SightingDecklistState {
  const [state, setState] = useState<SightingDecklistState>({ loading: false, decklist: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState({ loading: true, decklist: null, error: null });

    loadEventBundle(eventId)
      .then((bundle) => {
        if (cancelled) return;
        if (!Array.isArray(bundle.decklists)) {
          setState({ loading: false, decklist: null, error: bundle.decklists.error });
          return;
        }
        const entry = bundle.decklists.find((d) => d.player === playerId);
        setState({
          loading: false,
          decklist: entry?.decklist ?? null,
          error: entry ? null : "Decklist not found for this player.",
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
