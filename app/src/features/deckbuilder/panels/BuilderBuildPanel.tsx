import { useMemo, useState } from "react";
import CardBrowser from "../../../components/deck-editor/CardBrowser";
import DeckEditor from "../../../components/deck-editor/DeckEditor";
import DisclosureChevron from "../../../components/DisclosureChevron";
import { EDITOR_SECTIONS } from "../../../lib/deckEditing";
import { BuilderStartActions, DecklistPaste } from "../components/DeckBuilderSetup";
import { useDeckBuilder } from "../useDeckBuilder";
import ToolsPanel from "./BuilderToolsPanel";

export default function BuilderBuildPanel() {
  const b = useDeckBuilder();
  const [surface, setSurface] = useState<"cards" | "deck">("cards");
  const hasCards = EDITOR_SECTIONS.some(({key})=>b.editor.deck[key].length > 0);
  const total = EDITOR_SECTIONS.reduce((sum,{key})=>sum+b.editor.deck[key].reduce((n,line)=>n+line.quantity,0),0);
  const evidence = useMemo(()=>new Map(b.cardCategoryRecommendations.map(item=>[item.card.name, `${item.recommendedQuantity} copies suggested. ${item.tournamentDecks > 0 ? `${Math.round(item.tournamentRate*100)}% of matching tournament decks` : `${Math.round(item.communityRate*100)}% community adoption`}.`])),[b.cardCategoryRecommendations]);
  const suggestedNames = useMemo(()=>[...new Set(b.cardCategoryRecommendations.map(item=>item.card.name))],[b.cardCategoryRecommendations]);
  return <section aria-label="Deck building workspace" className="mt-3">
    {!hasCards && <div className="mb-3 flex flex-wrap items-start gap-x-3"><DecklistPaste /><BuilderStartActions /></div>}
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div role="group" aria-label="Workbench surface" className="flex rounded-lg border border-ctp-surface1 lg:hidden">{(["cards","deck"] as const).map(value=><button key={value} type="button" aria-pressed={surface===value} aria-controls={`workbench-${value}`} onClick={()=>setSurface(value)} className={`min-h-12 rounded-lg px-4 text-sm font-semibold ${surface===value ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>{value==="cards" ? "Cards" : `Deck (${total})`}</button>)}</div>
      <div className="flex flex-wrap items-center gap-1"><button type="button" disabled={!b.editor.canUndo} onClick={b.editor.undo} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue disabled:opacity-40">Undo</button><button type="button" disabled={!b.editor.canRedo} onClick={b.editor.redo} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue disabled:opacity-40">Redo</button></div>
    </div>
    <p role="status" className="text-xs text-ctp-subtext1">{b.editor.notice}</p>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <section id="workbench-cards" aria-label="Find cards" className={`${surface==="cards" ? "" : "hidden"} min-w-0 rounded-xl border border-ctp-surface1 lg:block`}>
        <h2 className="hidden border-b border-ctp-surface1 px-3 py-3 text-sm font-semibold lg:block">Cards</h2>
        <div className="h-[65dvh] overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable]">

          {b.recommendationsEnabled && <>
            <details className="mb-3"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm">Suggestion settings<DisclosureChevron /></summary><ToolsPanel archetypeId={b.archetypeId} archetypeOptions={b.archetypeOptions} onArchetypeChange={b.changeArchetype} deckFormat={b.deckFormat} populationSource={b.effectivePopulationSource} onChangePopulationSource={b.changePopulationSource} collectionMode={b.collectionMode} onCollectionModeChange={b.setCollectionMode} /></details>
            {(!b.championName || !b.spiritFilter) ? <p className="mb-3 text-sm text-ctp-subtext1">Add {!b.championName && !b.spiritFilter ? "Champion and Spirit cards" : !b.championName ? "a Champion card" : "a Spirit card"} to Material to focus suggestions. Use All cards to find them.</p> : b.gateLoading ? <p role="status" className="mb-3 text-sm">Loading suggestions…</p> : <p className="mb-3 text-xs text-ctp-subtext1">Suggestions use your deck’s available elements. Nothing is added until you choose it.</p>}
          </>}
          <CardBrowser sourceControl={<select aria-label="Card source" value={b.recommendationsEnabled ? "suggestions" : "all"} onChange={event=>b.setRecommendationsEnabled(event.target.value==="suggestions")} className="min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-xs"><option value="all">All cards</option><option value="suggestions">Suggestions</option></select>} suppressResults={b.recommendationsEnabled && (!b.championName || !b.spiritFilter || b.gateLoading)} query={b.cardInput} onQuery={b.setCardInput} destination={b.addDestination} onDestination={b.setAddDestination} names={b.cardNames} catalog={b.catalogByName} deck={b.editor.deck} onEdit={b.editor.edit} owned={b.collectionLoaded ? b.collectionOwnedByName : undefined} collectionStatus={b.collectionError ?? "Loading collection…"} identityElements={b.identityElements} suggestedNames={b.recommendationsEnabled ? suggestedNames : undefined} evidence={b.recommendationsEnabled ? evidence : undefined} />
        </div>
      </section>
      <section id="workbench-deck" aria-label="Edit deck" className={`${surface==="deck" ? "" : "hidden"} min-w-0 rounded-xl border border-ctp-surface1 lg:block`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ctp-surface1 px-3 py-2"><h2 className="text-sm font-semibold">Deck · {total} cards</h2><label className="flex items-center gap-2 text-xs">Layout<select aria-label="Deck layout" value={b.viewMode} onChange={e=>b.setViewMode(e.target.value as "list"|"grid")} className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="list">Compact</option><option value="grid">Card art</option></select></label></div>
        <div className="h-[65dvh] overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable]">
          <div className="flex flex-wrap gap-2 text-xs text-ctp-subtext1">{EDITOR_SECTIONS.map(({key,title})=><span key={key}>{title} {b.editor.deck[key].reduce((sum,line)=>sum+line.quantity,0)}</span>)}</div>
          <details className="mt-2 rounded-lg border border-ctp-surface1 px-3"><summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm ${b.validation.status==="Illegal" ? "text-ctp-yellow" : "text-ctp-subtext1"}`}>{b.validation.status==="Legal" ? "Construction checks pass" : b.validation.status==="Illegal" ? "Construction issues" : "Draft · construction incomplete"}<DisclosureChevron /></summary><div className="pb-3 text-xs text-ctp-subtext1">{b.validation.reasons.map(reason=><p className="mb-2" key={reason}>{reason}</p>)}<p>Incomplete decks can be saved. These checks do not cover every card-text exception.</p></div></details>
          {!hasCards && <div className="py-8 text-sm text-ctp-subtext1"><p>Your deck is empty. Add cards from the catalog to get started.</p><button type="button" onClick={()=>setSurface("cards")} className="mt-3 min-h-12 rounded-lg border border-ctp-blue px-4 text-ctp-blue lg:hidden">Find cards</button></div>}
          <DeckEditor deck={b.editor.deck} catalog={b.catalogByName} onEdit={b.editor.edit} viewMode={b.viewMode} />
        </div>
      </section>
    </div>
  </section>;
}
