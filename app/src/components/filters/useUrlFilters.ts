import { canonicalCardTag, filterValue, includeFilterValue, setFamilyPrefix } from "@gatcg/shared";
import { useMemo, type SetStateAction } from "react";
import { useBrowseParams } from "../../lib/useBrowseParams";

export function decodeUrlFilters<T extends object>(empty: () => T, prefix: string, fields: Record<string, string>, search: URLSearchParams): T {
  const next = empty();
  for (const [field, param] of Object.entries(fields)) {
    const key = field as keyof T, initial = next[key], values = search.getAll(prefix + param).map(value => {
      if (field === "tags") {
        if (/^-\d/.test(value)) value = includeFilterValue(value); // Legacy literal negative tag.
        const raw = canonicalCardTag(filterValue(value));
        return value.startsWith('-') ? `-${raw}` : includeFilterValue(raw);
      }
      if (field === "sets" && fields === CARD_FILTER_PARAMS) return (value.startsWith('-') ? '-' : '') + setFamilyPrefix(filterValue(value));
      return value;
    });
    if (!values.length) continue;
    next[key] = (initial instanceof Set ? new Set(values) : Array.isArray(initial) ? values : values[0]) as T[keyof T];
  }
  return next;
}

/** Stores filter fields only; tab, source and unrelated URL parameters remain intact. */
export function useUrlFilters<T extends object>(empty: () => T, prefix: string, fields: Record<string, string>): [T, (action: SetStateAction<T>) => void] {
  const [params, setParams] = useBrowseParams();
  // Keep derived filter objects stable when unrelated navigation/other filters change.
  const relevant = new URLSearchParams();
  for (const param of Object.values(fields)) for (const value of params.getAll(prefix + param)) relevant.append(prefix + param, value);
  const serialized = relevant.toString();
  const state = useMemo(() => decodeUrlFilters(empty, prefix, fields, new URLSearchParams(serialized)), [serialized, empty, prefix, fields]);
  const setState = (action: SetStateAction<T>) => {
    setParams(previous => {
      const next = typeof action === 'function' ? (action as (previous: T) => T)(decodeUrlFilters(empty, prefix, fields, previous)) : action;
      const search = new URLSearchParams(previous);
      for (const [field, param] of Object.entries(fields)) {
        search.delete(prefix + param);
        const value = next[field as keyof T];
        const values = value instanceof Set || Array.isArray(value) ? [...value] : value && value !== 'any' ? [value] : [];
        for (const item of values) search.append(prefix + param, String(item));
      }
      return search;
    }, { preventScrollReset: true });
  };
  return [state, setState];
}
export const CARD_FILTER_PARAMS = { name:'q', artist:'artist', classes:'class', types:'type', subtypes:'subtype', elements:'element', sets:'set', printingSets:'edition', rarities:'rarity', tags:'tag', speed:'speed' };
export const DECK_FILTER_PARAMS = { cards:'card', classes:'class', types:'type', subtypes:'subtype', elements:'element', sets:'set', speed:'speed' };
