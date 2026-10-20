import { useMemo, useState, useTransition } from "react";
import type { Card } from "@gatcg/shared";
import AssociatedCards from "../../components/AssociatedCards";
import Button from "../../components/ui/Button";
import { computeAggressionForecast } from "../../lib/aggressionForecast";
import type { AggressionForecast as Forecast } from "../../lib/aggressionForecast";
import { ForecastChart, ForecastCheckpointSelector, ForecastHeadline, ForecastMetricBar } from "../../components/ui/ForecastVisual";

function formatRange(min: number, max: number, suffix = ""): string {
  return min === max ? `${min}${suffix}` : `${min}–${max}${suffix}`;
}

function formatChance(min: number, max: number): string {
  return formatRange(Math.round(min * 100), Math.round(max * 100), "%");
}

export default function AggressionForecast({ forecast: initialForecast, mainLines, materialLines, cardsByName, embedded = false, seen, onSeenChange }: {
  forecast: Forecast;
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  cardsByName: Map<string, Card>;
  embedded?: boolean; seen?: number; onSeenChange?: (seen: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [playOrder, setPlayOrder] = useState<"first" | "second">("first");
  const forecast = useMemo(() => playOrder === "first" ? initialForecast : computeAggressionForecast(mainLines, cardsByName, materialLines, playOrder), [playOrder, mainLines, cardsByName, materialLines, initialForecast]);
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
  const damageCopies = forecast.detectedDamageCopies;
  const sources = forecast.audit.filter((entry) => entry.status === "modeled" || entry.status === "partial");
  if (sources.length === 0 && auditAttention.length > 0) return <section data-component="AggressionForecast" className="space-y-2">
    <h3 className="text-sm font-semibold">Direct-damage estimate unavailable</h3>
    {auditAttention.map(entry => <p key={`${entry.section}-${entry.name}`} className="text-xs text-ctp-yellow">{entry.name} · {entry.classification}</p>)}
    <AssociatedCards lines={auditAttention.map(entry => ({ name: entry.name, quantity: entry.quantity, detail: "Not modeled" }))} cardsByName={cardsByName} />
  </section>;

  return (
    <div data-component="AggressionForecast" className={embedded ? "" : "mt-4 border-t border-ctp-surface1 pt-4"}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Printed direct-damage access</h3>
      <div className="mt-4"><ForecastHeadline label={`Estimated printed damage available · ${selected.seen} cards seen`} value={formatRange(selected.expectedMin, selected.expectedMax)} /></div>
      <p className="my-3 text-xs text-ctp-subtext1">Modeled sources · Main and Material</p>
      <AssociatedCards lines={sources.map(entry => ({ name: entry.name, quantity: entry.quantity, detail: entry.section }))} cardsByName={cardsByName} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ForecastCheckpointSelector checkpoints={checkpoints} selected={selected.seen} onSelect={setSelectedSeen} />
        <div className="flex gap-2" aria-label="Play order">
          {(["first", "second"] as const).map((order) => <Button key={order} size="sm" variant={playOrder === order ? "primary" : "secondary"} aria-pressed={playOrder === order} onClick={() => startTransition(() => setPlayOrder(order))}>Play {order}</Button>)}
        </div>
      </div>
      {pending && <p role="status" className="mt-2 text-xs text-ctp-subtext1">Recalculating…</p>}
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
        {forecast.recurringDamagePerTurn > 0 && <span className="font-semibold text-ctp-mauve">+{forecast.recurringDamagePerTurn} potential recurring damage/turn once materialized (separate)</span>}
        {forecast.awakeningBloomComboCopies > 0 && <span>{forecast.awakeningBloomComboCopies} Diao phantasia combo copies</span>}
      </div>
      {auditAttention.length > 0 && <div className="mt-3 space-y-1 text-xs text-ctp-yellow" aria-label="Damage coverage issues">
        {auditAttention.map(entry => <p key={`${entry.section}-${entry.name}`}>{entry.name} · {entry.section}: {entry.classification} — {entry.status === "partial" ? "partly modeled" : "not modeled"}</p>)}
      </div>}
    </div>
  );
}
