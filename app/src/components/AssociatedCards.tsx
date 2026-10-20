import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "./CardArtTile";

/** Visible calculation membership; highlighting never changes the deck or selected pool. */
export default function AssociatedCards({ lines, cardsByName, highlighted, label = "Associated cards" }: {
  lines: { name: string; quantity: number; detail?: string }[];
  cardsByName: Map<string, Card>;
  highlighted?: ReadonlySet<string>;
  label?: string;
}) {
  const grouped = new Map<string, { name: string; quantity: number; detail?: string }>();
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const previous = grouped.get(line.name);
    grouped.set(line.name, {
      name: line.name,
      quantity: (previous?.quantity ?? 0) + line.quantity,
      detail: [...new Set([previous?.detail, line.detail].filter(Boolean))].join(" · ") || undefined,
    });
  }
  return <div aria-label={label} className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(8rem,100%),1fr))]">
    {[...grouped.values()].map(line => {
      const card = cardsByName.get(line.name);
      const active = highlighted?.has(line.name);
      const content = <><CardArtTile card={card} name={line.name} cornerBadge={`×${line.quantity}`} artworkOnly />
        <span className="mt-2 block break-words text-xs font-medium">{line.name}</span>
        <span className="mt-1 block text-xs text-ctp-subtext1">{line.quantity} {line.quantity === 1 ? "copy" : "copies"}{line.detail ? ` · ${line.detail}` : ""}</span>
        {active && <span className="mt-1 block text-xs font-semibold text-ctp-blue">✓ Contributes</span>}
      </>;
      const className = `min-w-0 rounded-lg border-2 p-2 ${active ? "border-ctp-blue bg-ctp-blue/10" : "border-transparent"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue`;
      return card ? <Link key={line.name} to={`/cards/${card.slug}`} className={className}>{content}</Link> : <div key={line.name} className={className}>{content}</div>;
    })}
  </div>;
}
