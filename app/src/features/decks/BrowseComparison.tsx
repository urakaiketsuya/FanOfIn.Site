import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";
import { accountApi } from "../../lib/accountApi";
import { resolveComparedDeck } from "../compare/useComparedDecklists";
import type { ComparedDeck } from "../compare/types";
import { saveBrowseHandoff } from "../compare/browseHandoff";
import { readBrowseComparison, type BrowseComparisonDeck } from "./browseComparisonModel";

const STORAGE_KEY = "foi:browse-comparison:v1";
const ComparisonContext = createContext<{ decks: BrowseComparisonDeck[]; toggle: (deck: BrowseComparisonDeck) => void; busy: boolean } | null>(null);

export function BrowseComparisonChoice({ deck, children }: { deck: BrowseComparisonDeck; children: ReactNode }) {
  const context = useContext(ComparisonContext);
  if (!context) return children;
  const selected = context.decks.some(item => item.key === deck.key);
  return <div data-component="BrowseComparisonChoice" className={`min-w-0 rounded-xl ${selected ? "ring-2 ring-ctp-blue" : ""}`}>
    <label className="flex min-h-12 cursor-pointer items-center justify-end gap-2 rounded-t-xl bg-ctp-mantle px-3 text-sm font-medium text-ctp-text">
      <input type="checkbox" className="h-5 w-5 accent-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue" checked={selected} disabled={context.busy} aria-label={`Compare ${deck.label}`} onChange={() => context.toggle(deck)} />
      {selected ? "Selected" : "Compare"}
    </label>
    {children}
  </div>;
}

export default function BrowseComparison({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [decks, setDecks] = useState<BrowseComparisonDeck[]>(() => {
    try { return readBrowseComparison(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { return []; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [review, setReview] = useState(false);
  const [height, setHeight] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const tray = useRef<HTMLDivElement>(null);
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(decks)); setStorageError(false); } catch { setStorageError(true); }
  }, [decks]);
  const visible = decks.length > 0;
  useEffect(() => {
    const element = tray.current;
    if (!element) { setHeight(0); return; }
    const page = document.documentElement;
    const previous = page.style.scrollPaddingBottom;
    const observer = new ResizeObserver(() => {
      const next = element.getBoundingClientRect().height;
      setHeight(next); page.style.scrollPaddingBottom = `${next + 24}px`;
    });
    observer.observe(element);
    return () => { observer.disconnect(); page.style.scrollPaddingBottom = previous; };
  }, [visible, keyboard]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => setKeyboard(Boolean(viewport && window.innerHeight - viewport.height > 150));
    viewport?.addEventListener("resize", update);
    return () => viewport?.removeEventListener("resize", update);
  }, []);
  function toggle(deck: BrowseComparisonDeck) {
    setError(null);
    setDecks(previous => previous.some(item => item.key === deck.key) ? previous.filter(item => item.key !== deck.key) : [...previous, deck]);
  }
  async function compare() {
    if (busy || decks.length < 2) return;
    const current = ++request.current;
    setBusy(true); setError(null);
    try {
      const resolved = await Promise.all(decks.map(async (deck): Promise<ComparedDeck> => {
        try {
          if (deck.source.kind === "public") {
            const { deck: published } = await accountApi.publicDeck(deck.source.slug);
            return { key: deck.key, label: deck.label, source: { kind: "custom", decklist: published.decklist }, format: published.format };
          }
          const comparison: ComparedDeck = { ...deck, source: deck.source };
          const decklist = await resolveComparedDeck(comparison);
          if (!decklist) throw new Error();
          return { ...comparison, source: { ...comparison.source, decklist } };
        } catch { throw new Error(`Could not load ${deck.label}. Retry or remove this deck.`); }
      }));
      if (current === request.current) {
        const handoff = { browseDecks: resolved, browseReturnTo: `${location.pathname}${location.search}` };
        const id = crypto.randomUUID();
        // Static-host route redirects discard history.state, so retain this exact comparison
        // under a tab-local token. Navigation state remains a fallback when storage is blocked.
        let saved = false;
        try { saved = saveBrowseHandoff(id, handoff, sessionStorage); } catch { /* Navigation still works without storage. */ }
        navigate(`/compare?view=table${saved ? `&browse=${id}` : ""}`, { state: handoff });
      }
    } catch (reason) { if (current === request.current) setError(reason instanceof Error ? reason.message : "Could not load the selected decks. Try again."); }
    finally { if (current === request.current) setBusy(false); }
  }
  const remove = (key: string) => { setError(null); setDecks(previous => previous.filter(deck => deck.key !== key)); };
  return <ComparisonContext.Provider value={{ decks, toggle, busy }}>
    {children}
    {visible && <>
      {!keyboard && <div aria-hidden="true" style={{ height }} />}
      <div ref={tray} role="region" aria-label="Selected decks" className={`${keyboard ? "relative" : "fixed inset-x-0 bottom-0"} z-30 border-t border-ctp-surface1 bg-ctp-base px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg`}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm font-semibold">{decks.length} {decks.length === 1 ? "deck" : "decks"} selected</p>
            <Button variant="ghost" disabled={busy} onClick={() => { setDecks([]); setError(null); }}>Clear</Button>
          </div>
          <div className="mb-2 flex min-w-0 flex-wrap gap-2">
            {decks.slice(0, 2).map(deck => <Button key={deck.key} disabled={busy} className="flex min-w-0 max-w-full items-center gap-2 sm:max-w-80" aria-label={`Remove ${deck.label} from comparison`} onClick={() => remove(deck.key)}><span className="truncate">{deck.label}</span><span aria-hidden="true">×</span></Button>)}
            {decks.length > 2 && <Button onClick={() => setReview(true)}>+{decks.length - 2} {decks.length === 3 ? "deck" : "decks"}</Button>}
          </div>
          {error && <p role="alert" className="mb-2 break-words text-sm text-ctp-red">{error}</p>}
          {storageError && <p role="status" className="mb-2 text-sm text-ctp-yellow">Selection cannot be saved in this browser.</p>}
          <Button variant="primary" className="w-full sm:w-auto" disabled={busy || decks.length < 2} onClick={() => void compare()}>{busy ? "Loading selected decks…" : decks.length < 2 ? "Select at least 2 decks" : `Compare selected (${decks.length})`}</Button>
        </div>
      </div>
    </>}
    {review && <DialogSheet title="Selected decks" onDismiss={() => setReview(false)} footer={<Button onClick={() => setReview(false)}>Done</Button>}>
      <div className="space-y-2">{decks.map(deck => <div key={deck.key} className="flex items-center justify-between gap-3"><p className="min-w-0 break-words text-sm">{deck.label}</p><Button disabled={busy} aria-label={`Remove ${deck.label} from comparison`} onClick={() => remove(deck.key)}>Remove</Button></div>)}</div>
    </DialogSheet>}
  </ComparisonContext.Provider>;
}
