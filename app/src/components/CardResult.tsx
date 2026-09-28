import type { ReactNode } from "react";
import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "./CardArtTile";

/** Shared card-first surface. Feature controllers own selection, quantities and persistence. */
export default function CardResult({ card, name, selected, onSelect, onManage, newTab = false, children }: {
  card?: Card; name: string; selected?: boolean; onSelect?: () => void;
  onManage?: () => void; newTab?: boolean; children?: ReactNode;
}) {
  const content = <><CardArtTile card={card} name={name} /><span className="flex min-h-12 items-center break-words text-sm font-medium">{name}</span></>;
  const actionClass = "block w-full rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";
  return <article data-component="CardResult" className={`min-w-0 overflow-hidden rounded-xl border bg-ctp-mantle p-2 ${selected ? "border-ctp-blue ring-2 ring-ctp-blue/30" : "border-ctp-surface1"}`}>
    {onSelect ? <button type="button" className={actionClass} aria-pressed={!!selected} aria-label={`${selected ? "Deselect" : "Select"} ${name}`} onClick={onSelect}>{content}<span className="flex min-h-12 items-center justify-center rounded-lg border border-ctp-blue px-2 text-sm text-ctp-blue">{selected ? "✓ Selected" : "Select card"}</span></button>
      : onManage ? <button type="button" className={actionClass} aria-label={`Manage ${name}`} onClick={onManage}>{content}</button>
      : card ? <Link className={actionClass} to={`/cards/${card.slug}`} target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined}>{content}{newTab && <span className="sr-only">Open card details in a new tab</span>}</Link> : content}
    {children}
  </article>;
}
