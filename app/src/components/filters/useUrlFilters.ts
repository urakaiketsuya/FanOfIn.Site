import { canonicalCardTag, filterValue, includeFilterValue, setFamilyPrefix } from "@gatcg/shared";
import { useMemo, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";

/** Stores filter fields only; tab, source and unrelated URL parameters remain intact. */
export function useUrlFilters<T extends object>(empty: () => T, prefix: string, fields: Record<string, string>): [T, (action: SetStateAction<T>) => void] {
  const [params, setParams] = useSearchParams();
  const serialized = params.toString();
  const state = useMemo(() => {
    const next = empty();
    const search = new URLSearchParams(serialized);
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
  }, [serialized, empty, prefix, fields]);
  const setState = (action: SetStateAction<T>) => {
    const next = typeof action === 'function' ? (action as (previous: T) => T)(state) : action;
    const search = new URLSearchParams(params);
    for (const [field, param] of Object.entries(fields)) {
      search.delete(prefix + param);
      const value = next[field as keyof T];
      const values = value instanceof Set || Array.isArray(value) ? [...value] : value && value !== 'any' ? [value] : [];
      for (const item of values) search.append(prefix + param, String(item));
    }
    if (search.toString() !== params.toString()) setParams(search, { preventScrollReset: true });
  };
  return [state, setState];
}
export const CARD_FILTER_PARAMS = { name:'q', artist:'artist', classes:'class', types:'type', subtypes:'subtype', elements:'element', sets:'set', printingSets:'edition', rarities:'rarity', tags:'tag', speed:'speed' };
export const DECK_FILTER_PARAMS = { cards:'card', classes:'class', types:'type', subtypes:'subtype', elements:'element', sets:'set', speed:'speed' };
