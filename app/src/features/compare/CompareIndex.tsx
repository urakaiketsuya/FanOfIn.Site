import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DeckSearchByCards from "./DeckSearchByCards";
import ImportByPlayer from "./ImportByPlayer";
import ImportTopDecks from "./ImportTopDecks";
import PasteDecklist from "./PasteDecklist";
import ComparisonSummary from "./ComparisonSummary";
import ComparisonGrid from "./ComparisonGrid";
import ComparisonDifferences from "./ComparisonDifferences";
import ComparisonCardStats from "./ComparisonCardStats";
import ComparisonSuggestions from "./ComparisonSuggestions";
import CardCompareIndex from "./CardCompareIndex";
import DeckChip from "./DeckChip";
import { useComparedDecklists } from "./useComparedDecklists";
import { useDeckChampionCards } from "./useDeckChampionCards";
import { useOmnidexIndex, useOmnidexPlayers } from "../tournaments/data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { useTabParam } from "../../lib/useTabParam";
import { encodeCustomDecks, decodeCustomDecks } from "../../lib/compareShareLink";
import type { OmnidexDecklist } from "@gatcg/shared";
import type { ComparedDeck } from "./types";

type CompareType = "decks" | "cards";
const COMPARE_TYPE_LABELS: Record<CompareType, string> = { decks: "Decks", cards: "Cards" };
const COMPARE_TYPE_KEYS = Object.keys(COMPARE_TYPE_LABELS) as CompareType[];

type SourceTab = "cards" | "player" | "topDecks" | "paste";
type ViewMode = "summary" | "table" | "cardStats" | "suggestions";
const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  summary: "Overview",
  table: "Table",
  cardStats: "Card Stats",
  suggestions: "Tuning",
};
const VIEW_MODE_KEYS = Object.keys(VIEW_MODE_LABELS) as ViewMode[];

const TAB_LABELS: Record<SourceTab, string> = {
  cards: "Search by cards",
  player: "Import by player",
  topDecks: "Top decks",
  paste: "Paste a decklist",
};
const SOURCE_TAB_KEYS = Object.keys(TAB_LABELS) as SourceTab[];

// Nested under the "Decks" compareType — separates the (potentially long, scrolling) source
// search/import panels from the comparison itself, so viewing the comparison never means
// scrolling past a big result list first.
type PanelTab = "add" | "compare";
const PANEL_LABELS: Record<PanelTab, string> = { add: "Add Decks", compare: "Comparison" };
const PANEL_KEYS = Object.keys(PANEL_LABELS) as PanelTab[];

