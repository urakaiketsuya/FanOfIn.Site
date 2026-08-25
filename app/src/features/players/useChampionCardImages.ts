import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Card } from "@gatcg/shared";
import { db } from "../../lib/db";

/**
 * Placeholder avatar art for a player/judge who's never actually played a decklisted match (their
 * `topChampions` list is empty, so there's no real champion to show). "Nameless Champion" is a real
 * card — a generic, classless-identity starter Champion, printed once per class-combo (unlike every
 * other Champion, its `name` alone doesn't disambiguate the print, hence the plain `.equals` lookup
 * here rather than `useChampionCardImages`'s "before the comma" convention). Which of the ~18 real
 * class-combo prints comes back is whatever IndexedDB's `.first()` happens to return — they're all
 * equally fitting for "no identity yet," so this doesn't try to pin one down.
 */
export function useNamelessChampionCard(): Card | undefined {
  return useLiveQuery(() => db.cards.where("name").equals("Nameless Champion").first(), []);
}

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
