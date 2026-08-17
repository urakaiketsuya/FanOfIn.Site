import { NavLink } from "react-router-dom";
import AppRoutes from "./routes";
import SyncStatus from "./components/SyncStatus";
import RandomFlavorFooter from "./components/RandomFlavorFooter";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  // Card catalog
  { to: "/cards", label: "Cards" },
  { to: "/sets", label: "Sets" },
  { to: "/thema", label: "Thema" },
  // Tournaments & people
  { to: "/tournaments", label: "Tournaments" },
  { to: "/seasons", label: "Seasons" },
  { to: "/players", label: "Players" },
  { to: "/judges", label: "Judges" },
  // Deck analysis
  { to: "/champions", label: "Champions" },
  { to: "/archetypes", label: "Archetypes" },
  { to: "/top-decks", label: "Top Decks" },
  { to: "/popular-decks", label: "Popular Decks" },
  // Tools
  { to: "/compare", label: "Compare" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded px-3 py-1.5 text-sm font-medium ${
    isActive ? "bg-ctp-surface0 text-ctp-blue" : "text-ctp-subtext1 hover:text-ctp-text"
  }`;
}

export default function App() {
  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      <header className="border-b border-ctp-surface0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <SyncStatus />
        </div>
      </header>
      <main>
        <AppRoutes />
      </main>
      <RandomFlavorFooter />
    </div>
  );
}
