/** Deterministic short string hash (djb2 xor variant) — no crypto needed, just a stable compact id for URLs. Shared so pipeline and app never drift on the same scheme. */
export function shortHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}
