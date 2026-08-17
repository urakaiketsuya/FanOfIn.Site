import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Card } from "@gatcg/shared";
import { db } from "../../lib/db";

/** Resolves decklist card-name strings against the locally-synced card catalog (Phase 1), for linking + Champion detection. */
export function useCardsByNames(names: string[]): Map<string, Card> {
  const key = useMemo(() => [...new Set(names)].sort().join("|"), [names]);

  const rows = useLiveQuery(async () => {
    const unique = [...new Set(names)];
    if (unique.length === 0) return [];
    return db.cards.where("name").anyOf(unique).toArray();
  }, [key]);

  return useMemo(() => new Map((rows ?? []).map((c) => [c.name, c])), [rows]);
}
