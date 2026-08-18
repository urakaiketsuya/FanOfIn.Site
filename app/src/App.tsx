import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import AppRoutes from "./routes";
import SyncStatus from "./components/SyncStatus";
import RandomFlavorFooter from "./components/RandomFlavorFooter";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  // Card catalog
  { to: "/cards", label: "Cards" },
  { to: "/sets", label: "Sets" },
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

function mobileNavLinkClass({ isActive }: { isActive: boolean }) {
  return `block rounded px-3 py-2 text-sm font-medium ${
    isActive ? "bg-ctp-surface0 text-ctp-blue" : "text-ctp-subtext1 hover:text-ctp-text"
  }`;
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      <header className="border-b border-ctp-surface0">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="shrink-0 text-sm font-semibold text-ctp-blue md:hidden">
            GA Explorer
          </Link>

          <nav className="hidden flex-wrap items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <SyncStatus />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="rounded-md border border-ctp-surface1 p-1.5 text-ctp-subtext1 hover:text-ctp-text md:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                {menuOpen ? (
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                ) : (
                  <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-ctp-surface0 px-4 py-2 md:hidden">
            <div className="grid grid-cols-2 gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={mobileNavLinkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main>
        <AppRoutes />
      </main>
      <RandomFlavorFooter />
    </div>
  );
}
