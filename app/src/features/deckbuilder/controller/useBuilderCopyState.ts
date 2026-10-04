import { useToast } from "../../../components/ui/toast/ToastContext";
import { useEffect, useRef, useState } from "react";
import { extractDeckPrintings, type DeckPrintings, type Card, type DeckFormat, type OmnidexDecklist } from "@gatcg/shared";
import { buildTcgplayerMassEntryUrl } from "../../../lib/tcgplayerMassEntry";
import { buildClarentPlaytestUrl } from "../../../lib/clarentPlaytest";
import { AccountApiError } from "../../../lib/accountApi";
import { trackEvent } from "../../../lib/analytics";
import { saveBuilderDeck } from "../services/builderDeckService";
import { copyBuilderDecklist, copyBuilderDecklistAndOpen, copyBuilderShareLink, exportBuilderTts } from "../services/builderExportService";
import type { SuggestedBuild } from "../useSuggestedBuild";
import type { LockedSection } from "../model/builderTypes";

interface UseBuilderCopyStateArgs {
  printings?: DeckPrintings;
  build: SuggestedBuild;
  buildLines: { name: string; quantity: number }[];
  sideboardLines: { name: string; quantity: number }[];
  decklist: OmnidexDecklist;
  keptDecklist: OmnidexDecklist;
  cardsByName: Map<string, Card>;
  championName: string | null;
  spiritFilter: string | null;
  archetypeId: string | null;
  deckFormat: DeckFormat;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
  improveDeckId: string | null;
  maybeboard: Map<string, number>;
}

/** Save/versioning and export state shared by the workbench header and export sheet. */
export function useBuilderCopyState({
  build, buildLines, sideboardLines, decklist, keptDecklist, cardsByName, championName, spiritFilter,
  printings, archetypeId, deckFormat, lockedCards, lockedSections, improveDeckId, maybeboard,
}: UseBuilderCopyStateArgs) {
  const { notify } = useToast();
  const massEntryUrl = buildTcgplayerMassEntryUrl([...buildLines, ...sideboardLines]);
  const clarentUrl = buildClarentPlaytestUrl(decklist);
  const [copyState, setCopyState] = useState<"idle" | "full-copied" | "kept-copied" | "full-failed" | "kept-failed">("idle");
  const [shareCopyState, setShareCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const titleKey = `workbench-title:${improveDeckId ?? "draft"}`;
  const [saveTitle, setSaveTitle] = useState(() => { try { return new URLSearchParams(window.location.search).has("locked") ? "" : sessionStorage.getItem(titleKey) ?? ""; } catch { return ""; } });
  useEffect(() => { try { sessionStorage.setItem(titleKey, saveTitle); } catch { /* Editing remains available without storage. */ } }, [saveTitle, titleKey]);
  const [saveNote, setSaveNote] = useState("");
  const [saveKeptOnly, setSaveKeptOnly] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "sign-in" | "failed">("idle");
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null);
  const fullCopyCount = [...build.main, ...build.material, ...build.sideboard].reduce((sum, card) => sum + card.quantity, 0);
  const keptCopyCount = [...build.main, ...build.material, ...build.sideboard]
    .filter((card) => card.locked)
    .reduce((sum, card) => sum + card.quantity, 0);
  const deckToSave = saveKeptOnly ? keptDecklist : decklist;
  const saveCopyCount = saveKeptOnly ? keptCopyCount : fullCopyCount;

  /** "Kept only" copies just the viewer's own choices (`card.locked`), skipping every
   * auto-suggested slot – for pasting a partial want-list rather than the full assembled deck. */
  async function handleCopy(keptOnly: boolean) {
    try {
      await copyBuilderDecklist(keptOnly ? keptDecklist : decklist);
      setCopyState(keptOnly ? "kept-copied" : "full-copied");
      notify({ message: "Decklist copied.", key: "copy" });
    } catch {
      setCopyState(keptOnly ? "kept-failed" : "full-failed");
      notify({ tone: "error", message: "Could not copy the decklist.", key: "copy", action: { label: "Retry", onClick: () => handleCopy(keptOnly) } });
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  async function handleCopyAndOpen(url: string) {
    try {
      await copyBuilderDecklistAndOpen(decklist, url);
      setCopyState("full-copied"); notify({ message: "Decklist copied.", key: "copy" });
    } catch {
      setCopyState("full-failed"); notify({ tone: "error", message: "Could not copy and open the decklist. Please try again.", key: "copy" });
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  /** Shares the Champion/Spirit/archetype/locked-cards *input*, not a snapshot of the assembled output –
   * opening the link re-runs the same suggestion logic, so it stays a live recipe rather than a
   * stale copy that drifts from the site's own numbers as data regenerates. */
  async function handleCopyShareLink() {
    try {
      await copyBuilderShareLink({
        printings: extractDeckPrintings(keptDecklist),
        origin: window.location.origin,
        championName,
        spiritName: spiritFilter,
        archetypeId,
        format: deckFormat,
        lockedCards,
        lockedSections,
      });
      setShareCopyState("copied"); notify({ message: "Deck link copied.", key: "copy" });
    } catch {
      setShareCopyState("failed"); notify({ tone: "error", message: "Could not copy the link.", key: "copy", action: { label: "Retry", onClick: handleCopyShareLink } });
    }
    setTimeout(() => setShareCopyState("idle"), 1500);
  }

  function handleExportTts() {
    try { exportBuilderTts(decklist, cardsByName, championName); notify({ message: "Decklist download started." }); }
    catch { notify({ tone: "error", message: "Could not export the decklist. Please try again." }); }
  }

  const signature = JSON.stringify([printings, deckToSave, deckFormat, saveTitle, saveNote, [...maybeboard]]);
  const currentSignature = useRef(signature);
  currentSignature.current = signature;
  useEffect(() => { setSaveState(state => state === "saving" ? state : "idle"); }, [signature]);

  async function handleSaveToMyDecks() {
    if (saveCopyCount === 0) return;
    const savingSignature = signature;
    setSaveState("saving");
    try {
      const result = await saveBuilderDeck({
        improveDeckId: improveDeckId ?? savedDeckId,
        title: saveTitle,
        changeNote: saveNote,
        format: deckFormat,
        championName,
        printings,
        decklist: deckToSave,
        maybeboard,
      });
      setSavedDeckId(result.id);
      notify({ message: currentSignature.current === savingSignature ? "Deck saved to your account." : "Earlier deck changes saved. Your newer edits still need saving.", key: "save", action: { label: "View deck", to: `/decks/${result.id}` } });
      setSaveState(currentSignature.current === savingSignature ? "saved" : "idle");
      trackEvent("deck_builder_saved", { improving: Boolean(improveDeckId), kept_only: saveKeptOnly, format: deckFormat });
    } catch (reason) {
      setSaveState(reason instanceof AccountApiError && reason.status === 401 ? "sign-in" : "failed");
      notify({ tone: "error", key: "save", message: reason instanceof AccountApiError && reason.status === 401 ? "Sign in to save this deck to your account." : "Could not save your deck. Your draft is still here." });
    }
  }

  return {
    massEntryUrl, clarentUrl,
    copyState, shareCopyState, saveTitle, setSaveTitle, saveNote, setSaveNote, saveKeptOnly, setSaveKeptOnly,
    saveState, savedDeckId, fullCopyCount, keptCopyCount, saveCopyCount,
    handleCopy, handleCopyAndOpen, handleCopyShareLink, handleExportTts, handleSaveToMyDecks,
  };
}
