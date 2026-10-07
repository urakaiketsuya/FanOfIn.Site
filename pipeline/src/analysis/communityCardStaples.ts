import { STAPLE_SECTIONS, type CommunityDeckSource, type ShoutAtYourDecksDeck } from "@gatcg/shared";
import { normalizeCardKey, resolveCard, type CardSignature } from "../cards/catalog.js";
import { classifyDeckFormat } from "../shoutatyourdecks/format.js";
import { aggregateStaples, type StapleObservation } from "./cardStaples.js";

export interface CommunityStapleInput { source: CommunityDeckSource; deck: ShoutAtYourDecksDeck }

/** Community popularity has no match outcomes or uniformly available creation dates. */
export function computeCommunityCardStaples(inputs: CommunityStapleInput[], catalog: Map<string, CardSignature>, generatedAt = new Date().toISOString()) {
  const latest = new Map<string, CommunityStapleInput>();
  for (const input of inputs) {
    const key = `${input.source}:${input.deck.id}`;
    const old = latest.get(key);
    if (!old || input.deck.fetchedAt > old.deck.fetchedAt) latest.set(key, input);
  }
  const seen = new Set<string>();
  const observations: StapleObservation[] = [];
  for (const { deck } of [...latest.values()].sort((a, b) => a.source.localeCompare(b.source) || a.deck.id.localeCompare(b.deck.id))) {
    const raw: StapleObservation["raw"] = {};
    for (const [section, lines] of [["main", deck.mainDeck], ["material", deck.materialDeck], ["sideboard", deck.sideDeck]] as const) {
      if (!Array.isArray(lines)) continue;
      const counts = new Map<string, number>();
      for (const line of lines) {
        if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;
        const name = resolveCard(catalog, line.name)?.name ?? normalizeCardKey(line.name);
        counts.set(name, (counts.get(name) ?? 0) + line.quantity);
      }
      raw[section] = [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([card, quantity]) => ({ card, quantity }));
    }
    if (!raw.main?.length || !raw.material?.length) continue;
    const format = classifyDeckFormat(deck, deck).format.toLowerCase();
    // This is an exact registered-list fingerprint, not the site's deck-group identity.
    // Section boundaries, unknown sideboards, and Pantheon boons must remain distinct.
    const boons = new Map<string, number>();
    for (const line of deck.pantheonDeck ?? []) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;
      const name = resolveCard(catalog, line.name)?.name ?? normalizeCardKey(line.name);
      boons.set(name, (boons.get(name) ?? 0) + line.quantity);
    }
    const key = JSON.stringify([format, ...STAPLE_SECTIONS.map(section => raw[section] ?? null), [...boons].sort(([a], [b]) => a.localeCompare(b))]);
    if (seen.has(key)) continue;
    seen.add(key);
    observations.push({ raw, format, periods: ["all"] });
  }
  return aggregateStaples(observations, catalog, generatedAt, null);
}
