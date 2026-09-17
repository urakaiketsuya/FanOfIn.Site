import type { Card } from "@gatcg/shared";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { RatingPillar } from "../../../lib/deckIdentity";
import type { SuggestedBuild } from "../useSuggestedBuild";
import type { ArchetypeTuningOption, PopulationSource } from "../model/builderTypes";
import { SIDEBOARD_POINT_BUDGET, sideboardPointCost } from "../validateDeck";
import {
  promoteMaybeboardCard,
  removeLockedCard,
  restoreChampionLevel,
  selectChampionPrint,
  toggleLockedCard,
} from "./builderCardMutations";
import type { PendingBuilderAction } from "./useBuilderChangeTracking";
import type { useBuilderWorkflowState } from "./useBuilderWorkflowState";

type AddDestination = "automatic" | "sideboard" | "maybeboard";
type Workflow = ReturnType<typeof useBuilderWorkflowState>;

interface BuilderCardActionsOptions {
  workflow: Workflow;
  build: SuggestedBuild;
  catalogByName: Map<string, Card>;
  cardCatalog: Card[];
  cardNameSet: Set<string>;
  archetypeOptions: ArchetypeTuningOption[];
  addDestination: AddDestination;
  setAddDestination: Dispatch<SetStateAction<AddDestination>>;
  setCardInput: Dispatch<SetStateAction<string>>;
  startTransition: (callback: () => void) => void;
  pendingActionRef: MutableRefObject<PendingBuilderAction | null>;
}

