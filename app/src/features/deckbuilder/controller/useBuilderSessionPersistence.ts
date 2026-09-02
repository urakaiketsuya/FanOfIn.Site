import { useEffect } from "react";
import type { DeckFormat } from "@gatcg/shared";
import { legacyMapsToSelections, saveBuilderSession } from "../persistence/builderPersistence";
import type { BuilderWorkflowState } from "./useBuilderWorkflowState";

export function useBuilderSessionPersistence(format: DeckFormat, state: BuilderWorkflowState): void {
  useEffect(() => {
    saveBuilderSession(sessionStorage, {
      selection: {
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
    });
  }, [format, state]);
}
