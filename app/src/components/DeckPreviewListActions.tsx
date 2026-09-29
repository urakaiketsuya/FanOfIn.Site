import { useState } from "react";
import { Link } from "react-router-dom";
import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { buildDecklistText } from "../features/events/DecklistView";
import { encodeCustomDecks } from "../lib/compareShareLink";
import { deckPreviewActionClass } from "./DeckPreviewCard";

/** Explicitly supplied by adapters only when a complete, exportable list is available. */
export default function DeckPreviewListActions({ decklist, title, format, compare = true }: {
  decklist: OmnidexDecklist; title: string; format?: DeckFormat; compare?: boolean;
}) {
  const [notice, setNotice] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(buildDecklistText(decklist)); setNotice("Copied decklist."); }
    catch { setNotice("Could not copy. Try again."); }
  }
  return <>
    <button type="button" onClick={() => void copy()} className={`${deckPreviewActionClass} text-ctp-blue`}>Copy</button>
    {compare && <Link to={`/compare?${new URLSearchParams({ custom: encodeCustomDecks([{ label: title, decklist, format }]), panel: "compare" })}`} className={`${deckPreviewActionClass} text-ctp-blue`}>Compare</Link>}
    {notice && <span role="status" className="w-full text-xs text-ctp-subtext1">{notice}</span>}
  </>;
}
