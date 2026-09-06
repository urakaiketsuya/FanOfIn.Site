import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, CardImpactEntry, CardImpactRole, OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import ElementIcon from "../../components/ElementIcon";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import { useChampionCardImpact } from "../decks/useChampionCardImpact";
import { useCardsByNames } from "../events/useCardsByNames";
import { useComparisonData } from "./useComparisonData";
import type { ComparedDeck } from "./types";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

const ROLE_LABEL: Record<CardImpactRole, string> = { main: "Main", material: "Material", sideboard: "Sideboard", mixed: "Mixed" };

function shortLabel(label: string): string {
  const at = label.indexOf(" @ ");
  return at === -1 ? label : label.slice(0, at);
}

function EvidenceList({ cards, cardsByName, tone }: { cards: CardImpactEntry[]; cardsByName: Map<string, Card>; tone: "add" | "review" }) {
  return <ul className="mt-3 space-y-2">
    {cards.map((entry) => {
      const card = cardsByName.get(entry.cardName);
      return <li key={entry.cardName} className="rounded-lg border border-ctp-surface0 bg-ctp-base/40 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {card && card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
          {card ? <CardHoverPreview image={card.editions[0]?.image} alt={entry.cardName}><Link to={`/cards/${card.slug}`} className="font-medium text-ctp-text hover:text-ctp-blue">{entry.cardName}</Link></CardHoverPreview> : <span className="font-medium text-ctp-text">{entry.cardName}</span>}
          <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">{ROLE_LABEL[entry.role]}</span>
          <span className={`ml-auto text-xs font-semibold ${tone === "add" ? "text-ctp-blue" : "text-ctp-yellow"}`}>{entry.adjustedLift >= 0 ? "+" : ""}{(entry.adjustedLift * 100).toFixed(1)}pp</span>
        </div>
        <p className="mt-1 text-[11px] text-ctp-subtext0">{entry.deckCountWith} decks with · {entry.deckCountWithout} without</p>
      </li>;
    })}
  </ul>;
}

