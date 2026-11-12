import { useEffect } from "react";
import type { DeckFormat } from "@gatcg/shared";
import { saveActiveDeckWorkspace, type DeckWorkspaceContext } from "../persistence/deckWorkspace";

interface DeckLine {
  name: string;
  quantity: number;
}

export function useBuilderWorkspacePersistence({ workspaceContext, printings, championName, spiritName, format, main, material, sideboard, song, maybeboard }: {
  workspaceContext?: DeckWorkspaceContext;
  printings?: import("@gatcg/shared").DeckPrintings;
  championName: string | null;
  spiritName: string | null;
  format: DeckFormat;
  song?: DeckLine[];
  main: DeckLine[];
  material: DeckLine[];
  sideboard: DeckLine[];
  maybeboard: Map<string, number>;
}) {
  useEffect(() => {
    saveActiveDeckWorkspace(sessionStorage, {
      printings,
      source: "builder",
      title: workspaceContext?.title ?? (championName ? `${championName} deck` : "Untitled deck"),
      sourceLabel: workspaceContext?.sourceLabel ?? "Deck editor",
      deckIdentity: workspaceContext?.deckIdentity,
      format,
      championName,
      spiritName,
      song,
      main,
      material,
      sideboard,
      maybeboard: Array.from(maybeboard, ([name, quantity]) => ({ name, quantity })),
    });
  }, [workspaceContext, printings, championName, format, main, material, maybeboard, sideboard, song, spiritName]);
}
