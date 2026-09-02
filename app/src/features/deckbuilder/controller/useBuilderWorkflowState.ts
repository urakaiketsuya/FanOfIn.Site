import { useMemo, useReducer, type Dispatch, type SetStateAction } from "react";
import type { RatingPillar } from "../../../lib/deckIdentity";
import type { ChangeLogEntry, CollectionMode, LockedSection, PopulationSource } from "../model/builderTypes";

export interface BuilderWorkflowState {
  championName: string | null;
  spiritFilter: string | null;
  lockedCards: Map<string, number>;
  maybeboard: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
  rejectedCards: Set<string>;
  pillarBias: RatingPillar | null;
  archetypeId: string | null;
  championLevelCap: number | null;
  populationSource: PopulationSource;
  collectionMode: CollectionMode;
  changeLog: ChangeLogEntry[];
}

type WorkflowAction = { [K in keyof BuilderWorkflowState]: { type: "set"; field: K; value: SetStateAction<BuilderWorkflowState[K]> } }[keyof BuilderWorkflowState];

function reducer(state: BuilderWorkflowState, action: WorkflowAction): BuilderWorkflowState {
  const current = state[action.field];
  const value = typeof action.value === "function"
    ? (action.value as (previous: typeof current) => typeof current)(current)
    : action.value;
  return { ...state, [action.field]: value };
}

export function useBuilderWorkflowState(initial: BuilderWorkflowState) {
  const [state, dispatch] = useReducer(reducer, initial);
  const setter = <K extends keyof BuilderWorkflowState>(field: K): Dispatch<SetStateAction<BuilderWorkflowState[K]>> => (
    (value) => dispatch({ type: "set", field, value } as WorkflowAction)
  );
  const actions = useMemo(() => ({
    setChampionName: setter("championName"),
    setSpiritFilter: setter("spiritFilter"),
    setLockedCards: setter("lockedCards"),
    setMaybeboard: setter("maybeboard"),
    setLockedSections: setter("lockedSections"),
    setRejectedCards: setter("rejectedCards"),
    setPillarBias: setter("pillarBias"),
    setArchetypeId: setter("archetypeId"),
    setChampionLevelCap: setter("championLevelCap"),
    setPopulationSource: setter("populationSource"),
    setCollectionMode: setter("collectionMode"),
    setChangeLog: setter("changeLog"),
    // `dispatch` is stable; setters close over no render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  return {
    state,
    ...actions,
  };
}
