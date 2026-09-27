import { useEffect, useRef, useState } from "react";
import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { buildTcgplayerMassEntryUrl } from "../../../lib/tcgplayerMassEntry";
import { buildClarentPlaytestUrl } from "../../../lib/clarentPlaytest";
import { AccountApiError } from "../../../lib/accountApi";
import { trackEvent } from "../../../lib/analytics";
import { saveBuilderDeck } from "../services/builderDeckService";
import { copyBuilderDecklist, copyBuilderDecklistAndOpen, copyBuilderShareLink, exportBuilderTts } from "../services/builderExportService";
import type { SuggestedBuild } from "../useSuggestedBuild";
import type { LockedSection } from "../model/builderTypes";

interface UseBuilderCopyStateArgs {
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
  archetypeId, deckFormat, lockedCards, lockedSections, improveDeckId, maybeboard,
}: UseBuilderCopyStateArgs) {
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
   * auto-suggested slot — for pasting a partial want-list rather than the full assembled deck. */
  async function handleCopy(keptOnly: boolean) {
    try {
      await copyBuilderDecklist(keptOnly ? keptDecklist : decklist);
      setCopyState(keptOnly ? "kept-copied" : "full-copied");
    } catch {
      setCopyState(keptOnly ? "kept-failed" : "full-failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  async function handleCopyAndOpen(url: string) {
    try {
      await copyBuilderDecklistAndOpen(decklist, url);
      setCopyState("full-copied");
    } catch {
      setCopyState("full-failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  /** Shares the Champion/Spirit/archetype/locked-cards *input*, not a snapshot of the assembled output —
   * opening the link re-runs the same suggestion logic, so it stays a live recipe rather than a
   * stale copy that drifts from the site's own numbers as data regenerates. */
  async function handleCopyShareLink() {
    try {
      await copyBuilderShareLink({
        origin: window.location.origin,
        championName,
        spiritName: spiritFilter,
        archetypeId,
        format: deckFormat,
        lockedCards,
        lockedSections,
      });
      setShareCopyState("copied");
    } catch {
      setShareCopyState("failed");
    }
    setTimeout(() => setShareCopyState("idle"), 1500);
  }

  function handleExportTts() {
    exportBuilderTts(decklist, cardsByName, championName);
  }

  const signature = JSON.stringify([deckToSave, deckFormat, saveTitle, saveNote, [...maybeboard]]);
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
        decklist: deckToSave,
        maybeboard,
      });
      setSavedDeckId(result.id);
      setSaveState(currentSignature.current === savingSignature ? "saved" : "idle");
      trackEvent("deck_builder_saved", { improving: Boolean(improveDeckId), kept_only: saveKeptOnly, format: deckFormat });
    } catch (reason) {
      setSaveState(reason instanceof AccountApiError && reason.status === 401 ? "sign-in" : "failed");
    }
  }

  return {
    massEntryUrl, clarentUrl,
    copyState, shareCopyState, saveTitle, setSaveTitle, saveNote, setSaveNote, saveKeptOnly, setSaveKeptOnly,
    saveState, savedDeckId, fullCopyCount, keptCopyCount, saveCopyCount,
    handleCopy, handleCopyAndOpen, handleCopyShareLink, handleExportTts, handleSaveToMyDecks,
  };
}
