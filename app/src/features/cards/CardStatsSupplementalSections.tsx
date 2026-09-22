import type { CompositionWinRateStat, KeywordStat } from "@gatcg/shared";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

type KeywordSortMode = "usage" | "adjusted" | "raw";

export function KeywordStatsSection({ rows, loading, sortMode, onSortChange }: { rows: KeywordStat[]; loading: boolean; sortMode: KeywordSortMode; onSortChange: (mode: KeywordSortMode) => void }) {
  return (
    <Section className="mt-10" heading="compact" title="Keywords" collapsible defaultOpen={false}>
      <select value={sortMode} onChange={(event) => onSortChange(event.target.value as KeywordSortMode)} aria-label="Sort keywords" className="mb-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text">
        <option value="usage">Most used</option>
        <option value="adjusted">Adjusted win rate</option>
        <option value="raw">Raw win rate</option>
      </select>
      {loading && <InlineState>Loading…</InlineState>}
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.keyword} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
            <div className="font-medium text-ctp-text">{row.keyword}</div>
            <div className="mt-1 text-sm text-ctp-subtext1">{row.deckCount.toLocaleString()} decks · {(row.adjustedWinRate * 100).toFixed(0)}% adjusted win rate</div>
            <details className="mt-2 text-xs text-ctp-subtext0"><summary className="w-fit cursor-pointer hover:text-ctp-blue">More statistics</summary><div className="mt-1">{row.eventCount.toLocaleString()} events · {(row.avgWinRate * 100).toFixed(0)}% raw win rate</div></details>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function CompositionStatsSection({ rows, types, activeType, bestIndex, loading, onTypeChange }: { rows: CompositionWinRateStat[]; types: string[]; activeType: string | null; bestIndex: number; loading: boolean; onTypeChange: (type: string) => void }) {
  return (
    <Section className="mt-6" heading="compact" title="Deck Composition" collapsible defaultOpen={false}>
      {types.length > 0 && <select value={activeType ?? ""} onChange={(event) => onTypeChange(event.target.value)} aria-label="Composition card type" className="mb-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text">{types.map((type) => <option key={type} value={type}>{type}</option>)}</select>}
      {loading && <InlineState>Loading…</InlineState>}
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row, index) => (
          <div key={row.bucket} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
            <div className="font-medium text-ctp-text">{row.bucket} of main deck</div>
            <div className={`mt-1 text-sm ${index === bestIndex ? "text-ctp-green" : "text-ctp-subtext1"}`}>{(row.adjustedWinRate * 100).toFixed(0)}% adjusted win rate</div>
            <details className="mt-2 text-xs text-ctp-subtext0"><summary className="w-fit cursor-pointer hover:text-ctp-blue">More statistics</summary><div className="mt-1">{row.deckCount.toLocaleString()} decks · {(row.avgWinRate * 100).toFixed(0)}% raw win rate</div></details>
          </div>
        ))}
      </div>
    </Section>
  );
}
