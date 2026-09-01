import { useMemo } from "react";
import type { Card, CardInclusionEntry, DeckFormat } from "@gatcg/shared";
import {
  guoJiaFatestoneForIdentity,
  hasChampionBonus,
  IDENTITY_STAPLE_PREVALENCE,
  MIN_IDENTITY_STAPLE_POPULATION,
  isElementCompatible,
  type SuggestedBuild,
  type SuggestedCard,
} from "./useSuggestedBuild";
import { getDeckPackageCatalog } from "./packageGuardrails";

/** Same fallback defaults `useSuggestedBuild`'s `modalTotal` uses when a population can't supply its
 * own modal section size — ShoutAtYourDecks analytics don't publish an average deck size at all, so
 * these are the only targets available here. */
const MATERIAL_TARGET = 12;
const MAIN_TARGET = 48;
const MAX_EXTRA_SUGGESTIONS = 16;

function legalMaxCopies(card: Card | undefined, format: DeckFormat): number {
  return card?.legality?.[format]?.limit ?? (format === "PANTHEON" ? 1 : 4);
}

function toSuggested(cardName: string, quantity: number, locked: boolean, entry: CardInclusionEntry | undefined, section: SuggestedCard["section"], reason: SuggestedCard["reason"] = "ranked"): SuggestedCard {
  return {
    cardName,
    quantity,
    locked,
    section,
    adjustedLift: null,
    sample: null,
    optimizedFrom: null,
    quantityEvidence: { source: "matching population", sampleSize: entry?.deckCount ?? 0 },
    reason,
  };
}

/**
 * A much simpler counterpart to `useSuggestedBuild`, for when the viewer wants the blended community
 * deck list (Shout At Your Decks + Sleeved, see pipeline/src/community/blend.ts) instead of real
 * tournament win-rate data (see docs/CALCULATIONS.md, "Community population (blended)"). Ranks by
 * `percentOfDecks` (popularity) instead of `adjustedLift` (performance), since neither community
 * source carries win/loss data at all — every `SuggestedCard` this returns has
 * `adjustedLift`/`sample` permanently null, so the UI's existing "only show lift when present"
 * guards hide the Card-Impact-specific figures on their own. Deliberately doesn't touch
 * `useSuggestedBuild.ts` or its win-rate math — a separate, additive hook.
 */
