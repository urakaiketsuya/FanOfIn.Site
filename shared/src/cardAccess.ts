import { reportAccess } from './packageAccessReport.js';

/** Uniform sampling without replacement; access is independent of playability. */
export function cardAccess(size: number, copies: number, seen: number) {
  if (![size, copies, seen].every(Number.isSafeInteger) || size < 0 || copies < 0 || copies > size || seen < 0) throw new RangeError('Invalid card access population');
  const draws = Math.min(size, seen);
  let zero = 1, one = 0;
  for (let i = 0; i < draws; i++) {
    const remaining = size - i;
    one = one * Math.max(0, size - copies - i + 1) / remaining + zero * copies / remaining;
    zero *= Math.max(0, size - copies - i) / remaining;
  }
  const access = reportAccess(size, copies, draws);
  return { seen: draws, access, multiple: copies < 2 || draws < 2 ? 0 : Math.max(0, Math.min(1, access - one)) };
}

/** Fixed deck size: additional copies replace other cards; no legality recommendation. */
export function copyCountTradeoffs(size: number, seen: number, current: number) {
  const quantities = [...new Set([1, 2, 3, 4, current])].filter(n => n > 0 && n <= size).sort((a, b) => a - b);
  return quantities.map(copies => {
    const result = cardAccess(size, copies, seen);
    const previous = cardAccess(size, copies - 1, seen);
    return { copies, ...result, accessGain: result.access - previous.access, multipleGain: result.multiple - previous.multiple };
  });
}
