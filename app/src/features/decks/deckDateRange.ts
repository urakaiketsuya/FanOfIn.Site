/** Inclusive calendar dates, without converting UTC date strings to local time. */
export function deckDateInRange(date: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (from && to && from > to) return false;
  const day = date.slice(0, 10);
  return Boolean(day) && (!from || day >= from) && (!to || day <= to);
}
