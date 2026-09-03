import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { BroadcastTimelineMatch, BroadcastTimelines, Card } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";
import { db } from "../../lib/db";

export function useBroadcastTimelines(): BroadcastTimelines | undefined {
  return usePublishedData<BroadcastTimelines>("broadcast-timelines", "/data/broadcast-timelines.json");
}

export function useBroadcastTimelineMatch(id: string | undefined): BroadcastTimelineMatch | undefined {
  const data = useBroadcastTimelines();
  return id ? data?.matches.find((m) => m.id === id) : undefined;
}

/** Collapses stray whitespace from hand-extracted transcript text (e.g. a double space from a
 * copy-paste) before it's used as a card-name lookup key — cheap and safe, unlike guessing at a
 * caster's shortened/misheard name, which should instead be fixed at the source in the dataset. */
export function normalizeCardMention(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Same intent as useCardsByNames (events/useCardsByNames.ts) but whitespace- and case-insensitive
 * — broadcast transcripts are hand-extracted prose, not decklist text, so a mention is more likely
 * to carry incidental whitespace noise than an exact decklist entry would. Left un-normalized
 * mentions (a caster's shorthand or an ASR mishearing that isn't just whitespace/case) still won't
 * resolve — fix those in the dataset itself rather than guessing here. */
export function useCardsByMentions(names: string[]): Map<string, Card> {
  const key = useMemo(() => [...new Set(names.map(normalizeCardMention))].sort().join("|"), [names]);

  const rows = useLiveQuery(async () => {
    const unique = [...new Set(names.map(normalizeCardMention))];
    if (unique.length === 0) return [];
    return db.cards.where("name").anyOfIgnoreCase(unique).toArray();
  }, [key]);

  return useMemo(() => {
    const byLowerName = new Map((rows ?? []).map((c) => [c.name.toLowerCase(), c]));
    const result = new Map<string, Card>();
    for (const name of names) {
      const card = byLowerName.get(normalizeCardMention(name).toLowerCase());
      if (card) result.set(name, card);
    }
    return result;
  }, [rows, key, names]);
}
