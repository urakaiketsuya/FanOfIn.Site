import { useMemo, useRef, useState } from "react";
import CardBrowser from "../../../components/deck-editor/CardBrowser";
import EditorDialog from "../../../components/deck-editor/EditorDialog";
import DeckEditor from "../../../components/deck-editor/DeckEditor";
import DeckTextSheet from "../../../components/deck-editor/DeckTextSheet";
import PackagePicker from "../../../components/deck-editor/PackagePicker";
import BudgetReplacementPanel from "../BudgetReplacementPanel";
import { BuilderStartActions, DecklistPaste } from "../components/DeckBuilderSetup";
import { useDeckBuilder } from "../useDeckBuilder";
import Button from "../../../components/ui/Button";

export default function BuilderBuildPanel() {
  const b = useDeckBuilder();
  const [textOpen, setTextOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserDestination, setBrowserDestination] = useState<"automatic" | "main" | "material" | "sideboard" | "maybeboard" | "song">("automatic");
  const total = Object.values(b.editor.deck).flat().reduce((sum, line) => sum + line.quantity, 0);
  const evidence = useMemo(()=>new Map(b.cardCategoryRecommendations.map(item=>[item.card.name, `${item.recommendedQuantity} copies suggested.`])),[b.cardCategoryRecommendations]);
  const suggestedNames = useMemo(()=>[...new Set(b.cardCategoryRecommendations.map(item=>item.card.name))],[b.cardCategoryRecommendations]);
  const sourceSelect = useRef<HTMLSelectElement>(null);
  const collectionPending = b.collectionMode !== "all" && !b.collectionLoaded;
  const cardBrowser = <><label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={b.previewEnabled} onChange={e => b.setPreviewEnabled(e.target.checked)} />Include spoiler cards</label>{b.previewEnabled && b.previewLoading && <p role="status" className="text-sm text-ctp-subtext1">Loading previews…</p>}{b.previewError && b.previewEnabled && <p role="alert">Preview cards unavailable. <Button onClick={b.retryPreviews}>Retry</Button></p>}          {b.recommendationsEnabled && <section aria-label="Suggestion context" className="identity-surface mb-3 rounded-2xl border border-ctp-surface1 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Suggested cards</h2><Button onClick={() => { b.setTab("tools"); }}>Settings</Button></div>
            {collectionPending && <div className="mt-3 rounded-xl border border-ctp-surface1 bg-ctp-base p-3">
              <p role={b.collectionError ? "alert" : "status"} className="text-sm">{b.collectionError ?? "Loading your collection before applying your ownership preference…"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button disabled={!b.collectionError} onClick={b.retryCollection}>{b.collectionError ? "Retry collection" : "Loading collection…"}</Button>
                <Button onClick={() => { b.setCollectionMode("all"); sourceSelect.current?.focus(); }}>Show all cards</Button>
              </div>
            </div>}
            {(!b.championName || !b.spiritFilter) ? <p className="mb-3 text-sm text-ctp-subtext1">Add {!b.championName && !b.spiritFilter ? "Champion and Spirit cards" : !b.championName ? "a Champion card" : "a Spirit card"} to Material to focus suggestions. Search to find them.</p> : b.gateLoading ? <p role="status" className="mb-3 text-sm">Loading suggestions…</p> : null}
          </section>}
          <CardBrowser format={b.deckFormat} sourceControl={<select ref={sourceSelect} aria-label="Card source" value={b.recommendationsEnabled ? "suggestions" : "all"} onChange={event=>b.setRecommendationsEnabled(event.target.value==="suggestions")} className="min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-xs"><option value="all">All cards</option><option value="suggestions">Suggestions</option></select>} suppressResults={b.recommendationsEnabled && (!b.championName || !b.spiritFilter || b.gateLoading || collectionPending)} query={b.cardInput} onQuery={b.setCardInput} destination={browserDestination} onDestination={setBrowserDestination} names={b.cardNames} catalog={b.catalogByName} deck={b.editor.deck} onEdit={b.editor.edit} owned={b.collectionLoaded ? b.collectionOwnedByName : undefined} collectionStatus={b.collectionError ?? "Loading collection…"} identityElements={b.identityElements} suggestedNames={b.recommendationsEnabled ? suggestedNames : undefined} evidence={b.recommendationsEnabled ? evidence : undefined} />
  </>;
  return <section aria-label="Edit deck" className="mt-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">Edit cards</h2>
      <Button variant="primary" onClick={() => { b.setRecommendationsEnabled(false); b.setCardInput(""); setBrowserDestination("automatic"); setBrowserOpen(true); }}>Add cards</Button>
    </div>
    <div className="my-3 flex flex-wrap items-center gap-2 rounded-lg border border-ctp-surface1 p-2">
      <span className="mr-auto text-sm text-ctp-subtext1">{total} cards</span>
      <Button disabled={!b.editor.canUndo} onClick={b.editor.undo}>Undo</Button><Button disabled={!b.editor.canRedo} onClick={b.editor.redo}>Redo</Button>
      <Button onClick={() => setTextOpen(true)}>Edit text</Button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <PackagePicker deck={b.editor.deck} catalog={b.catalogByName} onEdit={b.editor.edit} />
      <Button onClick={() => { b.setRecommendationsEnabled(true); setBrowserDestination("automatic"); b.setCardInput(""); setBrowserOpen(true); }}>Suggested cards</Button>
      <Button onClick={() => setBudgetOpen(true)}>Cheaper replacements</Button>
    </div>
    {!total && <div className="flex flex-wrap items-start gap-2"><DecklistPaste /><BuilderStartActions /></div>}
    <DeckEditor format={b.deckFormat} deck={b.editor.deck} catalog={b.catalogByName} onEdit={b.editor.edit} onReplace={b.editor.replace}
      onAdd={section => { setBrowserDestination(section); b.setRecommendationsEnabled(false); b.setCardInput(""); setBrowserOpen(true); }} />
    {textOpen && <DeckTextSheet deck={b.editor.deck} onDismiss={() => setTextOpen(false)} onApply={next => { b.editor.replace(next); setTextOpen(false); }} />}
    {budgetOpen && <EditorDialog title="Cheaper alternatives" onDismiss={() => setBudgetOpen(false)}><BudgetReplacementPanel /></EditorDialog>}
    {browserOpen && <EditorDialog count={total} onDismiss={() => setBrowserOpen(false)}>{cardBrowser}</EditorDialog>}
  </section>;
}
