import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Card, CardImpactEntry, CardImpactRole, OmnidexDecklist } from "@gatcg/shared";
import { VisualCardTile, type VisualFieldVisibility } from "../../components/VisualCardTile";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import { useChampionCardImpact } from "../decks/useChampionCardImpact";
import { useCardsByNames } from "../events/useCardsByNames";
import { useComparisonData } from "./useComparisonData";
import type { ComparedDeck } from "./types";
import Panel from "../../components/ui/Panel";
import { InlineState } from "../../components/ui/ContentState";

const ROLE_LABEL: Record<CardImpactRole, string> = { main: "Main", material: "Material", sideboard: "Sideboard", mixed: "Mixed" };
const TUNING_CARD_FIELDS: VisualFieldVisibility = { cost: false, price: false, priceTrend: false, tags: false, simulator: false, community: false };

function shortLabel(label: string): string {
  const at = label.indexOf(" @ ");
  return at === -1 ? label : label.slice(0, at);
}

function EvidenceList({ cards, cardsByName, tone }: { cards: CardImpactEntry[]; cardsByName: Map<string, Card>; tone: "add" | "review" }) {
  return <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
    {cards.map((entry) => {
      const card = cardsByName.get(entry.cardName);
      return <VisualCardTile key={entry.cardName} line={{ card: entry.cardName, quantity: 1 }} card={card} unitPrice={undefined} priceTrend={undefined} simulatorEvidence={undefined} communityEntry={undefined} fields={TUNING_CARD_FIELDS} footer={<div className="mt-1.5 min-w-0">
        <div className="truncate text-sm font-medium text-ctp-text" title={entry.cardName}>{entry.cardName}</div>
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-ctp-surface0 pt-1">
          <span className="text-[10px] text-ctp-subtext0">{ROLE_LABEL[entry.role]} · {entry.deckCountWith} decks</span>
          <span className={`shrink-0 text-xs font-semibold ${tone === "add" ? "text-ctp-blue" : "text-ctp-yellow"}`}>{entry.adjustedLift >= 0 ? "+" : ""}{(entry.adjustedLift * 100).toFixed(1)}pp</span>
        </div>
      </div>} />;
    })}
  </div>;
}

export default function ComparisonSuggestions({ decks, decklists, baselineKey }: { decks: ComparedDeck[]; decklists: Map<string, OmnidexDecklist | null>; baselineKey: string | null }) {
  const { cardsByName: comparisonCards, deckStats } = useComparisonData(decks, decklists);
  const selectedIndex = Math.max(0, decks.findIndex((deck) => deck.key === baselineKey));
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
  const additions = useMemo(() => additionsResult.cards.filter((entry) => entry.adjustedLift > 0 && !cardsByName.get(entry.cardName)?.types.includes("CHAMPION")).slice(0, 4), [additionsResult.cards, cardsByName]);
  const review = useMemo(() => weakestResult.cards.filter((entry) => entry.adjustedLift < 0 && currentNames.has(entry.cardName) && !cardsByName.get(entry.cardName)?.types.includes("CHAMPION")).slice(0, 4), [weakestResult.cards, currentNames, cardsByName]);

  const builderPath = useMemo(() => {
    if (!selectedList) return null;
    const params = deckBuilderParamsFromDecklist(selectedList, comparisonCards);
    if (!params) return null;
    const path = buildDeckBuilderPath(params.championName, params.spiritFilter, params.lockedCards, params.lockedSections);
    return selectedStats?.format === "PANTHEON" ? `${path}${path.includes("?") ? "&" : "?"}format=pantheon` : path;
  }, [selectedList, comparisonCards, selectedStats?.format]);

  const loading = additionsResult.loading || weakestResult.loading;
  const hasEvidence = additions.length > 0 || review.length > 0;

  return <div data-component="ComparisonSuggestions" className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Tuning baseline</p>
      <h2 className="mt-0.5 text-xl font-semibold text-ctp-text">{selectedDeck ? shortLabel(selectedDeck.label) : "Deck unavailable"}</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">Choose a different baseline from the compared decks above to tune another list.</p>
    </div>

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

      {!loading && hasEvidence && <div className="space-y-4">
        <Panel>
          <h2 className="font-semibold text-ctp-text">Evidence-backed additions</h2>
          <p className="mt-1 text-xs leading-5 text-ctp-subtext0">Cards not currently in this list that correlate with stronger results in other {champion} decks.</p>
          {additions.length > 0 ? <EvidenceList cards={additions} cardsByName={cardsByName} tone="add" /> : <InlineState className="mt-3 text-sm">No absent card clears the positive-evidence bar.</InlineState>}
        </Panel>
        <Panel>
          <h2 className="font-semibold text-ctp-text">Cards worth reviewing</h2>
          <p className="mt-1 text-xs leading-5 text-ctp-subtext0">Cards already in this list that correlate with weaker results in other {champion} decks.</p>
          {review.length > 0 ? <EvidenceList cards={review} cardsByName={cardsByName} tone="review" /> : <InlineState className="mt-3 text-sm">None of this deck’s cards appear among the strongest negative signals.</InlineState>}
        </Panel>
      </div>}
    </>}

    {selectedStats?.format !== "PANTHEON" && <p className="text-xs leading-5 text-ctp-overlay1">Tuning evidence describes other decks using the same Champion — it does not prove a change will improve this list. <Link to="/methodology#classification" className="text-ctp-blue hover:underline">Learn more</Link></p>}
  </div>;
}
