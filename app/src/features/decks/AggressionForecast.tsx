import { useState } from "react";
import type { AggressionForecast as Forecast } from "../../lib/aggressionForecast";
import { ForecastChart, ForecastCheckpointSelector, ForecastHeadline, ForecastMetricBar } from "../../components/ui/ForecastVisual";

const CHECKPOINT_LABELS = ["Opening", "Early", "Mid", "Late"] as const;

function formatRange(min: number, max: number, suffix = ""): string {
  return min === max ? `${min}${suffix}` : `${min}–${max}${suffix}`;
}

function formatChance(min: number, max: number): string {
  return formatRange(Math.round(min * 100), Math.round(max * 100), "%");
}

export default function AggressionForecast({ forecast, embedded = false, seen, onSeenChange }: { forecast: Forecast; embedded?: boolean; seen?: number; onSeenChange?: (seen: number) => void }) {
  const hasDamage = !(
    forecast.fixedDamageCopies === 0 &&
    forecast.variableDamageCopies === 0 &&
    forecast.scalingDamageCopies === 0 &&
    forecast.ambiguousDamageCopies === 0 &&
    forecast.recurringDamagePerTurn === 0
  );
  const [localSelectedSeen, setLocalSelectedSeen] = useState(forecast.points[1]?.seen ?? forecast.points[0]?.seen ?? 0);
  const selectedSeen = seen ?? localSelectedSeen;
  const setSelectedSeen = onSeenChange ?? setLocalSelectedSeen;
  if (!hasDamage) return null;
  const selected = forecast.points.find((point) => point.seen === selectedSeen) ?? forecast.points[0];
  if (!selected) return null;
  const checkpoints = forecast.points.map((point, index) => ({ label: `${CHECKPOINT_LABELS[index] ?? "Seen"} (${point.seen})`, seen: point.seen }));
  const expectedValues = forecast.points.map((point) => (point.expectedMin + point.expectedMax) / 2);
  const fiveChance = (selected.chanceAtLeastFiveMin + selected.chanceAtLeastFiveMax) / 2;
  const tenChance = (selected.chanceAtLeastTenMin + selected.chanceAtLeastTenMax) / 2;
  const damageCopies = forecast.fixedDamageCopies + forecast.variableDamageCopies + forecast.scalingDamageCopies + forecast.ambiguousDamageCopies;

  return (
    <div data-component="AggressionForecast" className={embedded ? "" : "mt-4 border-t border-ctp-surface1 pt-4"}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Damage Forecast</h3>
      <p className="mt-1 text-xs text-ctp-subtext0">This is how much damage you can expect to do based on cards drawn.</p>
      <div className="mt-3"><ForecastCheckpointSelector checkpoints={checkpoints} selected={selected.seen} onSelect={setSelectedSeen} /></div>
      <div className="mt-4"><ForecastHeadline label={`Expected damage · ${selected.seen} cards seen`} value={formatRange(selected.expectedMin, selected.expectedMax)} detail={`Likely range ${formatRange(selected.low, selected.high)} damage`} /></div>
      <div className="mt-3">
        <ForecastChart values={expectedValues} low={forecast.points.map((point) => point.low)} high={forecast.points.map((point) => point.high)} selectedIndex={forecast.points.indexOf(selected)} />
        <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">{forecast.points.map((point) => <span key={point.seen}>{point.seen} seen</span>)}</div>
      </div>
      <div className="mt-4 space-y-2">
        <ForecastMetricBar label="5+ damage" value={fiveChance} displayValue={formatChance(selected.chanceAtLeastFiveMin, selected.chanceAtLeastFiveMax)} />
        <ForecastMetricBar label="10+ damage" value={tenChance} displayValue={formatChance(selected.chanceAtLeastTenMin, selected.chanceAtLeastTenMax)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ctp-subtext0">
        <span>{damageCopies} detected damage {damageCopies === 1 ? "copy" : "copies"}</span>
        {forecast.recurringDamagePerTurn > 0 && <span>{forecast.recurringDamagePerTurn} recurring damage/turn</span>}
      </div>
      <details className="mt-3 overflow-hidden rounded-xl bg-ctp-surface0/50 text-xs text-ctp-subtext0">
        <summary className="min-h-10 cursor-pointer px-3 py-2.5 font-medium hover:bg-ctp-surface0 hover:text-ctp-text focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ctp-blue">View exact forecast data</summary>
        <div className="overflow-x-auto px-3 pb-3"><table className="w-full min-w-[32rem] text-left">
          <thead><tr className="border-b border-ctp-surface1"><th className="pb-1 pr-3">Seen</th><th className="px-3 pb-1">Likely</th><th className="px-3 pb-1">Expected</th><th className="px-3 pb-1">5+</th><th className="pl-3 pb-1">10+</th></tr></thead>
          <tbody>{forecast.points.map((point) => <tr key={point.seen} className="border-b border-ctp-surface0 last:border-0"><td className="py-1.5 pr-3">{point.seen}</td><td className="px-3 py-1.5">{formatRange(point.low, point.high)}</td><td className="px-3 py-1.5">{formatRange(point.expectedMin, point.expectedMax)}</td><td className="px-3 py-1.5">{formatChance(point.chanceAtLeastFiveMin, point.chanceAtLeastFiveMax)}</td><td className="py-1.5 pl-3">{formatChance(point.chanceAtLeastTenMin, point.chanceAtLeastTenMax)}</td></tr>)}</tbody>
        </table></div>
      </details>
    </div>
  );
}
