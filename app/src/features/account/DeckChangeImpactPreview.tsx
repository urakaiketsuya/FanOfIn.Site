import { useMemo } from "react";
import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { VisualCardTile, type VisualFieldVisibility } from "../../components/VisualCardTile";
import Panel from "../../components/ui/Panel";
import { applyDeckQuantityChanges, chanceAtLeastOne, type DeckQuantityChange } from "../../lib/deckChangePreview";
import { computeAggressionForecast } from "../../lib/aggressionForecast";
import { computeDeckIdentity, computeMemoryCostCurve } from "../../lib/deckIdentity";
import { sideboardPointCost, validateDeck } from "../deckbuilder/validateDeck";
import DeckSectionBalance from "./DeckSectionBalance";

const CARD_FIELDS: VisualFieldVisibility = { cost: true, price: false, priceTrend: false, tags: false, simulator: false, community: false };

function totals(decklist: OmnidexDecklist) {
  return {
    main: decklist.main.reduce((sum, line) => sum + line.quantity, 0),
    material: decklist.material.reduce((sum, line) => sum + line.quantity, 0),
    sideboard: decklist.sideboard.reduce((sum, line) => sum + line.quantity, 0),
  };
}

function sideboardPoints(decklist: OmnidexDecklist, cardsByName: Map<string, Card>): number {
  return decklist.sideboard.reduce((sum, line) => sum + line.quantity * sideboardPointCost(cardsByName.get(line.card)), 0);
}

function named(decklist: OmnidexDecklist, section: "main" | "material") {
  return decklist[section].map((line) => ({ name: line.card, quantity: line.quantity }));
}

function expectedAtTen(decklist: OmnidexDecklist, cardsByName: Map<string, Card>): string {
  const forecast = computeAggressionForecast(named(decklist, "main"), cardsByName, named(decklist, "material"));
  const hasDamage = forecast.fixedDamageCopies > 0 || forecast.variableDamageCopies > 0 || forecast.scalingDamageCopies > 0
    || forecast.ambiguousDamageCopies > 0 || forecast.recurringDamagePerTurn > 0;
  if (!hasDamage) return "—";
  const point = forecast.points.find((candidate) => candidate.seen === 10);
  if (!point) return "—";
  return point.expectedMin === point.expectedMax ? point.expectedMin.toFixed(1) : `${point.expectedMin.toFixed(1)}–${point.expectedMax.toFixed(1)}`;
}

function curvePeak(decklist: OmnidexDecklist, cardsByName: Map<string, Card>): string {
  const bars = computeMemoryCostCurve([...named(decklist, "main"), ...named(decklist, "material")], cardsByName);
  if (bars.length === 0) return "—";
  const peak = bars.reduce((best, bar) => bar.value > best.value ? bar : best);
  return `${peak.label} (${peak.value})`;
}

function validationStatus(decklist: OmnidexDecklist, cardsByName: Map<string, Card>, format: DeckFormat) {
  const identityLines = [...named(decklist, "main"), ...named(decklist, "material")];
  const identity = computeDeckIdentity(identityLines, cardsByName);
  return validateDeck({
    main: decklist.main.map((line) => ({ cardName: line.card, quantity: line.quantity })),
    material: decklist.material.map((line) => ({ cardName: line.card, quantity: line.quantity })),
    sideboard: decklist.sideboard.map((line) => ({ cardName: line.card, quantity: line.quantity })),
  }, cardsByName, new Set(identity.elements), format).status;
}