export default function ComparisonSuggestions({ decks, decklists }: { decks: ComparedDeck[]; decklists: Map<string, OmnidexDecklist | null> }) {
  const { cardsByName: comparisonCards, deckStats } = useComparisonData(decks, decklists);
  const [selectedKey, setSelectedKey] = useState(decks[0]?.key ?? "");

  useEffect(() => {
    if (!decks.some((deck) => deck.key === selectedKey)) setSelectedKey(decks[0]?.key ?? "");
  }, [decks, selectedKey]);

  const selectedIndex = Math.max(0, decks.findIndex((deck) => deck.key === selectedKey));
  const selectedDeck = decks[selectedIndex];
  const selectedList = selectedDeck ? decklists.get(selectedDeck.key) : null;
  const selectedStats = deckStats[selectedIndex];
  const champion = selectedStats?.championName?.split(",")[0].trim() ?? null;
  const currentNames = useMemo(() => selectedList ? new Set([...selectedList.main, ...selectedList.material, ...selectedList.sideboard].map((line) => line.card)) : new Set<string>(), [selectedList]);
  const noExclusions = useMemo(() => new Set<string>(), []);
  const identityElements = useMemo(() => selectedStats?.elements.filter((element) => element !== "NORM") ?? [], [selectedStats]);

  const additionsResult = useChampionCardImpact(champion, identityElements, currentNames, "best");
  const weakestResult = useChampionCardImpact(champion, identityElements, noExclusions, "worst");
  const evidenceCards = useCardsByNames(useMemo(() => [...additionsResult.cards, ...weakestResult.cards].map((entry) => entry.cardName), [additionsResult.cards, weakestResult.cards]));
  const cardsByName = useMemo(() => new Map([...comparisonCards, ...evidenceCards]), [comparisonCards, evidenceCards]);
  const additions = useMemo(() => additionsResult.cards.filter((entry) => entry.adjustedLift > 0 && !cardsByName.get(entry.cardName)?.types.includes("CHAMPION")).slice(0, 5), [additionsResult.cards, cardsByName]);
  const review = useMemo(() => weakestResult.cards.filter((entry) => entry.adjustedLift < 0 && currentNames.has(entry.cardName) && !cardsByName.get(entry.cardName)?.types.includes("CHAMPION")).slice(0, 5), [weakestResult.cards, currentNames, cardsByName]);

  const builderPath = useMemo(() => {
    if (!selectedList) return null;
    const params = deckBuilderParamsFromDecklist(selectedList, comparisonCards);
    if (!params) return null;
    const path = buildDeckBuilderPath(params.championName, params.spiritFilter, params.lockedCards, params.lockedSections);
    return selectedStats?.format === "PANTHEON" ? `${path}${path.includes("?") ? "&" : "?"}format=pantheon` : path;
  }, [selectedList, comparisonCards, selectedStats?.format]);

  const loading = additionsResult.loading || weakestResult.loading;
  const hasEvidence = additions.length > 0 || review.length > 0;

  return <div className="space-y-6">
    <Section heading="dense" title="Choose a deck to tune">
      <div className="mt-2 flex flex-wrap gap-1.5">
        {decks.map((deck) => <button key={deck.key} type="button" onClick={() => setSelectedKey(deck.key)} title={deck.label} className={`max-w-64 truncate rounded-full border px-2.5 py-1 text-xs ${deck.key === selectedDeck?.key ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>{shortLabel(deck.label)}</button>)}
      </div>
    </Section>

    {!selectedList && <p className="rounded-xl border border-ctp-surface1 p-4 text-sm text-ctp-subtext1">This decklist is unavailable, so it can’t be tuned.</p>}

    {selectedList && selectedStats?.format === "PANTHEON" && <section className="rounded-xl border border-ctp-mauve/40 bg-ctp-mauve/10 p-4">
      <h2 className="font-semibold text-ctp-text">Pantheon tuning belongs in the guided builder</h2>
      <p className="mt-1 text-sm leading-6 text-ctp-subtext1">Standard tournament card-impact signals are intentionally withheld for this list. Use format-separated community adoption, singleton legality, and synergy readiness instead.</p>
      {builderPath && <Link to={builderPath} className="mt-3 inline-flex rounded-md border border-ctp-blue px-2.5 py-1.5 text-xs font-medium text-ctp-blue hover:bg-ctp-surface0">Open Pantheon builder →</Link>}
    </section>}

    {selectedList && selectedStats?.format !== "PANTHEON" && <>
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ctp-text">{shortLabel(selectedDeck.label)}</h2>
            <p className="mt-1 text-xs text-ctp-subtext0">{champion ? `${champion} evidence across ${Math.max(additionsResult.totalDecks, weakestResult.totalDecks)} tournament decks` : "Champion could not be resolved"}</p>
          </div>
          {builderPath && <Link to={builderPath} className="rounded-md border border-ctp-blue px-2.5 py-1.5 text-xs font-medium text-ctp-blue hover:bg-ctp-surface0">Tune in Guided Deck Builder →</Link>}
        </div>
      </Panel>

      {loading && <InlineState className="text-sm">Loading tuning evidence…</InlineState>}

      {!loading && !hasEvidence && <section className="rounded-xl border border-ctp-surface1 p-4">
        <h2 className="font-semibold text-ctp-text">No evidence-backed changes yet</h2>
        <p className="mt-1 text-sm leading-6 text-ctp-subtext1">This Champion does not currently have enough with-versus-without samples for a reliable card recommendation. The deck remains available in the Guided Deck Builder for composition, synergy-readiness, and legality analysis.</p>
      </section>}

      {!loading && hasEvidence && <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-semibold text-ctp-text">Evidence-backed additions</h2>
          <p className="mt-1 text-xs leading-5 text-ctp-subtext0">Cards not currently in this list that correlate with stronger results in other {champion} decks.</p>
          {additions.length > 0 ? <EvidenceList cards={additions} cardsByName={cardsByName} tone="add" /> : <InlineState className="mt-3 text-sm">No absent card clears the positive-evidence bar.</InlineState>}
        </Panel>
        <Panel>
          <h2 className="font-semibold text-ctp-text">Cards worth reviewing</h2>
          <p className="mt-1 text-xs leading-5 text-ctp-subtext0">Cards already in this list that correlate with weaker results in other {champion} decks. This is a review signal, not an automatic cut.</p>
          {review.length > 0 ? <EvidenceList cards={review} cardsByName={cardsByName} tone="review" /> : <InlineState className="mt-3 text-sm">None of this deck’s cards appear among the strongest negative signals.</InlineState>}
        </Panel>
      </div>}
    </>}

    {selectedStats?.format !== "PANTHEON" && <p className="text-xs leading-5 text-ctp-overlay1">Tuning evidence describes other decks using the same Champion — it does not prove a change will improve this list. <Link to="/methodology#classification" className="text-ctp-blue hover:underline">Learn more</Link></p>}
  </div>;
}
