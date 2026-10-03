import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DeckPreviewCard from "../../components/DeckPreviewCard";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import Section from "../../components/ui/Section";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useHipsterData } from "../players/data";
import { useEventNameById, usePlayerNameById } from "../tournaments/data";
import { useDeckPopularityIndexData } from "../topdecks/data";

const VIEWS = [{ key: "recent", label: "Recent" }, { key: "unique", label: "Unique" }, { key: "top", label: "Top" }] as const;
type View = typeof VIEWS[number]["key"];
const DESCRIPTIONS: Record<View, string> = {
  recent: "Latest recorded tournament decks with published lists, newest event first.",
  unique: "Uncommon card choices compared with this champion’s other decks when played. Each main and material build appears once; sideboards do not define a different build.",
  top: "Tournament decks ranked by the published weighted placement score, which accounts for event size and tier.",
};

export default function ChampionDecks({ championName }: { championName: string }) {
  const [view, setView] = useState<View>("recent");
  const baseId = useId();
  const index = useDeckPopularityIndexData();
  const status = usePublishedDataStatus("analysis-deck-popularity-index", "/data/analysis/deck-popularity-index.json");
  const novelty = useHipsterData(view === "unique");
  const noveltyStatus = usePublishedDataStatus("analysis-hipster", "/data/analysis/hipster.json");
  const events = useEventNameById();
  const playerName = usePlayerNameById();
  const decks = useMemo(() => {
    const scores = new Map(novelty?.deckScores.map(score => [`${score.eventId}:${score.player}`, score.score]));
    const rows = (index?.entries ?? []).filter(entry => entry.championName === championName && !!entry.deckHash && (view !== "unique" || scores.has(entry.deckId)));
    rows.sort((a, b) => (view === "top" ? b.weightedScore - a.weightedScore : view === "unique" ? scores.get(b.deckId)! - scores.get(a.deckId)! : 0) || b.eventDate.localeCompare(a.eventDate) || a.deckId.localeCompare(b.deckId));
    const seen = new Set<string>();
    return rows.filter(entry => {
      const key = entry.deckHash ?? entry.deckId;
      if (view === "unique" && seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 3);
  }, [index, novelty, championName, view]);
  const ready = !!index && (view !== "unique" || !!novelty);
  return <Section id="decks" title={`${championName} decks`} description="Explore actual tournament lists across all elements and spirits." actions={<Link className="inline-flex min-h-control items-center rounded px-3 text-sm text-ctp-blue focus-visible:outline-2" to={`/decks?view=sightings&champion=${encodeURIComponent(championName)}`}>Browse all decks →</Link>}>
    <Tabs tabs={[...VIEWS]} active={view} onChange={setView} baseId={baseId} label="Champion decks" variant="pill" />
    <TabPanel baseId={baseId} tab={view} active={view} className="mt-3">
      <p className="mb-4 text-sm text-ctp-subtext1">{DESCRIPTIONS[view]}</p>
      <PublishedSourceStatus label="Tournament decks" status={status} hasData={!!index} />
      {view === "unique" && <PublishedSourceStatus label="Deck novelty" status={noveltyStatus} hasData={!!novelty} />}
      {ready && decks.length === 0 && <p className="py-4 text-sm text-ctp-subtext1">No {view === "unique" ? "novelty ranked " : ""}decks are available for this champion yet.</p>}
      {ready && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{decks.map(deck => <DeckPreviewCard key={deck.deckId} presentation="cover" model={{
        id: deck.deckId, title: `${playerName(deck.player)}’s ${championName}`, championName, decklist: null,
        source: { kind: "event", label: "Tournament" },
        metadata: <><p>{events.get(deck.eventId) ?? `Event #${deck.eventId}`}</p><p>{deck.eventDate.slice(0, 10)} · {deck.placement === null ? "Placement unavailable" : `Placed #${deck.placement}`}</p></>,
      }} view={{ to: deck.deckHash ? `/decks/${deck.deckHash}` : `/events/${deck.eventId}?tab=decklists&player=${deck.player}` }} />)}</div>}
    </TabPanel>
  </Section>;
}
