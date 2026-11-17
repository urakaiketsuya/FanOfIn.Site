import { cardAdoption, type CardAdoptionPeriods, type CardStat } from "@gatcg/shared";
import Section from "../../components/ui/Section";

/** Published, adjacent equal-length populations; never infer zero from a missing card. */
export default function CardAdoptionReport({ card, periods }: {
  card?: Pick<CardStat, "recentDeckCount" | "priorDeckCount">;
  periods?: CardAdoptionPeriods;
}) {
  const result = card && cardAdoption(card, periods);
  return <Section className="mt-4" heading="dense" title="Tournament adoption">
    {result && periods && card ? <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="text-xl tabular-nums">{(result.prior * 100).toFixed(1)}% → {(result.recent * 100).toFixed(1)}%</strong>
        <span className="text-sm tabular-nums" aria-label={`${(result.change * 100).toFixed(1)} percentage points`}>{result.change > 0 ? "+" : ""}{(result.change * 100).toFixed(1)} pp</span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {(["prior", "recent"] as const).map(key => {
          const period = periods[key];
          const lastDate = new Date(Date.parse(period.end) - 86_400_000).toISOString().slice(0, 10);
          const count = key === "prior" ? card.priorDeckCount : card.recentDeckCount;
          return <div key={key} className="min-w-0">
            <div className="flex justify-between gap-2 text-sm"><span>{key === "prior" ? "Previous" : "Recent"}</span><strong className="tabular-nums">{(result[key] * 100).toFixed(1)}%</strong></div>
            <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className="h-full rounded-full bg-ctp-teal" style={{ width: `${result[key] * 100}%` }} /></div>
            <p className="mt-2 text-xs text-ctp-subtext0">{period.start.slice(0, 10)} – {lastDate}</p>
            <p className="mt-1 text-xs text-ctp-subtext0">{count.toLocaleString()} / {period.decks.toLocaleString()} lists</p>
          </div>;
        })}
      </div>
    </> : <p className="text-sm text-ctp-subtext0">Adoption data unavailable.</p>}
  </Section>;
}
