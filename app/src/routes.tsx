import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import About from "./pages/About";

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

// Lazy-loaded so each route's JS is a separate chunk, fetched on demand — previously the whole
// app (every page) shipped as one bundle regardless of which page a visitor actually opened.
const CardsBrowse = lazy(() => import("./features/cards/CardsBrowse"));
const CardDetail = lazy(() => import("./features/cards/CardDetail"));
const CardStatsIndex = lazy(() => import("./features/cards/CardStatsIndex"));
const SetsBrowse = lazy(() => import("./features/sets/SetsBrowse"));
const SetDetail = lazy(() => import("./features/sets/SetDetail"));
const ThemaLeaderboard = lazy(() => import("./features/thema/ThemaLeaderboard"));
const ThemaHistory = lazy(() => import("./features/thema/ThemaHistory"));
const EventDetail = lazy(() => import("./features/events/EventDetail"));
const TournamentsIndex = lazy(() => import("./features/tournaments/TournamentsIndex"));
const SeasonsIndex = lazy(() => import("./features/tournaments/SeasonsIndex"));
const SeasonDetail = lazy(() => import("./features/tournaments/SeasonDetail"));
const PlayersIndex = lazy(() => import("./features/players/PlayersIndex"));
const PlayerProfile = lazy(() => import("./features/players/PlayerProfile"));
const JudgesIndex = lazy(() => import("./features/judges/JudgesIndex"));
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
const DeckBuilderIndex = lazy(() => import("./features/deckbuilder/DeckBuilderIndex"));
const ChangelogIndex = lazy(() => import("./features/changelog/ChangelogIndex"));

function RouteFallback() {
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
        <Route path="/sets" element={<SetsBrowse />} />
        <Route path="/sets/:prefix" element={<SetDetail />} />
        <Route path="/thema" element={<ThemaLeaderboard />} />
        <Route path="/thema/:editionUuid" element={<ThemaHistory />} />
        <Route path="/events" element={<Navigate to="/tournaments" replace />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/tournaments" element={<TournamentsIndex />} />
        <Route path="/seasons" element={<SeasonsIndex />} />
        <Route path="/seasons/:slug" element={<SeasonDetail />} />
        <Route path="/players" element={<PlayersIndex />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
        <Route path="/judges" element={<JudgesIndex />} />
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
        <Route path="/deck-builder" element={<DeckBuilderIndex />} />
        <Route path="/changelog" element={<ChangelogIndex />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
