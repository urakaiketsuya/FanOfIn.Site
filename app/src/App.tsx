import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import AppRoutes from "./routes";
import RandomFlavorFooter from "./components/RandomFlavorFooter";

const NAV_GROUPS = [
  { label: "Explore", paths: ["/cards", "/champions", "/archetypes", "/decks"], links: [{ to: "/cards/stats", label: "Card Stats" }, { to: "/cards?tab=sets", label: "Sets" }, { to: "/champions", label: "Champions" }, { to: "/archetypes", label: "Archetypes" }, { to: "/decks", label: "Browse Decks" }] },
  { label: "Competition", paths: ["/tournaments", "/seasons", "/players", "/teams"], links: [{ to: "/tournaments", label: "Tournaments" }, { to: "/seasons", label: "Seasons" }, { to: "/players", label: "Players" }, { to: "/players?tab=judges", label: "Judges" }, { to: "/teams", label: "Teams" }] },
  { label: "Tools", paths: ["/compare", "/deck-builder", "/regions"], links: [{ to: "/compare", label: "Compare Decks" }, { to: "/deck-builder", label: "Guided Deck Builder" }, { to: "/regions", label: "Regional Analysis" }] },
  { label: "More", paths: ["/achievements", "/community-decks", "/packs", "/changelog"], links: [{ to: "/achievements", label: "Achievements" }, { to: "/community-decks", label: "Community Decks" }, { to: "/changelog", label: "Changelog" }] },
];

function mobileNavLinkClass({ isActive }: { isActive: boolean }) {
  return `block rounded px-3 py-2 text-sm font-medium ${
    isActive ? "bg-ctp-surface0 text-ctp-blue" : "text-ctp-subtext1 hover:text-ctp-text"
  }`;
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [closedGroup, setClosedGroup] = useState<string | null>(null);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      <header className="sticky top-0 z-40 border-b border-ctp-surface0 bg-ctp-base/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="shrink-0 font-semibold tracking-tight text-ctp-blue">
            Fan of Insight
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {NAV_GROUPS.map((group) => {
              const active = group.paths.some((path) => location.pathname.startsWith(path));
              return <div key={group.label} className="group relative" onMouseLeave={() => setClosedGroup(null)}>
                <button type="button" aria-haspopup="menu" className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-ctp-surface0 text-ctp-blue" : "text-ctp-subtext1 hover:bg-ctp-mantle hover:text-ctp-text"}`}>{group.label}<span className="ml-1 text-[10px] text-ctp-subtext0">▾</span></button>
                <div className={`invisible absolute right-0 top-full z-50 min-w-48 pt-2 opacity-0 transition-opacity duration-150 ${closedGroup === group.label ? "" : "group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"}`} role="menu">
                  <div className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-1.5 shadow-xl shadow-black/20">
                  {group.links.map((link) => <NavLink key={link.to} to={link.to} className={mobileNavLinkClass} role="menuitem" onClick={() => setClosedGroup(group.label)}>{link.label}</NavLink>)}
                  </div>
                </div>
              </div>;
            })}
          </nav>

          <div className="flex items-center gap-2">
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
          <nav className="border-t border-ctp-surface0 bg-ctp-mantle px-4 py-4 md:hidden" aria-label="Mobile navigation">
            <div className="grid gap-4 sm:grid-cols-2">
              {NAV_GROUPS.map((group) => <section key={group.label}>
                <h2 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-ctp-subtext0">{group.label}</h2>
                <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-1">{group.links.map((link) => <NavLink key={link.to} to={link.to} className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>{link.label}</NavLink>)}</div>
              </section>)}
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
