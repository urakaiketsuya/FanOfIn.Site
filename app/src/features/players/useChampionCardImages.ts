import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Card } from "@gatcg/shared";
import { db } from "../../lib/db";

/**
 * A champion's display name ("Guo Jia") isn't itself a card name — it's the shared prefix of
 * that character's alternate-form printings ("Guo Jia, Chosen Disciple", ...). Picks any one
 * matching printing per name, just to have representative art.
 */
export function useChampionCardImages(championNames: string[]): Map<string, Card> {
  const key = useMemo(() => [...new Set(championNames)].sort().join("|"), [championNames]);

  const rows = useLiveQuery(async () => {
    const unique = [...new Set(championNames)];
    const found = await Promise.all(unique.map((name) => db.cards.where("name").startsWith(`${name}, `).first()));
    return found.filter((c): c is Card => c !== undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo(() => new Map((rows ?? []).map((c) => [c.name.split(",")[0].trim(), c])), [rows]);
}
