import { printingLabel, type Card, type OmnidexDecklistCardLine } from "@gatcg/shared";
import CardArtTile from "./CardArtTile";
import DisclosureChevron from "./DisclosureChevron";
export default function PrintingSummary({ line, card }: { line: OmnidexDecklistCardLine; card?: Card }) {
  if (!line.printings?.length) return null;
  const unspecified = line.quantity - line.printings.reduce((sum, p) => sum + p.quantity, 0);
  return <details className="group mt-1"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-1 text-xs">{line.printings.length} {line.printings.length === 1 ? "printing" : "printings"}{unspecified > 0 ? ` · ${unspecified} unspecified` : ""}<DisclosureChevron className="shrink-0 group-open:rotate-180" /></summary><div className="space-y-3">{line.printings.map(item => { const edition = card?.editions.find(e => e.uuid === item.editionUuid); return <div key={item.editionUuid} className="flex items-start gap-2"><div className="w-16 shrink-0"><CardArtTile card={card} name={line.card} editionUuid={item.editionUuid} /></div><p className="min-w-0 break-words text-xs">{item.quantity} × {edition ? printingLabel(edition) : `Unavailable printing (${item.editionUuid})`}</p></div>; })}</div></details>;
}
