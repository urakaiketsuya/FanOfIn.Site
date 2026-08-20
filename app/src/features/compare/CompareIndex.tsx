import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DeckSearchByCards from "./DeckSearchByCards";
import ImportByPlayer from "./ImportByPlayer";
import ImportTopDecks from "./ImportTopDecks";
import PasteDecklist from "./PasteDecklist";
import ComparisonGrid from "./ComparisonGrid";
import ComparisonCards from "./ComparisonCards";
import ComparisonSuggestions from "./ComparisonSuggestions";
import CardCompareIndex from "./CardCompareIndex";
import { useComparedDecklists } from "./useComparedDecklists";
import { useOmnidexIndex, useOmnidexPlayers } from "../tournaments/data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import type { ComparedDeck } from "./types";

type CompareType = "decks" | "cards";
const COMPARE_TYPE_LABELS: Record<CompareType, string> = { decks: "Decks", cards: "Cards" };
const COMPARE_TYPE_KEYS = Object.keys(COMPARE_TYPE_LABELS) as CompareType[];

type SourceTab = "cards" | "player" | "topDecks" | "paste";
type ViewMode = "table" | "cards";

const TAB_LABELS: Record<SourceTab, string> = {
  cards: "Search by cards",
  player: "Import by player",
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
  const [tab, setTab] = useTabParam("tab", SOURCE_TAB_KEYS, "cards");
  // Table needs horizontal space (one column per deck) — default to the stacked card view on a
  // phone-sized viewport instead, so the compare set is usable without opening on desktop first.
  const [viewMode, setViewMode] = useState<ViewMode>(() => (window.innerWidth < 768 ? "cards" : "table"));
  const [searchParams, setSearchParams] = useSearchParams();
  const playersData = useOmnidexPlayers();
  const index = useOmnidexIndex();

  const comparedKeys = useMemo(() => new Set(decks.map((d) => d.key)), [decks]);
  const decklists = useComparedDecklists(decks);
  const [shareCopyState, setShareCopyState] = useState<"idle" | "copied" | "failed">("idle");

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

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("add");
      return next;
    });
  }, [searchParams, playersData, index, setSearchParams]);

  function toggleDeck(deck: ComparedDeck) {
    setDecks((prev) => (prev.some((d) => d.key === deck.key) ? prev.filter((d) => d.key !== deck.key) : [...prev, deck]));
  }

  function addDeck(deck: ComparedDeck) {
    setDecks((prev) => [...prev, deck]);
  }

  function removeDeck(key: string) {
    setDecks((prev) => prev.filter((d) => d.key !== key));
  }

  // Only "sighting" decks (a real eventId:player pair) round-trip through a link — a "custom"
  // (pasted) deck has no stable id to reference, same limitation the ?add= seed mechanism already
  // has (it was built for this exact eventId:player shape).
  const sightingKeys = decks.filter((d) => d.source.kind === "sighting").map((d) => d.key);
  const excludedCustomCount = decks.length - sightingKeys.length;

  async function handleCopyShareLink() {
    const params = new URLSearchParams({ add: sightingKeys.join(",") });
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
      <h1 className="text-2xl font-bold text-ctp-blue">Compare</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        {compareType === "decks"
          ? "Add any number of decks, then see exactly where they overlap and diverge."
          : "Add any number of individual cards to compare their usage, win rate, and price."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {COMPARE_TYPE_KEYS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setCompareType(t)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              compareType === t ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {COMPARE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {compareType === "cards" ? (
        <div className="mt-4">
          <CardCompareIndex />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {(Object.keys(TAB_LABELS) as SourceTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  tab === t ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
            {tab === "cards" && <DeckSearchByCards comparedKeys={comparedKeys} onToggle={toggleDeck} />}
            {tab === "player" && <ImportByPlayer comparedKeys={comparedKeys} onToggle={toggleDeck} />}
            {tab === "topDecks" && <ImportTopDecks comparedKeys={comparedKeys} onToggle={toggleDeck} />}
            {tab === "paste" && <PasteDecklist onAdd={addDeck} />}
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">
                Comparing {decks.length} deck{decks.length === 1 ? "" : "s"}
              </h2>
              <div className="flex items-center gap-3">
                {decks.length > 0 && (
                  <div className="flex gap-1 text-xs">
                    {(["table", "cards"] as ViewMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={`rounded-md border px-2 py-1 capitalize ${
                          viewMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                )}
                {sightingKeys.length > 0 && (
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
                  <button type="button" onClick={() => setDecks([])} className="text-xs text-ctp-subtext0 hover:text-ctp-text">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {excludedCustomCount > 0 && sightingKeys.length > 0 && (
              <p className="mt-1 text-xs text-ctp-subtext0">
                {excludedCustomCount} pasted deck{excludedCustomCount === 1 ? "" : "s"} can't be included in a share link.
              </p>
            )}

            {decks.length === 0 && <p className="mt-2 text-sm text-ctp-subtext1">Add decks above to start comparing.</p>}

            {decks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {decks.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => removeDeck(d.key)}
                    className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-blue"
                  >
                    {d.label}
                    <span aria-hidden="true">&times;</span>
                  </button>
                ))}
              </div>
            )}

            {decks.length > 0 && (
              <div className="mt-4">
                {viewMode === "table" ? (
                  <ComparisonGrid decks={decks} decklists={decklists} />
                ) : (
                  <ComparisonCards decks={decks} decklists={decklists} />
                )}
              </div>
            )}

            {decks.length >= 2 && <ComparisonSuggestions decks={decks} decklists={decklists} />}
          </div>
        </>
      )}
    </div>
  );
}
