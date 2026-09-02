import { useEffect, useMemo, useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER, type Card, type ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { useDeckPopularity } from "../popular/useDeckPopularity";
import { useCardCombination } from "../cards/useCardCombination";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDeckPopularityIndexData, useDeckSightingsData } from "../topdecks/data";
import { useArchetypeData } from "../archetypes/data";
import { useOmnidexPlayers } from "../tournaments/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import PopularDeckRow from "../popular/PopularDeckRow";
import DeckSightingRow from "../topdecks/DeckSightingRow";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import Tabs from "../../components/ui/Tabs";
import PageHeader from "../../components/ui/PageHeader";
import CardImage from "../../components/CardImage";
import ElementIcon from "../../components/ElementIcon";
import { usePantheonDeckIndex } from "../community/data";
import PageLayout from "../../components/layout/PageLayout";

type ViewMode = "builds" | "sightings" | "pantheon";
const VIEW_TABS: readonly ViewMode[] = ["builds", "sightings", "pantheon"];
const VIEW_LABELS: Record<ViewMode, string> = { builds: "By Build", sightings: "By Sighting", pantheon: "Pantheon" };

const BUILDS_PAGE_SIZE = 30;
const SIGHTINGS_PAGE_SIZE = 50;

function formatPantheonChampion(name: string | null | undefined): string {
  return name ? name.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Unknown Champion";
}

function referencedPantheonTokens(lines: { name: string }[], cardsByName: Map<string, Card>) {
  const cardsBySlug = new Map(Array.from(cardsByName.values()).map((card) => [card.slug, card]));
  const tokens = new Set<string>();
  for (const line of lines) for (const reference of cardsByName.get(line.name)?.references ?? []) {
    const target = cardsBySlug.get(reference.slug) ?? cardsByName.get(reference.name);
    if (target?.types.includes("TOKEN")) tokens.add(target.name);
  }
  return Array.from(tokens).sort();
}

function DeckResultsSkeleton() {
  return (
    <div className="mt-6 space-y-3" role="status" aria-label="Loading deck results">
      <span className="sr-only">Loading deck results…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-lg border border-ctp-surface0 bg-ctp-mantle/60 p-4"
          aria-hidden="true"
        >
          <div className="h-4 w-28 rounded bg-ctp-surface1" />
          <div className="mt-3 h-3 w-full max-w-md rounded bg-ctp-surface0" />
          <div className="mt-2 h-3 w-2/3 rounded bg-ctp-surface0" />
        </div>
      ))}
    </div>
  );
}

export default function BrowseDecksIndex() {
  useDocumentTitle(
    "Browse Decks",
    "Browse Grand Archive TCG decklists — grouped into distinct builds or as individual tournament results — filterable by Champion, element, cards, season, and outcome.",
  );
  const [searchParams] = useSearchParams();
  const [view, setView] = useTabParam<ViewMode>("view", VIEW_TABS, "builds");
  const [championName, setChampionName] = useState<string | null>(searchParams.get("champion"));

  return (
    <PageLayout>
      <PageHeader
        title="Browse Decks"
        description={
          view === "builds"
            ? "Distinct decklists (main + material) — one row per exact build, aggregated across every player who ran it."
          : view === "sightings" ? "Every public decklist sighting — one row per player per event — filterable by event type, season, keyword, and outcome." : "Community Pantheon decklists, separated from Omnidex tournament results."
        }
      />

      <div className="mt-4">
        <Tabs tabs={VIEW_TABS.map((mode) => ({ key: mode, label: VIEW_LABELS[mode] }))} active={view} onChange={setView} label="Deck view" />
      </div>

      {view === "builds" ? (
        <BuildsView championName={championName} setChampionName={setChampionName} />
      ) : view === "sightings" ? (
        <SightingsView championName={championName} setChampionName={setChampionName} />
      ) : (
        <PantheonView />
      )}
    </PageLayout>
  );
}

