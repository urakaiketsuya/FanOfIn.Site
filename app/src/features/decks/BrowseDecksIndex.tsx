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
const VIEW_LABELS: Record<ViewMode, string> = {
  builds: "Unique Builds",
  sightings: "Tournament Results",
  pantheon: "Community Decks",
};

export default function BrowseDecksIndex() {
  useDocumentTitle(
    "Browse Decks",
    "Browse Grand Archive TCG decklists — grouped into distinct builds or as individual tournament results — filterable by Champion, element, cards, season, and outcome.",
  );
  const [searchParams] = useSearchParams();
  const [view, setView] = useTabParam<ViewMode>("view", VIEW_TABS, "sightings");
  const [championName, setChampionName] = useState<string | null>(searchParams.get("champion"));

  return (
    <PageLayout data-component="BrowseDecksIndex">
      <PageHeader
        title="Browse Decks"
        description={
          view === "builds"
            ? "Distinct main + material decklists, grouped across every player who ran the same build."
          : view === "sightings"
            ? "Explore public tournament decklists with their player, event, date, and result at a glance."
            : "Community Pantheon decklists, kept separate from tournament results."
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
