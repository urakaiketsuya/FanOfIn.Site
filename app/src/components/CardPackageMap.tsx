import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import type { DependencyReadiness, SynergyLine, SynergyReadiness } from "../features/deckbuilder/synergyReadiness";
import { VisualCardTile, type VisualFieldVisibility } from "./VisualCardTile";
import Panel from "./ui/Panel";

type PackageKind = "synergy" | "dependency";
type PackageEntry = {
  id: string;
  kind: PackageKind;
  label: string;
  status: string;
  tone: "success" | "info" | "warning" | "danger";
  supportLabel: string;
  payoffLabel: string;
  support: SynergyLine[];
  payoffs: SynergyLine[];
  supportCopies: number;
  payoffCopies: number;
  probability: number | null;
  note: string;
  recommendations: string[];
};

const CARD_FIELDS: VisualFieldVisibility = { cost: false, price: false, priceTrend: false, tags: false, simulator: false, community: false };
const TONE = {
  success: { border: "border-ctp-green/50", fill: "bg-ctp-green/10", text: "text-ctp-green" },
  info: { border: "border-ctp-blue/50", fill: "bg-ctp-blue/10", text: "text-ctp-blue" },
  warning: { border: "border-ctp-yellow/50", fill: "bg-ctp-yellow/10", text: "text-ctp-yellow" },
  danger: { border: "border-ctp-red/50", fill: "bg-ctp-red/10", text: "text-ctp-red" },
} as const;

function synergyTone(status: SynergyReadiness["status"]): PackageEntry["tone"] {
  return status === "Reliable" ? "success" : status === "Playable" ? "info" : status === "Fragile" ? "warning" : "danger";
}

function dependencyTone(status: DependencyReadiness["status"]): PackageEntry["tone"] {
  return status === "Supported" ? "success" : status === "Thin" ? "warning" : "danger";
}

function dedupe(lines: SynergyLine[]): SynergyLine[] {
  const quantities = new Map<string, number>();
  for (const line of lines) quantities.set(line.name, (quantities.get(line.name) ?? 0) + line.quantity);
  return [...quantities].map(([name, quantity]) => ({ name, quantity }));
}

function asEntries(synergies: SynergyReadiness[], dependencies: DependencyReadiness[]): PackageEntry[] {
  return [
    ...synergies.map((entry): PackageEntry => ({
      id: `synergy:${entry.key}`, kind: "synergy", label: entry.label, status: entry.status, tone: synergyTone(entry.status),
      supportLabel: "Enablers", payoffLabel: "Payoffs", support: dedupe(entry.enablerCards), payoffs: dedupe(entry.payoffCards),
      supportCopies: entry.enablerCopies, payoffCopies: entry.payoffCopies, probability: entry.probabilityByTen,
      note: entry.note, recommendations: entry.recommendations,
    })),
    ...dependencies.map((entry): PackageEntry => ({
      id: `dependency:${entry.key}`, kind: "dependency", label: entry.label, status: entry.status, tone: dependencyTone(entry.status),
      supportLabel: "Support", payoffLabel: "Consumers", support: dedupe(entry.producers), payoffs: dedupe(entry.consumers),
      supportCopies: entry.producerCopies, payoffCopies: entry.consumerCopies,
      probability: entry.producerCurve.find((point) => point.seen === 10)?.probability ?? null,
      note: entry.note, recommendations: entry.recommendations,
    })),
  ].sort((a, b) => ({ danger: 0, warning: 1, info: 2, success: 3 })[a.tone] - ({ danger: 0, warning: 1, info: 2, success: 3 })[b.tone] || a.label.localeCompare(b.label));
}

