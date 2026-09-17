import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Card } from "@gatcg/shared";
import { accountApi } from "../../../lib/accountApi";
import { parseDecklist } from "../../compare/parseDecklist";
import { clearBuilderSession } from "../persistence/builderPersistence";
import type { BuilderIntent, BuilderTab } from "../useDeckBuilderController";
import type { useBuilderWorkflowState } from "./useBuilderWorkflowState";

type Workflow = ReturnType<typeof useBuilderWorkflowState>;
type AddDestination = "automatic" | "sideboard" | "maybeboard";

interface BuilderLifecycleOptions {
  workflow: Workflow;
  builderIntent: BuilderIntent | null;
  improveDeckId: string | null;
  initialChampionName: string | null;
  catalogByName: Map<string, Card>;
  spiritCanonicalNames: Map<string, string>;
  setDismissedReviewCards: Dispatch<SetStateAction<Set<string>>>;
  setSpiritElement: Dispatch<SetStateAction<string | null>>;
  setCardInput: Dispatch<SetStateAction<string>>;
  setAddDestination: Dispatch<SetStateAction<AddDestination>>;
  setTab: (tab: BuilderTab) => void;
  startTransition: (callback: () => void) => void;
  resetChangeTracking: () => void;
}

/** Owns builder import, hydration, and reset transitions. */
export function useBuilderLifecycle(options: BuilderLifecycleOptions) {
  const {
    workflow, builderIntent, improveDeckId, initialChampionName, catalogByName,
    spiritCanonicalNames, setDismissedReviewCards, setSpiritElement, setCardInput,
    setAddDestination, setTab, startTransition, resetChangeTracking,
  } = options;
  const {
    championName,
  } = workflow.state;
  const {
    setChampionName, setSpiritFilter, setLockedCards, setMaybeboard, setLockedSections,
    setRejectedCards, setPillarBias, setArchetypeId, setPopulationSource, setChangeLog,
  } = workflow;
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const skipNextResetRef = useRef(false);
  const lastResetChampionRef = useRef(initialChampionName);

  useEffect(() => {
    if (!improveDeckId) return;
    void accountApi.deck(improveDeckId).then(({ deck }) => {
      setMaybeboard(new Map(deck.maybeboard.map((line) => [line.card, line.quantity])));
    }).catch(() => undefined);
  }, [improveDeckId, setMaybeboard]);

  useEffect(() => {
    if (lastResetChampionRef.current === championName) return;
    lastResetChampionRef.current = championName;
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
    } else {
      startTransition(() => {
        setSpiritFilter(null);
        setSpiritElement(null);
        if (builderIntent !== "seed") {
          setLockedCards(new Map());
          setLockedSections(new Map());
        }
        setMaybeboard(new Map());
        setRejectedCards(new Set());
        setDismissedReviewCards(new Set());
        setArchetypeId(null);
        setChangeLog([]);
      });
    }
    resetChangeTracking();
    // Setters and callbacks are stable; this reset is intentionally keyed only to identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [championName, builderIntent]);

  function loadPastedDecklist() {
    const { decklist, skippedLines } = parseDecklist(pasteText);
    const lines = [...decklist.main, ...decklist.material, ...decklist.sideboard];
    if (lines.length === 0) {
      setPasteError(skippedLines.length > 0 ? "Couldn't recognize any card lines in that paste." : "Paste a decklist first.");
      return;
    }

    let detectedChampion: string | null = null;
    let detectedSpirit: string | null = null;
    const newLocked = new Map<string, number>();
    const newSections = new Map<string, "main" | "material" | "sideboard">();
    for (const section of ["main", "material", "sideboard"] as const) {
      for (const line of decklist[section]) {
        const card = catalogByName.get(line.card);
        if (card?.types.includes("CHAMPION")) {
          if (card.subtypes.includes("SPIRIT")) {
            detectedSpirit = line.card;
            continue;
          }
          if (!detectedChampion) detectedChampion = card.name.split(",")[0].trim();
        }
        newLocked.set(line.card, (newLocked.get(line.card) ?? 0) + line.quantity);
        newSections.set(line.card, section);
      }
    }
    if (!detectedChampion) {
      setPasteError("Couldn't find a Champion card in this decklist.");
      return;
    }

    if (detectedChampion !== championName) skipNextResetRef.current = true;
    setChampionName(detectedChampion);
    setSpiritFilter(detectedSpirit ? (spiritCanonicalNames.get(detectedSpirit) ?? detectedSpirit) : null);
    setLockedCards(newLocked);
    setLockedSections(newSections);
    setMaybeboard(new Map());
    setRejectedCards(new Set());
    setDismissedReviewCards(new Set());
    setChangeLog([]);
    resetChangeTracking();
    setPasteText("");
    setPasteError(null);
    setPasteOpen(false);
    setTab("build");
  }

  function resetBuilder() {
    clearBuilderSession(sessionStorage);
    resetChangeTracking();
    skipNextResetRef.current = false;
    lastResetChampionRef.current = null;
    startTransition(() => {
      setChampionName(null);
      setSpiritFilter(null);
      setSpiritElement(null);
      setLockedCards(new Map());
      setLockedSections(new Map());
      setRejectedCards(new Set());
      setCardInput("");
      setAddDestination("automatic");
      setMaybeboard(new Map());
      setPillarBias(null);
      setArchetypeId(null);
      setPopulationSource("balanced");
      setChangeLog([]);
      setDismissedReviewCards(new Set());
      setPasteOpen(false);
      setPasteText("");
      setPasteError(null);
    });
  }

  return {
    pasteOpen, setPasteOpen, pasteText, setPasteText, pasteError, setPasteError,
    loadPastedDecklist, resetBuilder,
  };
}
