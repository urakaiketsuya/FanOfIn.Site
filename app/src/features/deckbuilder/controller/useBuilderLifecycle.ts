import { extractDeckPrintings } from "@gatcg/shared";
import { useToast } from "../../../components/ui/toast/ToastContext";
import { deckCardIssues, type DeckFormat } from "@gatcg/shared";
import { selectionsToMaps } from "../model/builderTypes";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
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
  deckFormat: DeckFormat;
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
  const { notify } = useToast();
  const {
    workflow, improveDeckId, catalogByName,
    setDismissedReviewCards, setSpiritElement, setCardInput,
    setAddDestination, setTab, startTransition, resetChangeTracking,
  } = options;
  const {
    setPrintings, setChampionName, setSpiritFilter, setLockedCards, setMaybeboard, setLockedSections,
    setRejectedCards, setPillarBias, setArchetypeId, setPopulationSource, setChangeLog,
  } = workflow;
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  useEffect(() => {
    if (!improveDeckId) return;
    void accountApi.deck(improveDeckId).then(({ deck }) => {
      setPrintings(extractDeckPrintings({ ...deck.decklist, maybeboard: deck.maybeboard }));
      setMaybeboard(new Map(deck.maybeboard.map((line) => [line.card, line.quantity])));
    }).catch(() => undefined);
  }, [improveDeckId, setMaybeboard, setPrintings]);

  function loadPastedDecklist() {
    const { decklist, skippedLines } = parseDecklist(pasteText);
    const lines = [...decklist.main, ...decklist.material, ...decklist.sideboard];
    if (lines.length === 0) {
      setPasteError(skippedLines.length > 0 ? "Couldn't recognize any card lines in that paste." : "Paste a decklist first.");
      return;
    }

    let detectedChampion: string | null = null;
    let detectedSpirit: string | null = null;
    for (const section of ["main", "material", "sideboard"] as const) {
      for (const line of decklist[section]) {
        const card = catalogByName.get(line.card);
        if (section !== "sideboard" && card?.types.includes("CHAMPION")) {
          if (card.subtypes.includes("SPIRIT")) {
            detectedSpirit = line.card;

          }
          if (!card.subtypes.includes("SPIRIT") && !detectedChampion) detectedChampion = card.name.split(",")[0].trim();
        }
      }
    }
    const banned = new Set(deckCardIssues(decklist, catalogByName, options.deckFormat).filter(issue => issue.code === "banned").map(issue => issue.card));
    notify({ message: `Decklist imported.${banned.size ? ` Contains ${banned.size} banned card${banned.size === 1 ? "" : "s"}; review the deck warnings.` : ""}${skippedLines.length ? ` ${skippedLines.length} lines were skipped.` : ""}`, tone: banned.size || skippedLines.length ? "warning" : "success", duration: banned.size || skippedLines.length ? null : undefined, key: "import" });
    setChampionName(detectedChampion);
    setSpiritFilter(detectedSpirit);
    const selections = selectionsToMaps((["main", "material", "sideboard"] as const).flatMap((section) => decklist[section].map((line) => ({ name: line.card, quantity: line.quantity, section }))));
    setPrintings(extractDeckPrintings(decklist));
    setLockedCards(selections.cards);
    setLockedSections(selections.sections);
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
    startTransition(() => {
      setPrintings({});
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
