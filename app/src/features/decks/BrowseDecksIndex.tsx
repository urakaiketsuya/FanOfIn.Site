import { useUrlFilters, DECK_FILTER_PARAMS } from "../../components/filters/useUrlFilters";
import { Navigate, useSearchParams } from "react-router-dom";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import BrowseComparison from "./BrowseComparison";
import CombinedDecksView from "./CombinedDecksView";
import TournamentBuildsView from "./TournamentBuildsView";
import BudgetDecksView from "./BudgetDecksView";
import { emptyDeckContentFilters } from "./deckContentFilters";

type ViewMode = "all" | "builds" | "budget";
const VIEW_TABS: readonly ViewMode[] = ["all", "builds", "budget"];
const VIEW_LABELS: Record<ViewMode, string> = {
  all: "All Decks",
  builds: "Most Played",
  budget: "Budget picks",
};

export default function BrowseDecksIndex() {
  useDocumentTitle(
    "Browse Decks",
    "Browse Grand Archive TCG decklists – grouped into distinct builds or as individual tournament results – filterable by Champion, element, cards, season, and outcome.",
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useTabParam<ViewMode>("view", VIEW_TABS, "all");
  const championName = searchParams.get("champion");
  const setChampionName = (value: string | null) => setSearchParams(previous => { const next = new URLSearchParams(previous); if (value) next.set("champion", value); else next.delete("champion"); return next; });
  const [contentFilters, setContentFilters] = useUrlFilters(emptyDeckContentFilters, "content-", DECK_FILTER_PARAMS);

  // Preserve links from the brief period when Pantheon search lived as a third tab here.
  if (searchParams.get("view") === "pantheon") return <Navigate to="/pantheon/decks" replace />;

  if (searchParams.get("view") === "sightings") {
    const next = new URLSearchParams(searchParams);
    next.delete("view");
    next.set("source", "tournament");
    return <Navigate to={`/decks?${next}`} replace />;
  }

  return (
    <PageLayout width="fluid" data-component="BrowseDecksIndex"><BrowseComparison>
      <PageHeader
        title="Browse Decks"
      />

      <div className="mt-4">
        <Tabs wrap baseId="deck-view" variant="pill" tabs={VIEW_TABS.map((mode) => ({ key: mode, label: VIEW_LABELS[mode] }))} active={view} onChange={setView} label="Deck view" />
      </div>

      <TabPanel baseId="deck-view" tab="all" active={view}><CombinedDecksView contentFilters={contentFilters} setContentFilters={setContentFilters} /></TabPanel>
      <TabPanel baseId="deck-view" tab="builds" active={view}>
        <TournamentBuildsView championName={championName} setChampionName={setChampionName} contentFilters={contentFilters} setContentFilters={setContentFilters} />
      </TabPanel>
      <TabPanel baseId="deck-view" tab="budget" active={view}><BudgetDecksView /></TabPanel>
    </BrowseComparison></PageLayout>
  );
}
