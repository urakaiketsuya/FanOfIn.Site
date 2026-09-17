import { Link } from "react-router-dom";
import PageHeader from "../../../components/ui/PageHeader";
import { useDeckBuilder } from "../useDeckBuilder";
import type { BuilderIntent } from "../useDeckBuilderController";
import ImprovementReviewPanel from "../panels/ImprovementReviewPanel";
import ChampionLineagePicker from "./ChampionLineagePicker";

const BUILDER_INTENTS: { key: BuilderIntent; title: string; description: string }[] = [
  { key: "seed", title: "Build around cards", description: "Choose a Champion and Spirit, lock the cards you care about, and fill the rest." },
  { key: "scratch", title: "Start from scratch", description: "Choose a Champion and Spirit, then optimize a full suggested list." },
];

export function DeckBuilderHeader() {
  const { isImproving } = useDeckBuilder();
  return (
    <PageHeader
      eyebrow="Connected deck tools"
      title={isImproving ? "Improve your deck" : "Deck Workbench"}
      description={isImproving
        ? <>Your saved list is the baseline. Review evidence-backed changes, keep only the ones you want, then save a new version when you are ready.</>
        : <>Start from a Champion, an Element, and a Spirit to generate a suggested deck from real decklists. You can also paste a list to tune cards you already have.</>}
    />
  );
}

export function BuilderIntentChooser() {
  const { builderIntent, chooseIntent, identityComplete, isImproving } = useDeckBuilder();
  if (isImproving || identityComplete) return null;

  return (
    <section className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" aria-labelledby="builder-start">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 id="builder-start" className="font-semibold text-ctp-text">What do you want to do?</h2>
          <p className="mt-1 text-sm text-ctp-subtext1">Pick a starting point. You can change direction without losing your current build.</p>
        </div>
        <Link to="/decks/edit" className="text-sm text-ctp-blue hover:underline">Improve a saved deck →</Link>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Link to="/card-discovery" className="rounded-lg border border-ctp-surface1 bg-ctp-base p-3 text-left transition-colors hover:border-ctp-blue/60">
          <span className="text-sm font-semibold text-ctp-text">Find new cards</span>
          <span className="mt-1 block text-xs leading-5 text-ctp-subtext1">Explore new-release cards that connect to a Champion, Spirit, or cards you already play.</span>
        </Link>
        {BUILDER_INTENTS.map((intent) => (
          <button
            key={intent.key}
            type="button"
            onClick={() => chooseIntent(intent.key)}
            aria-pressed={builderIntent === intent.key}
            className={`rounded-lg border p-3 text-left transition-colors ${builderIntent === intent.key ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 bg-ctp-base hover:border-ctp-blue/60"}`}
          >
            <span className={`text-sm font-semibold ${builderIntent === intent.key ? "text-ctp-blue" : "text-ctp-text"}`}>{intent.title}</span>
            <span className="mt-1 block text-xs leading-5 text-ctp-subtext1">{intent.description}</span>
          </button>
        ))}
      </div>
      {builderIntent === "seed" && <p className="mt-3 rounded-md border border-ctp-green/40 bg-ctp-green/10 px-3 py-2 text-xs text-ctp-subtext1">Choose your Champion and Spirit, then add the cards you already want to play. They stay locked while recommendations fill the remaining slots.</p>}
      {builderIntent === "scratch" && <p className="mt-3 rounded-md border border-ctp-blue/40 bg-ctp-blue/10 px-3 py-2 text-xs text-ctp-subtext1">Choose a Champion, Element, and Spirit to generate an evidence-backed shell. Continue to Deck Review when you want suggestions.</p>}
    </section>
  );
}

