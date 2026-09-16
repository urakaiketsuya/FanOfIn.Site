import { useEffect } from "react";
import type { DeckFormat } from "@gatcg/shared";
import { saveActiveDeckWorkspace } from "../persistence/deckWorkspace";

interface DeckLine {
  name: string;
  quantity: number;
}

export function useBuilderWorkspacePersistence({ championName, spiritName, format, main, material, sideboard, maybeboard }: {
  championName: string | null;
  spiritName: string | null;
  format: DeckFormat;
  main: DeckLine[];
  material: DeckLine[];
  sideboard: DeckLine[];
  maybeboard: Map<string, number>;
}) {
  useEffect(() => {
    if (!championName || main.length === 0) return;
    saveActiveDeckWorkspace(sessionStorage, {
      source: "builder",
      title: `${championName} guided build`,
      sourceLabel: "Guided Deck Builder",
      format,
      championName,
      spiritName,
      main,
      material,
      sideboard,
      maybeboard: Array.from(maybeboard, ([name, quantity]) => ({ name, quantity })),
    });
  }, [championName, format, main, material, maybeboard, sideboard, spiritName]);
}
