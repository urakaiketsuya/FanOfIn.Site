/**
 * TCGplayer's Mass Entry tool (tcgplayer.com/massentry) accepts a decklist via `?c=` — one entry
 * per card as "<quantity> <name>", joined with "||", with the game preselected via `productline`.
 * Confirmed against a real generated URL (Moxfield's MTG export); "Grand Archive" is TCGplayer's
 * own category name for this game (see pipeline/src/pricing/tcgcsv.ts's GA_ARCHIVE_CATEGORY_NAME),
 * so it's used verbatim as the productline value. No official public docs cover this parameter —
 * derived from a working example, not TCGplayer's API reference.
 */
export function buildTcgplayerMassEntryUrl(lines: { name: string; quantity: number }[]): string {
  const list = lines.map((l) => `${l.quantity} ${l.name}`).join("||");
  const params = new URLSearchParams({ productline: "Grand Archive", c: list });
  return `https://www.tcgplayer.com/massentry?${params.toString()}`;
}
