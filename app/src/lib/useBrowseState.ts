import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { decodeBrowseState, encodeBrowseState } from "./browseState";
import { useLocation } from "react-router-dom";

const memory = new Map<string, string>();

/** Tab-local browse preferences survive detail-page round trips. URL filters stay authoritative. */
export function useBrowseState<T>(field: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const { pathname } = useLocation();
  const key = `browse:v1:${pathname}:${field}`;
  function read(): T {
    let saved = memory.get(key);
    try { saved ??= sessionStorage.getItem(key) ?? undefined; } catch { /* Storage may be disabled. */ }
    try { if (saved !== undefined) return decodeBrowseState<T>(saved); } catch { /* Ignore damaged saved state. */ }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  }
  const [snapshot, setSnapshot] = useState(() => ({ key, value: read() }));
  const current = useRef(snapshot);
  let value = snapshot.value;
  if (snapshot.key !== key) {
    value = read();
    setSnapshot({ key, value });
  }
  current.current = { key, value };
  const update: Dispatch<SetStateAction<T>> = useCallback(action => {
    const next = typeof action === "function" ? (action as (value: T) => T)(current.current.value) : action;
    current.current = { key, value: next };
    const serialized = encodeBrowseState(next);
    memory.set(key, serialized);
    try { sessionStorage.setItem(key, serialized); } catch { /* Memory retains navigation state. */ }
    setSnapshot({ key, value: next });
  }, [key]);
  return [value, update];
}
