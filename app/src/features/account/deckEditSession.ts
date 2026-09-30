export interface EditSnapshot { deckText: string; maybeboardText: string }
export interface EditHistory { past: EditSnapshot[]; future: EditSnapshot[] }
export interface DeckEditSession extends EditSnapshot { history: EditHistory }
type Update<T> = T | ((current: T) => T);
export type DeckEditAction =
  | { type: "deckText" | "maybeboardText"; value: Update<string> }
  | { type: "history"; value: Update<EditHistory> }
  | { type: "commit"; deckText: string; maybeboardText?: string }
  | { type: "undo" | "redo" };
export const emptyDeckEditSession: DeckEditSession = { deckText: "", maybeboardText: "", history: { past: [], future: [] } };

export function deckEditReducer(state: DeckEditSession, action: DeckEditAction): DeckEditSession {
  const current = { deckText: state.deckText, maybeboardText: state.maybeboardText };
  if (action.type === "deckText" || action.type === "maybeboardText") return { ...state, [action.type]: typeof action.value === "function" ? action.value(state[action.type]) : action.value };
  if (action.type === "history") return { ...state, history: typeof action.value === "function" ? action.value(state.history) : action.value };
  if (action.type === "commit") {
    const next = { deckText: action.deckText, maybeboardText: action.maybeboardText ?? state.maybeboardText };
    if (next.deckText === state.deckText && next.maybeboardText === state.maybeboardText) return state;
    return { ...next, history: { past: [...state.history.past.slice(-49), current], future: [] } };
  }
  if (action.type === "undo") {
    const previous = state.history.past.at(-1);
    return previous ? { ...previous, history: { past: state.history.past.slice(0, -1), future: [current, ...state.history.future].slice(0, 50) } } : state;
  }
  const next = state.history.future[0];
  return next ? { ...next, history: { past: [...state.history.past.slice(-49), current], future: state.history.future.slice(1) } } : state;
}
