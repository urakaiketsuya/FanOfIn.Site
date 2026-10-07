import { useMemo, useState, useTransition } from "react";
import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import Button from "../../components/ui/Button";
import { computeAggressionForecast } from "../../lib/aggressionForecast";
import DisclosureChevron from "../../components/DisclosureChevron";
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
  const sources = forecast.audit.filter((entry) => entry.section === "Main" && (entry.status === "modeled" || entry.status === "partial"));

  return (
    <div data-component="AggressionForecast" className={embedded ? "" : "mt-4 border-t border-ctp-surface1 pt-4"}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Printed direct-damage access</h3>
      <p className="mt-1 text-xs text-ctp-subtext0">Damage access from this deck’s draws and support cards.</p>
      <div className="mt-3 flex flex-wrap gap-3">{sources.map((entry) => {
        const card = cardsByName.get(entry.name);
        const tile = <><CardArtTile card={card} name={entry.name} cornerBadge={`${entry.quantity}×`} /><span className="mt-1 block text-xs font-medium">{entry.name}</span></>;
        return card ? <Link key={entry.name} to={`/cards/${card.slug}`} className="w-20 min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{tile}</Link> : <div key={entry.name} className="w-20">{tile}</div>;
      })}</div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ForecastCheckpointSelector checkpoints={checkpoints} selected={selected.seen} onSelect={setSelectedSeen} />
        <div className="flex gap-2" aria-label="Play order">
          {(["first", "second"] as const).map((order) => <Button key={order} size="sm" variant={playOrder === order ? "primary" : "secondary"} aria-pressed={playOrder === order} onClick={() => startTransition(() => setPlayOrder(order))}>Play {order}</Button>)}
        </div>
      </div>
      {selected.sampleSize && <p className="mt-2 text-xs text-ctp-subtext1">Draw odds estimated from {selected.sampleSize.toLocaleString()} sampled hands.</p>}
      {pending && <p role="status" className="mt-2 text-xs text-ctp-subtext1">Recalculating…</p>}
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
        {forecast.recurringDamagePerTurn > 0 && <span className="font-semibold text-ctp-mauve">+{forecast.recurringDamagePerTurn} potential recurring damage/turn once materialized (separate)</span>}
        {forecast.awakeningBloomComboCopies > 0 && <span>{forecast.awakeningBloomComboCopies} Diao phantasia combo copies</span>}
      </div>
      {forecast.audit.some((entry) => entry.status === "modeled") && <details className="mt-3 rounded-xl border border-ctp-surface1 bg-ctp-surface0/40 text-xs">
        <summary className="list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-ctp-blue min-h-control cursor-pointer px-3 py-3 font-medium text-ctp-text">Where the damage comes from <DisclosureChevron /></summary>
        <div className="space-y-2 border-t border-ctp-surface1 px-3 py-3">{forecast.audit.filter((entry) => entry.status === "modeled").map((entry) => <div key={`${entry.section}-${entry.name}`} className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span className="font-medium text-ctp-text">{entry.quantity}× {entry.name}</span><span className="text-ctp-subtext1">{entry.reason}</span></div>)}</div>
      </details>}
      <details className={`mt-3 overflow-hidden rounded-xl border text-xs ${auditAttention.length > 0 ? "border-ctp-yellow/50 bg-ctp-yellow/5" : "border-ctp-surface1 bg-ctp-surface0/40"}`}>
        <summary className="list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-ctp-blue flex min-h-control cursor-pointer items-center justify-between gap-3 px-3 py-2.5 font-medium text-ctp-text hover:bg-ctp-surface0/60"><span>Damage coverage audit</span><span className={auditAttention.length > 0 ? "text-ctp-yellow" : "text-ctp-green"}>{auditAttention.length > 0 ? `${auditAttention.length} conditional / unmodeled` : "All damage text classified"}</span><DisclosureChevron /></summary>
        <div className="space-y-3 border-t border-ctp-surface1 p-3">{forecast.audit.map((entry) => <div key={`${entry.section}-${entry.name}`} className="min-w-0">
          <p className="font-medium text-ctp-text">{entry.quantity}× {entry.name} · {entry.section}</p>
          <p className={entry.status === "partial" || entry.status === "review" ? "text-ctp-yellow" : "text-ctp-subtext1"}>{entry.classification}: {entry.reason}</p>
        </div>)}</div>
      </details>
      <details className="mt-3 overflow-hidden rounded-xl bg-ctp-surface0/50 text-xs text-ctp-subtext0">
        <summary className="list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-ctp-blue min-h-control cursor-pointer px-3 py-2.5 font-medium hover:bg-ctp-surface0 hover:text-ctp-text focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ctp-blue">View forecast data <DisclosureChevron /></summary>
        <div className="overflow-x-auto px-3 pb-3"><table className="w-full min-w-[32rem] text-left">
          <thead><tr className="border-b border-ctp-surface1"><th className="pb-1 pr-3">Seen</th><th className="px-3 pb-1">Scenario percentiles</th><th className="px-3 pb-1">Expected</th><th className="px-3 pb-1">5+</th><th className="pl-3 pb-1">10+</th></tr></thead>
          <tbody>{forecast.points.map((point) => <tr key={point.seen} className="border-b border-ctp-surface0 last:border-0"><td className="py-1.5 pr-3">{point.seen}{point.sampleSize ? " · estimated" : ""}</td><td className="px-3 py-1.5">p10 {point.low} / p90 {point.high}</td><td className="px-3 py-1.5">{formatRange(point.expectedMin, point.expectedMax)}</td><td className="px-3 py-1.5">{formatChance(point.chanceAtLeastFiveMin, point.chanceAtLeastFiveMax)}</td><td className="py-1.5 pl-3">{formatChance(point.chanceAtLeastTenMin, point.chanceAtLeastTenMax)}</td></tr>)}</tbody>
        </table></div>
      </details>
    </div>
  );
}
