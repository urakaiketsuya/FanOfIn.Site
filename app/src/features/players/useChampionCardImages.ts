import { useCardCatalog } from "../cards/useCardCatalog";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Card } from "@gatcg/shared";
import { db } from "../../lib/db";

/**
 * Placeholder avatar art for a player/judge who's never actually played a decklisted match (their
 * `topChampions` list is empty, so there's no real champion to show). "Nameless Champion" is a real
 * card – a generic, classless-identity starter Champion, printed once per class-combo (unlike every
 * other Champion, its `name` alone doesn't disambiguate the print, hence the plain `.equals` lookup
 * here rather than `useChampionCardImages`'s "before the comma" convention). Which of the ~18 real
 * class-combo prints comes back is whatever IndexedDB's `.first()` happens to return – they're all
 * equally fitting for "no identity yet," so this doesn't try to pin one down.
 */
export function useNamelessChampionCard(): Card | undefined {
  return useLiveQuery(() => db.cards.where("name").equals("Nameless Champion").first(), []);
}

/**
 * A champion's display name ("Guo Jia") isn't itself a card name – it's the shared prefix of
 * that character's alternate-form printings ("Guo Jia, Chosen Disciple", ...). Picks any one
 * matching printing per name, just to have representative art.
 */
export function useChampionCardImages(championNames: string[]): Map<string, Card> {
  const cards = useCardCatalog();
  const key = JSON.stringify(championNames);
  return useMemo(() => {
    const names = new Set<string>(JSON.parse(key));
    return new Map(cards.filter(card => card.types.includes("CHAMPION") && names.has(card.name.split(",")[0].trim())).map(card => [card.name.split(",")[0].trim(), card]));
  }, [cards, key]);
}
