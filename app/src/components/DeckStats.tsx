import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { basicDeckStats, type BasicStatRow, type Card, type DeckFormat, type OmnidexDecklist } from "@gatcg/shared";
import DeckQuantityEvidence from "../features/decks/DeckQuantityEvidence";
import DeckCardAccess from "./DeckCardAccess";
import AssociatedCards from "./AssociatedCards";
import Button from "./ui/Button";
import Panel from "./ui/Panel";
import Tabs, { TabPanel } from "./ui/Tabs";

type Section = "main" | "material" | "sideboard";
type Breakdown = "elements" | "copies" | "subtypes" | "keywords";
const sections: { key: Section; label: string }[] = [{ key: "main", label: "Main" }, { key: "material", label: "Material" }, { key: "sideboard", label: "Sideboard" }];

function StatChart({ title, rows, cardsByName, curve = false, control }: { control?: ReactNode; title: string; rows: BasicStatRow[]; cardsByName: Map<string, Card>; curve?: boolean }) {
  const [selection, setSelection] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  const selected = rows.find(row => row.label === selection);
  const max = Math.max(1, ...rows.map(row => row.count));
  return <section className="min-w-0" aria-labelledby={`${id}-heading`}>
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3"><h3 id={`${id}-heading`} className="text-sm font-semibold">{title}</h3>{control}</div>
    {rows.length === 0 ? <p className="mt-3 text-sm text-ctp-subtext1">No cards in this breakdown.</p> : <div className={curve ? "grid gap-1 [grid-template-columns:repeat(auto-fit,minmax(3rem,1fr))]" : "space-y-0"}>
      {rows.map(row => <Button key={row.label} variant="ghost" className={`${curve ? "flex min-w-0 flex-col justify-end !px-1 !py-1" : "block w-full !px-0 !py-2 text-left"} ${selection === row.label ? "bg-ctp-surface0 ring-2 ring-ctp-blue" : ""}`} aria-pressed={selection === row.label} aria-expanded={selection === row.label} aria-controls={`${id}-cards`} aria-label={`${row.label}${curve ? ' cost' : ''}: ${row.count} copies, ${row.percent.toFixed(1)} percent`} onClick={event => { trigger.current = event.currentTarget; setSelection(selection === row.label ? null : row.label); }}>
        {curve ? <><span className="mb-1 flex h-32 w-full flex-col justify-end"><span className="mb-1 tabular-nums">{row.count}</span><span aria-hidden="true" className="mx-auto block w-3/4 rounded-t bg-ctp-blue" style={{ height: `${row.count / max * 96}px` }} /></span><span className="break-words">{row.label}</span></> : <><span className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"><span className="break-words">{row.label}</span><span className="text-xs text-ctp-subtext1 tabular-nums">{row.count} · {row.percent.toFixed(1)}%</span></span><span aria-hidden="true" className="mt-1 block h-2 rounded bg-ctp-surface0"><span className="block h-2 rounded bg-ctp-blue" style={{ width: `${row.percent}%` }} /></span></>}
      </Button>)}
    </div>}
    <div id={`${id}-cards`} aria-live="polite">{selected && <div className="mt-2 border-t border-ctp-surface1 pt-2"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm">{selected.label} · {selected.count} copies</h4><Button size="sm" onClick={() => { setSelection(null); trigger.current?.focus(); }}>Clear</Button></div><AssociatedCards lines={selected.lines} cardsByName={cardsByName} /></div>}</div>
  </section>;
}

export default function DeckStats({ decklist, cardsByName, format, championName, onExplore, showBuildComparison = true }: { showBuildComparison?: boolean; format?: DeckFormat; championName?: string | null; onExplore?: (name: string) => void; decklist: Pick<OmnidexDecklist, "main" | "material"> & Partial<Pick<OmnidexDecklist, "sideboard">>; cardsByName: Map<string, Card> }) {
  const id = useId();
  const [section, setSection] = useState<Section>("main");
  const [breakdown, setBreakdown] = useState<Breakdown>("elements");
  const stats = useMemo(() => basicDeckStats(decklist[section] ?? [], cardsByName), [decklist, section, cardsByName]);
  const tabs = sections.map(item => ({ ...item, label: `${item.label} ${(decklist[item.key] ?? []).reduce((sum, line) => sum + line.quantity, 0)}` }));
  return <Panel className="mt-4 min-w-0" aria-labelledby={`${id}-heading`} data-component="DeckStats">
    <h2 id={`${id}-heading`} className="mb-1 text-base font-semibold">Deck stats</h2>
    <Tabs tabs={tabs} active={section} onChange={setSection} baseId={`${id}-section`} label="Deck stats section" wrap />
    <TabPanel baseId={`${id}-section`} tab={section} active={section} className="mt-3">
      <p className="mb-2 text-sm text-ctp-subtext1"><span className="font-medium text-ctp-text tabular-nums">{stats.total}</span> copies <span aria-hidden="true" className="px-2">·</span><span className="font-medium text-ctp-text tabular-nums">{stats.unique}</span> unique cards</p>
      {stats.unresolved > 0 && <p role="status" className="mb-4 text-sm text-ctp-yellow">Card details unavailable for {stats.unresolved} of {stats.total} copies.</p>}
      {stats.total === 0 ? <p className="text-sm text-ctp-subtext1">No cards in this section yet.</p> : <div key={section} className="space-y-3">
        <div className="grid min-w-0 items-start gap-x-6 gap-y-3 lg:grid-cols-2"><StatChart title={section === "material" ? "Memory cost · non-champions" : "Reserve cost · non-champions"} rows={section === "material" ? stats.memory : stats.reserve} cardsByName={cardsByName} curve /><StatChart title="Card types" rows={stats.types} cardsByName={cardsByName} /></div>
        {section === "material" && stats.progression.length > 0 && <StatChart title="Champion Memory costs" rows={stats.progression} cardsByName={cardsByName} curve />}
        {stats.floating.length > 0 && <StatChart title="Floating Memory · printed copies" rows={stats.floating} cardsByName={cardsByName} />}
        {section === "main" && <DeckCardAccess size={stats.total} groups={stats.copies} cardsByName={cardsByName} onExplore={onExplore} />}
        <div className="border-t border-ctp-surface1 pt-2">
          <StatChart key={breakdown} title="Breakdown" rows={stats[breakdown]} cardsByName={cardsByName} control={<select aria-label="Deck stats breakdown" className="min-h-control max-w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 text-sm" value={breakdown} onChange={event => setBreakdown(event.target.value as Breakdown)}><option value="elements">Elements</option><option value="copies">Copies per card</option><option value="subtypes">Subtypes</option><option value="keywords">Keywords</option></select>} />
        </div>
        {showBuildComparison && section === "main" && <DeckQuantityEvidence decklist={decklist} format={format} championName={championName} cardsByName={cardsByName} />}
      </div>}
    </TabPanel>
  </Panel>;
}