function PantheonView() {
  const index = usePantheonDeckIndex();
  const catalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  const [query, setQuery] = useState("");
  const [champion, setChampion] = useState("");
  const [sort, setSort] = useState<"champion" | "main">("champion");
  const [visibleCount, setVisibleCount] = useState(30);
  const decks = index?.decks ?? [];
  const champions = useMemo(() => Array.from(new Set(decks.map((deck) => deck.champion).filter((name): name is string => Boolean(name)))).sort(), [decks]);
  const championImages = useMemo(() => new Map(champions.map((name) => {
    const display = formatPantheonChampion(name);
    const card = catalog.find((candidate) => candidate.types.includes("CHAMPION") && candidate.name.toLowerCase().startsWith(`${display.toLowerCase()},`));
    return [display, card] as const;
  })), [catalog, champions]);
  const filtered = useMemo(() => decks.filter((deck) => (!champion || deck.champion === champion) && (!query || `${deck.champion ?? ""} ${(deck.cardNames ?? []).join(" ")} ${(deck.boonNames ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => sort === "main" ? (b.mainCount ?? 0) - (a.mainCount ?? 0) || formatPantheonChampion(a.champion).localeCompare(formatPantheonChampion(b.champion)) : formatPantheonChampion(a.champion).localeCompare(formatPantheonChampion(b.champion))), [decks, champion, query, sort]);
  return <div className="mt-5">
    <div className="rounded-lg border border-ctp-mauve/40 bg-ctp-mauve/10 p-3 text-sm text-ctp-subtext1">Locally stored Pantheon community lists, kept separate from tournament results.</div>
    <div className="mt-3 flex flex-wrap gap-2">
      <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(30); }} placeholder="Search Champion, card, or Boon…" aria-label="Search Pantheon decks" className="w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0" />
      <select value={champion} onChange={(event) => { setChampion(event.target.value); setVisibleCount(30); }} aria-label="Pantheon Champion" className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text"><option value="">All Champions</option>{champions.map((name) => <option key={name} value={name}>{formatPantheonChampion(name)}</option>)}</select>
      <select value={sort} onChange={(event) => setSort(event.target.value as "champion" | "main")} aria-label="Sort Pantheon decks" className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text"><option value="champion">Champion A–Z</option><option value="main">Largest main deck</option></select>
    </div>
    <p className="mt-3 text-xs text-ctp-subtext0">Showing {filtered.length.toLocaleString()} of {decks.length.toLocaleString()} locally stored Pantheon decklists.</p>
    {!index && <p className="mt-5 text-sm text-ctp-subtext1">Loading Pantheon decks…</p>}
    {index && filtered.length === 0 && <p className="mt-5 text-sm text-ctp-subtext1">No Pantheon decklists match these filters.</p>}
    <div className="mt-3 space-y-2">{filtered.slice(0, visibleCount).map((deck) => <PantheonDeckRow key={deck.id} deck={deck} cardsByName={cardsByName} championCard={deck.champion ? championImages.get(formatPantheonChampion(deck.champion)) : undefined} />)}</div>
    {visibleCount < filtered.length && <button type="button" onClick={() => setVisibleCount((count) => count + 30)} className="mt-4 rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue">Load more</button>}
  </div>;
}

function PantheonDeckRow({ deck, championCard, cardsByName }: { deck: ShoutAtYourDecksDeckSummary; championCard?: Card; cardsByName: Map<string, Card> }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<{ materialDeck: { name: string; quantity: number }[]; pantheonDeck?: { name: string; quantity: number }[]; mainDeck: { name: string; quantity: number }[] } | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  useEffect(() => { if (expanded && detailStatus === "idle") { setDetailStatus("loading"); void fetch(`/data/shoutatyourdecks/decks/${deck.id}.json`).then((response) => { if (!response.ok) throw new Error(`Deck request failed: ${response.status}`); return response.json(); }).then((value) => { setDetail(value); setDetailStatus("loaded"); }).catch(() => setDetailStatus("error")); } }, [expanded, detailStatus, deck.id]);
  const legacyBoons = detail?.materialDeck.filter((line) => cardsByName.get(line.name)?.types.includes("BOON")) ?? [];
  const boons = detail?.pantheonDeck ?? legacyBoons;
  const material = detail?.materialDeck.filter((line) => !legacyBoons.includes(line)) ?? [];
  const tokens = referencedPantheonTokens(detail ? [...detail.mainDeck, ...detail.materialDeck, ...(detail.pantheonDeck ?? [])] : [], cardsByName);
  return <article className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm">
    <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
      {championCard?.editions[0] ? <CardImage image={championCard.editions[0].image} alt={deck.champion ?? "Champion"} className="h-14 w-10 shrink-0 rounded object-cover object-top" /> : <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />}
      <div className="min-w-0 flex-1"><Link to={`/pantheon/decks/${deck.id}`} className="font-medium text-ctp-text hover:text-ctp-blue">{formatPantheonChampion(deck.champion)}</Link><div className="mt-0.5 text-xs text-ctp-subtext0">{deck.mainCount !== null ? `${deck.mainCount} main` : ""}{deck.materialCount !== null ? ` · ${deck.materialCount} material` : ""}</div>{(deck.boonNames?.length ?? 0) > 0 && <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Boons">{deck.boonNames!.map((name) => <span key={name} className="rounded-full border border-ctp-mauve/40 bg-ctp-mauve/10 px-2 py-0.5 text-[10px] text-ctp-mauve">{name}</span>)}</div>}</div>
      <Link to={`/pantheon/decks/${deck.id}`} className="shrink-0 rounded-md border border-ctp-blue px-2 py-1.5 text-xs text-ctp-blue hover:bg-ctp-surface0">View stats →</Link>
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="shrink-0 rounded-md border border-ctp-surface1 px-2 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text">{expanded ? "Hide" : "Decklist"}</button>
    </div>
    {expanded && <div className="mt-2 grid gap-3 border-t border-ctp-surface0 pt-2 text-xs text-ctp-subtext1 sm:grid-cols-2">{detailStatus === "loaded" && detail ? <><div><p className="mb-1 font-semibold text-ctp-text">Boons</p>{boons.map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}<p className="mb-1 mt-3 font-semibold text-ctp-text">Material</p>{material.map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}{tokens.length > 0 && <><p className="mb-1 mt-3 font-semibold text-ctp-text">Tokens</p>{tokens.map((name) => <div key={name}>1× {name}</div>)}</>}</div><div><p className="mb-1 font-semibold text-ctp-text">Main deck</p>{detail.mainDeck.map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}</div></> : detailStatus === "error" ? <div><p className="text-ctp-red">Decklist unavailable.</p><button type="button" onClick={() => setDetailStatus("idle")} className="mt-2 text-ctp-blue hover:underline">Retry</button></div> : <p>Loading decklist…</p>}</div>}
  </article>;
}

type BuildSortMode = "mostPlayed" | "bestPerforming" | "mostRecent";
const BUILD_SORT_LABELS: Record<BuildSortMode, string> = {
  mostPlayed: "Most Played",
  bestPerforming: "Best Performing",
  mostRecent: "Most Recent",
};
type MinPlayers = "any" | "2plus";

function BuildsView({
  championName,
  setChampionName,
}: {
  championName: string | null;
  setChampionName: (v: string | null) => void;
}) {
  const [searchParams] = useSearchParams();
  const [minPlayers, setMinPlayers] = useState<MinPlayers>(searchParams.get("minPlayers") === "2plus" ? "2plus" : "any");
  const [elementFilter, setElementFilter] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<BuildSortMode>("mostRecent");
  const [visibleCount, setVisibleCount] = useState(BUILDS_PAGE_SIZE);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [cardInput, setCardInput] = useState("");
  // Every filter here re-runs a synchronous decode over the (20MB+) deck-card-index dataset —
  // wrapped in a transition so inputs stay responsive and the page can show a "recalculating"
  // state instead of appearing to hang.
  const [isPending, startTransition] = useTransition();

  const { decks: allDecks, loading } = useDeckPopularity(championName, 1);
  const popularityIndexData = useDeckPopularityIndexData();
  const playersData = useOmnidexPlayers();
  const cardCatalog = useCardCatalog();
  const combination = useCardCombination(selectedCards);

  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((c) => c.name))).sort(), [cardCatalog]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);
  const combinationDeckIds = useMemo(() => new Set(combination.deckIds), [combination.deckIds]);

  const decks = useMemo(
    () => (minPlayers === "2plus" ? allDecks.filter((d) => d.playerCount >= 2) : allDecks),
    [allDecks, minPlayers],
  );

  const championsPresent = useMemo(() => {
    if (!popularityIndexData) return [];
    return Array.from(new Set(popularityIndexData.entries.map((s) => s.championName).filter((n): n is string => n !== null))).sort();
  }, [popularityIndexData]);

  const elementsPresent = useMemo(() => {
    const set = new Set<string>();
    for (const d of decks) for (const e of d.elements) set.add(e);
    return Array.from(set).sort();
  }, [decks]);

  const filtered = useMemo(() => {
    let result = decks;
    if (elementFilter.length > 0) result = result.filter((d) => elementFilter.every((e) => d.elements.includes(e)));
    // A group's card content is identical across its main+material, so any member sighting
    // matching the combination search means the whole group matches — sideboard can differ
    // between members, so this is "played with this card at least once", not "always".
    if (selectedCards.length > 0) result = result.filter((d) => d.deckIds.some((id) => combinationDeckIds.has(id)));
    return result;
  }, [decks, elementFilter, selectedCards, combinationDeckIds]);

  function toggleElement(element: string) {
    startTransition(() =>
      setElementFilter((prev) => (prev.includes(element) ? prev.filter((e) => e !== element) : [...prev, element])),
    );
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortMode === "bestPerforming") return b.avgWeightedScore - a.avgWeightedScore;
      if (sortMode === "mostRecent") return b.lastPlayedDate.localeCompare(a.lastPlayedDate);
      return b.playerCount - a.playerCount;
    });
  }, [filtered, sortMode]);

  useEffect(() => {
    setVisibleCount(BUILDS_PAGE_SIZE);
  }, [championName, minPlayers, elementFilter, sortMode, selectedCards]);

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  function addCard(name: string) {
    if (!cardNameSet.has(name) || selectedCards.includes(name)) return;
    startTransition(() => setSelectedCards((prev) => [...prev, name]));
    setCardInput("");
  }

  function removeCard(name: string) {
    startTransition(() => setSelectedCards((prev) => prev.filter((n) => n !== name)));
  }

  const visible = sorted.slice(0, visibleCount);
  const championImages = useChampionCardImages(
    Array.from(new Set(visible.map((d) => d.championName).filter((n): n is string => n !== null))),
  );

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Champion:</span>
        <select
          value={championName ?? ""}
          aria-label="Champion"
          onChange={(e) => setChampionName(e.target.value || null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All champions</option>
          {championsPresent.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <span className="ml-2 text-ctp-subtext0">Players:</span>
        {(["any", "2plus"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMinPlayers(mode)}
            aria-pressed={minPlayers === mode}
            className={`rounded-md border px-2 py-1 text-xs ${
              minPlayers === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {mode === "any" ? "Any (incl. one-offs)" : "2+ (independently played)"}
          </button>
        ))}
      </div>

      <fieldset className="mt-3" aria-labelledby="browse-decks-elements-label">
        <div className="flex min-h-6 items-center gap-2">
          <span id="browse-decks-elements-label" className="text-sm text-ctp-subtext0">Elements</span>
          {elementFilter.length > 1 && <span className="text-[11px] text-ctp-overlay1">Match all selected</span>}
          {elementFilter.length > 0 && (
            <button
              type="button"
              onClick={() => startTransition(() => setElementFilter([]))}
              className="ml-auto rounded px-1.5 py-0.5 text-xs text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {elementsPresent.map((element) => {
            const selected = elementFilter.includes(element);
            return (
              <label
                key={element}
                className={`flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ctp-blue ${
                  selected
                    ? "border-ctp-blue bg-ctp-blue/15 text-ctp-blue"
                    : "border-ctp-surface1 bg-ctp-mantle text-ctp-subtext1 hover:border-ctp-overlay0 hover:bg-ctp-surface0 hover:text-ctp-text"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleElement(element)}
                  className="sr-only"
                />
                <span aria-hidden="true"><ElementIcon element={element} size={18} className="shrink-0" /></span>
                <span className="capitalize">{element.toLowerCase()}</span>
                {selected && <span aria-hidden="true" className="ml-0.5 text-sm leading-none">✓</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-3">
        <span className="text-sm text-ctp-subtext0">Cards in deck:</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {selectedCards.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => removeCard(name)}
              className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-blue"
            >
              {name}
              <span aria-hidden="true">&times;</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          list="browse-decks-card-options"
          aria-label="Cards in deck"
          value={cardInput}
          onChange={(e) => {
            setCardInput(e.target.value);
            if (cardNameSet.has(e.target.value)) addCard(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && cardNameSet.has(cardInput)) addCard(cardInput);
          }}
          placeholder="Type a card name…"
          className="mt-1 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
        />
        <datalist id="browse-decks-card-options">
          {cardNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(Object.keys(BUILD_SORT_LABELS) as BuildSortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            aria-pressed={sortMode === mode}
            className={`rounded-md border px-2 py-1 text-xs ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {BUILD_SORT_LABELS[mode]}
          </button>
        ))}
      </div>

      {loading && <DeckResultsSkeleton />}
      {!loading && sorted.length === 0 && <p className="mt-6 text-ctp-subtext1">No decks match these filters.</p>}
      {sorted.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          {sorted.length} distinct deck{sorted.length === 1 ? "" : "s"} match
          {isPending && " — recalculating…"}
        </p>
      )}

      <div className={`mt-2 space-y-2 transition-opacity ${isPending ? "opacity-50" : ""}`}>
        {visible.map((deck) => (
          <PopularDeckRow
            key={deck.signature}
            deck={deck}
            playerName={playerName}
            championCard={deck.championName ? championImages.get(deck.championName) : undefined}
          />
        ))}
      </div>

      <LoadMore remaining={sorted.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + BUILDS_PAGE_SIZE)} />
    </>
  );
}

