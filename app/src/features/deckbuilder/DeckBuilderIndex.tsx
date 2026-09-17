import { Link } from "react-router-dom";
import StaleDataNotice from "../../components/StaleDataNotice";
import DecklistCoverageNotice from "../../components/DecklistCoverageNotice";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import NotificationBanner from "../../components/ui/NotificationBanner";
import PageHeader from "../../components/ui/PageHeader";
import { TabPanel } from "../../components/ui/Tabs";
import PageLayout from "../../components/layout/PageLayout";
import BuilderChangeLog from "./panels/BuilderChangeLog";
import ImprovementReviewPanel from "./panels/ImprovementReviewPanel";
import ToolsPanel from "./panels/BuilderToolsPanel";
import BuilderCopyPanel from "./panels/BuilderCopyPanel";
import BuilderBuildPanel from "./panels/BuilderBuildPanel";
import BuilderWorkbenchNav from "./components/BuilderWorkbenchNav";
import ChampionLineagePicker from "./components/ChampionLineagePicker";
import { type BuilderIntent, useDeckBuilderController } from "./useDeckBuilderController";

const BUILDER_INTENTS: { key: BuilderIntent; title: string; description: string }[] = [
  { key: "seed", title: "Build around cards", description: "Choose a Champion and Spirit, lock the cards you care about, and fill the rest." },
  { key: "scratch", title: "Start from scratch", description: "Choose a Champion and Spirit, then optimize a full suggested list." },
];

