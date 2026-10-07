export type SortPriority = "equal" | "favor-first" | "tie-break";

/** Configurable rank aggregation. Comparators must put preferred values first. */
export function balancedSort<T>(
  rows: readonly T[],
  primary: (a: T, b: T) => number,
  secondary: (a: T, b: T) => number,
  fallback: (a: T, b: T) => number = () => 0,
  priority: SortPriority = "equal",
): T[] {
  if (priority === "tie-break") return [...rows].sort((a, b) => primary(a, b) || secondary(a, b) || fallback(a, b));
  const entries = rows.map((row, index) => ({ row, index, score: 0 }));
  for (const [compare, weight] of [[primary, priority === "favor-first" ? 2 : 1], [secondary, 1]] as const) {
    const ordered = [...entries].sort((a, b) => compare(a.row, b.row));
    for (let start = 0; start < ordered.length;) {
      let end = start + 1;
      while (end < ordered.length && compare(ordered[start].row, ordered[end].row) === 0) end++;
      // Midranks give every tied value the same contribution, independent of input order.
      const rank = (start + end - 1) / 2;
      for (let i = start; i < end; i++) ordered[i].score += rank * weight;
      start = end;
    }
  }
  return entries.sort((a, b) => a.score - b.score || primary(a.row, b.row)
    || secondary(a.row, b.row) || fallback(a.row, b.row) || a.index - b.index).map(({ row }) => row);
}
