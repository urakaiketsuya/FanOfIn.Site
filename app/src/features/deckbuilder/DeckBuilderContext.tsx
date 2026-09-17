import type { PropsWithChildren } from "react";
import { DeckBuilderContext, type DeckBuilderController } from "./useDeckBuilder";

export function DeckBuilderProvider({
  children,
  value,
}: PropsWithChildren<{ value: DeckBuilderController }>) {
  return <DeckBuilderContext.Provider value={value}>{children}</DeckBuilderContext.Provider>;
}
