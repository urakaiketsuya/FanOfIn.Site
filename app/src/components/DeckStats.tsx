import { useId, useMemo, useRef, useState } from "react";
import { basicDeckStats, type BasicStatRow, type Card, type OmnidexDecklist } from "@gatcg/shared";
import AssociatedCards from "./AssociatedCards";
import Button from "./ui/Button";
import Panel from "./ui/Panel";
import Tabs, { TabPanel } from "./ui/Tabs";

type Section = "main" | "material" | "sideboard";
type Breakdown = "elements" | "copies" | "subtypes" | "keywords";
const sections: { key: Section; label: string }[] = [{ key: "main", label: "Main" }, { key: "material", label: "Material" }, { key: "sideboard", label: "Sideboard" }];

function StatChart({ title, rows, cardsByName, curve = false }: { title: string; rows: BasicStatRow[]; cardsByName: Map<string, Card>; curve?: boolean }) {
  const [selection, setSelection] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  const selected = rows.find(row => row.label === selection);
  const max = Math.max(1, ...rows.map(row => row.count));
  return <section className="min-w-0 rounded-xl bg-ctp-mantle p-4" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`} className="text-sm font-semibold">{title}</h3>
    {rows.length === 0 ? <p className="mt-3 text-sm text-ctp-subtext1">No cards in this breakdown.</p> : <div className={curve ? "mt-3 grid gap-1 [grid-template-columns:repeat(auto-fit,minmax(3rem,1fr))]" : "mt-2 space-y-1"}>
      {rows.map(row => <Button key={row.label} variant="ghost" className={`${curve ? "flex min-w-0 flex-col justify-end px-1" : "block w-full text-left"} ${selection === row.label ? "bg-ctp-surface0 ring-2 ring-ctp-blue" : ""}`} aria-pressed={selection === row.label} aria-expanded={selection === row.label} aria-controls={`${id}-cards`} aria-label={`${row.label}${curve ? ' cost' : ''}: ${row.count} copies, ${row.percent.toFixed(1)} percent`} onClick={event => { trigger.current = event.currentTarget; setSelection(selection === row.label ? null : row.label); }}>
        {curve ? <><span className="tabular-nums">{row.count}</span><span aria-hidden="true" className="my-2 flex h-28 w-full items-end justify-center"><span className="w-3/4 rounded-t bg-ctp-blue" style={{ height: `${row.count / max * 100}%` }} /></span><span className="break-words">{row.label}</span></> : <><span className="flex flex-wrap items-baseline justify-between gap-2"><span className="break-words">{row.label}</span><span className="text-xs tabular-nums">{row.count} · {row.percent.toFixed(1)}%</span></span><span aria-hidden="true" className="mt-2 block h-2 rounded bg-ctp-surface0"><span className="block h-2 rounded bg-ctp-blue" style={{ width: `${row.percent}%` }} /></span></>}
      </Button>)}
    </div>}
    <div id={`${id}-cards`} aria-live="polite">{selected && <div className="mt-4 border-t border-ctp-surface1 pt-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm">{selected.label} · {selected.count} copies</h4><Button size="sm" onClick={() => { setSelection(null); trigger.current?.focus(); }}>Clear</Button></div><AssociatedCards lines={selected.lines} cardsByName={cardsByName} /></div>}</div>
  </section>;
}

export default function DeckStats({ decklist, cardsByName }: { decklist: Pick<OmnidexDecklist, "main" | "material"> & Partial<Pick<OmnidexDecklist, "sideboard">>; cardsByName: Map<string, Card> }) {
  const id = useId();
  const [section, setSection] = useState<Section>("main");
  const [breakdown, setBreakdown] = useState<Breakdown>("elements");
  const stats = useMemo(() => basicDeckStats(decklist[section] ?? [], cardsByName), [decklist, section, cardsByName]);
  const tabs = sections.map(item => ({ ...item, label: `${item.label} ${(decklist[item.key] ?? []).reduce((sum, line) => sum + line.quantity, 0)}` }));
  return <Panel className="mt-4 min-w-0" aria-labelledby={`${id}-heading`} data-component="DeckStats">
    <h2 id={`${id}-heading`} className="mb-3 text-base font-semibold">Deck stats</h2>
    <Tabs tabs={tabs} active={section} onChange={setSection} baseId={`${id}-section`} label="Deck stats section" wrap />
    <TabPanel baseId={`${id}-section`} tab={section} active={section} className="mt-4">
      <div className="mb-4 flex flex-wrap gap-6"><div><span className="block text-2xl tabular-nums">{stats.total}</span><span className="text-xs text-ctp-subtext1">Copies</span></div><div><span className="block text-2xl tabular-nums">{stats.unique}</span><span className="text-xs text-ctp-subtext1">Unique cards</span></div></div>
      {stats.unresolved > 0 && <p role="status" className="mb-4 text-sm text-ctp-yellow">Card details unavailable for {stats.unresolved} of {stats.total} copies.</p>}
      {stats.total === 0 ? <p className="text-sm text-ctp-subtext1">No cards in this section yet.</p> : <div key={section} className="space-y-4">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2"><StatChart title={section === "material" ? "Memory cost · non-champions" : "Reserve cost · non-champions"} rows={section === "material" ? stats.memory : stats.reserve} cardsByName={cardsByName} curve /><StatChart title="Card types" rows={stats.types} cardsByName={cardsByName} /></div>
        {section === "material" && stats.progression.length > 0 && <StatChart title="Champion Memory costs" rows={stats.progression} cardsByName={cardsByName} curve />}
        {stats.floating.length > 0 && <StatChart title="Floating Memory · printed copies" rows={stats.floating} cardsByName={cardsByName} />}
        <label className="flex flex-wrap items-center gap-3 text-sm">Breakdown<select className="min-h-control max-w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 text-base" value={breakdown} onChange={event => setBreakdown(event.target.value as Breakdown)}><option value="elements">Elements</option><option value="copies">Copies</option><option value="subtypes">Subtypes</option><option value="keywords">Keywords</option></select></label>
        <StatChart key={breakdown} title={{ elements: 'Elements', copies: 'Copies per card', subtypes: 'Subtypes', keywords: 'Keywords' }[breakdown]} rows={stats[breakdown]} cardsByName={cardsByName} />
      </div>}
    </TabPanel>
  </Panel>;
}