export function useCommunitySuggestedBuild(
  champData: { deckCount: number; cards: CardInclusionEntry[] } | undefined,
  lockedCards: Map<string, number>,
  lockedSections: Map<string, SuggestedCard["section"]>,
  rejectedCards: Set<string>,
  cardsByName: Map<string, Card>,
  loading: boolean,
  /** The deck's actual castable elements (Champion + Spirit granted), same source useSuggestedBuild
   * uses — ShoutAtYourDecks' card-inclusion data is only scoped per Champion, not per Spirit, so
   * without this an off-element card from a different real Spirit build for the same Champion (e.g.
   * a Fire-element pick showing up for a Water-Spirit build) would rank and suggest normally. */
  identityElements: Set<string>,
  format: DeckFormat = "STANDARD",
  championCard?: Card,
  spiritCard?: Card,
): SuggestedBuild {
  return useMemo((): SuggestedBuild => {
    const empty: SuggestedBuild = {
      material: [],
      main: [],
      sideboard: [],
      suggestions: [],
      removalSuggestions: [],
      protectedRemovalSuggestions: [],
      protectedPackages: [],
      packageCatalog: getDeckPackageCatalog([]),
      hasQuantityOptimizations: false,
      rankingPopulationSize: 0,
      usedFallback: false,
      usedSpiritElementFallback: false,
      spiritElementFallbackSpirits: [],
      conditionalWinRate: null,
      baselineWinRate: null,
      matchingDeckCount: 0,
      unresolved: { main: 0, material: 0, sideboard: 0 },
      loading,
    };
    if (loading || !champData) return empty;

    const entryByName = new Map(champData.cards.map((c) => [c.name, c]));
    const material: SuggestedCard[] = [];
    const main: SuggestedCard[] = [];
    const sideboard: SuggestedCard[] = [];
    const placed = new Set<string>();

    // Locked cards go in first, at the viewer's own quantity — same precedence as
    // useSuggestedBuild. An explicitly chosen section wins; otherwise use the card's community
    // primarySection (falling back to main for a card ShoutAtYourDecks has never seen at all).
    for (const [name, qty] of lockedCards) {
      const entry = entryByName.get(name);
      const card = cardsByName.get(name);
      const knownSection = lockedSections.get(name);
      // Same real-data-verified precheck as useSuggestedBuild.ts: Champion/Regalia cards can never
      // legally sit in Main, so a missing/"mixed" primarySection defaults them to Material instead
      // of the general main fallback.
      const isMainIneligible = card ? card.types.includes("CHAMPION") || card.types.includes("REGALIA") : false;
      const section: SuggestedCard["section"] =
        knownSection === "sideboard"
          ? "sideboard"
          : isMainIneligible
            ? "material"
            : knownSection === "material" || knownSection === "main"
              ? knownSection
              : entry?.primarySection === "sideboard" && !isMainIneligible
                ? "sideboard"
                : entry?.primarySection === "material"
                  ? "material"
                  : "main";
      // Material Deck is capped at 1 copy of each card by rule (see useSuggestedBuild.ts's own
      // note) — a locked card's stored quantity can predate knowing its section, so clamp rather
      // than trust it.
      const finalQty = section === "material" ? 1 : qty;
      (section === "material" ? material : section === "sideboard" ? sideboard : main).push(toSuggested(name, finalQty, true, entry, section));
      placed.add(name);
    }

    const identityFatestone = guoJiaFatestoneForIdentity(championCard, spiritCard);
    const identityCandidates: { card: Card; entry: CardInclusionEntry | undefined; forced: boolean }[] = champData.cards
      .flatMap((entry) => {
        const card = cardsByName.get(entry.name);
        const forced = entry.name === identityFatestone;
        if (!card || !hasChampionBonus(card, championCard) || card.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT")) return [];
        if (!forced && (champData.deckCount < MIN_IDENTITY_STAPLE_POPULATION || entry.percentOfDecks < IDENTITY_STAPLE_PREVALENCE)) return [];
        return [{ card, entry, forced }];
      })
      .sort((a, b) => Number(b.forced) - Number(a.forced) || b.entry.percentOfDecks - a.entry.percentOfDecks || a.card.name.localeCompare(b.card.name));
    // The selected Fatestone can be absent from a thin community export. Its catalog rules text is
    // still authoritative, so add it explicitly instead of requiring an inclusion entry.
    if (identityFatestone && !identityCandidates.some(({ card }) => card.name === identityFatestone)) {
      const card = cardsByName.get(identityFatestone);
      if (card && hasChampionBonus(card, championCard)) identityCandidates.unshift({ card, entry: entryByName.get(identityFatestone), forced: true });
    }
    const deferredIdentityStaples: SuggestedCard[] = [];
    for (const { card, entry } of identityCandidates) {
      if (placed.has(card.name) || rejectedCards.has(card.name) || card.legality?.[format]?.limit === 0 || !isElementCompatible(card, identityElements)) continue;
      const section: SuggestedCard["section"] = entry?.primarySection === "main" && !card.types.includes("REGALIA") ? "main" : "material";
      const quantity = section === "material" ? 1 : Math.min(Math.max(1, Math.round(entry?.avgCopiesWhenIncluded ?? 1)), legalMaxCopies(card, format));
      const suggestion = toSuggested(card.name, quantity, false, entry, section, "identity-staple");
      const sectionCards = section === "material" ? material : main;
      const target = section === "material" ? MATERIAL_TARGET : (format === "PANTHEON" ? 60 : MAIN_TARGET);
      const total = sectionCards.reduce((sum, item) => sum + item.quantity, 0);
      if (total + quantity <= target) sectionCards.push(suggestion);
      else deferredIdentityStaples.push(suggestion);
      placed.add(card.name);
    }

    let materialTotal = material.reduce((sum, c) => sum + c.quantity, 0);
    let mainTotal = main.reduce((sum, c) => sum + c.quantity, 0);
    const mainTarget = format === "PANTHEON" ? 60 : MAIN_TARGET;

    // champData.cards already comes sorted by deckCount descending (pipeline/src/shoutatyourdecks/
    // analytics/cardInclusion.ts's tally()), same order as percentOfDecks for a fixed champion.
    const ranked = champData.cards.filter(
      (c) =>
        !placed.has(c.name) &&
        !rejectedCards.has(c.name) &&
        !cardsByName.get(c.name)?.subtypes.includes("SPIRIT") &&
        cardsByName.get(c.name)?.legality?.[format]?.limit !== 0 &&
        isElementCompatible(cardsByName.get(c.name), identityElements),
    );

    for (const entry of ranked) {
      if (materialTotal >= MATERIAL_TARGET && mainTotal >= mainTarget) break;
      const card = cardsByName.get(entry.name);
      if (card?.types.includes("CHAMPION") && entry.primarySection !== "material") continue;
      const section: SuggestedCard["section"] = entry.primarySection === "material" ? "material" : "main";
      if (section === "material") {
        if (materialTotal >= MATERIAL_TARGET) continue;
        material.push(toSuggested(entry.name, 1, false, entry, "material"));
        materialTotal += 1;
      } else {
        if (mainTotal >= mainTarget) continue;
        const qty = Math.min(Math.max(1, Math.round(entry.avgCopiesWhenIncluded)), legalMaxCopies(card, format), mainTarget - mainTotal);
        main.push(toSuggested(entry.name, qty, false, entry, "main"));
        mainTotal += qty;
      }
      placed.add(entry.name);
    }

    // Top ranked cards that didn't make the assembled build — mirrors useSuggestedBuild.suggestions.
    const suggestions = [
      ...deferredIdentityStaples,
      ...champData.cards
      .filter((c) => !placed.has(c.name) && !rejectedCards.has(c.name) && isElementCompatible(cardsByName.get(c.name), identityElements))
      .slice(0, MAX_EXTRA_SUGGESTIONS)
      .map((entry) => {
        const card = cardsByName.get(entry.name);
        const section: SuggestedCard["section"] = entry.primarySection === "material" ? "material" : entry.primarySection === "sideboard" ? "sideboard" : "main";
        const qty = section === "material" ? 1 : Math.min(Math.max(1, Math.round(entry.avgCopiesWhenIncluded)), legalMaxCopies(card, format));
        return toSuggested(entry.name, qty, false, entry, section);
      }),
    ].slice(0, MAX_EXTRA_SUGGESTIONS);

    const packageCatalog = getDeckPackageCatalog([...material, ...main, ...sideboard]);
    return {
      material,
      main,
      sideboard,
      suggestions,
      // Meaningless without win/loss data — always empty here, so the existing
      // `build.removalSuggestions.length > 0` render guard hides "Cards that might hurt" on its own.
      removalSuggestions: [],
      protectedRemovalSuggestions: [],
      protectedPackages: packageCatalog.filter((entry) => entry.active),
      packageCatalog,
      hasQuantityOptimizations: false,
      rankingPopulationSize: champData.deckCount,
      usedFallback: false,
      usedSpiritElementFallback: false,
      spiritElementFallbackSpirits: [],
      conditionalWinRate: null,
      baselineWinRate: null,
      matchingDeckCount: champData.deckCount,
      unresolved: { main: Math.max(0, mainTarget - mainTotal), material: Math.max(0, MATERIAL_TARGET - materialTotal), sideboard: 0 },
      loading: false,
    };
  }, [champData, lockedCards, lockedSections, rejectedCards, cardsByName, loading, identityElements, format, championCard, spiritCard]);
}
