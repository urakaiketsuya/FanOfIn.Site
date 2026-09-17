import { createContext, useContext } from "react";
import { useDeckBuilderController } from "./useDeckBuilderController";

export type DeckBuilderController = ReturnType<typeof useDeckBuilderController>;

export const DeckBuilderContext = createContext<DeckBuilderController | null>(null);

export function useDeckBuilder() {
  const controller = useContext(DeckBuilderContext);
  if (!controller) throw new Error("useDeckBuilder must be used within DeckBuilderProvider");
  return controller;
}
