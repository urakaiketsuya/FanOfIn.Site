import { useEffect, useState } from "react";
import type { DeckFormat } from "@gatcg/shared";
import { BUILDER_SESSION_KEY, legacyMapsToSelections, saveBuilderSession } from "../persistence/builderPersistence";
import type { BuilderWorkflowState } from "./useBuilderWorkflowState";

export function useBuilderSessionPersistence(format: DeckFormat, state: BuilderWorkflowState, storageKey: string = BUILDER_SESSION_KEY) {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    const saved = saveBuilderSession(sessionStorage, {
      selection: {
        printings: state.printings,
        format,
        championName: state.championName,
        spiritName: state.spiritFilter,
        archetypeId: state.archetypeId,
        populationSource: state.populationSource,
        pillarBias: state.pillarBias,
        championLevelCap: state.championLevelCap,
        collectionMode: state.collectionMode,
        lockedCards: legacyMapsToSelections(state.lockedCards, state.lockedSections),
        rejectedCards: Array.from(state.rejectedCards),
        maybeboard: legacyMapsToSelections(state.maybeboard, new Map()),
      },
      changeLog: state.changeLog,
    }, storageKey);
    setAvailable(saved);
  }, [format, state, storageKey]);
  return available;
}
