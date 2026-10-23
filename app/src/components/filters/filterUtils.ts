import { toggleFilterValue } from "@gatcg/shared";
export function toggleSetValue<T>(values: ReadonlySet<T>, value: T): Set<T> {
  if (typeof value === "string") return toggleFilterValue(values as ReadonlySet<string>, value) as Set<T>;
  const next = new Set(values);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