/** Owns user-initiated changes to cards, build tuning, and the maybeboard. */
export function useBuilderCardActions(options: BuilderCardActionsOptions) {
  const {
    workflow, build, catalogByName, cardCatalog, cardNameSet, archetypeOptions, addDestination,
    setAddDestination, setCardInput, startTransition, pendingActionRef,
  } = options;
  const {
    championName, lockedCards, lockedSections, rejectedCards, maybeboard, populationSource,
    pillarBias, archetypeId, championLevelCap,
  } = workflow.state;
  const {
    setLockedCards, setLockedSections, setRejectedCards, setMaybeboard, setPopulationSource,
    setPillarBias, setArchetypeId, setChampionLevelCap,
  } = workflow;

  function toggleLock(name: string, quantity: number, section?: "main" | "material" | "sideboard") {
    const willLock = !lockedCards.has(name);
    pendingActionRef.current = { label: willLock ? `Chose ${name}` : `Released ${name}`, subject: name };
    startTransition(() => {
      const next = toggleLockedCard(lockedCards, lockedSections, name, quantity, section);
      setLockedCards(next.cards);
      setLockedSections(next.sections);
    });
  }

  function chooseChampionLineagePrint(name: string) {
    const selected = catalogByName.get(name);
    if (!selected || selected.level == null) return;
    pendingActionRef.current = { label: `Chose ${selected.name} for Level ${selected.level}`, subject: selected.name };
    startTransition(() => {
      const next = selectChampionPrint(lockedCards, lockedSections, rejectedCards, selected, catalogByName);
      setLockedCards(next.cards);
      setLockedSections(next.sections);
      setRejectedCards(next.rejected);
    });
  }

  function restoreSuggestedChampionLevel(level: number) {
    if (!championName) return;
    pendingActionRef.current = { label: `Restored suggested Level ${level} Champion print`, subject: null };
    startTransition(() => {
      const next = restoreChampionLevel(lockedCards, lockedSections, level, championName, catalogByName);
      setLockedCards(next.cards);
      setLockedSections(next.sections);
    });
  }

  function setLockedQuantity(name: string, quantity: number) {
    startTransition(() => setLockedCards((previous) => {
      if (!previous.has(name)) return previous;
      return new Map(previous).set(name, quantity);
    }));
  }

  function removeCard(name: string, locked: boolean) {
    pendingActionRef.current = { label: locked ? `Removed ${name}` : `Excluded ${name} from suggestions`, subject: name };
    startTransition(() => {
      if (locked) {
        const next = removeLockedCard(lockedCards, lockedSections, name, catalogByName);
        setLockedCards(next.cards);
        setLockedSections(next.sections);
      } else {
        setRejectedCards((previous) => new Set(previous).add(name));
      }
    });
  }

  function addCard(name: string) {
    if (!cardNameSet.has(name) || (lockedCards.has(name) && addDestination !== "maybeboard")) return;
    const card = cardCatalog.find((candidate) => candidate.name === name);
    const materialOnly = card?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ?? false;
    const quantity = materialOnly ? 1 : 4;
    const sideboardPoints = build.sideboard.reduce(
      (sum, entry) => sum + entry.quantity * sideboardPointCost(catalogByName.get(entry.cardName)),
      0,
    );
    const fitsSideboard = sideboardPoints + quantity * sideboardPointCost(card) <= SIDEBOARD_POINT_BUDGET;
    if (addDestination === "maybeboard") {
      setMaybeboard((previous) => new Map(previous).set(name, quantity));
      setCardInput("");
      setAddDestination("automatic");
      return;
    }
    pendingActionRef.current = { label: `Added ${name}`, subject: name };
    startTransition(() => {
      setLockedCards((previous) => new Map(previous).set(name, quantity));
      if (addDestination === "sideboard" && fitsSideboard) {
        setLockedSections((previous) => new Map(previous).set(name, "sideboard"));
      }
    });
    setCardInput("");
    setAddDestination("automatic");
  }

  function removeMaybeCard(name: string) {
    setMaybeboard((previous) => {
      const next = new Map(previous);
      next.delete(name);
      return next;
    });
  }

  function setMaybeQuantity(name: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    setMaybeboard((previous) => new Map(previous).set(name, Math.min(quantity, 4)));
  }

  function promoteMaybeCard(name: string) {
    const next = promoteMaybeboardCard(lockedCards, lockedSections, maybeboard, name, catalogByName);
    if (!next) return;
    pendingActionRef.current = { label: `Added ${name} from maybeboard`, subject: name };
    startTransition(() => {
      setLockedCards(next.cards);
      setLockedSections(next.sections);
      setMaybeboard(next.maybeboard);
    });
  }

  function changePopulationSource(source: PopulationSource, label: string) {
    if (source !== populationSource) pendingActionRef.current = { label: `Switched to ${label} data`, subject: null };
    setPopulationSource(source);
  }

  function changePillarBias(pillar: RatingPillar | null) {
    if (pillar !== pillarBias) {
      pendingActionRef.current = {
        label: pillar === null ? "Reset tuning to Balanced" : `Tuned toward ${pillar[0].toUpperCase()}${pillar.slice(1)}`,
        subject: null,
      };
    }
    setPillarBias(pillar);
  }

  function changeArchetype(archetype: string | null) {
    if (archetype !== archetypeId) {
      const selected = archetypeOptions.find((option) => option.id === archetype);
      pendingActionRef.current = {
        label: selected ? `Inspired by ${selected.name}` : "Removed archetype inspiration",
        subject: null,
      };
    }
    startTransition(() => setArchetypeId(archetype));
  }

  function changeChampionLevelCap(cap: number | null) {
    if (cap !== championLevelCap) {
      pendingActionRef.current = {
        label: cap === null ? "Restored automatic Champion progression" : `Set Champion progression through Level ${cap}`,
        subject: null,
      };
    }
    startTransition(() => setChampionLevelCap(cap));
  }

  return {
    toggleLock, chooseChampionLineagePrint, restoreSuggestedChampionLevel, setLockedQuantity,
    removeCard, addCard, removeMaybeCard, setMaybeQuantity, promoteMaybeCard,
    changePopulationSource, changePillarBias, changeArchetype, changeChampionLevelCap,
  };
}
