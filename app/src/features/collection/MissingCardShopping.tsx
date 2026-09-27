import { useState } from "react";
import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";

/** Shopping choices are local drafts; this component never changes ownership. */
export default function MissingCardShopping({ cards }: { cards: Card[] }) {
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [limit, setLimit] = useState(24);
  const quantity = (card: Card) => choices[card.uuid] ?? 1;
  const lines = cards.filter(card => quantity(card) > 0).map(card => ({ name: card.name, quantity: quantity(card) }));
  const list = lines.map(line => `${line.quantity} ${line.name}`).join("\n");
  const linkClass = "inline-flex min-h-12 items-center justify-center rounded-lg border border-ctp-surface1 px-3 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue";
  async function copy() {
    try { await navigator.clipboard.writeText(list); setMessage("Shopping list copied. Paste it into your preferred store or share it with your local shop."); }
    catch { setMessage("Could not copy. Select and copy the list below."); }
  }
  if (!cards.length) return null;
  return <details className="my-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm text-ctp-blue">Find missing cards ({cards.length})<DisclosureChevron /></summary>
    <p className="mt-2 text-sm text-ctp-subtext1">Missing cards matching your current filters, including results beyond the visible page. Start with one copy each; choose the cards and quantities you want to shop for.</p>
    <p className="mt-2 text-xs text-ctp-subtext0">Any printing is fine. Review printing, condition, price, and availability at the store. Shopping does not mark cards as owned.</p>
    <div className="my-3 flex flex-wrap gap-2"><button type="button" onClick={() => { setChoices({}); setMessage(""); }} className={linkClass}>Select all · one each</button><button type="button" onClick={() => { setChoices(Object.fromEntries(cards.map(card => [card.uuid, 0]))); setMessage(""); }} className={linkClass}>Clear selection</button></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.slice(0, limit).map(card => <article key={card.uuid} className="min-w-0 rounded-lg border border-ctp-surface1 p-2">
      <Link to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={card} name={card.name} /><span className="flex min-h-12 items-center text-sm">{card.name}</span></Link>
      <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={quantity(card) > 0} onChange={event => { setChoices(current => ({ ...current, [card.uuid]: event.target.checked ? 1 : 0 })); setMessage(""); }} aria-label={`Select ${card.name}`} />Include</label>
      <label className="block text-xs">Copies<input aria-label={`Shopping quantity for ${card.name}`} type="number" min={0} max={99} step={1} value={quantity(card)} onChange={event => { setChoices(current => ({ ...current, [card.uuid]: Math.max(0, Math.min(99, Math.floor(Number(event.target.value) || 0))) })); setMessage(""); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-base" /></label>
    </article>)}</div>
    {cards.length > limit && <button type="button" onClick={() => setLimit(value => value + 24)} className={`${linkClass} mt-3`}>Show more missing cards</button>}
    <p role="status" className="mt-3 text-sm">{lines.length} cards selected · {lines.reduce((sum, line) => sum + line.quantity, 0)} copies</p>
    {lines.length > 0 ? <><div className="mt-3 flex flex-wrap gap-2"><a href={buildTcgplayerMassEntryUrl(lines)} target="_blank" rel="noreferrer" className={linkClass}>TCGplayer Mass Entry ↗</a><button type="button" onClick={() => void copy()} className={linkClass}>Copy list for another store</button></div><textarea aria-label="Shopping list" readOnly value={list} rows={4} className="mt-3 w-full rounded-lg border border-ctp-surface1 bg-ctp-base p-2 text-sm" /></> : <p className="mt-2 text-sm text-ctp-subtext1">Select a card to see buying options.</p>}
    {message && <p role="status" className="mt-2 text-sm text-ctp-subtext1">{message}</p>}
  </details>;
}
