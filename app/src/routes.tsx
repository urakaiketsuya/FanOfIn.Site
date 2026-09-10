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

// Champion Synergy became the default champion page; the old dedicated /synergy path now just
// points at the same URL its content already lives at, preserving any existing bookmarks/links.
function ChampionSynergyRedirect() {
  const { name = "" } = useParams<{ name: string }>();
  return <Navigate to={`/champions/${name}`} replace />;
}

// Every deck-viewing page now lives under /decks — a publicly shared deck used to be a completely
// differently-named route (/decklists/:publicSlug, browsed from /shared-decks), inconsistent with
// /decks/:hash (tournament) and /pantheon/decks/:id right next to it. Old links/bookmarks/anything
// already shared via "Copy link" keep working through these redirects.
function PublicDeckDetailRedirect() {
  const { publicSlug = "" } = useParams<{ publicSlug: string }>();
  return <Navigate to={`/decks/${encodeURIComponent(publicSlug)}`} replace />;
}
function SharedDecksRedirect() {
  return <Navigate to="/decks/shared" replace />;
}
// A shared deck's own detail page moved one level up again — /decks/shared/:publicSlug folded
// directly into /decks/:id, right alongside tournament deck hashes, so every individual deck page
// (shared or tournament) shares one flat URL shape. Links/bookmarks from the brief window that path
// was live keep working.
function SharedDeckDetailRedirect() {
  const { publicSlug = "" } = useParams<{ publicSlug: string }>();
  return <Navigate to={`/decks/${encodeURIComponent(publicSlug)}`} replace />;
}

// /my-decks moved under the same /decks namespace as every other deck page — the list at
// /decks/edit (mirroring /decks/shared as an index), and each saved deck's own edit page folded
// straight into /decks/:id, right alongside tournament and shared decks (see
// SAVED_DECK_ID_PATTERN above). Old links/bookmarks keep working through these redirects.
function MyDecksIndexRedirect() {
  return <Navigate to="/decks/edit" replace />;
}
function MyDeckDetailRedirect() {
  const { deckId = "" } = useParams<{ deckId: string }>();
  return <Navigate to={`/decks/${encodeURIComponent(deckId)}`} replace />;
}

// Lazy-loaded so each route's JS is a separate chunk, fetched on demand — previously the whole
// app (every page) shipped as one bundle regardless of which page a visitor actually opened.
const CardsBrowse = lazy(() => import("./features/cards/CardsBrowse"));
const CardDetail = lazy(() => import("./features/cards/CardDetail"));
const CardStatsIndex = lazy(() => import("./features/cards/CardStatsIndex"));
const PackagesIndex = lazy(() => import("./features/cards/PackagesIndex"));
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
const ArchetypeCompare = lazy(() => import("./features/archetypes/ArchetypeCompare"));
const BattleChart = lazy(() => import("./features/archetypes/BattleChart"));
const ChampionsIndex = lazy(() => import("./features/champions/ChampionsIndex"));
const ChampionDetail = lazy(() => import("./features/champions/ChampionDetail"));
const ChampionSynergy = lazy(() => import("./features/champions/ChampionSynergy"));
const CompareIndex = lazy(() => import("./features/compare/CompareIndex"));
const BrowseDecksIndex = lazy(() => import("./features/decks/BrowseDecksIndex"));
const DeckDetail = lazy(() => import("./features/decks/DeckDetail"));
const PantheonDeckDetail = lazy(() => import("./features/decks/PantheonDeckDetail"));
const DeckBuilderIndex = lazy(() => import("./features/deckbuilder/DeckBuilderIndex"));
const DeckReviewIndex = lazy(() => import("./features/deck-review/DeckReviewIndex"));
const GoldfishIndex = lazy(() => import("./features/goldfish/GoldfishIndex"));
const CardDiscoveryIndex = lazy(() => import("./features/card-discovery/CardDiscoveryIndex"));
const RegionsIndex = lazy(() => import("./features/regions/RegionsIndex"));
const PackOpener = lazy(() => import("./features/packs/PackOpener"));
const ChangelogIndex = lazy(() => import("./features/changelog/ChangelogIndex"));
const Methodology = lazy(() => import("./pages/Methodology"));
const CommunityDecksIndex = lazy(() => import("./features/community/CommunityDecksIndex"));
const SimulatorIndex = lazy(() => import("./features/simulator/SimulatorIndex"));
const TimelinesIndex = lazy(() => import("./features/timelines/TimelinesIndex"));
const TimelineDetail = lazy(() => import("./features/timelines/TimelineDetail"));
const CombosIndex = lazy(() => import("./features/timelines/CombosIndex"));
const OfficialProductsIndex = lazy(() => import("./features/official-products/OfficialProductsIndex"));
const ProductsIndex = lazy(() => import("./features/products/ProductsIndex"));
const MediaKitIndex = lazy(() => import("./features/products/MediaKitIndex"));
const LookingForIndex = lazy(() => import("./features/looking-for/LookingForIndex"));
const DiaoReviewIndex = lazy(() => import("./features/diao-review/DiaoReviewIndex"));
const MyDecksIndex = lazy(() => import("./features/account/MyDecksIndex"));
const AccountIndex = lazy(() => import("./features/account/AccountIndex"));
const VerifyEmailPage = lazy(() => import("./features/account/PasswordTokenPage").then((module) => ({ default: module.VerifyEmailPage })));
const ResetPasswordPage = lazy(() => import("./features/account/PasswordTokenPage").then((module) => ({ default: module.ResetPasswordPage })));
const MyDeckDetail = lazy(() => import("./features/account/MyDeckDetail"));
const PublicDeckDetail = lazy(() => import("./features/account/PublicDeckDetail"));
const SharedDecksIndex = lazy(() => import("./features/account/SharedDecksIndex"));
const PublicUserProfile = lazy(() => import("./features/account/PublicUserProfile"));
const CollectionIndex = lazy(() => import("./features/collection/CollectionIndex"));
const SettingsIndex = lazy(() => import("./features/settings/SettingsIndex"));

