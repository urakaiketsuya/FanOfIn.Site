/** Minimal shape both the app's `Card` and the pipeline's `CardSignature` satisfy. */
export interface SpiritLike {
  name: string;
  types: string[];
  subtypes: string[];
  elements: string[];
  effect: string | null | undefined;
}

/**
 * Maps a named-alter Spirit print (e.g. "Aithne, Spirit of Fire") to its base name ("Spirit of
 * Fire") when they're mechanically identical — same elements and effect text, not just the same
 * naming pattern. Verified against the real catalog: e.g. "Fragmented Spirit of Fire"/"Spirit of
 * Fortuitous Fire"/"Spirit of Serene Fire" share the "Spirit of ... Fire" pattern and FIRE element
 * with "Spirit of Fire" but have genuinely different effects (Glimpse variants, a Lineage Release
 * ability) — those stay separate, on purpose. Only a real byte-identical (elements + effect) match
 * gets folded, and only into the one group member without a comma in its name (the base print) —
 * a group with zero or more than one such member is left unaggregated rather than guessed at.
 * Without this, real named alters fragment one population into several thin ones (e.g. "Hanabi,
 * Spirit of Fire" — 1 deck) instead of counting toward the shared "Spirit of Fire" population they
 * actually belong to.
 */
export function buildSpiritCanonicalNames<T extends SpiritLike>(catalog: T[]): Map<string, string> {
  const groups = new Map<string, T[]>();
  for (const card of catalog) {
    if (!card.types.includes("CHAMPION") || !card.subtypes.includes("SPIRIT")) continue;
    // Incidental API formatting must not split mechanically-identical Spirit printings into
    // separate populations: whitespace (for example Miao, Spirit of Water vs. Spirit of Water)
    // and bold-marker placement around the same words (Kaze, Spirit of Wind writes "**On
    // Enter**:", the base print writes "**On Enter:**" — same ability, stray asterisks).
    const key = `${[...card.elements].sort().join(",")}|${(card.effect ?? "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim()}`;
    const list = groups.get(key) ?? [];
    list.push(card);
    groups.set(key, list);
  }
  const canonicalByName = new Map<string, string>();
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const basePrints = members.filter((c) => !c.name.includes(","));
    if (basePrints.length !== 1) continue;
    const baseName = basePrints[0].name;
    for (const member of members) canonicalByName.set(member.name, baseName);
  }
  return canonicalByName;
}
