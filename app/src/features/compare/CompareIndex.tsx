import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DeckSearchByCards from "./DeckSearchByCards";
import ImportByPlayer from "./ImportByPlayer";
import ImportTopDecks from "./ImportTopDecks";
import PasteDecklist from "./PasteDecklist";
import ImportMyDecks from "./ImportMyDecks";
import ImportByUser from "./ImportByUser";
import ComparisonSummary from "./ComparisonSummary";
import ComparisonDifferences from "./ComparisonDifferences";
import ComparisonCardStats from "./ComparisonCardStats";
import ComparisonSuggestions from "./ComparisonSuggestions";
import CardCompareIndex from "./CardCompareIndex";
import DeckChip from "./DeckChip";
import { useComparedDecklists } from "./useComparedDecklists";
import { useDeckChampionCards } from "./useDeckChampionCards";
import { useOmnidexIndex, useOmnidexPlayers } from "../tournaments/data";
import { canonicalSignature } from "../popular/useDeckPopularity";
import { shortHash } from "../../lib/hash";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { useTabParam } from "../../lib/useTabParam";
import { encodeCustomDecks, decodeCustomDecks } from "../../lib/compareShareLink";
import type { OmnidexDecklist } from "@gatcg/shared";
import type { ComparedDeck } from "./types";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";

type CompareType = "decks" | "cards";
const COMPARE_TYPE_LABELS: Record<CompareType, string> = { decks: "Decks", cards: "Cards" };
const COMPARE_TYPE_KEYS = Object.keys(COMPARE_TYPE_LABELS) as CompareType[];

type SourceTab = "myDecks" | "users" | "cards" | "player" | "topDecks" | "paste";
type ViewMode = "summary" | "table" | "forecasts" | "suggestions";
const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  summary: "Overview",
  table: "Cards",
  forecasts: "Forecasts",
  suggestions: "Tuning",
};
const VIEW_MODE_KEYS: ViewMode[] = ["summary", "table", "forecasts", "suggestions"];

const TAB_LABELS: Record<SourceTab, string> = {
  myDecks: "My Decks",
  users: "User search",
  cards: "Search by cards",
  player: "Tournament player",
  topDecks: "Top decks",
  paste: "Paste a decklist",
};
const SOURCE_TAB_KEYS = Object.keys(TAB_LABELS) as SourceTab[];

