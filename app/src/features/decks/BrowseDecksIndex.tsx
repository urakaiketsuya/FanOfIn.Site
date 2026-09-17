import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import DeckSightingsView from "./DeckSightingsView";
import PantheonDecksView from "./PantheonDecksView";
import TournamentBuildsView from "./TournamentBuildsView";

type ViewMode = "builds" | "sightings" | "pantheon";
const VIEW_TABS: readonly ViewMode[] = ["builds", "sightings", "pantheon"];
const VIEW_LABELS: Record<ViewMode, string> = { builds: "By Build", sightings: "By Sighting", pantheon: "Pantheon" };

export default function BrowseDecksIndex() {
  useDocumentTitle(
    "Browse Decks",
    "Browse Grand Archive TCG decklists — grouped into distinct builds or as individual tournament results — filterable by Champion, element, cards, season, and outcome.",
  );
  const [searchParams] = useSearchParams();
  const [view, setView] = useTabParam<ViewMode>("view", VIEW_TABS, "builds");
  const [championName, setChampionName] = useState<string | null>(searchParams.get("champion"));

  return (
    <PageLayout data-component="BrowseDecksIndex">
      <PageHeader
        title="Browse Decks"
        description={
          view === "builds"
            ? "Distinct decklists (main + material) — one row per exact build, aggregated across every player who ran it."
          : view === "sightings"
            ? "Every public decklist sighting — one row per player per event — filterable by event type, season, keyword, and outcome."
            : "Community Pantheon decklists, separated from Omnidex tournament results."
        }
      />

      <div className="mt-4">
        <Tabs tabs={VIEW_TABS.map((mode) => ({ key: mode, label: VIEW_LABELS[mode] }))} active={view} onChange={setView} label="Deck view" />
      </div>

      {view === "builds" ? (
        <TournamentBuildsView championName={championName} setChampionName={setChampionName} />
      ) : view === "sightings" ? (
        <DeckSightingsView championName={championName} setChampionName={setChampionName} />
      ) : (
        <PantheonDecksView />
      )}
    </PageLayout>
  );
}
