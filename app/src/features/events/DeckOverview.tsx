import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import DialogSheet from "../../components/ui/DialogSheet";

/** Fits actual rendered names and artwork, with readable scrolling as the lower bound. */
export default function DeckOverview({ decklist, extraSections, cardsByName, onDismiss }: {
  decklist: OmnidexDecklist;
  extraSections: { title: string; lines: OmnidexDecklistCardLine[] }[];
  cardsByName: Map<string, Card>;
  onDismiss: () => void;
}) {
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
  }, []);
  useLayoutEffect(() => {
    const maximum = Math.max(1, Math.floor((size.width + 8) / 84));
    if (grid.current && grid.current.scrollHeight > size.height && columns < maximum) {
      setColumns(columns + 1);
    }
  }, [columns, size]);
  const sections = [...extraSections, { title: "Material", lines: decklist.material }, { title: "Main", lines: decklist.main }, { title: "Sideboard", lines: decklist.sideboard }];
  const entries = sections.flatMap(section => section.lines.flatMap((line, index) => {
    const printings = line.printings ?? [];
    const remaining = line.quantity - printings.reduce((sum, printing) => sum + printing.quantity, 0);
    return [...printings, ...(remaining > 0 ? [{ quantity: remaining, editionUuid: undefined }] : [])].map((printing, printingIndex) => ({
      name: line.card, section: section.title, ...printing, key: `${section.title}:${index}:${printingIndex}`,
    }));
  }));
  return <DialogSheet title="Deck overview" fullScreen onDismiss={onDismiss}>
    <div ref={viewport} className="h-full min-h-0 overflow-y-auto">
      {entries.length === 0 ? <p className="p-3 text-sm text-ctp-subtext1">This deck has no cards.</p> : <div ref={grid} className="grid items-start gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {entries.map(entry => {
          const card = cardsByName.get(entry.name);
          const content = <><CardArtTile card={card} name={entry.name} editionUuid={entry.editionUuid} cornerBadge={`${entry.quantity}×`} /><p className="mt-1 break-words text-xs">{entry.name}</p><p className="text-xs text-ctp-subtext0">{entry.section} · {entry.quantity}×</p></>;
          return card ? <Link key={entry.key} to={`/cards/${card.slug}`} onClick={onDismiss} className="min-h-control min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={entry.key} className="min-w-0">{content}</div>;
        })}
      </div>}
    </div>
  </DialogSheet>;
}