export default function CompareIndex() {
  useDocumentTitle(
    "Compare",
    "Compare Grand Archive TCG decklists side by side to see exactly where they overlap and diverge, or compare individual cards' usage, win rate, and price.",
  );
  const [compareType, setCompareType] = useTabParam<CompareType>("type", COMPARE_TYPE_KEYS, "decks");
  const [decks, setDecks] = useState<ComparedDeck[]>([]);
  const [showAddDecks, setShowAddDecks] = useState(true);
  const [tab, setTab] = useTabParam("tab", SOURCE_TAB_KEYS, "myDecks");
  // Lead with a decision summary, then let cards, forecasts, and tuning progressively disclose
  // detail. Older summary/table URLs retain their meaning below.
  const [viewMode, setViewMode] = useTabParam<ViewMode>("view", VIEW_MODE_KEYS, "summary");
  const [cardDataMode, setCardDataMode] = useState<"quantities" | "performance">("quantities");
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
  const deckPageByKey = useMemo(() => {
    const pages = new Map<string, string>();
    for (const deck of decks) {
      if (deck.source.kind !== "sighting") continue;
      const list = decklists.get(deck.key);
      if (!list) continue;
      const main = list.main.map((line) => ({ name: line.card, quantity: line.quantity }));
      const material = list.material.map((line) => ({ name: line.card, quantity: line.quantity }));
      pages.set(deck.key, `/decks/${shortHash(canonicalSignature(main, material))}`);
    }
    return pages;
  }, [decks, decklists]);
  const [shareCopyState, setShareCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmClearTimerRef = useRef<number | null>(null);

  // Preserve older view names while consolidating card quantities and performance into one tab.
  useEffect(() => {
    const legacyView = searchParams.get("view");
    if (legacyView !== "cards" && legacyView !== "cardStats") return;
    if (legacyView === "cardStats") setCardDataMode("performance");
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
    if (seeded.length > 0) setShowAddDecks(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("add");
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
        ...parsed.map((d, i) => ({ key: `custom-shared-${i}`, label: d.label, source: { kind: "custom" as const, decklist: d.decklist }, format: d.format })),
      ]);
    }

    // Combined into one setSearchParams call for the same reason the ?add= effect above avoids a
    // separate setPanel() call — see that comment.
    if (parsed.length > 0) setShowAddDecks(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("custom");
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
      params.set("custom", encodeCustomDecks(customDecks.map((d) => ({ label: d.label, decklist: d.source.decklist, format: d.format }))));
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
    <PageLayout data-component="CompareIndex" width="full">
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
          <Panel className="sticky top-14 z-30 mt-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Compare decks</p>
                <p className="mt-0.5 text-sm text-ctp-subtext1">Select a deck to make it the baseline.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={showAddDecks ? "primary" : "secondary"} size="sm" onClick={() => setShowAddDecks((value) => !value)}>
                  {showAddDecks ? "Close deck picker" : "+ Add deck"}
                </Button>
                {decks.length > 0 && <Button variant="ghost" size="sm" onClick={handleCopyShareLink} className={shareCopyState === "failed" ? "text-ctp-red" : ""}>{shareCopyState === "copied" ? "Copied!" : shareCopyState === "failed" ? "Couldn't copy" : "Share"}</Button>}
                {decks.length > 0 && <button type="button" onClick={handleClearAll} className={`text-xs ${confirmClear ? "font-semibold text-ctp-red" : "text-ctp-subtext0 hover:text-ctp-text"}`}>{confirmClear ? "Confirm clear all?" : "Clear"}</button>}
              </div>
            </div>
            {decks.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">
              {decks.map((d) => (
                <DeckChip
                  key={d.key}
                  deck={d}
                  championCard={championCardsByDeckKey.get(d.key)}
                  deckHref={d.source.kind === "sighting" ? deckPageByKey.get(d.key) : undefined}
                  isBaseline={d.key === effectiveBaselineKey}
                  onSetBaseline={() => setBaselineKey(d.key)}
                  onRemove={() => removeDeck(d.key)}
                />
              ))}
            </div>}
          </Panel>

          {showAddDecks && (
            <div className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle/40 p-3 sm:p-4">
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

              <Panel as="div" role="tabpanel" id="source-panel" aria-labelledby={`source-tab-${tab}`} className="mt-3">
                {tab === "myDecks" && <ImportMyDecks comparedKeys={comparedKeys} onToggle={toggleDeck} />}
                {tab === "users" && <ImportByUser comparedKeys={comparedKeys} onToggle={toggleDeck} />}
                {tab === "cards" && <DeckSearchByCards comparedKeys={comparedKeys} onToggle={toggleDeck} />}
                {tab === "player" && <ImportByPlayer comparedKeys={comparedKeys} onToggle={toggleDeck} />}
                {tab === "topDecks" && <ImportTopDecks comparedKeys={comparedKeys} onToggle={toggleDeck} />}
                {tab === "paste" && <PasteDecklist onAdd={addDeck} />}
              </Panel>
            </div>
          )}

            <div className="mt-5">
              {decks.length === 0 && (
                <InlineState className="text-sm">
                  Add at least two decks to start a comparison.
                </InlineState>
              )}

              {decks.length > 0 && (
                <>
                  <div role="tablist" aria-label="Comparison view" className="flex flex-wrap items-center gap-1 border-b border-ctp-surface1">
                    {VIEW_MODE_KEYS.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        id={`view-tab-${mode}`}
                        aria-selected={effectiveViewMode === mode}
                        aria-controls="view-panel"
                        onClick={() => setViewMode(mode)}
                        className={`min-h-10 border-b-2 px-3 py-2 text-sm font-medium ${
                          effectiveViewMode === mode ? "border-ctp-blue text-ctp-blue" : "border-transparent text-ctp-subtext1 hover:text-ctp-text"
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
                        mode="overview"
                        onViewAllDifferences={() => setViewMode("table")}
                      />
                    )}
                    {effectiveViewMode === "table" && (
                      <>
                        <div className="mb-4 inline-flex rounded-lg bg-ctp-mantle p-1" aria-label="Card data">
                          <button type="button" aria-pressed={cardDataMode === "quantities"} onClick={() => setCardDataMode("quantities")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${cardDataMode === "quantities" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Deck quantities</button>
                          <button type="button" aria-pressed={cardDataMode === "performance"} onClick={() => setCardDataMode("performance")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${cardDataMode === "performance" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Performance</button>
                        </div>
                        {cardDataMode === "quantities" ? <ComparisonDifferences decks={decks} decklists={decklists} /> : <ComparisonCardStats decks={decks} decklists={decklists} />}
                      </>
                    )}
                    {effectiveViewMode === "forecasts" && <ComparisonSummary decks={decks} decklists={decklists} baselineKey={effectiveBaselineKey} mode="forecasts" onViewAllDifferences={() => setViewMode("table")} />}
                    {effectiveViewMode === "suggestions" && <ComparisonSuggestions decks={decks} decklists={decklists} baselineKey={effectiveBaselineKey} />}
                  </div>
                </>
              )}
            </div>
        </div>
      )}
    </PageLayout>
  );
}
