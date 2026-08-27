import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import About from "./pages/About";
import { beginLoading, endLoading } from "./lib/useGlobalLoading";

// /top-decks and /popular-decks were merged into /decks (Browse Decks, "By Sighting"/"By Build"
// tabs) — these redirect old links/bookmarks to the equivalent tab, preserving a ?champion= param.
function TopDecksRedirect() {
  const [searchParams] = useSearchParams();
  const params = new URLSearchParams({ view: "sightings" });
  const champion = searchParams.get("champion");
  if (champion) params.set("champion", champion);
  return <Navigate to={`/decks?${params.toString()}`} replace />;
}

function PopularDecksRedirect() {
  return <Navigate to="/decks?view=builds&minPlayers=2plus" replace />;
}

// Sets browsing merged into the Cards page's "By Set" tab; /sets/:prefix now redirects into the
// Set filter directly instead of its own dedicated route.
function SetsRedirect() {
  return <Navigate to="/cards?tab=sets" replace />;
}

function SetDetailRedirect() {
  const { prefix = "" } = useParams<{ prefix: string }>();
  return <Navigate to={`/cards?tab=browse&set=${encodeURIComponent(prefix)}`} replace />;
}

// Judges merged into the Players page's "Judges" tab (judge IDs share the player ID space, and
// both link to the same /players/:id profile).
function JudgesRedirect() {
  return <Navigate to="/players?tab=judges" replace />;
}

// Lazy-loaded so each route's JS is a separate chunk, fetched on demand — previously the whole
// app (every page) shipped as one bundle regardless of which page a visitor actually opened.
const CardsBrowse = lazy(() => import("./features/cards/CardsBrowse"));
const CardDetail = lazy(() => import("./features/cards/CardDetail"));
const CardStatsIndex = lazy(() => import("./features/cards/CardStatsIndex"));
const ThemaLeaderboard = lazy(() => import("./features/thema/ThemaLeaderboard"));
const ThemaHistory = lazy(() => import("./features/thema/ThemaHistory"));
const EventDetail = lazy(() => import("./features/events/EventDetail"));
const TournamentsIndex = lazy(() => import("./features/tournaments/TournamentsIndex"));
const SeasonsIndex = lazy(() => import("./features/tournaments/SeasonsIndex"));
const SeasonDetail = lazy(() => import("./features/tournaments/SeasonDetail"));
const PlayersIndex = lazy(() => import("./features/players/PlayersIndex"));
const PlayerProfile = lazy(() => import("./features/players/PlayerProfile"));
const TeamsIndex = lazy(() => import("./features/teams/TeamsIndex"));
const AchievementsIndex = lazy(() => import("./features/achievements/AchievementsIndex"));
const AchievementDetail = lazy(() => import("./features/achievements/AchievementDetail"));
const ArchetypesIndex = lazy(() => import("./features/archetypes/ArchetypesIndex"));
const ArchetypeDetail = lazy(() => import("./features/archetypes/ArchetypeDetail"));
const BattleChart = lazy(() => import("./features/archetypes/BattleChart"));
const ChampionsIndex = lazy(() => import("./features/champions/ChampionsIndex"));
const ChampionDetail = lazy(() => import("./features/champions/ChampionDetail"));
const CompareIndex = lazy(() => import("./features/compare/CompareIndex"));
const BrowseDecksIndex = lazy(() => import("./features/decks/BrowseDecksIndex"));
const DeckDetail = lazy(() => import("./features/decks/DeckDetail"));
const PantheonDeckDetail = lazy(() => import("./features/decks/PantheonDeckDetail"));
const DeckBuilderIndex = lazy(() => import("./features/deckbuilder/DeckBuilderIndex"));
const RegionsIndex = lazy(() => import("./features/regions/RegionsIndex"));
const PackOpener = lazy(() => import("./features/packs/PackOpener"));
const ChangelogIndex = lazy(() => import("./features/changelog/ChangelogIndex"));
const CommunityDecksIndex = lazy(() => import("./features/community/CommunityDecksIndex"));
const SimulatorIndex = lazy(() => import("./features/simulator/SimulatorIndex"));
const OfficialProductsIndex = lazy(() => import("./features/official-products/OfficialProductsIndex"));
const LookingForIndex = lazy(() => import("./features/looking-for/LookingForIndex"));

function RouteFallback() {
  useEffect(() => {
    beginLoading();
    return endLoading;
  }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-ctp-subtext1">Loading…</p>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<About />} />
        <Route path="/cards" element={<CardsBrowse />} />
        <Route path="/cards/stats" element={<CardStatsIndex />} />
        <Route path="/cards/:slug" element={<CardDetail />} />
        <Route path="/sets" element={<SetsRedirect />} />
        <Route path="/sets/:prefix" element={<SetDetailRedirect />} />
        <Route path="/thema" element={<ThemaLeaderboard />} />
        <Route path="/thema/:editionUuid" element={<ThemaHistory />} />
        <Route path="/events" element={<Navigate to="/tournaments" replace />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/tournaments" element={<TournamentsIndex />} />
        <Route path="/seasons" element={<SeasonsIndex />} />
        <Route path="/seasons/:slug" element={<SeasonDetail />} />
        <Route path="/players" element={<PlayersIndex />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
        <Route path="/judges" element={<JudgesRedirect />} />
        <Route path="/teams" element={<TeamsIndex />} />
        <Route path="/achievements" element={<AchievementsIndex />} />
        <Route path="/achievements/:id" element={<AchievementDetail />} />
        <Route path="/archetypes" element={<ArchetypesIndex />} />
        <Route path="/archetypes/:id" element={<ArchetypeDetail />} />
        <Route path="/battle-chart" element={<BattleChart />} />
        <Route path="/top-decks" element={<TopDecksRedirect />} />
        <Route path="/champions" element={<ChampionsIndex />} />
        <Route path="/champions/:name" element={<ChampionDetail />} />
        <Route path="/compare" element={<CompareIndex />} />
        <Route path="/popular-decks" element={<PopularDecksRedirect />} />
        <Route path="/decks" element={<BrowseDecksIndex />} />
        <Route path="/decks/:hash" element={<DeckDetail />} />
        <Route path="/pantheon/decks/:id" element={<PantheonDeckDetail />} />
        <Route path="/deck-builder" element={<DeckBuilderIndex />} />
        <Route path="/regions" element={<RegionsIndex />} />
        <Route path="/packs/:prefix" element={<PackOpener />} />
        <Route path="/changelog" element={<ChangelogIndex />} />
        <Route path="/community-decks" element={<CommunityDecksIndex />} />
        <Route path="/pantheon" element={<CommunityDecksIndex format="PANTHEON" />} />
        <Route path="/official-decks" element={<OfficialProductsIndex />} />
        <Route path="/looking-for" element={<LookingForIndex />} />
        <Route path="/simulator" element={<SimulatorIndex />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
