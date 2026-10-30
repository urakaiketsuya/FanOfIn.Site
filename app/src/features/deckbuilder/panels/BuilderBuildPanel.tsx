import BudgetReplacementPanel from "../BudgetReplacementPanel";
import DeckStats from "../../../components/DeckStats";
import { useMemo, useRef, useState } from "react";
import CardBrowser from "../../../components/deck-editor/CardBrowser";
import EditorDialog from "../../../components/deck-editor/EditorDialog";
import DeckEditor from "../../../components/deck-editor/DeckEditor";
import DisclosureChevron from "../../../components/DisclosureChevron";
import { EDITOR_SECTIONS } from "../../../lib/deckEditing";
import { BuilderStartActions, DecklistPaste } from "../components/DeckBuilderSetup";
import { useDeckBuilder } from "../useDeckBuilder";
import Button from "../../../components/ui/Button";
import Tabs, { TabPanel } from "../../../components/ui/Tabs";

export default function BuilderBuildPanel() {
  const b = useDeckBuilder();
  const view = b.searchParams.get("workbenchView") === "stats" ? "stats" : "deck";
  const [statsVisited, setStatsVisited] = useState(view === "stats");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  function changeView(next: "deck" | "stats") {
    if (next === "stats") setStatsVisited(true);
    const params = new URLSearchParams(b.searchParams);
    if (next === "stats") params.set("workbenchView", next); else params.delete("workbenchView");
    b.setSearchParams(params, { replace: true });
  }
  const hasCards = EDITOR_SECTIONS.some(({key})=>b.editor.deck[key].length > 0);
  const [starting, setStarting] = useState(!hasCards);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserDestination, setBrowserDestination] = useState<"automatic" | "main" | "material" | "sideboard" | "maybeboard">("automatic");
  const total = EDITOR_SECTIONS.reduce((sum,{key})=>sum+b.editor.deck[key].reduce((n,line)=>n+line.quantity,0),0);
  const evidence = useMemo(()=>new Map(b.cardCategoryRecommendations.map(item=>[item.card.name, `${item.recommendedQuantity} copies suggested. ${item.tournamentDecks > 0 ? `${Math.round(item.tournamentRate*100)}% of matching tournament decks` : `${Math.round(item.communityRate*100)}% community adoption`}.`])),[b.cardCategoryRecommendations]);
  const suggestedNames = useMemo(()=>[...new Set(b.cardCategoryRecommendations.map(item=>item.card.name))],[b.cardCategoryRecommendations]);
  const sourceSelect = useRef<HTMLSelectElement>(null);
  const collectionPending = b.collectionMode !== "all" && !b.collectionLoaded;
  const cardBrowser = <>          {b.recommendationsEnabled && <section aria-label="Suggestion context" className="identity-surface mb-3 rounded-2xl border border-ctp-surface1 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Suggested cards</h2><Button onClick={() => { b.setTab("tools"); }}>Settings</Button></div>
            {collectionPending && <div className="mt-3 rounded-xl border border-ctp-surface1 bg-ctp-base p-3">
              <p role={b.collectionError ? "alert" : "status"} className="text-sm">{b.collectionError ?? "Loading your collection before applying your ownership preference…"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button disabled={!b.collectionError} onClick={b.retryCollection}>{b.collectionError ? "Retry collection" : "Loading collection…"}</Button>
                <Button onClick={() => { b.setCollectionMode("all"); sourceSelect.current?.focus(); }}>Show all cards</Button>
              </div>
            </div>}
            {(!b.championName || !b.spiritFilter) ? <p className="mb-3 text-sm text-ctp-subtext1">Add {!b.championName && !b.spiritFilter ? "Champion and Spirit cards" : !b.championName ? "a Champion card" : "a Spirit card"} to Material to focus suggestions. Use All cards to find them.</p> : b.gateLoading ? <p role="status" className="mb-3 text-sm">Loading suggestions…</p> : null}
          </section>}
          <CardBrowser format={b.deckFormat} sourceControl={<select ref={sourceSelect} aria-label="Card source" value={b.recommendationsEnabled ? "suggestions" : "all"} onChange={event=>b.setRecommendationsEnabled(event.target.value==="suggestions")} className="min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-xs"><option value="all">All cards</option><option value="suggestions">Suggestions</option></select>} suppressResults={b.recommendationsEnabled && (!b.championName || !b.spiritFilter || b.gateLoading || collectionPending)} query={b.cardInput} onQuery={b.setCardInput} destination={browserDestination} onDestination={setBrowserDestination} names={b.cardNames} catalog={b.catalogByName} deck={b.editor.deck} onEdit={b.editor.edit} owned={b.collectionLoaded ? b.collectionOwnedByName : undefined} collectionStatus={b.collectionError ?? "Loading collection…"} identityElements={b.identityElements} suggestedNames={b.recommendationsEnabled ? suggestedNames : undefined} evidence={b.recommendationsEnabled ? evidence : undefined} />
  </>;
  return <section aria-label="Deck building workspace" className="mt-3">
    {(!starting || hasCards) && <div className=" -mx-1 flex flex-wrap items-center justify-between gap-2 border-b border-ctp-surface1 bg-ctp-base px-1 py-2">
      {!starting && <div className="flex gap-1"><Button size="sm" disabled={!b.editor.canUndo} onClick={b.editor.undo}>Undo</Button><Button size="sm" disabled={!b.editor.canRedo} onClick={b.editor.redo}>Redo</Button></div>}
      <h2 className="sr-only sm:not-sr-only sm:text-base sm:font-semibold">Your deck · {total} {total === 1 ? "card" : "cards"}</h2>
      {starting ? <button type="button" disabled={!hasCards} onClick={()=>setStarting(false)} className="min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base disabled:opacity-40">View deck ({total})</button> : <button type="button" onClick={()=>{b.setRecommendationsEnabled(false);setBrowserDestination("automatic");setBrowserOpen(true);}} className="min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base">Add cards</button>}
    </div>}
    {!starting && <Tabs tabs={[{key: "deck", label: "Deck"}, {key: "stats", label: "Stats"}]} active={view} onChange={changeView} baseId="workbench" label="Workbench view" />}
    {starting ? <section aria-label="Find your first cards" className="mt-3">
      {!hasCards && <details className="mb-2"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm text-ctp-blue">Import or open a deck<DisclosureChevron /></summary><div className="flex flex-wrap items-start gap-x-3"><DecklistPaste /><BuilderStartActions /></div></details>}
      {cardBrowser}
    </section> : <TabPanel baseId="workbench" tab="deck" active={view} keepMounted><section id="workbench-deck" aria-label="Edit deck" className="min-w-0">
      <div className="my-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs">Layout<select aria-label="Deck layout" value={b.viewMode} onChange={e=>b.setViewMode(e.target.value as "list"|"grid")} className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="grid">Card art</option><option value="list">Compact</option></select></label>
        <Button onClick={() => setSuggestionsOpen(true)}>Suggestions</Button>
      </div>
      <details className="mt-2 rounded-lg border border-ctp-surface1 px-3"><summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm ${b.validation.status==="Illegal" ? "text-ctp-yellow" : "text-ctp-subtext1"}`}>{b.validation.status==="Legal" ? "Construction checks pass" : b.validation.status==="Illegal" ? "Construction issues" : "Draft · construction incomplete"}<DisclosureChevron /></summary><div className="pb-3 text-xs text-ctp-subtext1">{b.validation.reasons.map(reason=><p className="mb-2" key={reason}>{reason}</p>)}</div></details>
      {!hasCards && <p className="py-8 text-sm text-ctp-subtext1">Your deck is empty. Use Add cards to get started.</p>}
      <DeckEditor onAdd={section => { setBrowserDestination(section); b.setRecommendationsEnabled(false); setBrowserOpen(true); }} format={b.deckFormat} deck={b.editor.deck} catalog={b.catalogByName} onEdit={b.editor.edit} viewMode={b.viewMode} />
    </section></TabPanel>}
    {!starting && <TabPanel baseId="workbench" tab="stats" active={view} keepMounted>{(statsVisited || view === "stats") && <DeckStats decklist={b.editor.deck} cardsByName={b.catalogByName} format={b.deckFormat} championName={b.championName} showBuildComparison={false} />}</TabPanel>}
    {suggestionsOpen && <EditorDialog title="Suggestions" doneLabel="Back to workbench" onDismiss={() => setSuggestionsOpen(false)}><div className="flex flex-col gap-3">
      <Button onClick={() => { setBudgetOpen(true); }}>Cheaper replacements</Button>
      <Button onClick={() => { b.setRecommendationsEnabled(true); setBrowserDestination("automatic"); setBrowserOpen(true); }}>Suggested cards</Button>
    </div></EditorDialog>}

    {budgetOpen && <EditorDialog title="Cheaper alternatives" doneLabel="Back to suggestions" onDismiss={() => setBudgetOpen(false)}><BudgetReplacementPanel /></EditorDialog>}
    {browserOpen && <EditorDialog count={total} onDismiss={()=>setBrowserOpen(false)}>{cardBrowser}</EditorDialog>}
  </section>;
}
