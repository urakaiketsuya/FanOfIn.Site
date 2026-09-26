import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { TabPanel } from "../../components/ui/Tabs";
import PageLayout from "../../components/layout/PageLayout";
import BuilderChangeLog from "./panels/BuilderChangeLog";
import ToolsPanel from "./panels/BuilderToolsPanel";
import BuilderCopyPanel from "./panels/BuilderCopyPanel";
import BuilderBuildPanel from "./panels/BuilderBuildPanel";
import { useDeckBuilderController } from "./useDeckBuilderController";
import { DeckBuilderProvider } from "./DeckBuilderContext";
import { useDeckBuilder } from "./useDeckBuilder";
import { DeckBuilderHeader } from "./components/DeckBuilderSetup";
import { DeckBuilderMethodology, DeckBuilderWorkbenchStatus } from "./components/DeckBuilderWorkbenchStatus";

export default function DeckBuilderIndex() {
  useDocumentTitle(
    "Deck Workbench",
    "Build, validate, save, and export a Grand Archive deck, then continue to dedicated analysis and review tools.",
  );
  const controller = useDeckBuilderController();
  return (
    <DeckBuilderProvider value={controller}>
      <DeckBuilderPage />
    </DeckBuilderProvider>
  );
}

function DeckBuilderPage() {
  const {
    recommendationsEnabled,
    setRecommendationsEnabled,
    deckFormat,
    championName,
    lockedCards,
    maybeboard,
    archetypeId,
    collectionMode,
    setCollectionMode,
    changeLog,
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
    isPending,
    startTransition,
    catalogByName,
    priceByName,
    priceTrendByName,
    improveDeckId,
    communityInclusionByName,
    hypeGapByName,
    decaySignalByName,
    build,
    reviewRemovalNames,
    cardNames,
    cardNameSet,
    cardsByName,
    toggleLock,
    setLockedQuantity,
    removeCard,
    addCard,
    removeMaybeCard,
    setMaybeQuantity,
    promoteMaybeCard,
    changePopulationSource,
    changeArchetype,
    mainTotal,
    materialTotal,
    sideboardTotal,
    selectedSideboardPoints,
    currentSideboardPoints,
    canAddToSideboard,
    sideboardDestinationSelected,
    decklist,
    validation,
    reviewComplete,
    validationComplete,
    copyPanel,
    effectivePopulationSource,
    simulatorResult,
    archetypeOptions,
    cardCategoryRecommendations,
  } = useDeckBuilder();
  return (
    <PageLayout data-component="DeckBuilderIndex" className="[&_input]:min-h-12 [&_input]:min-w-12 [&_button]:min-h-12 [&_button]:min-w-12 [&_select]:min-h-12 [&_summary]:min-h-12 [&_summary]:content-center [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-ctp-blue">
      <DeckBuilderHeader />
        <>
          <DeckBuilderWorkbenchStatus />
          {tab === "build" && (
            <BuilderBuildPanel
              recommendationsEnabled={recommendationsEnabled}
              onToggleRecommendations={() => startTransition(() => setRecommendationsEnabled((enabled) => !enabled))}
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
              effectivePopulationSource={effectivePopulationSource}
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
                archetypeId={archetypeId}
                archetypeOptions={archetypeOptions}
                onArchetypeChange={changeArchetype}
                deckFormat={deckFormat}
                populationSource={effectivePopulationSource}
                onChangePopulationSource={changePopulationSource}
                collectionMode={collectionMode}
                onCollectionModeChange={(mode) => startTransition(() => setCollectionMode(mode))}
              />
          </TabPanel>

          {tab === "copy" && (
            <BuilderCopyPanel
              hideFullDeckOption
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

          <DeckBuilderMethodology />
        </>
    </PageLayout>
  );
}
