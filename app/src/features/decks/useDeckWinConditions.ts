import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import { computeDeckWinConditions, type DeckInteraction } from "../../lib/deckWinConditions";
import { useDeckCardPresenceIndex } from "../cards/useDeckCardPresenceIndex";

export type { DeckInteraction };

/** Thin `useMemo` wrapper around `computeDeckWinConditions` — see that function's doc comment for
 * what it detects and why. `loading` distinguishes "presence data hasn't loaded yet" (every
 * interaction is provisionally `"textOnly"`) from "confirmed no real deck backs this." */
export function useDeckWinConditions(deckCardNames: string[], cardsByName: Map<string, Card>): { interactions: DeckInteraction[]; loading: boolean } {
  const presence = useDeckCardPresenceIndex();
  const interactions = useMemo(
    () => computeDeckWinConditions(deckCardNames, cardsByName, presence),
    [deckCardNames, cardsByName, presence],
  );
  return { interactions, loading: !presence };
}
