import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import type { DeckValidationResult } from "../validateDeck";
import { deckBuilderDestinations } from "../../../lib/deckBuilderDestinations";
import DeckCollectionTools from "../../collection/DeckCollectionTools";

export default function BuilderCopyPanel({
  validation, validationComplete, reviewComplete, onReviewFirst, improveDeckId, championName,
  saveNote, onSaveNoteChange, saveTitle, onSaveTitleChange, saveCopyCount, saveState, onSave,
  savedDeckId, saveKeptOnly, onSaveKeptOnlyChange, keptCopyCount, decklist, catalogByName,
  onCopy, copyState, fullCopyCount, onCopyAndOpen, massEntryUrl, clarentUrl, onExportTts,
  onCopyShareLink, shareCopyState, hideFullDeckOption = false,
}: {
  validation: DeckValidationResult;
  validationComplete: boolean;
  reviewComplete: boolean;
  onReviewFirst: () => void;
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
  /** Hides the "Copy full deck" option and "Save only kept cards" checkbox — for a caller (the suggestions-only Deck Review page) where every card is already kept by construction, so a "full vs. kept" distinction doesn't exist. */
  hideFullDeckOption?: boolean;
}) {
  return (
    <div data-component="BuilderCopyPanel" role="tabpanel" id="deck-builder-panel-copy" aria-labelledby="deck-builder-tab-copy" className="mt-4">
      <section className={`mb-4 rounded-lg border p-4 ${validationComplete ? "border-ctp-green/50 bg-ctp-green/5" : "border-ctp-yellow/50 bg-ctp-yellow/5"}`} aria-labelledby="validate-and-save">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="validate-and-save" className="font-semibold text-ctp-text">Validate & save</h2>
            <p className={`mt-1 text-sm ${validationComplete ? "text-ctp-green" : "text-ctp-yellow"}`}>{validationComplete ? "Construction checks pass. This version is ready to save, export, or playtest." : `${validation.status}: ${validation.reasons[0] ?? "review the deck before saving."}`}</p>
          </div>
          {!reviewComplete && <button type="button" onClick={onReviewFirst} className="rounded-md border border-ctp-yellow/60 px-3 py-1.5 text-xs font-medium text-ctp-yellow hover:bg-ctp-yellow/10">Review changes first</button>}
        </div>
        {validation.reasons.length > 1 && <ul className="mt-2 list-disc pl-5 text-xs text-ctp-subtext1">{validation.reasons.slice(1, 4).map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      </section>
      <div className="mb-4 rounded-lg border border-ctp-blue/40 bg-ctp-blue/5 p-4">
        <h3 className="font-semibold text-ctp-text">{improveDeckId ? "Save improved version" : "Save this build"}</h3>
        <p className="mt-1 text-sm text-ctp-subtext1">{improveDeckId ? "Save the accepted changes as a new version. Your previous deck version remains available." : "Add the current Main, Material, and Sideboard to your private editable decks."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {improveDeckId ? <input value={saveNote} onChange={(event) => onSaveNoteChange(event.target.value)} maxLength={240} placeholder="What changed? (optional)" aria-label="Version change note" className="min-w-56 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" /> : <input value={saveTitle} onChange={(event) => onSaveTitleChange(event.target.value)} maxLength={160} placeholder={championName ? `${championName} guided build` : "Deck name"} aria-label="Saved deck name" className="min-w-56 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" />}
          <button type="button" disabled={!championName || saveCopyCount === 0 || saveState === "saving"} onClick={onSave} className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base disabled:cursor-not-allowed disabled:opacity-50">{saveState === "saving" ? "Saving…" : savedDeckId ? "Saved" : improveDeckId ? "Save new version" : "Save to My Decks"}</button>
        </div>
        {!hideFullDeckOption && <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-ctp-subtext1"><input type="checkbox" checked={saveKeptOnly} onChange={(event) => onSaveKeptOnlyChange(event.target.checked)} /> Save only kept cards ({keptCopyCount})</label>}
        {saveKeptOnly && <p className="mt-1 text-xs text-ctp-yellow">This saves your explicit choices only; it can be a partial decklist.</p>}
        {saveState === "saved" && savedDeckId && <p className="mt-2 text-sm text-ctp-green">{improveDeckId ? "New version saved." : "Deck saved."} <Link to={`/my-decks/${savedDeckId}`} className="font-medium underline">Open deck →</Link></p>}
        {saveState === "sign-in" && <p className="mt-2 text-sm text-ctp-yellow">Sign in from <Link to="/my-decks" className="font-medium underline">My Decks</Link>, then return to save this build. Your builder choices are kept in this browser.</p>}
        {saveState === "failed" && <p className="mt-2 text-sm text-ctp-red">The deck could not be saved. Please try again.</p>}
      </div>
      <DeckCollectionTools decklist={decklist} cardsByName={catalogByName} source={`${championName ?? "Guided"} deck builder`} />
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
          title={keptCopyCount === 0 ? "Keep at least one card to copy your choices" : "Copies your explicitly kept cards and skips auto-suggested slots"}
          className={`rounded-md border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
            copyState === "kept-failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 enabled:hover:text-ctp-text"
          }`}
        >
          {copyState === "kept-copied" ? "Copied!" : copyState === "kept-failed" ? "Couldn't copy" : `Copy kept cards (${keptCopyCount})`}
        </button>
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
          className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0"
        >
          Buy on TCGplayer &rarr;
        </a>
        <a
          href={clarentUrl}
          target="_blank"
          rel="noreferrer"
          title="Opens this deck in Clarent's solo Goldfish playtest mode"
          className="rounded-md border border-ctp-green px-2 py-1 text-xs text-ctp-green hover:bg-ctp-surface0"
        >
          Playtest in Clarent &rarr;
        </a>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExportTts}
          title="Downloads a .json file — in Tabletop Simulator, use Games ▸ Save & Load ▸ Load to open it"
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
    </div>
  );
}
