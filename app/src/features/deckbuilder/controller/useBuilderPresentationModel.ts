import { useMemo } from "react";
import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { buildToDecklist } from "../engine/builderSelectors";
import type { LockedSection } from "../model/builderTypes";
import { computeNewReleaseCards } from "../newReleaseCards";
import type { SuggestedBuild } from "../useSuggestedBuild";
import { SIDEBOARD_POINT_BUDGET, sideboardPointCost, validateDeck } from "../validateDeck";
import { useBuilderCopyState } from "./useBuilderCopyState";
import { useBuilderWorkspacePersistence } from "./useBuilderWorkspacePersistence";

interface UseBuilderPresentationModelArgs {
  build: SuggestedBuild;
  catalogByName: Map<string, Card>;
  cardsByName: Map<string, Card>;
  identityElements: Set<string>;
  deckFormat: DeckFormat;
  championName: string | null;
  spiritFilter: string | null;
  archetypeId: string | null;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
  maybeboard: Map<string, number>;
  improveDeckId: string | null;
  reviewItemCount: number;
  cardInput: string;
  cardNameSet: Set<string>;
  addDestination: "automatic" | "sideboard" | "maybeboard";
}

/**
 * Derives the builder's rendered deck summary and composes presentation-only side effects.
 * Recommendation and mutation concerns stay in the parent controller; this hook turns their
 * current result into the totals, validation, exports, and persisted workspace consumed by UI.
 */
export function useBuilderPresentationModel({
  build, catalogByName, cardsByName, identityElements, deckFormat, championName, spiritFilter,
  archetypeId, lockedCards, lockedSections, maybeboard, improveDeckId, reviewItemCount, cardInput,
  cardNameSet, addDestination,
}: UseBuilderPresentationModelArgs) {
  const mainTotal = build.main.reduce((sum, card) => sum + card.quantity, 0);
  const materialTotal = build.material.reduce((sum, card) => sum + card.quantity, 0);
  const sideboardTotal = build.sideboard.reduce((sum, card) => sum + card.quantity, 0);

  const selectedAddCard = cardNameSet.has(cardInput) && !lockedCards.has(cardInput)
    ? catalogByName.get(cardInput)
    : undefined;
  const selectedAddQuantity = selectedAddCard?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ? 1 : 4;
  const currentSideboardPoints = build.sideboard.reduce(
    (sum, card) => sum + card.quantity * sideboardPointCost(catalogByName.get(card.cardName)),
    0,
  );
  const selectedSideboardPoints = selectedAddCard ? selectedAddQuantity * sideboardPointCost(selectedAddCard) : 0;
  const canAddToSideboard = Boolean(selectedAddCard)
    && currentSideboardPoints + selectedSideboardPoints <= SIDEBOARD_POINT_BUDGET;
  const sideboardDestinationSelected = addDestination === "sideboard" && canAddToSideboard;

  // Price/stats and deck identity intentionally cover material+main only. Sideboard lines remain
  // separate for persistence, export, and the dedicated sideboard price shown by the UI.
  const buildLines = useMemo(
    () => [...build.material, ...build.main].map((card) => ({ name: card.cardName, quantity: card.quantity })),
    [build.material, build.main],
  );
  const mainOnlyLines = useMemo(
    () => build.main.map((card) => ({ name: card.cardName, quantity: card.quantity })),
    [build.main],
  );
  const materialOnlyLines = useMemo(
    () => build.material.map((card) => ({ name: card.cardName, quantity: card.quantity })),
    [build.material],
  );
  const sideboardLines = useMemo(
    () => build.sideboard.map((card) => ({ name: card.cardName, quantity: card.quantity })),
    [build.sideboard],
  );

  useBuilderWorkspacePersistence({
    championName,
    spiritName: spiritFilter,
    format: deckFormat,
    main: mainOnlyLines,
    material: materialOnlyLines,
    sideboard: sideboardLines,
    maybeboard,
  });

  const newReleaseCards = useMemo(() => {
    const includedNames = new Set(buildLines.map((line) => line.name));
    const deckCards = buildLines
      .map((line) => catalogByName.get(line.name))
      .filter((card): card is Card => card !== undefined);
    return computeNewReleaseCards(catalogByName.values(), deckCards, identityElements, includedNames);
  }, [buildLines, catalogByName, identityElements]);
  const decklist: OmnidexDecklist = useMemo(() => buildToDecklist(build), [build]);
  const keptDecklist: OmnidexDecklist = useMemo(() => buildToDecklist(build, true), [build]);
  const validation = useMemo(
    () => validateDeck(
      { main: build.main, material: build.material, sideboard: build.sideboard },
      catalogByName,
      identityElements,
      deckFormat,
    ),
    [build.main, build.material, build.sideboard, catalogByName, identityElements, deckFormat],
  );
  const importedCardCount = Array.from(lockedCards.values()).reduce((sum, quantity) => sum + quantity, 0);
  const identityComplete = Boolean(championName && spiritFilter);
  const buildComplete = identityComplete && mainTotal > 0;
  const reviewComplete = buildComplete && reviewItemCount === 0;
  const validationComplete = validation.status === "Legal";
  const copyPanel = useBuilderCopyState({
    build, buildLines, sideboardLines, decklist, keptDecklist, cardsByName, championName, spiritFilter,
    archetypeId, deckFormat, lockedCards, lockedSections, improveDeckId, maybeboard,
  });

  return {
    mainTotal,
    materialTotal,
    sideboardTotal,
    selectedSideboardPoints,
    currentSideboardPoints,
    canAddToSideboard,
    sideboardDestinationSelected,
    newReleaseCards,
    decklist,
    validation,
    importedCardCount,
    identityComplete,
    reviewComplete,
    validationComplete,
    copyPanel,
  };
}