// /decks/:id serves tournament decks, publicly shared decks, and a signed-in user's own saved
// decks from one flat namespace, dispatching to whichever one actually owns the id — no network
// probe needed, since the three id spaces never overlap in shape. Tournament hashes (`shortHash()`,
// shared/src/hash.ts) are base-36 of a 32-bit int, at most 7 lowercase alphanumeric characters, and
// never contain a dash. Shared-deck slugs (account-worker/src/decks.ts) are `crypto.randomUUID()`
// with dashes stripped — always exactly 32 lowercase hex characters, also never a dash. A saved
// deck's own id is that same `crypto.randomUUID()` with its dashes intact, so it's the only one of
// the three that ever matches a dash-containing pattern. Ownership itself is still enforced
// server-side (account-worker's getDeck scopes every lookup to the signed-in user), so a saved-deck
// id belonging to someone else just renders MyDeckDetail's own "not found" state, not a data leak.
const PUBLIC_SLUG_PATTERN = /^[0-9a-f]{32}$/;
const SAVED_DECK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function DeckOrPublicDeckDetail() {
  const { id = "" } = useParams<{ id: string }>();
  if (SAVED_DECK_ID_PATTERN.test(id)) return <MyDeckDetail />;
  return PUBLIC_SLUG_PATTERN.test(id) ? <PublicDeckDetail /> : <DeckDetail />;
}

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
        <Route path="/cards/packages" element={<PackagesIndex />} />
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
        <Route path="/archetypes/compare" element={<ArchetypeCompare />} />
        <Route path="/archetypes/:id" element={<ArchetypeDetail />} />
        <Route path="/battle-chart" element={<BattleChart />} />
        <Route path="/top-decks" element={<TopDecksRedirect />} />
        <Route path="/champions" element={<ChampionsIndex />} />
        <Route path="/champions/:name" element={<ChampionSynergy />} />
        <Route path="/champions/:name/stats" element={<ChampionDetail />} />
        <Route path="/champions/:name/synergy" element={<ChampionSynergyRedirect />} />
        <Route path="/compare" element={<CompareIndex />} />
        <Route path="/popular-decks" element={<PopularDecksRedirect />} />
        <Route path="/decks" element={<BrowseDecksIndex />} />
        <Route path="/decks/shared" element={<SharedDecksIndex />} />
        <Route path="/decks/shared/:publicSlug" element={<SharedDeckDetailRedirect />} />
        <Route path="/decks/edit" element={<MyDecksIndex />} />
        <Route path="/decks/:id" element={<DeckOrPublicDeckDetail />} />
        <Route path="/pantheon/decks/:id" element={<PantheonDeckDetail />} />
        <Route path="/deck-builder" element={<DeckBuilderIndex />} />
        <Route path="/deck-review" element={<DeckReviewIndex />} />
        <Route path="/goldfish" element={<GoldfishIndex />} />
        <Route path="/card-discovery" element={<CardDiscoveryIndex />} />
        <Route path="/regions" element={<RegionsIndex />} />
        <Route path="/packs/:prefix" element={<PackOpener />} />
        <Route path="/changelog" element={<ChangelogIndex />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/community-decks" element={<CommunityDecksIndex />} />
        <Route path="/pantheon" element={<CommunityDecksIndex format="PANTHEON" />} />
        <Route path="/official-decks" element={<OfficialProductsIndex />} />
        <Route path="/products" element={<ProductsIndex />} />
        <Route path="/media-kit" element={<MediaKitIndex />} />
        <Route path="/looking-for" element={<LookingForIndex />} />
        <Route path="/simulator" element={<SimulatorIndex />} />
        <Route path="/timelines" element={<TimelinesIndex />} />
        <Route path="/timelines/combos" element={<CombosIndex />} />
        <Route path="/timelines/:id" element={<TimelineDetail />} />
        <Route path="/diao-review" element={<DiaoReviewIndex />} />
        <Route path="/collection" element={<CollectionIndex />} />
        <Route path="/account" element={<AccountIndex />} />
        <Route path="/account/verify-email" element={<VerifyEmailPage />} />
        <Route path="/account/reset-password" element={<ResetPasswordPage />} />
        <Route path="/settings" element={<SettingsIndex />} />
        <Route path="/my-decks" element={<MyDecksIndexRedirect />} />
        <Route path="/my-decks/:deckId" element={<MyDeckDetailRedirect />} />
        <Route path="/decklists/:publicSlug" element={<PublicDeckDetailRedirect />} />
        <Route path="/shared-decks" element={<SharedDecksRedirect />} />
        <Route path="/users/:profileSlug" element={<PublicUserProfile />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
