import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import CardsBrowse from "./features/cards/CardsBrowse";
import CardDetail from "./features/cards/CardDetail";
import CardStatsIndex from "./features/cards/CardStatsIndex";
import SetsBrowse from "./features/sets/SetsBrowse";
import SetDetail from "./features/sets/SetDetail";
import ThemaLeaderboard from "./features/thema/ThemaLeaderboard";
import ThemaHistory from "./features/thema/ThemaHistory";
import EventDetail from "./features/events/EventDetail";
import TournamentsIndex from "./features/tournaments/TournamentsIndex";
import SeasonsIndex from "./features/tournaments/SeasonsIndex";
import SeasonDetail from "./features/tournaments/SeasonDetail";
import PlayersIndex from "./features/players/PlayersIndex";
import PlayerProfile from "./features/players/PlayerProfile";
import JudgesIndex from "./features/judges/JudgesIndex";
import ArchetypesIndex from "./features/archetypes/ArchetypesIndex";
import ArchetypeDetail from "./features/archetypes/ArchetypeDetail";
import BattleChart from "./features/archetypes/BattleChart";
import TopDecksIndex from "./features/topdecks/TopDecksIndex";
import ChampionsIndex from "./features/champions/ChampionsIndex";
import ChampionDetail from "./features/champions/ChampionDetail";
import CompareIndex from "./features/compare/CompareIndex";
import PopularDecksIndex from "./features/popular/PopularDecksIndex";
import DeckDetail from "./features/decks/DeckDetail";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
      <Route path="/archetypes" element={<ArchetypesIndex />} />
      <Route path="/archetypes/:signature" element={<ArchetypeDetail />} />
      <Route path="/battle-chart" element={<BattleChart />} />
      <Route path="/top-decks" element={<TopDecksIndex />} />
      <Route path="/champions" element={<ChampionsIndex />} />
      <Route path="/champions/:name" element={<ChampionDetail />} />
      <Route path="/compare" element={<CompareIndex />} />
      <Route path="/popular-decks" element={<PopularDecksIndex />} />
      <Route path="/decks/:hash" element={<DeckDetail />} />
    </Routes>
  );
}
