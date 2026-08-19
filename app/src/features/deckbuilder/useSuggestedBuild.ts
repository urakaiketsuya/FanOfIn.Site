import { useMemo } from "react";
import { computeCardImpactEntries, computeSingleCardImpact, type Card, type CardImpactEntry, type CardSectionRow } from "@gatcg/shared";
import { useCardCatalog } from "../cards/useCardCatalog";
import type { DeckBuilderRow } from "./useDeckBuilderPopulation";

/** Mirrors pipeline/src/config.ts's defaults — see useChampionCardImpact.ts for why these are plain literals here. */
const PRIOR_WEIGHT = 10;
const MIN_SAMPLE_SIZE = 5;
/** A with/without split needs at least this many rows total before it's worth ranking against — below this, fall back to the broader (lock-unconditioned) population instead of showing nothing. */
const MIN_RANKING_POPULATION = MIN_SAMPLE_SIZE * 2;
/** How many ranked-but-unplaced cards to surface as "cards that might help" beyond the assembled build — matters most for a fully-locked build (e.g. from a paste), where every Material/Main/Sideboard slot is already spoken for and the ranked pool would otherwise never be shown at all. */
const MAX_EXTRA_SUGGESTIONS = 8;
/** A locked card's own lift needs to clear this far below zero (not just "any negative number") before it's worth flagging as a removal candidate — same shrinkage-noise-floor reasoning as the positive suggestion side. */
const REMOVAL_LIFT_CEILING = -0.02;
const MAX_REMOVAL_SUGGESTIONS = 5;

type DeckSection = "main" | "material" | "sideboard";

export interface SuggestedCard {
  cardName: string;
  quantity: number;
  locked: boolean;
  /** Which section this card is placed in (for entries already in material/main/sideboard) — or, for an unplaced `suggestions` entry, which section it *would* go into if added. */
  section: DeckSection;
  /** null when there's no lift number to show — either it's the viewer's picked Spirit, or a Champion-level print so near-universally run that it never cleared the with/without sample bar (see the "staple" note below). */
  adjustedLift: number | null;
  sample: { with: number; without: number } | null;
  /** "spirit" = the viewer's own Spirit pick, not ranked. "staple" = a Champion-level print included because it's the most commonly run print at that level, not because it cleared the lift sample bar (near-100%-adoption cards usually don't — their "without" bucket is too thin). "ranked" = a normal lift-ranked suggestion. */
  reason: "spirit" | "staple" | "ranked";
}

export interface SuggestedBuild {
  material: SuggestedCard[];
  main: SuggestedCard[];
  /** Locked cards first, then ranked sideboard-role suggestions up to this population's own modal sideboard size (0 when most decks don't run one) — same ranking core as Material/Main, just against the `sideboard` presence data instead. */
  sideboard: SuggestedCard[];
  /** Top ranked cards that didn't make it into Material/Main/Sideboard above — either because every slot in their section's target was already full, or (most visibly) because a fully-locked build (e.g. loaded from a paste) leaves no open slots at all. Unlocked, "Add" is the only action; adding one grows the build past its modal target on purpose. */
  suggestions: SuggestedCard[];
  /** Locked cards whose own with/without split (against the Spirit-only population, independent of any other lock) came out meaningfully negative — a candidate to cut, not just "no data either way." Always locked (they're already in material/main/sideboard); "Remove" is the only action. */
  removalSuggestions: SuggestedCard[];
  /** Size of the population actually used to rank suggestions for the remaining (unlocked) slots — not the same as the total matching-decks count once usedFallback is true. */
  rankingPopulationSize: number;
  /** True once enough cards are locked that the exact (Spirit + all locks) population got too thin to rank against, so remaining suggestions fell back to the Spirit-only population instead. */
  usedFallback: boolean;
  /** Real average win rate of decks matching the Spirit filter AND every card currently locked in — the actual population everything is being ranked against. Shifts as locks are added/removed, so it doubles as "does this pick move the needle." Null only when there's no population at all yet. */
  conditionalWinRate: number | null;
  /** Real average win rate of decks matching just the Spirit filter (no lock condition) — a stable reference point for measuring how far locks have moved conditionalWinRate. */
  baselineWinRate: number | null;
  loading: boolean;
}

