import { useId, useMemo, useState, type ReactNode } from "react";
import { basicDeckStats, type BasicStatRow, type Card, type DeckFormat, type OmnidexDecklist } from "@gatcg/shared";
import DeckQuantityEvidence from "../features/decks/DeckQuantityEvidence";
import DeckConsistency from "./DeckConsistency";
import DialogSheet from "./ui/DialogSheet";
import CardResult from "./CardResult";
import Button from "./ui/Button";
import Panel from "./ui/Panel";
import Tabs, { TabPanel } from "./ui/Tabs";

type Section = "main" | "material" | "sideboard";
type Breakdown = "types" | "elements" | "copies" | "subtypes" | "keywords";
const sections: { key: Section; label: string }[] = [{ key: "main", label: "Main" }, { key: "material", label: "Material" }, { key: "sideboard", label: "Sideboard" }];

function StatChart({ title, rows, onInspect, curve = false, control }: { control?: ReactNode; title: string; rows: BasicStatRow[]; onInspect: (row: BasicStatRow, title: string) => void; curve?: boolean }) {
  const id = useId();
  const max = Math.max(1, ...rows.map(row => row.count));
  return <section className="min-w-0" aria-labelledby={`${id}-heading`}>
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3"><h3 id={`${id}-heading`} className="text-sm font-semibold">{title}</h3>{control}</div>
    {rows.length === 0 ? <p className="mt-3 text-sm text-ctp-subtext1">No cards in this breakdown.</p> : <div className={curve ? "grid gap-1 [grid-template-columns:repeat(auto-fit,minmax(3rem,1fr))]" : "space-y-0"}>
      {rows.map(row => <Button key={row.label} variant="ghost" className={`${curve ? "flex min-w-0 flex-col justify-end !px-1 !py-1" : "block w-full !px-0 !py-2 text-left"}`} aria-haspopup="dialog" aria-label={`${row.label}${curve ? ' cost' : ''}: ${row.count} copies, ${row.percent.toFixed(1)} percent. Show cards`} onClick={() => onInspect(row, title)}>
        {curve ? <><span className="mb-1 flex h-32 w-full flex-col justify-end"><span className="mb-1 tabular-nums">{row.count}</span><span aria-hidden="true" className="mx-auto block w-3/4 rounded-t bg-ctp-blue" style={{ height: `${row.count / max * 96}px` }} /></span><span className="break-words">{row.label}</span></> : <><span className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"><span className="break-words">{row.label}</span><span className="text-xs text-ctp-subtext1 tabular-nums">{row.count} · {row.percent.toFixed(1)}%</span></span><span aria-hidden="true" className="mt-1 block h-2 rounded bg-ctp-surface0"><span className="block h-2 rounded bg-ctp-blue" style={{ width: `${row.percent}%` }} /></span></>}
      </Button>)}
    </div>}

  </section>;
}

export default function DeckStats({ decklist, cardsByName, format, championName, onExplore, showBuildComparison = true }: { showBuildComparison?: boolean; format?: DeckFormat; championName?: string | null; onExplore?: (name: string) => void; decklist: Pick<OmnidexDecklist, "main" | "material"> & Partial<Pick<OmnidexDecklist, "sideboard">>; cardsByName: Map<string, Card> }) {
  const id = useId();
  const [section, setSection] = useState<Section>("main");
  const [breakdown, setBreakdown] = useState<Breakdown>("types");
  const [view, setView] = useState<"composition" | "consistency" | "compare">("composition");
  const [inspection, setInspection] = useState<{ title: string; label: string } | null>(null);
  const inspect = (row: BasicStatRow, title: string) => setInspection({ title, label: row.label });
  const stats = useMemo(() => basicDeckStats(decklist[section] ?? [], cardsByName), [decklist, section, cardsByName]);
  const mainStats = useMemo(() => basicDeckStats(decklist.main, cardsByName), [decklist.main, cardsByName]);
  const views = [{ key: "composition" as const, label: "Composition" }, { key: "consistency" as const, label: "Consistency" }, ...(showBuildComparison ? [{ key: "compare" as const, label: "Compare" }] : [])];
  const activeView = view === "compare" && !showBuildComparison ? "composition" : view;
  const inspectionRows = inspection?.title === "Breakdown" ? stats[breakdown] : inspection?.title === "Floating Memory · printed copies" ? stats.floating : inspection?.title === "Champion Memory costs" ? stats.progression : section === "material" ? stats.memory : stats.reserve;
  const inspected = inspectionRows.find(row => row.label === inspection?.label);
  const tabs = sections.map(item => ({ ...item, label: `${item.label} ${(decklist[item.key] ?? []).reduce((sum, line) => sum + line.quantity, 0)}` }));
  return <Panel className="mt-4 min-w-0" aria-labelledby={`${id}-heading`} data-component="DeckStats">
    <h2 id={`${id}-heading`} className="mb-1 text-base font-semibold">Deck stats</h2>
    <Tabs tabs={views} active={activeView} onChange={setView} baseId={`${id}-view`} label="Deck stats task" variant="pill" wrap />
    <TabPanel baseId={`${id}-view`} tab="composition" active={activeView} keepMounted>
    <Tabs tabs={tabs} active={section} onChange={setSection} baseId={`${id}-section`} label="Deck stats section" wrap />
    <TabPanel baseId={`${id}-section`} tab={section} active={section} className="mt-3">
      <p className="mb-2 text-sm text-ctp-subtext1"><span className="font-medium text-ctp-text tabular-nums">{stats.total}</span> copies <span aria-hidden="true" className="px-2">·</span><span className="font-medium text-ctp-text tabular-nums">{stats.unique}</span> unique cards</p>
      {stats.unresolved > 0 && <p role="status" className="mb-4 text-sm text-ctp-yellow">Card details unavailable for {stats.unresolved} of {stats.total} copies.</p>}
      {stats.total === 0 ? <p className="text-sm text-ctp-subtext1">No cards in this section yet.</p> : <div key={section} className="space-y-3">
        <div className="min-w-0"><StatChart title={section === "material" ? "Memory cost · non-champions" : "Reserve cost · non-champions"} rows={section === "material" ? stats.memory : stats.reserve} onInspect={inspect} curve /></div>
        {section === "material" && stats.progression.length > 0 && <section aria-label="Champion Memory costs"><h3 className="text-sm font-semibold">Champion Memory costs</h3><div className="mt-2 flex flex-wrap gap-2">{stats.progression.map(row => <Button key={row.label} aria-haspopup="dialog" onClick={() => inspect(row, "Champion Memory costs")}>{row.label} cost · {row.count} copies</Button>)}</div></section>}
        {stats.floating.length > 0 && <section aria-label="Floating Memory"><h3 className="text-sm font-semibold">Floating Memory · printed copies</h3><div className="mt-2 flex flex-wrap gap-2">{stats.floating.map(row => <Button key={row.label} aria-haspopup="dialog" onClick={() => inspect(row, "Floating Memory · printed copies")}><span className="break-words">{row.label} · <strong className="tabular-nums">{row.count}</strong></span></Button>)}</div></section>}
        <div className="border-t border-ctp-surface1 pt-2">
          <StatChart key={breakdown} title="Breakdown" rows={stats[breakdown]} onInspect={inspect} control={<select aria-label="Deck stats breakdown" className="min-h-control max-w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 text-sm" value={breakdown} onChange={event => setBreakdown(event.target.value as Breakdown)}><option value="types">Card types</option><option value="elements">Elements</option><option value="copies">Copies per card</option><option value="subtypes">Subtypes</option><option value="keywords">Keywords</option></select>} />
        </div>
      </div>}
    </TabPanel>
    </TabPanel>
    <TabPanel baseId={`${id}-view`} tab="consistency" active={activeView} keepMounted>
      <DeckConsistency size={mainStats.total} groups={mainStats.copies} cardsByName={cardsByName} onExplore={onExplore} />
    </TabPanel>
    {showBuildComparison && <TabPanel baseId={`${id}-view`} tab="compare" active={activeView}>
      <DeckQuantityEvidence compact decklist={decklist} format={format} championName={championName} cardsByName={cardsByName} />
    </TabPanel>}
    {inspection && inspected && <DialogSheet title={`${inspection.title} · ${inspected.label}`} onDismiss={() => setInspection(null)} footer={<p className="text-sm text-ctp-subtext1">{inspected.count} copies · {inspected.percent.toFixed(1)}% of {section}</p>}>
      <div className="grid grid-cols-2 gap-3">{inspected.lines.map(line => <CardResult key={line.name} card={cardsByName.get(line.name)} name={line.name}><p className="text-sm text-ctp-subtext1">{line.quantity} copies</p></CardResult>)}</div>
    </DialogSheet>}
  </Panel>;
}
