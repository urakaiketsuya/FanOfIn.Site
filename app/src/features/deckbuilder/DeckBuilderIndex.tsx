import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import BuilderChangeLog from "./panels/BuilderChangeLog";
import ToolsPanel from "./panels/BuilderToolsPanel";
import BuilderCopyPanel from "./panels/BuilderCopyPanel";
import BuilderBuildPanel from "./panels/BuilderBuildPanel";
import { useDeckBuilderController } from "./useDeckBuilderController";
import { DeckBuilderProvider } from "./DeckBuilderContext";
import { useDeckBuilder } from "./useDeckBuilder";
import { DeckBuilderHeader } from "./components/DeckBuilderSetup";
import { DeckBuilderMethodology } from "./components/DeckBuilderWorkbenchStatus";

export default function DeckBuilderIndex() {
  useDocumentTitle("Deck Workbench", "Find cards, edit your deck, and save drafts. Ask for suggestions when you need them.");
  const controller = useDeckBuilderController();
  return <DeckBuilderProvider value={controller}><DeckBuilderPage /></DeckBuilderProvider>;
}

function DeckBuilderPage() {
  const b = useDeckBuilder();
  const c = b.copyPanel;
  return <PageLayout width="full" data-component="DeckBuilderIndex" className="[&_button]:min-h-12 [&_button]:min-w-12 [&_select]:min-h-12 [&_summary]:min-h-12 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-ctp-blue">
    <DeckBuilderHeader />
    {b.isPending && <p role="status" className="text-xs text-ctp-subtext1">Updating deck…</p>}
    <BuilderBuildPanel />
    {b.tab !== "build" && <EditorDialog title={b.tab === "copy" ? "Save & export" : b.tab === "log" ? "Change history" : "Suggestion settings"} doneLabel="Back to workbench" onDismiss={()=>b.setTab("build")}>
      {b.tab === "log" && <BuilderChangeLog entries={b.changeLog} />}
      {b.tab === "tools" && <ToolsPanel archetypeId={b.archetypeId} archetypeOptions={b.archetypeOptions} onArchetypeChange={b.changeArchetype} deckFormat={b.deckFormat} populationSource={b.effectivePopulationSource} onChangePopulationSource={b.changePopulationSource} collectionMode={b.collectionMode} onCollectionModeChange={b.setCollectionMode} />}
      {b.tab === "copy" && <BuilderCopyPanel hideFullDeckOption validation={b.validation} validationComplete={b.validationComplete} reviewComplete={b.reviewComplete} improveDeckId={b.improveDeckId || c.savedDeckId} championName={b.championName}
        saveNote={c.saveNote} onSaveNoteChange={c.setSaveNote} saveTitle={c.saveTitle} onSaveTitleChange={c.setSaveTitle} saveCopyCount={c.saveCopyCount} saveState={c.saveState} onSave={()=>void c.handleSaveToMyDecks()} savedDeckId={c.savedDeckId} saveKeptOnly={c.saveKeptOnly} onSaveKeptOnlyChange={c.setSaveKeptOnly} keptCopyCount={c.keptCopyCount} decklist={b.decklist} catalogByName={b.catalogByName} onCopy={keptOnly=>void c.handleCopy(keptOnly)} copyState={c.copyState} fullCopyCount={c.fullCopyCount} onCopyAndOpen={url=>void c.handleCopyAndOpen(url)} massEntryUrl={c.massEntryUrl} clarentUrl={c.clarentUrl} onExportTts={c.handleExportTts} onCopyShareLink={()=>void c.handleCopyShareLink()} shareCopyState={c.shareCopyState} />}
    </EditorDialog>}
    <DeckBuilderMethodology />
  </PageLayout>;
}
