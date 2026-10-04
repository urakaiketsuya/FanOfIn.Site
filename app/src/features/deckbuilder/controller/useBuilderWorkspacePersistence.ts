import { useEffect } from "react";
import type { DeckFormat } from "@gatcg/shared";
import { saveActiveDeckWorkspace } from "../persistence/deckWorkspace";

interface DeckLine {
  name: string;
  quantity: number;
}

export function useBuilderWorkspacePersistence({ printings, championName, spiritName, format, main, material, sideboard, maybeboard }: {
  printings?: import("@gatcg/shared").DeckPrintings;
  championName: string | null;
  spiritName: string | null;
  format: DeckFormat;
  main: DeckLine[];
  material: DeckLine[];
  sideboard: DeckLine[];
  maybeboard: Map<string, number>;
}) {
  useEffect(() => {
    saveActiveDeckWorkspace(sessionStorage, {
      printings,
      source: "builder",
      title: championName ? `${championName} deck` : "Untitled deck",
      sourceLabel: "Deck Workbench",
      format,
      championName,
      spiritName,
      main,
      material,
      sideboard,
      maybeboard: Array.from(maybeboard, ([name, quantity]) => ({ name, quantity })),
    });
  }, [printings, championName, format, main, material, maybeboard, sideboard, spiritName]);
}
