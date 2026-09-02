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
    <div className="mt-4 border-t border-ctp-surface1 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Direct damage forecast</h3>
          <p className="mt-1 max-w-3xl text-xs text-ctp-subtext0">
            Printed champion damage available among cards seen. The range is the exact 10th–90th percentile from the shuffled main deck,
            not damage guaranteed to resolve in a match.
          </p>
        </div>
        <span className="text-xs text-ctp-subtext1">
          {forecast.fixedDamageCopies} fixed-damage cop{forecast.fixedDamageCopies === 1 ? "y" : "ies"}
          {forecast.symmetricDamageCopies > 0 && ` (${forecast.symmetricDamageCopies} also hit your own champion)`}
          {forecast.scalingDamageCopies > 0 && (
            <>
              , {forecast.scalingDamageCopies} combo-scaling cop{forecast.scalingDamageCopies === 1 ? "y" : "ies"}
            </>
          )}
          {forecast.ambiguousDamageCopies > 0 && (
            <>
              , {forecast.ambiguousDamageCopies} ambiguous-target cop{forecast.ambiguousDamageCopies === 1 ? "y" : "ies"}
            </>
          )}
        </span>
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

      {forecast.recurringDamagePerTurn > 0 && (
        <p className="mt-2 text-[11px] text-ctp-green">
          Material Deck also deals {forecast.recurringDamagePerTurn} damage to the champion every turn, unconditionally, once its source is in play (e.g. Fabled Ruby
          Fatestone) — not in the table above, since "cards seen" doesn't correspond to turns elapsed. Assumes the card stays in play; doesn't model it being removed.
        </p>
      )}
      {forecast.scalingDamageCopies > 0 && (
        <p className="mt-2 text-[11px] text-ctp-mauve">
          {forecast.scalingDamageCopies} cop{forecast.scalingDamageCopies === 1 ? "y" : "ies"} deal bonus damage scaled by a sacrifice/combo cost (e.g. Burst Asunder off Fractals) —
          folded into the Expected/Chance "Max" side above, sized off how much of that fodder this deck actually runs. Not in the Min side, and not a guarantee: it assumes
          each copy has independent access to all the fodder seen so far, which overstates the total once more than one copy is in play and sharing the same fodder pool.
        </p>
      )}
      {forecast.ambiguousDamageCopies > 0 && (
        <p className="mt-2 text-[11px] text-ctp-blue">
          {forecast.ambiguousDamageCopies} cop{forecast.ambiguousDamageCopies === 1 ? "y deals" : "ies deal"} its printed damage to an ambiguously-targeted "unit" (could hit an
          ally instead of the champion) or as one mode of a "Choose one" card (might not get picked) — folded into the "Max" side above as an optimistic estimate that assumes
          it lands on the champion, never into the guaranteed Min side.
        </p>
      )}
      {forecast.variableDamageCopies > 0 && (
        <p className="mt-2 text-[11px] text-ctp-yellow">
          {forecast.variableDamageCopies} variable-damage cop{forecast.variableDamageCopies === 1 ? "y is" : "ies are"} excluded entirely — its damage scales with an
          unresolved X value, so no number, not even an optimistic one, can be assigned.
        </p>
      )}
      <p className="mt-2 text-[11px] text-ctp-subtext0">
        Conditional printed values produce a lower–upper estimate. Costs, targets, blockers, prevention, and whether a condition is enabled are not modeled.
      </p>
    </div>
  );
}
