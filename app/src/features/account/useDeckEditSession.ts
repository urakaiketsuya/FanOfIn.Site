import { useMemo, useReducer, type SetStateAction } from "react";
import { deckEditReducer, emptyDeckEditSession, type EditHistory, type EditSnapshot } from "./deckEditSession";

export function useDeckEditSession(initial?: EditSnapshot) {
  const [state, dispatch] = useReducer(deckEditReducer, { ...emptyDeckEditSession, ...initial });
  const controls = useMemo(() => ({
    setDeckText: (value: SetStateAction<string>) => dispatch({ type: "deckText", value }),
    setMaybeboardText: (value: SetStateAction<string>) => dispatch({ type: "maybeboardText", value }),
    setEditHistory: (value: SetStateAction<EditHistory>) => dispatch({ type: "history", value }),
    commit: (deckText: string, maybeboardText?: string) => dispatch({ type: "commit", deckText, maybeboardText }),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
  }), [dispatch]);
  return { ...controls, deckText: state.deckText, maybeboardText: state.maybeboardText, editHistory: state.history };
}
