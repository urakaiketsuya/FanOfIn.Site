import { useState } from "react";
import type { AggressionForecast as Forecast } from "../../lib/aggressionForecast";
import { ForecastChart, ForecastCheckpointSelector, ForecastHeadline, ForecastMetricBar } from "../../components/ui/ForecastVisual";

function formatRange(min: number, max: number, suffix = ""): string {
  return min === max ? `${min}${suffix}` : `${min}–${max}${suffix}`;
}

function formatChance(min: number, max: number): string {
  return formatRange(Math.round(min * 100), Math.round(max * 100), "%");
}

export default function AggressionForecast({ forecast, embedded = false, seen, onSeenChange }: { forecast: Forecast; embedded?: boolean; seen?: number; onSeenChange?: (seen: number) => void }) {
  const auditAttention = forecast.audit.filter((entry) => entry.status === "review" || entry.status === "partial");
  const hasDamage = !(
    forecast.fixedDamageCopies === 0 &&
    forecast.variableDamageCopies === 0 &&
    forecast.scalingDamageCopies === 0 &&
    forecast.ambiguousDamageCopies === 0 &&
    forecast.awakeningBloomComboCopies === 0 &&
    forecast.recurringDamagePerTurn === 0 &&
    auditAttention.length === 0
  );
  const [localSelectedSeen, setLocalSelectedSeen] = useState(forecast.points[1]?.seen ?? forecast.points[0]?.seen ?? 0);
  const [playOrder, setPlayOrder] = useState<"first" | "second">("first");
  const selectedSeen = seen ?? localSelectedSeen;
  const setSelectedSeen = onSeenChange ?? setLocalSelectedSeen;
  if (!hasDamage) return null;
  const selected = forecast.points.find((point) => point.seen === selectedSeen) ?? forecast.points[0];
  if (!selected) return null;
  // Seven is the site's disclosed default starting hand. Going first sees 7 on T1 and one card
  // per personal turn thereafter; going second sees one additional card at the same turn.
  const turnForSeen = (cardsSeen: number) => Math.max(1, cardsSeen - (playOrder === "first" ? 6 : 7));
  const checkpoints = forecast.points.map((point) => ({ label: point.seen === 7 ? "Opening · 7 seen" : `T${turnForSeen(point.seen)} · ${point.seen} seen`, seen: point.seen }));
  const expectedValues = forecast.points.map((point) => (point.expectedMin + point.expectedMax) / 2);
  const fiveChance = (selected.chanceAtLeastFiveMin + selected.chanceAtLeastFiveMax) / 2;
  const tenChance = (selected.chanceAtLeastTenMin + selected.chanceAtLeastTenMax) / 2;
  const damageCopies = forecast.fixedDamageCopies + forecast.variableDamageCopies + forecast.scalingDamageCopies + forecast.ambiguousDamageCopies + forecast.awakeningBloomComboCopies;

  return (
    <div data-component="AggressionForecast" className={embedded ? "" : "mt-4 border-t border-ctp-surface1 pt-4"}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Printed direct-damage access</h3>
      <p className="mt-1 text-xs text-ctp-subtext0">Damage printed on cards you are expected to have seen—not damage guaranteed to resolve.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ForecastCheckpointSelector checkpoints={checkpoints} selected={selected.seen} onSelect={setSelectedSeen} />
        <div className="inline-flex rounded-full border border-ctp-surface1 bg-ctp-mantle p-0.5" aria-label="Play order">
          {(["first", "second"] as const).map((order) => <button key={order} type="button" aria-pressed={playOrder === order} onClick={() => setPlayOrder(order)} className={`min-h-10 rounded-full px-3 text-xs font-medium ${playOrder === order ? "bg-ctp-mauve text-ctp-crust" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>Play {order}</button>)}
        </div>
      </div>
      <div className="mt-4"><ForecastHeadline label={`Expected printed damage available · turn ${turnForSeen(selected.seen)}`} value={formatRange(selected.expectedMin, selected.expectedMax)} detail={`Median ${formatRange(selected.medianMin, selected.medianMax)} · conservative p10 ${selected.low} · optimistic p90 ${selected.high}`} /></div>
      <div className="mt-3">
        <ForecastChart values={expectedValues} low={forecast.points.map((point) => point.low)} high={forecast.points.map((point) => point.high)} selectedIndex={forecast.points.indexOf(selected)} />
        <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">{forecast.points.map((point) => <span key={point.seen}>{point.seen} seen</span>)}</div>
      </div>
      <div className="mt-4 space-y-2">
        <ForecastMetricBar label="Chance to access 5+ printed damage" value={fiveChance} displayValue={formatChance(selected.chanceAtLeastFiveMin, selected.chanceAtLeastFiveMax)} />
        <ForecastMetricBar label="Chance to access 10+ printed damage" value={tenChance} displayValue={formatChance(selected.chanceAtLeastTenMin, selected.chanceAtLeastTenMax)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ctp-subtext0">
        <span>{damageCopies} detected damage {damageCopies === 1 ? "copy" : "copies"}</span>
        {forecast.recurringDamagePerTurn > 0 && <span className="font-semibold text-ctp-mauve">+{forecast.recurringDamagePerTurn} recurring printed damage/turn (not included above)</span>}
        {forecast.awakeningBloomComboCopies > 0 && <span>{forecast.awakeningBloomComboCopies} Diao phantasia combo copies</span>}
      </div>
      {forecast.audit.some((entry) => entry.status === "modeled") && <details className="mt-3 rounded-xl border border-ctp-surface1 bg-ctp-surface0/40 text-xs">
        <summary className="min-h-11 cursor-pointer px-3 py-3 font-medium text-ctp-text">Where the damage comes from</summary>
        <div className="space-y-2 border-t border-ctp-surface1 px-3 py-3">{forecast.audit.filter((entry) => entry.status === "modeled").map((entry) => <div key={`${entry.section}-${entry.name}`} className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span className="font-medium text-ctp-text">{entry.quantity}× {entry.name}</span><span className="text-ctp-subtext1">{entry.reason}</span></div>)}</div>
      </details>}
      <details className={`mt-3 overflow-hidden rounded-xl border text-xs ${auditAttention.length > 0 ? "border-ctp-yellow/50 bg-ctp-yellow/5" : "border-ctp-surface1 bg-ctp-surface0/40"}`}>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2.5 font-medium text-ctp-text hover:bg-ctp-surface0/60"><span>Damage coverage audit</span><span className={auditAttention.length > 0 ? "text-ctp-yellow" : "text-ctp-green"}>{auditAttention.length > 0 ? `${auditAttention.length} need review` : "All damage text classified"}</span></summary>
        <div className="border-t border-ctp-surface1 px-3 pb-3"><p className="py-3 text-ctp-subtext1">Every Main and Material card is classified so likely parser gaps are visible rather than silently omitted.</p><div className="overflow-x-auto"><table className="w-full min-w-[38rem] text-left"><thead><tr className="border-b border-ctp-surface1 text-ctp-subtext0"><th className="pb-2 pr-3">Card</th><th className="px-3 pb-2">Section</th><th className="px-3 pb-2">Coverage</th><th className="pl-3 pb-2">Reason</th></tr></thead><tbody>{forecast.audit.map((entry) => <tr key={`${entry.section}-${entry.name}`} className="border-b border-ctp-surface0 align-top last:border-0"><td className="py-2 pr-3 font-medium text-ctp-text">{entry.quantity}× {entry.name}</td><td className="px-3 py-2 text-ctp-subtext1">{entry.section}</td><td className={`px-3 py-2 font-medium ${entry.status === "review" ? "text-ctp-red" : entry.status === "partial" ? "text-ctp-yellow" : entry.status === "modeled" ? "text-ctp-green" : "text-ctp-subtext0"}`}>{entry.classification}</td><td className="py-2 pl-3 text-ctp-subtext1">{entry.reason}</td></tr>)}</tbody></table></div></div>
      </details>
      <details className="mt-3 overflow-hidden rounded-xl bg-ctp-surface0/50 text-xs text-ctp-subtext0">
        <summary className="min-h-10 cursor-pointer px-3 py-2.5 font-medium hover:bg-ctp-surface0 hover:text-ctp-text focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ctp-blue">View exact forecast data</summary>
        <div className="overflow-x-auto px-3 pb-3"><table className="w-full min-w-[32rem] text-left">
          <thead><tr className="border-b border-ctp-surface1"><th className="pb-1 pr-3">Seen</th><th className="px-3 pb-1">Scenario percentiles</th><th className="px-3 pb-1">Expected</th><th className="px-3 pb-1">5+</th><th className="pl-3 pb-1">10+</th></tr></thead>
          <tbody>{forecast.points.map((point) => <tr key={point.seen} className="border-b border-ctp-surface0 last:border-0"><td className="py-1.5 pr-3">{point.seen}</td><td className="px-3 py-1.5">p10 {point.low} / p90 {point.high}</td><td className="px-3 py-1.5">{formatRange(point.expectedMin, point.expectedMax)}</td><td className="px-3 py-1.5">{formatChance(point.chanceAtLeastFiveMin, point.chanceAtLeastFiveMax)}</td><td className="py-1.5 pl-3">{formatChance(point.chanceAtLeastTenMin, point.chanceAtLeastTenMax)}</td></tr>)}</tbody>
        </table></div>
      </details>
    </div>
  );
}