function CardCluster({ title, lines, cardsByName }: { title: string; lines: SynergyLine[]; cardsByName: Map<string, Card> }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? lines : lines.slice(0, 4);
  return <section className="min-w-0" aria-label={title}>
    <div className="mb-2 flex items-center justify-between gap-2"><h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{title}</h4><span className="text-xs tabular-nums text-ctp-subtext0">{lines.reduce((sum, line) => sum + line.quantity, 0)} copies</span></div>
    {lines.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{visible.map((line) => <VisualCardTile key={line.name} line={{ card: line.name, quantity: line.quantity }} card={cardsByName.get(line.name)} unitPrice={undefined} priceTrend={undefined} simulatorEvidence={undefined} communityEntry={undefined} fields={CARD_FIELDS} />)}</div> : <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-ctp-red/50 bg-ctp-red/5 p-4 text-center text-xs text-ctp-red">No support cards detected</div>}
    {lines.length > 4 && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 min-h-10 text-xs font-medium text-ctp-blue">{expanded ? "Show fewer cards" : `Show all ${lines.length} cards`}</button>}
  </section>;
}

export default function CardPackageMap({ synergies, dependencies, cardsByName, previewedCards, onTogglePreview }: {
  synergies: SynergyReadiness[];
  dependencies: DependencyReadiness[];
  cardsByName: Map<string, Card>;
  previewedCards: Set<string>;
  onTogglePreview: (cardName: string) => void;
}) {
  const entries = useMemo(() => asEntries(synergies, dependencies), [synergies, dependencies]);
  const [selection, setSelection] = useState<string | null>(null);
  const active = entries.find((entry) => entry.id === selection) ?? entries[0];
  if (!active) return null;
  const style = TONE[active.tone];
  const membership = new Map<string, number>();
  for (const entry of entries) {
    const names = new Set([...entry.support, ...entry.payoffs].map((line) => line.name));
    for (const name of names) membership.set(name, (membership.get(name) ?? 0) + 1);
  }
  const shared = new Set([...membership].filter(([, count]) => count > 1).map(([name]) => name));
  const activeShared = new Set([...active.support, ...active.payoffs].map((line) => line.name).filter((name) => shared.has(name)));

  return <div data-component="CardPackageMap" className="grid gap-4 lg:grid-cols-[minmax(13rem,0.35fr)_minmax(0,1fr)]">
    <div className="space-y-2 lg:max-h-[38rem] lg:overflow-y-auto lg:pr-1" role="group" aria-label="Detected card packages">
      {entries.map((entry) => {
        const selected = entry.id === active.id;
        const entryStyle = TONE[entry.tone];
        return <button key={entry.id} type="button" aria-pressed={selected} onClick={() => setSelection(entry.id)} className={`min-h-14 w-full rounded-lg border p-3 text-left transition-colors ${selected ? `${entryStyle.border} ${entryStyle.fill} shadow-sm` : "border-ctp-surface1 bg-ctp-mantle hover:bg-ctp-surface0"}`}>
          <span className="flex items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate text-sm font-semibold capitalize text-ctp-text">{entry.label}</span><span className="mt-0.5 block text-[11px] uppercase tracking-wide text-ctp-subtext0">{entry.kind === "synergy" ? "Synergy" : "Dependency"}</span></span><span className={`shrink-0 text-xs font-medium ${entryStyle.text}`}>{entry.status}</span></span>
        </button>;
      })}
    </div>

    <Panel className={`${style.border} ${style.fill}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{active.kind === "synergy" ? "Synergy package" : "Dependency package"}</p><h3 className="mt-0.5 text-lg font-semibold capitalize text-ctp-text">{active.label}</h3></div>
        <div className="flex flex-wrap gap-2"><span className={`rounded-full bg-ctp-base/70 px-2.5 py-1 text-xs font-medium ${style.text}`}>{active.status}</span>{active.probability !== null && <span className="rounded-full bg-ctp-base/70 px-2.5 py-1 text-xs tabular-nums text-ctp-subtext1">{Math.round(active.probability * 100)}% by 10 seen</span>}</div>
      </div>
      <p className="mt-2 text-xs leading-5 text-ctp-subtext1">{active.note}</p>

      <div className="mt-4 grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)]">
        <CardCluster title={active.supportLabel} lines={active.support} cardsByName={cardsByName} />
        <div className="flex items-center justify-center text-ctp-subtext0" aria-hidden="true"><span className="text-center text-[10px] font-semibold uppercase tracking-wide"><span className="block text-xl md:hidden">↓</span><span className="hidden text-xl md:block">→</span>Enables</span></div>
        <CardCluster title={active.payoffLabel} lines={active.payoffs} cardsByName={cardsByName} />
      </div>
      {activeShared.size > 0 && <p className="mt-4 rounded-md bg-ctp-mauve/10 px-3 py-2 text-xs text-ctp-mauve">{activeShared.size} card{activeShared.size === 1 ? "" : "s"} in this view also support another detected package.</p>}

      {active.recommendations.length > 0 && <section className="mt-5 border-t border-ctp-surface1 pt-4">
        <div><h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-blue">Compatible support to preview</h4><p className="mt-1 text-xs text-ctp-subtext0">Preview one additional copy in its appropriate deck section.</p></div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {active.recommendations.map((name) => {
            const previewed = previewedCards.has(name);
            return <div key={name} className={`rounded-lg border border-dashed p-2 ${previewed ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 bg-ctp-base/40"}`}><VisualCardTile line={{ card: name, quantity: 1 }} card={cardsByName.get(name)} unitPrice={undefined} priceTrend={undefined} simulatorEvidence={undefined} communityEntry={undefined} fields={CARD_FIELDS} /><button type="button" aria-pressed={previewed} onClick={() => onTogglePreview(name)} className={`mt-2 min-h-10 w-full rounded-md px-2 text-xs font-medium ${previewed ? "bg-ctp-blue text-ctp-base" : "border border-ctp-blue/50 text-ctp-blue hover:bg-ctp-blue/10"}`}>{previewed ? "Previewing ✓" : "+ Preview addition"}</button></div>;
          })}
        </div>
      </section>}
    </Panel>
  </div>;
}
