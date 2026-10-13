import { useId, useMemo, useState } from "react";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import { deckSectionStats } from "../lib/deckSectionStats";
import BarChart from "./BarChart";
import Panel from "./ui/Panel";
import Tabs, { TabPanel } from "./ui/Tabs";

type Section = "main" | "material";
type Breakdown = "types" | "elements" | "subtypes";
const sections: { key: Section; label: string }[] = [{ key: "main", label: "Main" }, { key: "material", label: "Material" }];
const breakdowns: { key: Breakdown; label: string }[] = [{ key: "types", label: "Card types" }, { key: "elements", label: "Elements" }, { key: "subtypes", label: "Subtypes" }];

export default function DeckStats({ decklist, cardsByName }: { decklist: Pick<OmnidexDecklist, Section>; cardsByName: Map<string, Card> }) {
  const id = useId();
  const [section, setSection] = useState<Section>("main");
  const [breakdown, setBreakdown] = useState<Breakdown>("types");
  const lines = decklist[section];
  const stats = useMemo(() => deckSectionStats(lines, cardsByName), [lines, cardsByName]);
  const hasCosts = [...stats.memory, ...stats.reserve].some(bar => bar.value > 0);
  return <Panel className="mt-4 min-w-0" aria-labelledby={`${id}-heading`} data-component="DeckStats">
    <h2 id={`${id}-heading`} className="text-base font-semibold">Deck stats</h2>
    <Tabs tabs={sections} active={section} onChange={setSection} baseId={`${id}-section`} label="Deck stats section" wrap />
    <TabPanel baseId={`${id}-section`} tab={section} active={section} className="mt-3">
      <p className="mb-3 text-sm text-ctp-subtext1">{stats.total} cards in {section === "main" ? "Main" : "Material"}</p>
      {stats.total === 0 ? <p className="text-sm text-ctp-subtext0">No cards in this section yet.</p> : <>
        {stats.unresolved > 0 && <p role="status" className="mb-3 text-sm text-ctp-subtext1">Card details unavailable for {stats.unresolved} of {stats.total} copies.</p>}
        {stats.unresolved < stats.total && <>
          <Tabs tabs={breakdowns} active={breakdown} onChange={setBreakdown} baseId={`${id}-breakdown`} label="Deck stats breakdown" variant="pill" wrap />
          <TabPanel baseId={`${id}-breakdown`} tab={breakdown} active={breakdown} className="mt-3">
            {stats[breakdown].length === 0 ? <p className="text-sm text-ctp-subtext0">No {breakdown === "subtypes" ? "subtypes" : breakdown === "types" ? "card types" : "elements"} recorded.</p> : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats[breakdown].map(row => <li key={row.label} className="min-w-0">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 text-sm"><span className="break-words">{row.label}</span><span className="shrink-0 text-ctp-subtext1 tabular-nums">{row.count}/{stats.total} · {row.percent.toFixed(1)}%</span></div>
                <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className="h-full rounded-full bg-ctp-blue" style={{ width: `${row.percent}%` }} /></div>
              </li>)}
            </ul>}
          </TabPanel>
          {hasCosts && <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2"><BarChart title="Memory cost" bars={stats.memory} /><BarChart title="Reserve cost" bars={stats.reserve} /></div>}
        </>}
      </>}
    </TabPanel>
  </Panel>;
}
