import { useToast } from "./ui/toast/ToastContext";
import { Link } from "react-router-dom";
import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { buildDecklistText } from "../features/events/DecklistView";
import { encodeCustomDecks } from "../lib/compareShareLink";
import { deckPreviewActionClass } from "./DeckPreviewCard";

/** Explicitly supplied by adapters only when a complete, exportable list is available. */
export default function DeckPreviewListActions({ decklist, title, format, compare = true }: {
  decklist: OmnidexDecklist; title: string; format?: DeckFormat; compare?: boolean;
}) {
  const { notify } = useToast();
  async function copy() {
    try { await navigator.clipboard.writeText(buildDecklistText(decklist)); notify({ message: "Decklist copied.", key: "copy" }); }
    catch { notify({ tone: "error", message: "Could not copy the decklist.", key: "copy", action: { label: "Retry", onClick: copy } }); }
  }
  return <>
    <button type="button" onClick={() => void copy()} className={`${deckPreviewActionClass} text-ctp-blue`}>Copy</button>
    {compare && <Link to={`/compare?${new URLSearchParams({ custom: encodeCustomDecks([{ label: title, decklist, format }]), panel: "compare" })}`} className={`${deckPreviewActionClass} text-ctp-blue`}>Compare</Link>}

  </>;
}