export function DeckFormatPicker() {
  const {
    deckFormat, identityComplete, searchParams, setDeckFormat, setPopulationSource, setSearchParams,
  } = useDeckBuilder();
  if (identityComplete) return null;

  return (
    <div className="mt-4">
      <div id="deck-builder-starting" className="inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1 text-sm" role="group" aria-label="Deck format">
        {(["STANDARD", "PANTHEON"] as const).map((format) => (
          <button
            key={format}
            type="button"
            aria-pressed={deckFormat === format}
            onClick={() => {
              setDeckFormat(format);
              if (format === "PANTHEON") setPopulationSource("community");
              const next = new URLSearchParams(searchParams);
              if (format === "PANTHEON") next.set("format", "pantheon");
              else next.delete("format");
              setSearchParams(next, { replace: true });
            }}
            className={`rounded-md px-3 py-1.5 ${deckFormat === format ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}
          >
            {format === "PANTHEON" ? "Pantheon" : "Standard"}
          </button>
        ))}
      </div>
      {deckFormat === "PANTHEON" && <p className="mt-2 text-xs text-ctp-subtext0">Pantheon recommendations use format-separated community adoption and singleton legality. They do not use Standard tournament win rates.</p>}
    </div>
  );
}

export function DeckIdentitySetup() {
  const {
    build, catalogByName, championName, championsPresent, chooseChampionLineagePrint, deckFormat,
    identityEditorOpen, importedCardCount, isImproving, liveCatalogByName, lockedCards,
    pendingActionRef, resetBuilder, restoreSuggestedChampionLevel, reviewItemCount,
    setChampionName, setIdentityEditorOpen, setSpiritElement, setSpiritFilter, spiritElement,
    spiritElements, spiritFilter, spiritOptionLabel, spiritsForElement, startTransition,
  } = useDeckBuilder();

  return (
    <>
      {isImproving && <ImprovementReviewPanel importedCardCount={importedCardCount} reviewItemCount={reviewItemCount} />}
      <DeckFormatPicker />
      <div
        id="deck-builder-identity"
        className={isImproving ? "mt-4" : "mt-4 grid gap-2 text-sm sm:flex sm:flex-wrap sm:items-center"}
      >
        {isImproving && championName && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm">
              <span className="text-ctp-subtext0">Reviewing:</span>
              <span className="font-medium text-ctp-text">{championName}</span>
              <span className="text-ctp-subtext0">·</span>
              <span className={spiritFilter ? "text-ctp-green" : "text-ctp-yellow"}>{spiritFilter ?? "Spirit required"}</span>
              <button type="button" onClick={() => setIdentityEditorOpen((open) => !open)} className="ml-auto text-xs text-ctp-blue hover:underline">
                {identityEditorOpen ? "Done changing identity" : "Change identity"}
              </button>
            </div>
            {identityEditorOpen && <p className="text-xs text-ctp-yellow sm:basis-full">Changing Champion clears the imported baseline. Changing Spirit keeps the baseline but changes the recommendation lens.</p>}
          </>
        )}
        {(!isImproving || identityEditorOpen) && (
          <>
            <label htmlFor="deck-builder-champion" className="text-ctp-subtext0">Champion:</label>
            <select
              id="deck-builder-champion"
              value={championName ?? ""}
              onChange={(event) => setChampionName(event.target.value || null)}
              className="w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-sm text-ctp-text sm:w-auto sm:text-xs"
            >
              <option value="">Choose a Champion…</option>
              {championsPresent.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            {championName && (
              <>
                <label htmlFor="deck-builder-element" className="text-ctp-subtext0 sm:ml-2">Element:</label>
                <select
                  id="deck-builder-element"
                  value={spiritElement ?? liveCatalogByName.get(spiritFilter ?? "")?.elements.find((element) => element !== "NORM") ?? ""}
                  onChange={(event) => {
                    const value = event.target.value || null;
                    setSpiritElement(value);
                    if (spiritFilter && value && !liveCatalogByName.get(spiritFilter)?.elements.includes(value)) setSpiritFilter(null);
                  }}
                  className="w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-sm text-ctp-text sm:w-auto sm:text-xs"
                >
                  <option value="">Choose an element…</option>
                  {spiritElements.map((element) => <option key={element} value={element}>{element}</option>)}
                </select>
                {(spiritElement || spiritFilter) && (
                  <>
                    <label htmlFor="deck-builder-spirit" className="text-ctp-subtext0 sm:ml-2">Spirit:</label>
                    <select
                      id="deck-builder-spirit"
                      value={spiritFilter ?? ""}
                      onChange={(event) => {
                        const value = event.target.value || null;
                        pendingActionRef.current = { label: `Set Spirit to ${value ?? "Any Spirit"}`, subject: null };
                        startTransition(() => setSpiritFilter(value));
                      }}
                      className="w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-sm text-ctp-text sm:w-auto sm:text-xs"
                    >
                      <option value="">Choose a Spirit…</option>
                      {spiritsForElement.map((name) => <option key={name} value={name}>{spiritOptionLabel(name)}</option>)}
                    </select>
                  </>
                )}
              </>
            )}
          </>
        )}
        {championName && (
          <button type="button" onClick={resetBuilder} className="justify-self-start rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-red hover:text-ctp-red sm:ml-1">
            Reset builder
          </button>
        )}
      </div>
      <DecklistPaste />
      {championName && (
        <ChampionLineagePicker
          championName={championName}
          cardsByName={catalogByName}
          material={build.material}
          lockedCards={lockedCards}
          format={deckFormat}
          onSelect={chooseChampionLineagePrint}
          onUseSuggested={restoreSuggestedChampionLevel}
        />
      )}
    </>
  );
}

function DecklistPaste() {
  const {
    deckFormat, isImproving, loadPastedDecklist, pasteError, pasteOpen, pasteText,
    setPasteError, setPasteOpen, setPasteText,
  } = useDeckBuilder();
  if (isImproving) return null;

  return (
    <div className="mt-2">
      {!pasteOpen ? (
        <button type="button" onClick={() => setPasteOpen(true)} className="text-xs text-ctp-blue hover:underline">
          Or paste a decklist for recommendations &rarr;
        </button>
      ) : (
        <div className="mt-1 max-w-sm">
          <p className="text-xs text-ctp-subtext0">
            Paste a decklist — one card per line, e.g. "4x Card Name", with optional "Main"/"Material" section
            headers. The Champion (and Spirit, if run) are detected automatically and everything else locks in as
            your starting point for recommendations.
          </p>
          <textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder={"Main\n4x Dungeon Guide\n...\n\nMaterial\n1x Spirit of Water"}
            rows={6}
            className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {deckFormat === "STANDARD" && (
              <button type="button" onClick={loadPastedDecklist} disabled={pasteText.trim().length === 0} className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0 disabled:cursor-not-allowed disabled:opacity-50">
                Load decklist
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPasteOpen(false);
                setPasteText("");
                setPasteError(null);
              }}
              className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text"
            >
              Cancel
            </button>
          </div>
          {pasteError && <p className="mt-1.5 text-xs text-ctp-red">{pasteError}</p>}
        </div>
      )}
    </div>
  );
}