type SightingSortMode = "best" | "date" | "placement" | "duplicated" | "cheapest";
type Outcome = "all" | "winner" | "topCut" | "high";

const OUTCOME_LABELS: Record<Outcome, string> = {
  all: "All",
  winner: "Winners",
  topCut: "Top Cut",
  high: "High performers",
};

/** A deck with no known price is excluded whenever a max-price filter is active — can't call something "budget" without knowing what it costs. */
const MAX_PRICE_OPTIONS = [25, 50, 100, 250];

function SightingsView({
  championName,
  setChampionName,
}: {
  championName: string | null;
  setChampionName: (v: string | null) => void;
}) {
  const sightingsData = useDeckSightingsData();
  const playersData = useOmnidexPlayers();
  const archetypeData = useArchetypeData();

  const [category, setCategory] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [sortMode, setSortMode] = useState<SightingSortMode>("best");
  const [visibleCount, setVisibleCount] = useState(SIGHTINGS_PAGE_SIZE);

  const classesByChampion = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of [...(archetypeData?.archetypes ?? []), ...(archetypeData?.namedSpirits ?? [])]) {
      map.set(a.signature, a.classes);
    }
    return map;
  }, [archetypeData]);

  function toggleClass(cls: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }

  const categoriesPresent = useMemo(() => {
    if (!sightingsData) return [];
    const present = new Set(sightingsData.sightings.map((s) => s.eventCategory));
    return EVENT_CATEGORY_ORDER.filter((c) => present.has(c));
  }, [sightingsData]);

  const seasonsPresent = useMemo(() => {
    if (!sightingsData) return [];
    const bySeasonId = new Map<number, string>();
    for (const s of sightingsData.sightings) {
      if (s.seasonId !== null && s.seasonName) bySeasonId.set(s.seasonId, s.seasonName);
    }
    return Array.from(bySeasonId.entries()).sort((a, b) => b[0] - a[0]);
  }, [sightingsData]);

  const championsPresent = useMemo(() => {
    if (!sightingsData) return [];
    return Array.from(new Set(sightingsData.sightings.map((s) => s.championName).filter((n): n is string => n !== null))).sort();
  }, [sightingsData]);

  const classesPresent = useMemo(() => {
    const present = new Set<string>();
    for (const name of championsPresent) {
      for (const cls of classesByChampion.get(name) ?? []) present.add(cls);
    }
    return Array.from(present).sort();
  }, [championsPresent, classesByChampion]);

  const keywordsPresent = useMemo(() => {
    if (!sightingsData) return [];
    const present = new Set<string>();
    for (const s of sightingsData.sightings) {
      for (const k of s.keywords ?? []) present.add(k.keyword);
    }
    return Array.from(present).sort();
  }, [sightingsData]);

  const filtered = useMemo(() => {
    if (!sightingsData) return [];
    const rows = sightingsData.sightings.filter(
      (s) =>
        (!category || s.eventCategory === category) &&
        (seasonId === null || s.seasonId === seasonId) &&
        (!championName || s.championName === championName) &&
        (selectedClasses.size === 0 ||
          (s.championName && (classesByChampion.get(s.championName) ?? []).some((c) => selectedClasses.has(c)))) &&
        (!keyword || (s.keywords ?? []).some((k) => k.keyword === keyword)) &&
        (maxPrice === null || (s.price !== null && s.price <= maxPrice)) &&
        (outcome === "all" || (outcome === "winner" && s.winner) || (outcome === "topCut" && s.topCut) || (outcome === "high" && s.high)),
    );
    return [...rows].sort((a, b) => {
      if (sortMode === "best" && a.weightedScore !== b.weightedScore) {
        return b.weightedScore - a.weightedScore;
      }
      if (sortMode === "placement") {
        const aP = a.placement ?? Infinity;
        const bP = b.placement ?? Infinity;
        if (aP !== bP) return aP - bP;
      }
      if (sortMode === "duplicated" && a.duplicateCount !== b.duplicateCount) {
        return b.duplicateCount - a.duplicateCount;
      }
      if (sortMode === "cheapest") {
        const aPrice = a.price ?? Infinity;
        const bPrice = b.price ?? Infinity;
        if (aPrice !== bPrice) return aPrice - bPrice;
      }
      return b.eventDate.localeCompare(a.eventDate);
    });
  }, [sightingsData, category, seasonId, championName, selectedClasses, classesByChampion, keyword, maxPrice, outcome, sortMode]);

  useEffect(() => {
    setVisibleCount(SIGHTINGS_PAGE_SIZE);
  }, [category, seasonId, championName, selectedClasses, keyword, maxPrice, outcome, sortMode]);

  const visible = filtered.slice(0, visibleCount);
  const championImages = useChampionCardImages(Array.from(new Set(visible.map((s) => s.championName).filter((n): n is string => n !== null))));

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Type:</span>
        <button
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={`rounded-md border px-2 py-1 text-xs ${
            category === null ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          All
        </button>
        {categoriesPresent.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-md border px-2 py-1 text-xs ${
              category === c ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {EVENT_CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Season:</span>
        <select
          value={seasonId ?? ""}
          aria-label="Season"
          onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All seasons</option>
          {seasonsPresent.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <span className="ml-2 text-ctp-subtext0">Champion:</span>
        <select
          value={championName ?? ""}
          aria-label="Champion"
          onChange={(e) => setChampionName(e.target.value || null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All champions</option>
          {championsPresent.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {classesPresent.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Class:</span>
          {classesPresent.map((cls) => (
            <button
              key={cls}
              onClick={() => toggleClass(cls)}
              aria-pressed={selectedClasses.has(cls)}
              className={`rounded-md border px-2 py-1 text-xs ${
                selectedClasses.has(cls) ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      )}

      {keywordsPresent.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Keyword:</span>
          <select
            value={keyword ?? ""}
            aria-label="Keyword"
            onChange={(e) => setKeyword(e.target.value || null)}
            className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
          >
            <option value="">Any keyword</option>
            {keywordsPresent.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Max price:</span>
        <button
          onClick={() => setMaxPrice(null)}
          aria-pressed={maxPrice === null}
          className={`rounded-md border px-2 py-1 text-xs ${
            maxPrice === null ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          Any
        </button>
        {MAX_PRICE_OPTIONS.map((p) => (
          <button
            key={p}
            onClick={() => setMaxPrice(p)}
            aria-pressed={maxPrice === p}
            className={`rounded-md border px-2 py-1 text-xs ${
              maxPrice === p ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Outcome:</span>
        {(Object.keys(OUTCOME_LABELS) as Outcome[]).map((o) => (
          <button
            key={o}
            onClick={() => setOutcome(o)}
            aria-pressed={outcome === o}
            className={`rounded-md border px-2 py-1 text-xs ${
              outcome === o ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {OUTCOME_LABELS[o]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(["best", "date", "placement", "duplicated", "cheapest"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            aria-pressed={sortMode === mode}
            className={`rounded-md border px-2 py-1 text-xs capitalize ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {!sightingsData && <DeckResultsSkeleton />}
      {sightingsData && filtered.length === 0 && <p className="mt-6 text-ctp-subtext1">No decks match this filter yet.</p>}
      {sightingsData && filtered.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          {filtered.length} deck{filtered.length === 1 ? "" : "s"} match
        </p>
      )}

      <div className="mt-2 space-y-2">
        {visible.map((sighting) => (
          <DeckSightingRow
            key={sighting.deckId}
            sighting={sighting}
            playerName={playerName(sighting.player)}
            championCard={sighting.championName ? championImages.get(sighting.championName) : undefined}
          />
        ))}
      </div>

      <LoadMore remaining={filtered.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + SIGHTINGS_PAGE_SIZE)} />
    </>
  );
}
