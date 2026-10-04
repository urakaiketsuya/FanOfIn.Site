import { useToast } from "../../../components/ui/toast/ToastContext";
import { buildEditableDeckText } from "../../events/DecklistView";
import Button from "../../../components/ui/Button";
import DisclosureChevron from "../../../components/DisclosureChevron";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import type { DeckValidationResult } from "../validateDeck";
import { deckBuilderDestinations } from "../../../lib/deckBuilderDestinations";
import DeckCollectionTools from "../../collection/DeckCollectionTools";

export default function BuilderCopyPanel({
  validation, validationComplete, improveDeckId, championName,
  saveNote, onSaveNoteChange, saveTitle, onSaveTitleChange, saveCopyCount, saveState, onSave,
  savedDeckId, saveKeptOnly, onSaveKeptOnlyChange, keptCopyCount, decklist, catalogByName,
  onCopy, copyState, fullCopyCount, onCopyAndOpen, massEntryUrl, clarentUrl, onExportTts,
  onCopyShareLink, shareCopyState, hideFullDeckOption = false,
}: {
  validation: DeckValidationResult;
  validationComplete: boolean;
  reviewComplete: boolean;
  improveDeckId: string | null;
  championName: string | null;
  saveNote: string;
  onSaveNoteChange: (value: string) => void;
  saveTitle: string;
  onSaveTitleChange: (value: string) => void;
  saveCopyCount: number;
  saveState: "idle" | "saving" | "saved" | "sign-in" | "failed";
  onSave: () => void;
  savedDeckId: string | null;
  saveKeptOnly: boolean;
  onSaveKeptOnlyChange: (value: boolean) => void;
  keptCopyCount: number;
  decklist: OmnidexDecklist;
  catalogByName: Map<string, Card>;
  onCopy: (keptOnly: boolean) => void;
  copyState: "idle" | "full-copied" | "kept-copied" | "full-failed" | "kept-failed";
  fullCopyCount: number;
  onCopyAndOpen: (url: string) => void;
  massEntryUrl: string;
  clarentUrl: string;
  onExportTts: () => void;
  onCopyShareLink: () => void;
  shareCopyState: "idle" | "copied" | "failed";
  /** Hides the "Copy full deck" option and "Save only kept cards" checkbox – for a caller (the suggestions-only Deck Review page) where every card is already kept by construction, so a "full vs. kept" distinction doesn't exist. */
  hideFullDeckOption?: boolean;
}) {
  const { notify } = useToast();
  return (
    <div data-component="BuilderCopyPanel" role="region" aria-label="Save and export deck" className="mt-4">
      <div className="mb-4 rounded-lg border border-ctp-blue/40 bg-ctp-blue/5 p-4">
        <h3 className="font-semibold text-ctp-text">{improveDeckId ? "Save deck version" : "Save this build"}</h3>
        <p className="mt-1 text-sm text-ctp-subtext1">{improveDeckId ? "Save your edits as a new version. Your previous deck version remains available." : "Save your current cards to your private decks. Incomplete lists can be saved as drafts."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {improveDeckId ? <input value={saveNote} onChange={(event) => onSaveNoteChange(event.target.value)} maxLength={240} placeholder="What changed? (optional)" aria-label="Version change note" className="min-w-56 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" /> : <input value={saveTitle} onChange={(event) => onSaveTitleChange(event.target.value)} maxLength={160} placeholder={championName ? `${championName} deck` : "Deck name"} aria-label="Saved deck name" className="min-w-56 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" />}
          <button type="button" disabled={saveCopyCount === 0 || saveState === "saving" || saveState === "saved"} onClick={onSave} className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base disabled:cursor-not-allowed disabled:opacity-50">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : improveDeckId ? "Save new version" : "Save to My Decks"}</button>
        </div>
        {!hideFullDeckOption && <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-ctp-subtext1"><input type="checkbox" checked={saveKeptOnly} onChange={(event) => onSaveKeptOnlyChange(event.target.checked)} /> Save only kept cards ({keptCopyCount})</label>}
        {!hideFullDeckOption && saveKeptOnly && <p className="mt-1 text-xs text-ctp-yellow">This saves your explicit choices only; it can be a partial decklist.</p>}
        {saveState === "saved" && savedDeckId && <p className="mt-2 text-sm text-ctp-green">{improveDeckId ? "New version saved." : "Deck saved."} <Link to={`/decks/${savedDeckId}`} className="font-medium underline">Open deck →</Link></p>}
        {saveState === "sign-in" && <p className="mt-2 text-sm text-ctp-yellow">Sign in from <Link to="/decks/edit" className="font-medium underline">My Decks</Link>, then return to save this build. Your builder choices are kept in this browser.</p>}
        {saveState === "failed" && <p className="mt-2 text-sm text-ctp-red">The deck could not be saved. Please try again.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!hideFullDeckOption && <button
          type="button"
          onClick={() => onCopy(false)}
          aria-live="polite"
          className={`rounded-md border px-2 py-1 text-xs ${
            copyState === "full-failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          {copyState === "full-copied" ? "Copied!" : copyState === "full-failed" ? "Couldn't copy" : `Copy full deck (${fullCopyCount})`}
        </button>}
        <button
          type="button"
          onClick={() => onCopy(true)}
          disabled={keptCopyCount === 0}
          aria-live="polite"
          title={keptCopyCount === 0 ? "Add at least one card to copy" : "Copy your selected cards"}
          className={`rounded-md border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
            copyState === "kept-failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 enabled:hover:text-ctp-text"
          }`}
        >
          {copyState === "kept-copied" ? "Copied!" : copyState === "kept-failed" ? "Couldn't copy" : `${hideFullDeckOption ? "Copy decklist" : "Copy kept cards"} (${keptCopyCount})`}
        </button>
      </div>
      <details className="mt-4 rounded-lg border border-ctp-surface1 p-3"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm">{validationComplete ? "Construction checks pass" : `Construction: ${validation.status.toLowerCase()}`}<DisclosureChevron /></summary><p className="mt-2 text-xs text-ctp-subtext1">You can save an incomplete draft.</p>{validation.reasons.map(reason=><p key={reason} className="mt-2 text-xs text-ctp-subtext1">{reason}</p>)}</details>
      <details className="mt-4 rounded-xl border border-ctp-surface1 p-3">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm font-medium text-ctp-subtext1">More export & collection options<DisclosureChevron /></summary>
        {[...decklist.main, ...decklist.material, ...decklist.sideboard].some(line => line.printings?.length) && <div className="space-y-2"><p className="text-xs text-ctp-subtext1">Standard copy and external exports omit printing choices. Your saved deck and share link retain them.</p><Button onClick={() => { void navigator.clipboard.writeText(buildEditableDeckText(decklist)).then(() => notify({ message: "Copied with printings. Paste into Fan of Insight to restore them." })).catch(() => notify({ tone: "error", message: "Could not copy. Try again." })); }}>Copy with printings (Fan of Insight)</Button></div>}
        <DeckCollectionTools decklist={decklist} cardsByName={catalogByName} source={`${championName ?? "Untitled"} deck builder`} />
        <div className="mt-2 flex flex-wrap gap-2">
        {deckBuilderDestinations.map((destination) => (
          <button
            key={destination.id}
            type="button"
            disabled={fullCopyCount === 0}
            onClick={() => onCopyAndOpen(destination.url)}
            title={`Copies the full deck, then opens ${destination.label} so you can paste it into a new deck`}
            className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 enabled:hover:text-ctp-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copy & open {destination.label} &rarr;
          </button>
        ))}
        <a
          href={massEntryUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0"
        >
          Buy on TCGplayer &rarr;
        </a>
        <a
          href={clarentUrl}
          target="_blank"
          rel="noreferrer"
          title="Opens this deck in Clarent's solo Goldfish playtest mode"
          className="inline-flex min-h-12 items-center rounded-md border border-ctp-green px-2 py-1 text-xs text-ctp-green hover:bg-ctp-surface0"
        >
          Playtest in Clarent &rarr;
        </a>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExportTts}
          title="Downloads a .json file – in Tabletop Simulator, use Games ▸ Save & Load ▸ Load to open it"
          className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text"
        >
          Export to TTS
        </button>
        <button
          type="button"
          onClick={onCopyShareLink}
          aria-live="polite"
          title="Copies a link that reopens this Champion/Spirit and every user-choice card"
          className={`rounded-md border px-2 py-1 text-xs ${
            shareCopyState === "failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          {shareCopyState === "copied" ? "Copied!" : shareCopyState === "failed" ? "Couldn't copy" : "Copy share link"}
        </button>
      </div>
      </details>
    </div>
  );
}
