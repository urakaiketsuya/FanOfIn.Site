import { useBuilderCardStats } from "../components/BuilderCardStats";
import { useEffect, useMemo, useState } from "react";
import CardBrowser from "../../../components/deck-editor/CardBrowser";
import EditorDialog from "../../../components/deck-editor/EditorDialog";
import DeckEditor from "../../../components/deck-editor/DeckEditor";
import DisclosureChevron from "../../../components/DisclosureChevron";
import { EDITOR_SECTIONS } from "../../../lib/deckEditing";
import { BuilderStartActions, DecklistPaste } from "../components/DeckBuilderSetup";
import { useDeckBuilder } from "../useDeckBuilder";
import ToolsPanel from "./BuilderToolsPanel";

export default function BuilderBuildPanel() {
  const b = useDeckBuilder();
  const cardStats = useBuilderCardStats();
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const header = document.querySelector('[data-component="App"] > header');
    if (!header) return;
    const observer = new ResizeObserver(() => setHeaderHeight(header.getBoundingClientRect().height));
    setHeaderHeight(header.getBoundingClientRect().height);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const hasCards = EDITOR_SECTIONS.some(({key})=>b.editor.deck[key].length > 0);
  const [starting, setStarting] = useState(!hasCards);
  const [browserOpen, setBrowserOpen] = useState(false);
  const total = EDITOR_SECTIONS.reduce((sum,{key})=>sum+b.editor.deck[key].reduce((n,line)=>n+line.quantity,0),0);
  const evidence = useMemo(()=>new Map(b.cardCategoryRecommendations.map(item=>[item.card.name, `${item.recommendedQuantity} copies suggested. ${item.tournamentDecks > 0 ? `${Math.round(item.tournamentRate*100)}% of matching tournament decks` : `${Math.round(item.communityRate*100)}% community adoption`}.`])),[b.cardCategoryRecommendations]);
  const suggestedNames = useMemo(()=>[...new Set(b.cardCategoryRecommendations.map(item=>item.card.name))],[b.cardCategoryRecommendations]);
  const cardBrowser = <>          {b.recommendationsEnabled && <section aria-label="Suggestion context" className="identity-surface mb-3 rounded-2xl border border-ctp-surface1 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ctp-subtext0">Optional suggestions</p>
            <h2 className="mt-1 text-xl font-semibold">Find your next card</h2>
            <p className="mt-2 text-sm text-ctp-subtext1">Select cards to review, then choose Add 1 each or Add playset. Browsing suggestions does not change your deck.</p>
            {b.championName && b.spiritFilter && <p className="mt-2 break-words text-sm font-medium">{b.championName} · {b.spiritFilter}</p>}
            <p className="mt-2 text-xs text-ctp-subtext1">{b.effectivePopulationSource === "tournament" ? "Tournament evidence" : b.effectivePopulationSource === "community" || b.effectivePopulationSource === "simulator" ? "Community evidence" : "Tournament and community evidence"}{b.collectionMode === "owned-only" ? " · Owned cards only" : b.collectionMode === "prioritize" ? " · Owned cards prioritized in recommendation order" : ""}</p>
            <details className="mb-3"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm">Suggestion settings<DisclosureChevron /></summary><ToolsPanel archetypeId={b.archetypeId} archetypeOptions={b.archetypeOptions} onArchetypeChange={b.changeArchetype} deckFormat={b.deckFormat} populationSource={b.effectivePopulationSource} onChangePopulationSource={b.changePopulationSource} collectionMode={b.collectionMode} onCollectionModeChange={b.setCollectionMode} /></details>
            {(!b.championName || !b.spiritFilter) ? <p className="mb-3 text-sm text-ctp-subtext1">Add {!b.championName && !b.spiritFilter ? "Champion and Spirit cards" : !b.championName ? "a Champion card" : "a Spirit card"} to Material to focus suggestions. Use All cards to find them.</p> : b.gateLoading ? <p role="status" className="mb-3 text-sm">Loading suggestions…</p> : <p className="mb-3 text-xs text-ctp-subtext1">Suggestions use your deck’s available elements. Nothing is added until you choose it.</p>}
          </section>}
          <CardBrowser format={b.deckFormat} renderStats={name => cardStats.renderStats(name, b.recommendationsEnabled)} statsControls={cardStats.controls} sourceControl={<select aria-label="Card source" value={b.recommendationsEnabled ? "suggestions" : "all"} onChange={event=>b.setRecommendationsEnabled(event.target.value==="suggestions")} className="min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-xs"><option value="all">All cards</option><option value="suggestions">Suggestions</option></select>} suppressResults={b.recommendationsEnabled && (!b.championName || !b.spiritFilter || b.gateLoading)} query={b.cardInput} onQuery={b.setCardInput} destination={b.addDestination} onDestination={b.setAddDestination} names={b.cardNames} catalog={b.catalogByName} deck={b.editor.deck} onEdit={b.editor.edit} owned={b.collectionLoaded ? b.collectionOwnedByName : undefined} collectionStatus={b.collectionError ?? "Loading collection…"} identityElements={b.identityElements} suggestedNames={b.recommendationsEnabled ? suggestedNames : undefined} evidence={b.recommendationsEnabled ? evidence : undefined} />
  </>;
  return <section aria-label="Deck building workspace" className="mt-3">
    {(!starting || hasCards) && <div style={{top: headerHeight}} className="sticky z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 border-b border-ctp-surface1 bg-ctp-base px-1 py-2">
      <h2 className="text-base font-semibold">Your deck · {total} {total === 1 ? "card" : "cards"}</h2>
      {starting ? <button type="button" disabled={!hasCards} onClick={()=>setStarting(false)} className="min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base disabled:opacity-40">View deck ({total})</button> : <button type="button" onClick={()=>setBrowserOpen(true)} className="min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base">Add cards</button>}
    </div>}
    {starting ? <section aria-label="Find your first cards" className="mt-3">
      {!hasCards && <details className="mb-2"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm text-ctp-blue">Import or open a deck<DisclosureChevron /></summary><div className="flex flex-wrap items-start gap-x-3"><DecklistPaste /><BuilderStartActions /></div></details>}
      {cardBrowser}
    </section> : <section id="workbench-deck" aria-label="Edit deck" className="min-w-0">
      <div className="my-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1"><button type="button" disabled={!b.editor.canUndo} onClick={b.editor.undo} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue disabled:opacity-40">Undo</button><button type="button" disabled={!b.editor.canRedo} onClick={b.editor.redo} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue disabled:opacity-40">Redo</button></div>
        <label className="flex items-center gap-2 text-xs">Layout<select aria-label="Deck layout" value={b.viewMode} onChange={e=>b.setViewMode(e.target.value as "list"|"grid")} className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="grid">Card art</option><option value="list">Compact</option></select></label>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-ctp-subtext1">{EDITOR_SECTIONS.map(({key,title})=><span key={key}>{title} {b.editor.deck[key].reduce((sum,line)=>sum+line.quantity,0)}</span>)}</div>
      <details className="mt-2 rounded-lg border border-ctp-surface1 px-3"><summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm ${b.validation.status==="Illegal" ? "text-ctp-yellow" : "text-ctp-subtext1"}`}>{b.validation.status==="Legal" ? "Construction checks pass" : b.validation.status==="Illegal" ? "Construction issues" : "Draft · construction incomplete"}<DisclosureChevron /></summary><div className="pb-3 text-xs text-ctp-subtext1">{b.validation.reasons.map(reason=><p className="mb-2" key={reason}>{reason}</p>)}<p>Incomplete decks can be saved. These checks do not cover every card-text exception.</p></div></details>
      {!hasCards && <p className="py-8 text-sm text-ctp-subtext1">Your deck is empty. Use Add cards to get started.</p>}
      {cardStats.controls}
      <DeckEditor format={b.deckFormat} renderStats={name => cardStats.renderStats(name, true)} deck={b.editor.deck} catalog={b.catalogByName} onEdit={b.editor.edit} viewMode={b.viewMode} />
    </section>}

    {browserOpen && <EditorDialog count={total} onDismiss={()=>setBrowserOpen(false)}>{cardBrowser}</EditorDialog>}
  </section>;
}