function legalMaxCopies(card: Card | undefined): number {
  return card?.types.includes("UNIQUE") ? 1 : 4;
}

/** Most common quantity this card was run at, among rows that include it in the given section — falls back to the legal max when the card was never seen in this population (e.g. added via free-text search). */
function modalQuantity(rows: DeckBuilderRow[], section: DeckSection, cardName: string, card: Card | undefined): number {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const qty = row[section].get(cardName);
    if (qty !== undefined) counts.set(qty, (counts.get(qty) ?? 0) + 1);
  }
  if (counts.size === 0) return legalMaxCopies(card);
  const [best] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return Math.min(best, legalMaxCopies(card));
}

/** Most common total copy count for a section across the population — the assembly target, rather than assuming a fixed 60/12 (real decklists vary, e.g. 60 vs 61). A sideboard target of 0 is a real, valid answer (most decks for a Champion may simply not run one) — no fallback games it upward. */
function modalTotal(rows: DeckBuilderRow[], section: DeckSection, fallback: number): number {
  if (rows.length === 0) return fallback;
  const counts = new Map<number, number>();
  for (const row of rows) {
    const total = Array.from(row[section].values()).reduce((a, b) => a + b, 0);
    if (total > 0) counts.set(total, (counts.get(total) ?? 0) + 1);
  }
  if (counts.size === 0) return fallback;
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

function toSuggested(
  cardName: string,
  quantity: number,
  locked: boolean,
  entry: CardImpactEntry | undefined,
  reason: SuggestedCard["reason"],
  section: DeckSection,
): SuggestedCard {
  return {
    cardName,
    quantity,
    locked,
    section,
    adjustedLift: entry?.adjustedLift ?? null,
    sample: entry ? { with: entry.deckCountWith, without: entry.deckCountWithout } : null,
    reason,
  };
}

/**
 * Assembles a suggested build for a Champion (+ optional Spirit filter), honoring any cards the
 * viewer has locked in. Locked cards are always included as-is — they need no data to justify
 * their presence, they're the viewer's own choice. Everything else is filled by ranking the
 * remaining population (decks that have the Spirit and every locked card) via the same
 * with/without/shrink core used by every other Card Impact surface (`computeCardImpactEntries`),
 * falling back to the Spirit-only population once locking has narrowed things too far to rank
 * against reliably.
 */
export function useSuggestedBuild(
  rows: DeckBuilderRow[],
  spiritFilter: string | null,
  lockedCards: Map<string, number>,
  rejectedCards: Set<string>,
  loading: boolean,
  /** Section a lock is *known* to belong to (e.g. from a pasted decklist's own Main/Material/Sideboard headers) — trusted over the population-derived `sectionOf` guess below, which can misclassify a card the current population barely plays (see the Resonance Bauble bug: near-zero sample defaults to "main" regardless of the card's real section), and is the only way a card ever lands in the sideboard at all (there's no population-driven sideboard guess). Cards locked without a known section (manual "Add a card") still fall back to the main/material guess. */
  lockedSections: Map<string, "main" | "material" | "sideboard"> = new Map(),
): SuggestedBuild {
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);

  return useMemo((): SuggestedBuild => {
    if (loading || rows.length === 0)
      return {
        material: [],
        main: [],
        sideboard: [],
        suggestions: [],
        removalSuggestions: [],
        rankingPopulationSize: 0,
        usedFallback: false,
        conditionalWinRate: null,
        baselineWinRate: null,
        loading,
      };

    const spiritRows = spiritFilter === null ? rows : rows.filter((r) => r.spiritName === spiritFilter);
    if (spiritRows.length === 0)
      return {
        material: [],
        main: [],
        sideboard: [],
        suggestions: [],
        removalSuggestions: [],
        rankingPopulationSize: 0,
        usedFallback: false,
        conditionalWinRate: null,
        baselineWinRate: null,
        loading: false,
      };

    const baselineWinRate = spiritRows.reduce((sum, r) => sum + r.winRate, 0) / spiritRows.length;

    const lockedNames = new Set(lockedCards.keys());
    // Only condition on locks with a real sample behind them — a card only 1-4 decks in this
    // population have ever played (e.g. "Ariel, Archangel of Natura", confirmed live: exactly 1
    // Diao Chan deck) would otherwise let that single deck's own win rate dominate — or, at zero
    // occurrences, require every row to contain it, which is trivially impossible and zeroes out
    // the conditional population entirely. Neither is "this combo performs badly," it's "we don't
    // have enough data on this card here" — a different situation that shouldn't erase or distort
    // the win rate contributed by every OTHER lock already in place. Same MIN_SAMPLE_SIZE bar
    // Card Impact uses everywhere else for "is this enough data to trust." Real bug, reported live
    // (first as the win rate vanishing, then as a single deck swinging it) and fixed both ways.
    const conditionableLockedNames = Array.from(lockedNames).filter(
      (n) => spiritRows.filter((r) => r.main.has(n) || r.material.has(n)).length >= MIN_SAMPLE_SIZE,
    );
    const conditionalRows =
      conditionableLockedNames.length === 0 ? spiritRows : spiritRows.filter((r) => conditionableLockedNames.every((n) => r.main.has(n) || r.material.has(n)));
    // The real average for decks matching every (data-backed) lock exactly — reported even when
    // that same population was too thin to rank against and suggestions fell back to the broader
    // one below (ranking and "what does this combo actually average" are different questions).
    const conditionalWinRate = conditionalRows.length > 0 ? conditionalRows.reduce((sum, r) => sum + r.winRate, 0) / conditionalRows.length : null;

    const usedFallback = lockedNames.size > 0 && conditionalRows.length < MIN_RANKING_POPULATION;
    const rankingRows = usedFallback ? spiritRows : conditionalRows;

    // A locked card's OWN with/without split, independent of every other lock — `rankingRows` is
    // the wrong population for this (once conditioned on this exact card, its own "without" bucket
    // is empty by construction), so this runs against `spiritRows` instead, same population
    // `baselineWinRate` already uses. Lets a locked card show a real lift number instead of a flat
    // "locked" badge, and is what "which of my locked cards might actually be hurting me" needs.
    const spiritSectionRows: CardSectionRow[] = spiritRows.map((r) => ({
      sections: { main: new Set(r.main.keys()), material: new Set(r.material.keys()), sideboard: new Set(r.sideboard.keys()) },
      outcome: r.winRate,
    }));
    const lockedEntryByName = new Map<string, CardImpactEntry>();
    for (const name of lockedNames) {
      const entry = computeSingleCardImpact(spiritSectionRows, name, baselineWinRate, PRIOR_WEIGHT, MIN_SAMPLE_SIZE);
      if (entry) lockedEntryByName.set(name, entry);
    }

    const sectionRows: CardSectionRow[] = rankingRows.map((r) => ({
      sections: { main: new Set(r.main.keys()), material: new Set(r.material.keys()), sideboard: new Set(r.sideboard.keys()) },
      outcome: r.winRate,
    }));
    const baseline = rankingRows.reduce((sum, r) => sum + r.winRate, 0) / rankingRows.length;
    const ranked = computeCardImpactEntries(sectionRows, baseline, PRIOR_WEIGHT, MIN_SAMPLE_SIZE).filter(
      (e) => !lockedNames.has(e.cardName) && !rejectedCards.has(e.cardName),
    );
    const entryByName = new Map(ranked.map((e) => [e.cardName, e]));

    const materialTarget = modalTotal(spiritRows, "material", 12);
    const mainTarget = modalTotal(spiritRows, "main", 60);
    const sideboardTarget = modalTotal(spiritRows, "sideboard", 0);

    const material: SuggestedCard[] = [];
    const main: SuggestedCard[] = [];
    const sideboard: SuggestedCard[] = [];
    const placed = new Set<string>();

    // Which section a card typically lives in, from raw presence in the (lock-independent)
    // Spirit-filtered population — NOT from `entryByName`, which deliberately excludes locked
    // cards (so a card doesn't compete against itself in the ranking) and would otherwise always
    // return undefined for every locked card, silently defaulting every one of them to "main"
    // regardless of where it's actually played. >=80% in one section wins; otherwise "mixed",
    // which defaults to main — same convention `computeCardImpactEntries` uses for role.
    function sectionOf(name: string): "main" | "material" {
      let mainCount = 0;
      let materialCount = 0;
      for (const row of spiritRows) {
        if (row.main.has(name)) mainCount++;
        if (row.material.has(name)) materialCount++;
      }
      const total = mainCount + materialCount;
      if (total === 0) return "main";
      return materialCount / total >= 0.8 ? "material" : "main";
    }

    // Locked cards go in first, at their own quantity, sectioned by wherever they're actually
    // played (falls back to "main" for a card never seen in this population). A known "sideboard"
    // section always wins — there's no population-derived guess for it, only explicit knowledge
    // from where the card was locked (e.g. a pasted decklist's own Sideboard section).
    for (const [name, qty] of lockedCards) {
      const card = cardsByName.get(name);
      const knownSection = lockedSections.get(name);
      if (knownSection === "sideboard") {
        sideboard.push(toSuggested(name, qty, true, lockedEntryByName.get(name), "ranked", "sideboard"));
        placed.add(name);
        continue;
      }
      const isMaterialCard = knownSection ? knownSection === "material" : card?.types.includes("CHAMPION") || sectionOf(name) === "material";
      (isMaterialCard ? material : main).push(toSuggested(name, qty, true, lockedEntryByName.get(name), "ranked", isMaterialCard ? "material" : "main"));
      placed.add(name);
    }

    // Champion-level anchors: one print per level actually present in the ranking population,
    // highest-lift pick at that level (a locked print at the same level, handled above, wins
    // instead). Real decklists showed the levels/prints aren't fixed per Champion — some Champions
    // have multiple same-level variants — so this is picked from data, not the raw card list.
    const lockedLevels = new Set(
      Array.from(lockedCards.keys())
        .map((n) => cardsByName.get(n)?.level)
        .filter((l): l is number => l !== null && l !== undefined),
    );
    const championCardsByLevel = new Map<number, Map<string, number>>();
    for (const row of rankingRows) {
      for (const name of row.material.keys()) {
        const card = cardsByName.get(name);
        if (!card?.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT") || card.level === null || card.level === undefined) continue;
        if (placed.has(name)) continue;
        const counts = championCardsByLevel.get(card.level) ?? new Map<string, number>();
        counts.set(name, (counts.get(name) ?? 0) + 1);
        championCardsByLevel.set(card.level, counts);
      }
    }
    for (const [level, counts] of Array.from(championCardsByLevel.entries()).sort((a, b) => a[0] - b[0])) {
      if (lockedLevels.has(level)) continue;
      const names = Array.from(counts.keys());
      // Prefer the highest-lift print if any candidate at this level cleared the sample bar; a
      // near-universally-run print (most decks include all their Champion's level prints) usually
      // won't, since its "without" bucket is too thin — same "excludes defining/staple cards"
      // behavior documented for the general Card Impact feature. Unlike a flex-slot suggestion,
      // though, a Champion's level print is structurally close to mandatory, so fall back to
      // whichever print is simply most common at this level rather than omitting the level.
      const liftRanked = names.filter((n) => entryByName.has(n)).sort((a, b) => entryByName.get(b)!.adjustedLift - entryByName.get(a)!.adjustedLift);
      const best = liftRanked[0] ?? names.sort((a, b) => counts.get(b)! - counts.get(a)!)[0];
      if (!best) continue;
      material.push(toSuggested(best, 1, false, entryByName.get(best), entryByName.has(best) ? "ranked" : "staple", "material"));
      placed.add(best);
    }

    // The Spirit itself — the viewer's explicit pick, not ranked against alternatives.
    if (spiritFilter && !placed.has(spiritFilter)) {
      material.push(toSuggested(spiritFilter, 1, false, undefined, "spirit", "material"));
      placed.add(spiritFilter);
    }

    let materialTotal = material.reduce((sum, c) => sum + c.quantity, 0);
    let mainTotal = main.reduce((sum, c) => sum + c.quantity, 0);
    let sideboardTotal = sideboard.reduce((sum, c) => sum + c.quantity, 0);

    for (const entry of ranked) {
      if (placed.has(entry.cardName)) continue;
      const card = cardsByName.get(entry.cardName);
      if (card?.types.includes("CHAMPION")) continue; // only ever placed as a level anchor above
      if (entry.role === "material") {
        if (materialTotal >= materialTarget) continue;
        material.push(toSuggested(entry.cardName, 1, false, entry, "ranked", "material"));
        materialTotal += 1;
      } else if (entry.role === "sideboard") {
        if (sideboardTotal >= sideboardTarget) continue;
        const qty = Math.min(modalQuantity(rankingRows, "sideboard", entry.cardName, card), sideboardTarget - sideboardTotal);
        sideboard.push(toSuggested(entry.cardName, qty, false, entry, "ranked", "sideboard"));
        sideboardTotal += qty;
      } else {
        if (mainTotal >= mainTarget) continue;
        const qty = Math.min(modalQuantity(rankingRows, "main", entry.cardName, card), mainTarget - mainTotal);
        main.push(toSuggested(entry.cardName, qty, false, entry, "ranked", "main"));
        mainTotal += qty;
      }
      placed.add(entry.cardName);
      if (materialTotal >= materialTarget && mainTotal >= mainTarget && sideboardTotal >= sideboardTarget) break;
    }

    // Everything ranked that still didn't make it in — most visibly non-empty for a fully-locked
    // build (every target already met by locks alone, so the loop above placed nothing new even
    // though `ranked` has real candidates). Shown as swap-in ideas, not auto-filled.
    const suggestions = ranked
      .filter((e) => !placed.has(e.cardName) && !cardsByName.get(e.cardName)?.types.includes("CHAMPION"))
      .slice(0, MAX_EXTRA_SUGGESTIONS)
      .map((e) => {
        const card = cardsByName.get(e.cardName);
        const section: DeckSection = e.role === "material" ? "material" : e.role === "sideboard" ? "sideboard" : "main";
        const qty = section === "material" ? 1 : modalQuantity(rankingRows, section, e.cardName, card);
        return toSuggested(e.cardName, qty, false, e, "ranked", section);
      });

    const removalSuggestions = [...material, ...main, ...sideboard]
      .filter((c) => c.locked && c.adjustedLift !== null && c.adjustedLift <= REMOVAL_LIFT_CEILING)
      .sort((a, b) => a.adjustedLift! - b.adjustedLift!)
      .slice(0, MAX_REMOVAL_SUGGESTIONS);

    return {
      material,
      main,
      sideboard,
      suggestions,
      removalSuggestions,
      rankingPopulationSize: rankingRows.length,
      usedFallback,
      conditionalWinRate,
      baselineWinRate,
      loading: false,
    };
  }, [rows, spiritFilter, lockedCards, rejectedCards, loading, cardsByName, lockedSections]);
}
