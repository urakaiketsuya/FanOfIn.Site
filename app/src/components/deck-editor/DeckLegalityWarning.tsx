import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { deckCardIssues, type Card, type DeckFormat, type OmnidexDecklist } from "@gatcg/shared";
import CardArtTile from "../CardArtTile";
import DisclosureChevron from "../DisclosureChevron";
export default function DeckLegalityWarning({ deck, catalog, format, historical = false }: { deck: OmnidexDecklist; catalog: ReadonlyMap<string, Card>; format: DeckFormat; historical?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const issues = deckCardIssues(deck, catalog, format);
  const banned = issues.filter(issue => issue.code === "banned");
  const bannedCopies = banned.reduce((sum, issue) => sum + issue.quantity, 0);
  const names = [...new Set(banned.map(issue => issue.card))];
  const reviewNames = [...new Set(issues.map(issue => issue.card))];
  const unverified = new Set(issues.filter(issue => issue.code === "unverified").map(issue => issue.card)).size;
  if (!issues.length) return null;
  return <aside aria-label="Deck legality warnings" className={`my-3 rounded-xl border p-3 ${banned.length ? "border-ctp-red/60 bg-ctp-red/5" : "border-ctp-yellow/40 bg-ctp-yellow/5"}`}>
    <p className={`font-semibold ${banned.length ? "text-ctp-red" : "text-ctp-yellow"}`}><span aria-hidden="true">⚠ </span>{names.length ? `${names.length} banned card${names.length === 1 ? "" : "s"} · ${bannedCopies} ${bannedCopies === 1 ? "copy" : "copies"}` : "Legality unverified"}</p>
    {names.length > 0 && <p className="mt-1 text-sm text-ctp-subtext1">{historical ? "Banned under the current catalog rules" : "Banned in this deck’s format"} ({format === "PANTHEON" ? "Pantheon" : "Standard"}).{!historical && " You can still save this draft."}</p>}
    {unverified > 0 && <p className="mt-1 text-sm text-ctp-subtext1">{format === "UNKNOWN" ? "Choose a format to verify legality." : `${unverified} card${unverified === 1 ? " has" : "s have"} no verified legality record. ${catalog.size ? "" : "Card data is still loading or unavailable."}`}</p>}
    {reviewNames.length > 0 && <><button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="mt-2 flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">{open ? "Hide cards" : "Review cards"}<DisclosureChevron className={open ? "rotate-180" : ""} /></button>
    {open && <div id={id} className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">{reviewNames.map(name => {
      const card = catalog.get(name);
      const cardIssues = issues.filter(issue => issue.card === name);
      const isBanned = cardIssues.some(issue => issue.code === "banned");
      return <div key={name} className={`min-w-0 rounded-lg border ${isBanned ? "border-ctp-red/30" : "border-ctp-yellow/30"} bg-ctp-mantle p-2`}><CardArtTile card={card} name={name} />{card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center break-words text-sm underline">{name}<span className="sr-only"> — opens in a new tab</span></Link> : <p className="break-words text-sm">{name}</p>}<p className="my-1 text-xs font-semibold">{isBanned ? "Banned" : format === "UNKNOWN" ? "Choose a format" : !card ? "Not found in the catalog" : "Missing format legality record"}</p><p className="text-xs text-ctp-subtext1">{cardIssues.map(issue => `${issue.section}: ${issue.quantity}`).join(" · ")}</p></div>;
    })}</div>}</>}
  </aside>;
}