export default function DeckBuilderIndex() {
  useDocumentTitle(
    "Guided Deck Builder",
    "Build, validate, save, and export a Grand Archive deck, then continue to dedicated analysis and review tools.",
  );
  const {
    searchParams,
    setSearchParams,
    isImproving,
    builderIntent,
    deckFormat,
    setDeckFormat,
    chooseIntent,
    championName,
    setChampionName,
    spiritFilter,
    setSpiritFilter,
    lockedCards,
    maybeboard,
    rejectedCards,
    setRejectedCards,
    pillarBias,
    archetypeId,
    championLevelCap,
    setPopulationSource,
    collectionMode,
    setCollectionMode,
    changeLog,
    spiritElement,
    setSpiritElement,
    cardInput,
    setCardInput,
    addDestination,
    setAddDestination,
    visibleFields,
    setVisibleField,
    customizeOpen,
    setCustomizeOpen,
    viewMode,
    setViewMode,
    tab,
    setTab,
    identityEditorOpen,
    setIdentityEditorOpen,
    isPending,
    startTransition,
    pasteOpen,
    setPasteOpen,
    pasteText,
    setPasteText,
    pasteError,
    setPasteError,
    pendingActionRef,
    popularityIndexData,
    liveCatalogByName,
    catalogByName,
    simulatorSummary,
    priceByName,
    priceTrendByName,
    improveDeckId,
    seedLockedCards,
    communityInclusionByName,
    hypeGapByName,
    decaySignalByName,
    build,
    reviewItemCount,
    reviewRemovalNames,
    gateLoading,
    gateHasData,
    spiritElements,
    spiritsForElement,
    spiritOptionLabel,
    championsPresent,
    cardNames,
    cardNameSet,
    cardsByName,
    loadPastedDecklist,
    toggleLock,
    chooseChampionLineagePrint,
    restoreSuggestedChampionLevel,
    setLockedQuantity,
    removeCard,
    addCard,
    removeMaybeCard,
    setMaybeQuantity,
    promoteMaybeCard,
    changePopulationSource,
    changePillarBias,
    changeArchetype,
    changeChampionLevelCap,
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
    resetBuilder,
    importedCardCount,
    identityComplete,
    reviewComplete,
    validationComplete,
    copyPanel,
    effectivePopulationSource,
    simulatorResult,
    archetypeOptions,
    cardCategoryRecommendations,
  } = useDeckBuilderController();
  return (
    <PageLayout data-component="DeckBuilderIndex">
      <PageHeader
        eyebrow="Connected deck tools"
        title={isImproving ? "Improve your deck" : "Deck Workbench"}
        description={(
          isImproving
            ? <>Your saved list is the baseline. Review evidence-backed changes, keep only the ones you want, then save a new version when you are ready.</>
            : <>Start from a Champion, an Element, and a Spirit to generate a suggested deck from real decklists. You can also paste a list to tune cards you already have.</>
        )}
      />

      {!isImproving && !identityComplete && <section className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" aria-labelledby="builder-start">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
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
          {BUILDER_INTENTS.map((intent) => <button
            key={intent.key}
            type="button"
            onClick={() => chooseIntent(intent.key)}
            aria-pressed={builderIntent === intent.key}
            className={`rounded-lg border p-3 text-left transition-colors ${builderIntent === intent.key ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 bg-ctp-base hover:border-ctp-blue/60"}`}
          >
            <span className={`text-sm font-semibold ${builderIntent === intent.key ? "text-ctp-blue" : "text-ctp-text"}`}>{intent.title}</span>
            <span className="mt-1 block text-xs leading-5 text-ctp-subtext1">{intent.description}</span>
          </button>)}
        </div>
        {builderIntent === "seed" && <p className="mt-3 rounded-md border border-ctp-green/40 bg-ctp-green/10 px-3 py-2 text-xs text-ctp-subtext1">Choose your Champion and Spirit, then add the cards you already want to play. They stay locked while recommendations fill the remaining slots.</p>}
        {builderIntent === "scratch" && <p className="mt-3 rounded-md border border-ctp-blue/40 bg-ctp-blue/10 px-3 py-2 text-xs text-ctp-subtext1">Choose a Champion, Element, and Spirit to generate an evidence-backed shell. Continue to Deck Review when you want suggestions.</p>}
      </section>}

      {isImproving && <ImprovementReviewPanel importedCardCount={importedCardCount} reviewItemCount={reviewItemCount} />}

      {!identityComplete && <div id="deck-builder-starting" className="mt-4 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1 text-sm" role="group" aria-label="Deck format">
        {(["STANDARD", "PANTHEON"] as const).map((format) => <button key={format} type="button" aria-pressed={deckFormat === format} onClick={() => { setDeckFormat(format); if (format === "PANTHEON") setPopulationSource("community"); const next = new URLSearchParams(searchParams); if (format === "PANTHEON") next.set("format", "pantheon"); else next.delete("format"); setSearchParams(next, { replace: true }); }} className={`rounded-md px-3 py-1.5 ${deckFormat === format ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>{format === "PANTHEON" ? "Pantheon" : "Standard"}</button>)}
      </div>}
      {!identityComplete && deckFormat === "PANTHEON" && <p className="mt-2 text-xs text-ctp-subtext0">Pantheon recommendations use format-separated community adoption and singleton legality. They do not use Standard tournament win rates.</p>}

      <div id="deck-builder-identity" className={isImproving ? "mt-4" : "mt-4 flex flex-wrap items-center gap-2 text-sm"}>
        {isImproving && championName && <>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm">
            <span className="text-ctp-subtext0">Reviewing:</span>
            <span className="font-medium text-ctp-text">{championName}</span>
            <span className="text-ctp-subtext0">·</span>
            <span className={spiritFilter ? "text-ctp-green" : "text-ctp-yellow"}>{spiritFilter ?? "Spirit required"}</span>
            <button type="button" onClick={() => setIdentityEditorOpen((open) => !open)} className="ml-auto text-xs text-ctp-blue hover:underline">
              {identityEditorOpen ? "Done changing identity" : "Change identity"}
            </button>
          </div>
          {identityEditorOpen && <p className="mt-2 text-xs text-ctp-yellow">Changing Champion clears the imported baseline. Changing Spirit keeps the baseline but changes the recommendation lens.</p>}
        </>}
        {(!isImproving || identityEditorOpen) && <>
        <label htmlFor="deck-builder-champion" className="text-ctp-subtext0">Champion:</label>
        <select
          id="deck-builder-champion"
          value={championName ?? ""}
          onChange={(e) => setChampionName(e.target.value || null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">Choose a Champion…</option>
          {championsPresent.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {championName && (!isImproving || identityEditorOpen) && (
          <>
            <label htmlFor="deck-builder-element" className="ml-2 text-ctp-subtext0">Element:</label>
            <select
              id="deck-builder-element"
              value={spiritElement ?? liveCatalogByName.get(spiritFilter ?? "")?.elements.find((element) => element !== "NORM") ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                setSpiritElement(value);
                if (spiritFilter && value && !liveCatalogByName.get(spiritFilter)?.elements.includes(value)) setSpiritFilter(null);
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              <option value="">Choose an element…</option>
              {spiritElements.map((element) => <option key={element} value={element}>{element}</option>)}
            </select>
            {(spiritElement || spiritFilter) && <>
            <label htmlFor="deck-builder-spirit" className="ml-2 text-ctp-subtext0">Spirit:</label>
            <select
              id="deck-builder-spirit"
              value={spiritFilter ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                pendingActionRef.current = { label: `Set Spirit to ${value ?? "Any Spirit"}`, subject: null };
                startTransition(() => setSpiritFilter(value));
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              <option value="">Choose a Spirit…</option>
              {spiritsForElement.map((name) => (
                <option key={name} value={name}>
                  {spiritOptionLabel(name)}
                </option>
              ))}
            </select>
            </>}
          </>
        )}
        </>}
        {championName && (
          <button
            type="button"
            onClick={resetBuilder}
            className="ml-1 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-red hover:text-ctp-red"
          >
            Reset builder
          </button>
        )}
      </div>
      {!isImproving && <div className="mt-2">
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
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Main\n4x Dungeon Guide\n...\n\nMaterial\n1x Spirit of Water"}
              rows={6}
              className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {deckFormat === "STANDARD" && <button
                type="button"
                onClick={loadPastedDecklist}
                disabled={pasteText.trim().length === 0}
                className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Load decklist
              </button>}
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
      </div>}

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

      {builderIntent === "seed" && (!championName || !spiritFilter || gateLoading || !gateHasData || seedLockedCards.size === 0) && <section className="mt-5 rounded-lg border border-ctp-green/40 bg-ctp-green/5 p-3" aria-labelledby="seed-cards">
        <h2 id="seed-cards" className="text-sm font-semibold text-ctp-text">Start with your cards</h2>
        <p className="mt-1 text-xs text-ctp-subtext1">Add one or more cards, then choose the Champion and Spirit that should support them. Your selected cards stay locked as the deck fills in.</p>
        <div className="mt-3 flex max-w-xl flex-wrap gap-2">
          <input
            type="text"
            list="deck-builder-card-options"
            value={cardInput}
            onChange={(event) => setCardInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && cardNameSet.has(cardInput)) addCard(cardInput); }}
            placeholder="Type a card name…"
            className="min-w-52 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
          />
          <button type="button" disabled={!cardNameSet.has(cardInput) || lockedCards.has(cardInput)} onClick={() => addCard(cardInput)} className="rounded-md border border-ctp-green/60 px-3 py-1.5 text-sm text-ctp-green hover:bg-ctp-green/10 disabled:cursor-not-allowed disabled:opacity-50">Add card</button>
        </div>
        <datalist id="deck-builder-card-options">{cardNames.map((name) => <option key={name} value={name} />)}</datalist>
        {seedLockedCards.size > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{Array.from(seedLockedCards.keys()).map((name) => <button key={name} type="button" onClick={() => removeCard(name, true)} className="rounded-full border border-ctp-green/40 px-2 py-0.5 text-xs text-ctp-green hover:border-ctp-red hover:text-ctp-red" title="Remove seed card">{name} ×</button>)}</div>}
      </section>}

      {!championName && <p className="mt-6 text-ctp-subtext1">Choose a Champion to see a suggested build.</p>}

      {builderIntent === "seed" && championName && spiritFilter && seedLockedCards.size === 0 && !gateLoading && gateHasData && <p className="mt-6 rounded-lg border border-ctp-green/40 bg-ctp-green/5 px-4 py-3 text-sm text-ctp-subtext1">Add at least one card you want to build around. We’ll use it with {championName} and {spiritFilter} to shape the suggested deck.</p>}

      {championName && gateLoading && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      {championName && !gateLoading && !gateHasData && (
        <p className="mt-6 text-ctp-subtext1">
          No decks found for {championName}.
        </p>
      )}

      {championName && !gateLoading && gateHasData && !spiritFilter && (
        <p className="mt-6 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm text-ctp-subtext1">
          Select an element and Spirit above to generate a coherent core. The builder will keep unsupported slots unresolved
          instead of mixing this Champion's different strategies.
        </p>
      )}

      {championName && spiritFilter && !gateLoading && gateHasData && (builderIntent !== "seed" || seedLockedCards.size > 0) && (
        <>
          {effectivePopulationSource === "simulator" && <div className="mt-2 rounded-lg border border-ctp-mauve/50 bg-ctp-mauve/10 px-3 py-2 text-xs text-ctp-subtext1">
            <span className="font-semibold text-ctp-mauve">Experimental:</span>{" "}
            Clarent currently reports {simulatorSummary?.games ?? 0} game{simulatorSummary?.games === 1 ? "" : "s"} and {simulatorResult.matchedCards} catalog-resolved card sample{simulatorResult.matchedCards === 1 ? "" : "s"}. Community construction still supplies the legal shell — simulator rows only reorder card priority within it.{" "}
            <Link to="/methodology#simulator-data" className="text-ctp-blue hover:underline">Learn more</Link>
          </div>}

          {isPending && <p role="status" className="mt-1 text-xs text-ctp-subtext0">Recalculating suggestions…</p>}
          {rejectedCards.size > 0 && <p className="mt-1 text-xs text-ctp-subtext0">{rejectedCards.size} card{rejectedCards.size === 1 ? "" : "s"} excluded · <button type="button" onClick={() => { pendingActionRef.current = { label: "Reset excluded cards", subject: null }; startTransition(() => setRejectedCards(new Set())); }} className="hover:text-ctp-blue hover:underline">reset</button></p>}
          {build.usedSpiritElementFallback && (
            <p className="mt-1 text-xs text-ctp-yellow">
              Too few {championName} decks run {spiritFilter} specifically — suggestions also draw on other{" "}
              {championName} decks with a same-element Spirit ({build.spiritElementFallbackSpirits.join(", ")}).
            </p>
          )}
          <section className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3" aria-labelledby="deck-builder-checklist">
            <h2 id="deck-builder-checklist" className="text-sm font-semibold text-ctp-text">Deck-building checklist</h2>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
              {isImproving && <p className={importedCardCount > 0 ? "text-ctp-green" : "text-ctp-yellow"}>{importedCardCount > 0 ? `✓ ${importedCardCount} baseline cards loaded` : "○ Imported deck is empty"}</p>}
              <p className={championName ? "text-ctp-green" : "text-ctp-subtext1"}>{championName ? "✓ Champion selected" : "○ Choose a Champion"}</p>
              <p className={spiritFilter ? "text-ctp-green" : "text-ctp-subtext1"}>{spiritFilter ? "✓ Spirit selected" : "○ Choose an element and Spirit"}</p>
              <p className={validation.status === "Legal" ? "text-ctp-green" : "text-ctp-yellow"}>{validation.status === "Legal" ? "✓ Construction checks pass" : `○ ${validation.status}: review deck size and legality`}</p>
            </div>
          </section>

          <BuilderWorkbenchNav
            activeView={tab}
            onViewChange={setTab}
            championName={championName}
            spiritName={spiritFilter}
            deckFormat={deckFormat}
            mainTotal={mainTotal}
            materialTotal={materialTotal}
            sideboardTotal={sideboardTotal}
            validationStatus={validation.status}
            changeLogCount={changeLog.length}
          />

          {newReleaseCards.length > 0 && (
            <div className="mt-4">
              <NotificationBanner
                tone="highlight"
                title="New cards available"
                description={`${newReleaseCards.length} new card${newReleaseCards.length === 1 ? "" : "s"} from recent sets`}
                action={{ label: "Explore new cards", to: "/card-discovery" }}
              />
            </div>
          )}
          {tab === "build" && (
            <BuilderBuildPanel
              builderIntent={builderIntent}
              cardInput={cardInput}
              onCardInputChange={setCardInput}
              addDestination={addDestination}
              onAddDestinationChange={setAddDestination}
              cardNameSet={cardNameSet}
              cardNames={cardNames}
              onAddCard={addCard}
              canAddToSideboard={canAddToSideboard}
              selectedSideboardPoints={selectedSideboardPoints}
              currentSideboardPoints={currentSideboardPoints}
              sideboardDestinationSelected={sideboardDestinationSelected}
              customizeOpen={customizeOpen}
              onToggleCustomizeOpen={() => setCustomizeOpen((v) => !v)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              visibleFields={visibleFields}
              onVisibleFieldChange={setVisibleField}
              pillarBias={pillarBias}
              effectivePopulationSource={effectivePopulationSource}
              onJumpToTools={() => setTab("tools")}
              build={build}
              isPending={isPending}
              materialTotal={materialTotal}
              mainTotal={mainTotal}
              sideboardTotal={sideboardTotal}
              cardsByName={cardsByName}
              catalogByName={catalogByName}
              priceByName={priceByName}
              priceTrendByName={priceTrendByName}
              communityInclusionByName={communityInclusionByName}
              hypeGapByName={hypeGapByName}
              decaySignalByName={decaySignalByName}
              simulatorEvidenceByName={simulatorResult.evidenceByName}
              reviewRemovalNames={reviewRemovalNames}
              onToggleLock={toggleLock}
              onChangeQuantity={setLockedQuantity}
              onRemoveCard={removeCard}
              maybeboard={maybeboard}
              onMaybeQuantityChange={setMaybeQuantity}
              lockedCards={lockedCards}
              onPromoteMaybeCard={promoteMaybeCard}
              onRemoveMaybeCard={removeMaybeCard}
              cardCategoryRecommendations={cardCategoryRecommendations}
            />
          )}

          <TabPanel baseId="deck-builder" tab="tools" active={tab}>
              <ToolsPanel
                pillarBias={pillarBias}
                onPillarBiasChange={changePillarBias}
                archetypeId={archetypeId}
                archetypeOptions={archetypeOptions}
                onArchetypeChange={changeArchetype}
                championLevelCap={championLevelCap}
                onChampionLevelCapChange={changeChampionLevelCap}
                validation={validation}
                unresolvedMain={build.unresolved.main}
                deckFormat={deckFormat}
                populationSource={effectivePopulationSource}
                onChangePopulationSource={changePopulationSource}
                collectionMode={collectionMode}
                onCollectionModeChange={(mode) => startTransition(() => setCollectionMode(mode))}
              />
          </TabPanel>

          {tab === "copy" && (
            <BuilderCopyPanel
              validation={validation}
              validationComplete={validationComplete}
              reviewComplete={reviewComplete}
              improveDeckId={improveDeckId}
              championName={championName}
              saveNote={copyPanel.saveNote}
              onSaveNoteChange={copyPanel.setSaveNote}
              saveTitle={copyPanel.saveTitle}
              onSaveTitleChange={copyPanel.setSaveTitle}
              saveCopyCount={copyPanel.saveCopyCount}
              saveState={copyPanel.saveState}
              onSave={() => void copyPanel.handleSaveToMyDecks()}
              savedDeckId={copyPanel.savedDeckId}
              saveKeptOnly={copyPanel.saveKeptOnly}
              onSaveKeptOnlyChange={copyPanel.setSaveKeptOnly}
              keptCopyCount={copyPanel.keptCopyCount}
              decklist={decklist}
              catalogByName={catalogByName}
              onCopy={(keptOnly) => void copyPanel.handleCopy(keptOnly)}
              copyState={copyPanel.copyState}
              fullCopyCount={copyPanel.fullCopyCount}
              onCopyAndOpen={(url) => void copyPanel.handleCopyAndOpen(url)}
              massEntryUrl={copyPanel.massEntryUrl}
              clarentUrl={copyPanel.clarentUrl}
              onExportTts={copyPanel.handleExportTts}
              onCopyShareLink={() => void copyPanel.handleCopyShareLink()}
              shareCopyState={copyPanel.shareCopyState}
            />
          )}

          <TabPanel baseId="deck-builder" tab="log" active={tab}>
            <BuilderChangeLog entries={changeLog} />
          </TabPanel>

          <details className="mt-8 border-t border-ctp-surface1 pt-3 text-xs text-ctp-subtext0">
            <summary className="cursor-pointer font-medium hover:text-ctp-text">Data &amp; methodology</summary>
            <div className="mt-2 space-y-2">
              <DecklistCoverageNotice />
              <StaleDataNotice generatedAt={[popularityIndexData?.generatedAt, effectivePopulationSource === "simulator" ? simulatorSummary?.generatedAt : undefined]} />
              <p>
                {effectivePopulationSource === "simulator" ? "Simulator ordering is an experimental overlay on a community-built legal shell." : "Suggestions are correlations from public tournament decklists, not causal or predictive claims."}{" "}
                <Link to={effectivePopulationSource === "simulator" ? "/methodology#simulator-data" : "/methodology#classification"} className="text-ctp-blue hover:underline">Learn more</Link>
              </p>
              {build.hasQuantityOptimizations && (
                <p>
                  Starred quantities use copy-count evidence only when the gap is statistically significant, not just numerically different — checked first against this build's own population, then against the global copy-count dataset.{" "}
                  <Link to="/methodology#small-samples" className="text-ctp-blue hover:underline">Learn more</Link>
                </p>
              )}
              <p>Validation does not cover {validation.unsupportedRules.join("; ")}.</p>
            </div>
          </details>
        </>
      )}
    </PageLayout>
  );
}
