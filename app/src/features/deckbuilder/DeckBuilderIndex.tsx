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
import { BuilderIntentChooser, DeckBuilderHeader, DeckIdentitySetup } from "./components/DeckBuilderSetup";
import { BuilderReadinessMessage, SeedCardPrompt } from "./components/DeckBuilderReadiness";
import { DeckBuilderMethodology, DeckBuilderWorkbenchStatus } from "./components/DeckBuilderWorkbenchStatus";

export default function DeckBuilderIndex() {
  useDocumentTitle(
    "Guided Deck Builder",
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
    builderIntent,
    deckFormat,
    championName,
    spiritFilter,
    lockedCards,
    maybeboard,
    pillarBias,
    archetypeId,
    championLevelCap,
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
    setTab,
    isPending,
    startTransition,
    catalogByName,
    priceByName,
    priceTrendByName,
    improveDeckId,
    seedLockedCards,
    communityInclusionByName,
    hypeGapByName,
    decaySignalByName,
    build,
    reviewRemovalNames,
    gateLoading,
    gateHasData,
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
    <PageLayout data-component="DeckBuilderIndex">
      <DeckBuilderHeader />
      <BuilderIntentChooser />

      <DeckIdentitySetup />

      <SeedCardPrompt />
      <BuilderReadinessMessage />

      {championName && spiritFilter && !gateLoading && gateHasData && (builderIntent !== "seed" || seedLockedCards.size > 0) && (
        <>
          <DeckBuilderWorkbenchStatus />
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

          <DeckBuilderMethodology />
        </>
      )}
    </PageLayout>
  );
}