export default function CompareIndex() {
  useDocumentTitle(
    "Compare",
    "Compare Grand Archive TCG decklists side by side to see exactly where they overlap and diverge, or compare individual cards' usage, win rate, and price.",
  );
  const [compareType, setCompareType] = useTabParam<CompareType>("type", COMPARE_TYPE_KEYS, "decks");
  const [decks, setDecks] = useState<ComparedDeck[]>([]);
  const [panel, setPanel] = useTabParam<PanelTab>("panel", PANEL_KEYS, "add");
  const [tab, setTab] = useTabParam("tab", SOURCE_TAB_KEYS, "cards");
  // Summary answers "what's different" at a glance regardless of viewport — the other views are
  // for drilling into the raw matrix once that question is answered.
  const [viewMode, setViewMode] = useTabParam<ViewMode>("view", VIEW_MODE_KEYS, "summary");
  const effectiveViewMode = viewMode;
  const [baselineKey, setBaselineKey] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const playersData = useOmnidexPlayers();
  const index = useOmnidexIndex();

  const comparedKeys = useMemo(() => new Set(decks.map((d) => d.key)), [decks]);
  // Falls back to the first compared deck whenever no baseline is set yet, or the chosen one gets removed.
  const effectiveBaselineKey = baselineKey && comparedKeys.has(baselineKey) ? baselineKey : (decks[0]?.key ?? null);
  const decklists = useComparedDecklists(decks);
  const championCardsByDeckKey = useDeckChampionCards(decks, decklists);
  const [shareCopyState, setShareCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmClearTimerRef = useRef<number | null>(null);

  // The former stacked Cards view duplicated the Overview and responsive Table. Preserve old
  // bookmarks/share links by moving them to the complete card-by-card Table instead.
  useEffect(() => {
    if (searchParams.get("view") !== "cards") return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("view", "table");
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  // Seeds the compare set from a `?add=eventId:player,...` link (e.g. from an event's pairings
  // or an achievement unlock) — once player/event data is available, then clears the param so it
  // doesn't re-seed if the user removes a deck and the data refetches.
  const seededRef = useRef(false);
  useEffect(() => {
    const add = searchParams.get("add");
    if (!add || seededRef.current || !playersData || !index) return;
    seededRef.current = true;

    const usernameById = new Map(playersData.players.map((p) => [p.id, p.username]));
    const eventNameById = new Map(index.events.map((e) => [e.id, e.name]));
    const seeded: ComparedDeck[] = [];
    for (const pair of add.split(",")) {
      const [eventIdStr, playerStr] = pair.split(":");
      const eventId = Number(eventIdStr);
      const player = Number(playerStr);
      if (!Number.isFinite(eventId) || !Number.isFinite(player)) continue;
      const key = `${eventId}:${player}`;
      if (seeded.some((d) => d.key === key)) continue;
      const username = usernameById.get(player) ?? `Player #${player}`;
      const eventName = eventNameById.get(eventId) ?? `Event #${eventId}`;
      seeded.push({ key, label: `${username} @ ${eventName}`, source: { kind: "sighting", eventId, player } });
    }
    if (seeded.length > 0) setDecks((prev) => [...prev, ...seeded]);

    // One combined update, not a separate setPanel() call — two sequential setSearchParams calls
    // in the same effect can race (the second's `prev` may not see the first's write yet), silently
    // dropping the panel switch.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("add");
      if (seeded.length > 0) next.set("panel", "compare");
      return next;
    });
  }, [searchParams, playersData, index, setSearchParams]);

  // Seeds pasted ("custom") decks from a `?custom=` link — independent of the ?add= effect above
  // since decoding a custom deck's full card list needs no player/event lookup, unlike a sighting
  // deck's eventId:player reference.
  const seededCustomRef = useRef(false);
  useEffect(() => {
    const custom = searchParams.get("custom");
    if (!custom || seededCustomRef.current) return;
    seededCustomRef.current = true;

    const parsed = decodeCustomDecks(custom);
    if (parsed.length > 0) {
      setDecks((prev) => [
        ...prev,
        ...parsed.map((d, i) => ({ key: `custom-shared-${i}`, label: d.label, source: { kind: "custom" as const, decklist: d.decklist } })),
      ]);
    }

    // Combined into one setSearchParams call for the same reason the ?add= effect above avoids a
    // separate setPanel() call — see that comment.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("custom");
      if (parsed.length > 0) next.set("panel", "compare");
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleDeck(deck: ComparedDeck) {
    setDecks((prev) => (prev.some((d) => d.key === deck.key) ? prev.filter((d) => d.key !== deck.key) : [...prev, deck]));
  }

  function addDeck(deck: ComparedDeck) {
    setDecks((prev) => [...prev, deck]);
  }

  function removeDeck(key: string) {
    setDecks((prev) => prev.filter((d) => d.key !== key));
  }

  /** Two-step confirmation so wiping the whole compare set isn't one accidental click. */
  function handleClearAll() {
    if (confirmClear) {
      setDecks([]);
      setConfirmClear(false);
      if (confirmClearTimerRef.current !== null) window.clearTimeout(confirmClearTimerRef.current);
      confirmClearTimerRef.current = null;
    } else {
      setConfirmClear(true);
      confirmClearTimerRef.current = window.setTimeout(() => setConfirmClear(false), 3000);
    }
  }

  const sightingKeys = decks.filter((d) => d.source.kind === "sighting").map((d) => d.key);
  const customDecks = decks.filter((d): d is ComparedDeck & { source: { kind: "custom"; decklist: OmnidexDecklist } } => d.source.kind === "custom");

  async function handleCopyShareLink() {
    const params = new URLSearchParams();
    if (sightingKeys.length > 0) params.set("add", sightingKeys.join(","));
    if (customDecks.length > 0) {
      params.set("custom", encodeCustomDecks(customDecks.map((d) => ({ label: d.label, decklist: d.source.decklist }))));
    }
    const url = `${window.location.origin}/compare?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopyState("copied");
    } catch {
      setShareCopyState("failed");
    }
    setTimeout(() => setShareCopyState("idle"), 1500);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Compare"
        description={
          compareType === "decks"
            ? "Add any number of decks, then see exactly where they overlap and diverge."
            : "Add any number of individual cards to compare their usage, win rate, and price."
        }
      />

      <div role="tablist" aria-label="Comparison type" className="mt-4 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1">
        {COMPARE_TYPE_KEYS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`type-tab-${t}`}
            aria-selected={compareType === t}
            aria-controls={`type-panel-${t}`}
            onClick={() => setCompareType(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              compareType === t ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {COMPARE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {compareType === "cards" ? (
        <div role="tabpanel" id="type-panel-cards" aria-labelledby="type-tab-cards" className="mt-4">
          <CardCompareIndex />
        </div>
      ) : (
        <div role="tabpanel" id="type-panel-decks" aria-labelledby="type-tab-decks">
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">
              Comparing {decks.length} deck{decks.length === 1 ? "" : "s"}
            </h2>
            <div className="flex items-center gap-2">
              {decks.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    shareCopyState === "failed" ? "border-ctp-red text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                  }`}
                >
                  {shareCopyState === "copied" ? "Copied!" : shareCopyState === "failed" ? "Couldn't copy" : "Copy share link"}
                </button>
              )}
              {decks.length > 0 && (
                <button type="button" onClick={handleClearAll} className={`text-xs ${confirmClear ? "font-semibold text-ctp-red" : "text-ctp-subtext0 hover:text-ctp-text"}`}>
                  {confirmClear ? "Confirm clear all?" : "Clear all"}
                </button>
              )}
            </div>
          </div>

          {decks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {decks.map((d) => (
                <DeckChip key={d.key} deck={d} championCard={championCardsByDeckKey.get(d.key)} onRemove={() => removeDeck(d.key)} />
              ))}
            </div>
          )}

          {/* Nested tabs: search/import (potentially long result lists) kept separate from the
              comparison itself, so switching to it never means scrolling past search results. */}
          <div role="tablist" aria-label="Compare sections" className="mt-4 flex flex-wrap items-center gap-2">
            {PANEL_KEYS.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                id={`panel-tab-${p}`}
                aria-selected={panel === p}
                aria-controls={`panel-${p}`}
                onClick={() => setPanel(p)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                  panel === p ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                }`}
              >
                {PANEL_LABELS[p]}
                {p === "compare" && decks.length > 0 ? ` (${decks.length})` : ""}
              </button>
            ))}
          </div>

          {panel === "add" && (
            <div role="tabpanel" id="panel-add" aria-labelledby="panel-tab-add" className="mt-4">
              <div role="tablist" aria-label="Add decks source" className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs text-ctp-subtext0">Source:</span>
                {(Object.keys(TAB_LABELS) as SourceTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    id={`source-tab-${t}`}
                    aria-selected={tab === t}
                    aria-controls="source-panel"
                    onClick={() => setTab(t)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      tab === t ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                    }`}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>

              {decks.length > 0 && (
                <p className="mt-2 text-xs text-ctp-subtext0">
                  {decks.length} deck{decks.length === 1 ? "" : "s"} selected —{" "}
                  <button type="button" onClick={() => setPanel("compare")} className="text-ctp-blue hover:underline">
                    view comparison &rarr;
                  </button>
                </p>
              )}

              <div role="tabpanel" id="source-panel" aria-labelledby={`source-tab-${tab}`} className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
                {tab === "cards" && <DeckSearchByCards comparedKeys={comparedKeys} onToggle={toggleDeck} />}
                {tab === "player" && <ImportByPlayer comparedKeys={comparedKeys} onToggle={toggleDeck} />}
                {tab === "topDecks" && <ImportTopDecks comparedKeys={comparedKeys} onToggle={toggleDeck} />}
                {tab === "paste" && <PasteDecklist onAdd={addDeck} />}
              </div>
            </div>
          )}

          {panel === "compare" && (
            <div role="tabpanel" id="panel-compare" aria-labelledby="panel-tab-compare" className="mt-4">
              {decks.length === 0 && (
                <p className="text-sm text-ctp-subtext1">
                  Nothing to compare yet — switch to "Add Decks" to search, import, or paste one.
                </p>
              )}

              {decks.length > 0 && (
                <>
                  <div role="tablist" aria-label="Comparison view" className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-xs text-ctp-subtext0">View:</span>
                    {VIEW_MODE_KEYS.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        id={`view-tab-${mode}`}
                        aria-selected={effectiveViewMode === mode}
                        aria-controls="view-panel"
                        onClick={() => setViewMode(mode)}
                        className={`rounded-md border px-2 py-1 ${
                          effectiveViewMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                        }`}
                      >
                        {VIEW_MODE_LABELS[mode]}
                      </button>
                    ))}
                  </div>

                  <div role="tabpanel" id="view-panel" aria-labelledby={`view-tab-${effectiveViewMode}`} className="mt-4">
                    {effectiveViewMode === "summary" && (
                      <ComparisonSummary
                        decks={decks}
                        decklists={decklists}
                        baselineKey={effectiveBaselineKey}
                        onBaselineChange={setBaselineKey}
                        onViewAllDifferences={() => setViewMode("table")}
                      />
                    )}
                    {effectiveViewMode === "table" && (
                      <>
                        {/* Below md, the desktop matrix shrinks each deck's column too far to stay
                            readable, so the same Table tab shows a card-by-card diff list instead —
                            same underlying data, no separate tab to discover. */}
                        <div className="hidden md:block">
                          <ComparisonGrid decks={decks} decklists={decklists} />
                        </div>
                        <div className="md:hidden">
                          <ComparisonDifferences decks={decks} decklists={decklists} />
                        </div>
                      </>
                    )}
                    {effectiveViewMode === "cardStats" && <ComparisonCardStats decks={decks} decklists={decklists} />}
                    {effectiveViewMode === "suggestions" && <ComparisonSuggestions decks={decks} decklists={decklists} />}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
