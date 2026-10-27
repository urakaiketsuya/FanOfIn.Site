import { readBrowseComparison } from "../decks/browseComparisonModel";
import type { ComparedDeck } from "./types";

export interface BrowseHandoff { browseDecks: ComparedDeck[]; browseReturnTo: string }
const prefix = "foi:comparison-handoff:";

export function readBrowseHandoff(value: unknown): BrowseHandoff | null {
  if (!value || typeof value !== "object") return null;
  const handoff = value as Partial<BrowseHandoff>;
  if (typeof handoff.browseReturnTo !== "string" || !/^\/decks\/?(?:\?|$)/.test(handoff.browseReturnTo)) return null;
  return { browseReturnTo: handoff.browseReturnTo, browseDecks: readBrowseComparison(handoff.browseDecks).filter((deck): deck is ComparedDeck => deck.source.kind !== "public") };
}

export function loadBrowseHandoff(id: string | null, storage: Pick<Storage, "getItem">): BrowseHandoff | null {
  if (!id || !/^[a-zA-Z0-9-]{1,64}$/.test(id)) return null;
  try { return readBrowseHandoff(JSON.parse(storage.getItem(prefix + id) ?? "null")); } catch { return null; }
}

export function saveBrowseHandoff(id: string, handoff: BrowseHandoff, storage: Pick<Storage, "setItem">): boolean {
  try { storage.setItem(prefix + id, JSON.stringify(handoff)); return true; } catch { return false; }
}
