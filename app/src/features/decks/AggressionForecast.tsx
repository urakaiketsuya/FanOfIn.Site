import type { AggressionForecast as Forecast } from "../../lib/aggressionForecast";

function formatRange(min: number, max: number, suffix = ""): string {
  return min === max ? `${min}${suffix}` : `${min}–${max}${suffix}`;
}

function formatChance(min: number, max: number): string {
  return formatRange(Math.round(min * 100), Math.round(max * 100), "%");
}

export default function AggressionForecast({ forecast }: { forecast: Forecast }) {
  if (
    forecast.fixedDamageCopies === 0 &&
    forecast.variableDamageCopies === 0 &&
    forecast.scalingDamageCopies === 0 &&
    forecast.ambiguousDamageCopies === 0 &&
    forecast.recurringDamagePerTurn === 0
  )
    return null;

  return (
    <div data-component="AggressionForecast" className="mt-4 border-t border-ctp-surface1 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Printed damage forecast</h3>
           <p className="mt-1 max-w-3xl text-xs text-ctp-subtext0">
            Damage from spells and abilities only — combat damage from attacking allies or a wielded weapon isn't included here.
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-xs">
          <thead className="text-ctp-subtext0">
            <tr className="border-b border-ctp-surface1">
              <th className="pb-2 pr-3 font-medium">Cards seen</th>
              <th className="px-3 pb-2 font-medium">Likely range</th>
              <th className="px-3 pb-2 font-medium">Expected</th>
              <th className="px-3 pb-2 font-medium">Chance of 5+</th>
              <th className="pl-3 pb-2 font-medium">Chance of 10+</th>
            </tr>
          </thead>
          <tbody className="text-ctp-subtext1">
            {forecast.points.map((point) => (
              <tr key={point.seen} className="border-b border-ctp-surface0 last:border-0">
                <td className="py-2 pr-3 font-medium text-ctp-text">{point.seen}</td>
                <td className="px-3 py-2 text-ctp-blue">{formatRange(point.low, point.high)}</td>
                <td className="px-3 py-2">{formatRange(point.expectedMin, point.expectedMax)}</td>
                <td className="px-3 py-2">{formatChance(point.chanceAtLeastFiveMin, point.chanceAtLeastFiveMax)}</td>
                <td className="pl-3 py-2">{formatChance(point.chanceAtLeastTenMin, point.chanceAtLeastTenMax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
