import type { CompositionWinRateStat, KeywordStat } from "@gatcg/shared";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

type KeywordSortMode = "usage" | "adjusted" | "raw";

export function KeywordStatsSection({ rows, loading, sortMode, onSortChange }: { rows: KeywordStat[]; loading: boolean; sortMode: KeywordSortMode; onSortChange: (mode: KeywordSortMode) => void }) {
  return (
    <Section className="mt-10" heading="compact" title="Keywords" description="Ability keyword usage and win rate across every public decklist (main + material, weighted by copies).">
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(["usage", "adjusted", "raw"] as const).map((mode) => <button key={mode} type="button" onClick={() => onSortChange(mode)} aria-pressed={sortMode === mode} className={`rounded-md border px-2 py-1 text-xs ${sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>{mode === "usage" ? "Usage" : mode === "adjusted" ? "Win rate (adjusted)" : "Win rate (raw)"}</button>)}
      </div>
      {loading && <InlineState className="mt-4">Loading…</InlineState>}
      <div className="mt-2 overflow-x-auto"><table className="w-max min-w-full text-sm"><thead><tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase"><th className="py-1 pr-6">Keyword</th><th className="py-1 pr-6">Decks</th><th className="py-1 pr-6">Events</th><th className="py-1 pr-6">Win rate</th><th className="py-1">Adjusted</th></tr></thead><tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">{rows.map((row) => <tr key={row.keyword}><td className="py-1.5 pr-6 whitespace-nowrap text-ctp-text">{row.keyword}</td><td className="py-1.5 pr-6 text-ctp-subtext1">{row.deckCount}</td><td className="py-1.5 pr-6 text-ctp-subtext1">{row.eventCount}</td><td className="py-1.5 pr-6 text-ctp-subtext1">{(row.avgWinRate * 100).toFixed(0)}%</td><td className="py-1.5 text-ctp-subtext1">{(row.adjustedWinRate * 100).toFixed(0)}%</td></tr>)}</tbody></table></div>
    </Section>
  );
}

export function CompositionStatsSection({ rows, types, activeType, bestIndex, loading, onTypeChange }: { rows: CompositionWinRateStat[]; types: string[]; activeType: string | null; bestIndex: number; loading: boolean; onTypeChange: (type: string) => void }) {
  return (
    <Section className="mt-10" heading="compact" title="Deck Composition" description="Does running more of a card type change your odds? Every public main deck (weighted by copies), bucketed by what share of it one type makes up, with the average win rate in each bucket.">
      {types.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span className="text-ctp-subtext0">Type:</span>{types.map((type) => <button key={type} type="button" onClick={() => onTypeChange(type)} aria-pressed={activeType === type} className={`rounded-md border px-2 py-1 text-xs ${activeType === type ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>{type}</button>)}</div>}
      {loading && <InlineState className="mt-4">Loading…</InlineState>}
      <div className="mt-2 overflow-x-auto"><table className="w-max min-w-full text-sm"><thead><tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase"><th className="py-1 pr-6">Share of main deck</th><th className="py-1 pr-6">Decks</th><th className="py-1 pr-6">Win rate</th><th className="py-1">Adjusted</th></tr></thead><tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">{rows.map((row, index) => <tr key={row.bucket}><td className="py-1.5 pr-6 whitespace-nowrap text-ctp-text">{row.bucket}</td><td className="py-1.5 pr-6 text-ctp-subtext1">{row.deckCount}</td><td className="py-1.5 pr-6 text-ctp-subtext1">{(row.avgWinRate * 100).toFixed(0)}%</td><td className={`py-1.5 font-semibold ${index === bestIndex ? "text-ctp-green" : "text-ctp-subtext1"}`}>{(row.adjustedWinRate * 100).toFixed(0)}%</td></tr>)}</tbody></table></div>
    </Section>
  );
}
