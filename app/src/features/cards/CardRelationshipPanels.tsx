import type { Card, CardImpactEntry, TopCardsBySection } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardImpactTable from "../../components/CardImpactTable";
import CardSearchPicker from "../../components/CardSearchPicker";
import TopCardsSections from "../../components/TopCardsSections";
import { InlineState } from "../../components/ui/ContentState";
import Section from "../../components/ui/Section";
import CardComparisonTable from "../compare/CardComparisonTable";

export function CardPlayedWithPanel({ cardName, deckCount, topCards, cardImages }: { cardName: string; deckCount?: number; topCards: TopCardsBySection; cardImages: Map<string, Card> }) {
  const hasCards = topCards.main.length > 0 || topCards.material.length > 0 || topCards.sideboard.length > 0;
  return <Section className="mt-5" heading="compact" title="Often played together" actions={deckCount !== undefined && <span className="text-xs text-ctp-subtext0">{deckCount} decks</span>}>
    {hasCards ? <TopCardsSections topCards={topCards} cardImages={cardImages} layout="grid" /> : <InlineState className="mt-4 text-sm">Not enough decks running {cardName} to show common pairings yet.</InlineState>}
  </Section>;
}

export function CardSynergyPanel({ cardName, cards, totalDecks, cardImages }: { cardName: string; cards: CardImpactEntry[]; totalDecks: number; cardImages: Map<string, Card> }) {
  return <Section className="mt-4" heading="compact" title="Win-rate synergy">
    {cards.length > 0 ? <><p className="mt-1 text-xs text-ctp-subtext0">Across {totalDecks} decks running {cardName}, cards that correlate with a higher win rate when also included. This differs from “Most Used With,” which ranks frequency. <Link to="/methodology#classification" className="text-ctp-blue hover:underline">Learn more</Link></p><CardImpactTable cards={cards} cardImages={cardImages} withLabel="Win rate (with)" withoutLabel="Win rate (without)" /></> : <InlineState className="mt-4 text-sm">No card clears the sample bar for a win-rate synergy with {cardName} yet.</InlineState>}
  </Section>;
}

export function CardComparePanel({ options, input, selected, onInputChange, onAdd, onRemove }: { options: string[]; input: string; selected: string[]; onInputChange: (value: string) => void; onAdd: (name: string) => void; onRemove: (name: string) => void }) {
  return <Section className="mt-4" heading="compact" title="Compare with other cards" description="Add any card to see usage, win rate, and price side by side — a quick way to decide between two options without leaving this page.">
    <CardSearchPicker className="mt-2 max-w-sm" options={options.filter((name) => !selected.includes(name))} value={input} onChange={onInputChange} onSelect={onAdd} placeholder="Search for a card to compare…" ariaLabel="Search for a card to compare" />
    {selected.length > 0 && <div className="mt-3"><CardComparisonTable names={selected} onRemove={onRemove} /></div>}
    {selected.length > 1 && <Link to={`/compare?type=cards&cards=${encodeURIComponent(selected.join(","))}`} className="mt-2 inline-block text-xs text-ctp-blue hover:underline">Open in full Compare tool &rarr;</Link>}
  </Section>;
}
