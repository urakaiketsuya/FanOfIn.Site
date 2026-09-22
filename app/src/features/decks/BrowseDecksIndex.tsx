import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import DeckSightingsView from "./DeckSightingsView";
import TournamentBuildsView from "./TournamentBuildsView";
import { emptyDeckContentFilters, type DeckContentFilterState } from "./deckContentFilters";

type ViewMode = "builds" | "sightings";
const VIEW_TABS: readonly ViewMode[] = ["builds", "sightings"];
const VIEW_LABELS: Record<ViewMode, string> = {
  builds: "Unique Builds",
  sightings: "Tournament Results",
};

export default function BrowseDecksIndex() {
  useDocumentTitle(
    "Browse Decks",
    "Browse Grand Archive TCG decklists — grouped into distinct builds or as individual tournament results — filterable by Champion, element, cards, season, and outcome.",
  );
  const [searchParams] = useSearchParams();
  const [view, setView] = useTabParam<ViewMode>("view", VIEW_TABS, "sightings");
  const [championName, setChampionName] = useState<string | null>(searchParams.get("champion"));
  const [contentFilters, setContentFilters] = useState<DeckContentFilterState>(emptyDeckContentFilters);

  // Preserve links from the brief period when Pantheon search lived as a third tab here.
  if (searchParams.get("view") === "pantheon") return <Navigate to="/pantheon/decks" replace />;

  return (
    <PageLayout data-component="BrowseDecksIndex">
      <PageHeader
        title="Browse Decks"
        description={
          view === "builds"
            ? "Distinct main + material decklists, grouped across every player who ran the same build."
            : "Explore public tournament decklists with their player, event, date, and result at a glance."
        }
      />

      <div className="mt-4">
        <Tabs tabs={VIEW_TABS.map((mode) => ({ key: mode, label: VIEW_LABELS[mode] }))} active={view} onChange={setView} label="Deck view" />
      </div>

      {view === "builds" ? (
        <TournamentBuildsView championName={championName} setChampionName={setChampionName} contentFilters={contentFilters} setContentFilters={setContentFilters} />
      ) : (
        <DeckSightingsView championName={championName} setChampionName={setChampionName} contentFilters={contentFilters} setContentFilters={setContentFilters} />
      )}
    </PageLayout>
  );
}
