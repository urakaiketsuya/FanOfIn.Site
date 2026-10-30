import { useId, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import DialogSheet from "../../components/ui/DialogSheet";

/** Fits actual rendered names and artwork, with readable scrolling as the lower bound. */
export default function DeckOverview({ decklist, extraSections, cardsByName, onDismiss }: {
  decklist: OmnidexDecklist;
  extraSections: { title: string; lines: OmnidexDecklistCardLine[] }[];
  cardsByName: Map<string, Card>;
  onDismiss: () => void;
}) {
  const [view, setView] = useState<"overview" | "grouped" | "list">("overview");
  const [grouping, setGrouping] = useState("section");
  const baseId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [columns, setColumns] = useState(1);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
      setColumns(Math.max(1, Math.ceil((element.clientWidth + 8) / 168)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [view, grouping]);
  useLayoutEffect(() => {
    const maximum = Math.max(1, Math.floor((size.width + 8) / 84));
    if (grid.current && grid.current.scrollHeight > size.height && columns < maximum) {
      setColumns(columns + 1);
    }
  }, [columns, size, view, grouping]);
  const sections = [...extraSections, { title: "Material", lines: decklist.material }, { title: "Main", lines: decklist.main }, { title: "Sideboard", lines: decklist.sideboard }];
  const entries = sections.flatMap((section, sectionIndex) => section.lines.flatMap((line, index) => {
    const printings = line.printings ?? [];
    const remaining = line.quantity - printings.reduce((sum, printing) => sum + printing.quantity, 0);
    return [...printings, ...(remaining > 0 ? [{ quantity: remaining, editionUuid: undefined }] : [])].map((printing, printingIndex) => ({
      name: line.card, sectionIndex, section: section.title, ...printing, key: `${sectionIndex}:${index}:${printingIndex}`,
    }));
  }));
  const groups = view === "grouped" && grouping !== "section"
    ? [...entries.reduce((groups, entry) => {
      const card = cardsByName.get(entry.name);
      const title = grouping === "type" ? card?.types.join(" / ") || "Unknown type" : card ? `${card.cost.type} ${card.cost.value ?? "—"}` : "Unknown cost";
      groups.set(title, [...(groups.get(title) ?? []), entry]);
      return groups;
    }, new Map<string, typeof entries>())].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([title, rows]) => ({ title, rows }))
    : sections.map((section, index) => ({ title: section.title, rows: entries.filter(entry => entry.sectionIndex === index) }));
  const renderEntry = (entry: typeof entries[number]) => {
    const card = cardsByName.get(entry.name);
    const compact = view === "list";
    const content = <>
      <div className={compact ? "w-9 shrink-0" : ""}><CardArtTile card={card} name={entry.name} editionUuid={entry.editionUuid} cornerBadge={compact ? undefined : `${entry.quantity}×`} /></div>
      <div className="min-w-0 flex-1"><p className="mt-1 break-words text-xs">{entry.name}</p><p className="text-xs text-ctp-subtext0">{entry.section}{compact && card ? ` · ${card.cost.type} ${card.cost.value ?? "—"}` : ""}{!compact ? ` · ${entry.quantity}×` : ""}</p></div>
      {compact && <span className="shrink-0 text-sm font-semibold">{entry.quantity}×</span>}
    </>;
    const className = `min-h-control min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue ${compact ? "flex items-center gap-2 border-b border-ctp-surface0 p-1" : ""}`;
    return card ? <Link key={entry.key} to={`/cards/${card.slug}`} onClick={onDismiss} className={className}>{content}</Link> : <div key={entry.key} className={className}>{content}</div>;
  };
  return <DialogSheet title="Deck overview" fullScreen onDismiss={onDismiss}>
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="shrink-0"><Tabs baseId={baseId} label="Deck view" active={view} onChange={setView} wrap tabs={[{ key: "overview", label: "Overview" }, { key: "grouped", label: "Grouped" }, { key: "list", label: "Compact list" }]} /></div>
      {view === "grouped" && <label className="flex shrink-0 items-center gap-2 text-sm">Group by<select value={grouping} onChange={event => setGrouping(event.target.value)} className="min-h-control rounded border border-ctp-surface1 bg-ctp-base px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue"><option value="section">Deck section</option><option value="type">Card type</option><option value="cost">Cost</option></select></label>}
      <div ref={viewport} className="min-h-0 flex-1 overflow-y-auto">
        <TabPanel baseId={baseId} tab={view} active={view}>
          {entries.length === 0 ? <p className="p-3 text-sm text-ctp-subtext1">This deck has no cards.</p> : <div ref={grid} className="grid items-start gap-2" style={{ gridTemplateColumns: view === "list" ? "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))" : `repeat(${columns}, minmax(0, 1fr))` }}>
            {view === "overview" ? entries.map(renderEntry) : groups.map((section, index) => {
              const sectionEntries = section.rows;
              if (!sectionEntries.length) return null;
              return <section key={`${index}:${section.title}`} className={view === "grouped" ? "col-span-full" : "min-w-0"}>
                <h3 className="mb-2 text-sm font-semibold">{section.title} <span className="text-ctp-subtext0">· {section.rows.reduce((sum, entry) => sum + entry.quantity, 0)}</span></h3>
                <div className={view === "grouped" ? "grid items-start gap-2" : ""} style={view === "grouped" ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>{sectionEntries.map(renderEntry)}</div>
              </section>;
            })}
          </div>}
        </TabPanel>
      </div>
    </div>
  </DialogSheet>;
}
