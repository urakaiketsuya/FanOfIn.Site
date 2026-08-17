import { useEffect, useState } from "react";
import type { OmnidexDecklist, OmnidexDecklistEntry } from "@gatcg/shared";
import { gatcgApi, isApiErrorBody } from "../../lib/api/client";
import type { ComparedDeck } from "./types";

interface PublishedEventBundle {
  decklists: OmnidexDecklistEntry[] | { error: string };
}

async function resolveOne(deck: ComparedDeck): Promise<OmnidexDecklist | null> {
  if (deck.source.kind === "custom") return deck.source.decklist;

  const { eventId, player } = deck.source;

  // Prefer the static published bundle (matches useSightingDecklist) — falls back to the live
  // API for events a player has that the pipeline hasn't deep-fetched (see usePlayerDecklist).
  try {
    const res = await fetch(`/data/omnidex/events/${eventId}.json`);
    if (res.ok) {
      const bundle = (await res.json()) as PublishedEventBundle;
      if (Array.isArray(bundle.decklists)) {
        const entry = bundle.decklists.find((d) => d.player === player);
        if (entry) return entry.decklist;
      }
    }
  } catch {
    // fall through to the live API
  }

  const live = await gatcgApi.getOmnidexDecklists(eventId);
  if (isApiErrorBody(live)) return null;
  return live.find((d) => d.player === player)?.decklist ?? null;
}

/**
 * Resolves every compared deck to its actual card contents. "Custom" (pasted) decks already
 * carry their decklist; "sighting" decks are fetched per-deck, static bundle first with a live
 * API fallback (a player's event history can include events the backfill hasn't reached).
 */
export function useComparedDecklists(decks: ComparedDeck[]): Map<string, OmnidexDecklist | null> {
  const [resolved, setResolved] = useState<Map<string, OmnidexDecklist | null>>(new Map());

  useEffect(() => {
    let cancelled = false;

    Promise.all(decks.map(async (deck) => [deck.key, await resolveOne(deck)] as const)).then((pairs) => {
      if (!cancelled) setResolved(new Map(pairs));
    });

    return () => {
      cancelled = true;
    };
  }, [decks]);

  return resolved;
}