export default function DeckChangeImpactPreview({ decklist, changes, cardsByName, format }: {
  decklist: OmnidexDecklist;
  changes: DeckQuantityChange[];
  cardsByName: Map<string, Card>;
  format: DeckFormat;
}) {
  const next = useMemo(() => applyDeckQuantityChanges(decklist, changes), [decklist, changes]);
  const beforeTotals = totals(decklist);
  const afterTotals = totals(next);
  const changedMainBefore = changes.reduce((sum, change) => sum + (change.section === "main" ? decklist.main.find((line) => line.card === change.cardName)?.quantity ?? 0 : 0), 0);
  const changedMainAfter = changes.reduce((sum, change) => sum + (change.section === "main" ? next.main.find((line) => line.card === change.cardName)?.quantity ?? 0 : 0), 0);
  const exposureBefore = chanceAtLeastOne(Math.max(60, beforeTotals.main), changedMainBefore, 10);
  const exposureAfter = chanceAtLeastOne(Math.max(60, afterTotals.main), changedMainAfter, 10);
  const metrics = [
    { label: "Memory peak", before: curvePeak(decklist, cardsByName), after: curvePeak(next, cardsByName) },
    { label: "Changed-card exposure", before: `${Math.round(exposureBefore * 100)}%`, after: `${Math.round(exposureAfter * 100)}%` },
    { label: "Printed damage · 10 seen", before: expectedAtTen(decklist, cardsByName), after: expectedAtTen(next, cardsByName) },
    { label: "Construction", before: validationStatus(decklist, cardsByName, format), after: validationStatus(next, cardsByName, format) },
  ];

  return <Panel data-component="DeckChangeImpactPreview" tone="info" className="mb-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-ctp-text">Change impact preview</h3><p className="mt-1 text-xs text-ctp-subtext1">Live projection of the staged quantities; no deck changes have been saved.</p></div>
      <span className="rounded-full bg-ctp-blue/15 px-2.5 py-1 text-xs font-medium text-ctp-blue">{changes.length} card change{changes.length === 1 ? "" : "s"}</span>
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <section className="rounded-lg border border-ctp-surface1 bg-ctp-base/60 p-3" aria-label="Current section balance"><p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Current</p><DeckSectionBalance compact counts={beforeTotals} sideboardPoints={sideboardPoints(decklist, cardsByName)} /></section>
        <section className="rounded-lg border border-ctp-blue/40 bg-ctp-blue/5 p-3" aria-label="Projected section balance"><p className="text-xs font-semibold uppercase tracking-wide text-ctp-blue">Projected</p><DeckSectionBalance compact counts={afterTotals} sideboardPoints={sideboardPoints(next, cardsByName)} /></section>
      </div>
      <div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-2 text-xs" role="table" aria-label="Projected metric changes">
          <div className="font-semibold uppercase tracking-wide text-ctp-subtext0" role="columnheader">Metric</div><div className="font-semibold uppercase tracking-wide text-ctp-subtext0" role="columnheader">Current</div><div className="font-semibold uppercase tracking-wide text-ctp-blue" role="columnheader">Projected</div>
          {metrics.map((metric) => <div key={metric.label} className="contents" role="row"><div className="border-t border-ctp-surface1 py-2 text-ctp-subtext1" role="cell">{metric.label}</div><div className="border-t border-ctp-surface1 py-2 text-right tabular-nums text-ctp-subtext1" role="cell">{metric.before}</div><div className={`border-t border-ctp-surface1 py-2 text-right font-medium tabular-nums ${metric.before === metric.after ? "text-ctp-subtext0" : "text-ctp-blue"}`} role="cell"><span className="mr-1" aria-hidden="true">{metric.before === metric.after ? "=" : "→"}</span>{metric.after}</div></div>)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {changes.slice(0, 4).map((change) => {
            const before = decklist[change.section].find((line) => line.card === change.cardName)?.quantity ?? 0;
            const after = next[change.section].find((line) => line.card === change.cardName)?.quantity ?? 0;
            return <VisualCardTile key={`${change.section}:${change.cardName}`} line={{ card: change.cardName, quantity: before }} card={cardsByName.get(change.cardName)} unitPrice={undefined} priceTrend={undefined} simulatorEvidence={undefined} communityEntry={undefined} fields={CARD_FIELDS} footer={<div className="mt-1.5"><p className="truncate text-xs font-medium text-ctp-text">{change.cardName}</p><p className="mt-1 border-t border-ctp-surface0 pt-1 text-[11px] text-ctp-yellow">{before}× → {after}×</p></div>} />;
          })}
        </div>
        {changes.length > 4 && <p className="mt-3 text-xs text-ctp-subtext0">+{changes.length - 4} more staged card change{changes.length - 4 === 1 ? "" : "s"} included in the projection.</p>}
      </div>
    </div>
  </Panel>;
}
