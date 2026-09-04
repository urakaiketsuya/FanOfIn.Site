import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AppRoutes from "./routes";
import RandomFlavorFooter from "./components/RandomFlavorFooter";
import LoadingBar from "./components/LoadingBar";
import FeatureBanner from "./components/FeatureBanner";
import { initAnalytics, trackPageview } from "./lib/analytics";

interface NavLinkItem { to: string; label: string }
interface NavGroup { label: string; paths: string[]; links: NavLinkItem[] }

const NAV_GROUPS: NavGroup[] = [
  { label: "Cards", paths: ["/cards", "/champions", "/archetypes"], links: [{ to: "/cards", label: "Browse Cards" }, { to: "/cards/stats", label: "Card Stats" }, { to: "/cards/packages", label: "Card Packages" }, { to: "/cards?tab=sets", label: "Sets" }, { to: "/champions", label: "Champions" }, { to: "/archetypes", label: "Archetypes" }] },
  { label: "Decks", paths: ["/decks", "/decklists", "/shared-decks", "/community-decks", "/users", "/my-decks", "/collection", "/official-decks", "/pantheon"], links: [{ to: "/decks", label: "Tournament Decks" }, { to: "/shared-decks", label: "Community Decks" }, { to: "/my-decks", label: "My Decks" }, { to: "/collection", label: "My Collection" }, { to: "/official-decks", label: "Official Decks" }, { to: "/pantheon", label: "Pantheon Decks" }, { to: "/community-decks", label: "Deck Trends" }] },
  { label: "Competition", paths: ["/tournaments", "/seasons", "/players", "/teams", "/timelines"], links: [{ to: "/tournaments", label: "Tournaments" }, { to: "/seasons", label: "Seasons" }, { to: "/players", label: "Players" }, { to: "/players?tab=judges", label: "Judges" }, { to: "/teams", label: "Teams" }, { to: "/timelines", label: "Match Timelines" }] },
  { label: "Tools", paths: ["/compare", "/deck-builder", "/card-discovery", "/looking-for", "/regions", "/simulator", "/diao-review"], links: [{ to: "/compare", label: "Compare Decks" }, { to: "/deck-builder", label: "Deck Builder" }, { to: "/card-discovery", label: "Find New Cards" }, { to: "/looking-for", label: "Looking For" }, { to: "/regions", label: "Regional Analysis" }, { to: "/simulator", label: "Simulator" }, { to: "/diao-review", label: "DIAO Score Review" }] },
  { label: "More", paths: ["/achievements", "/changelog", "/media-kit", "/settings", "/methodology"], links: [{ to: "/achievements", label: "Achievements" }, { to: "/media-kit", label: "Media Kit" }, { to: "/changelog", label: "Changelog" }, { to: "/methodology", label: "Methodology" }, { to: "/settings", label: "Display Settings" }] },
];

function linkClass(active: boolean) {
  return `block rounded px-3 py-2 text-sm font-medium ${active ? "bg-ctp-surface0 text-ctp-blue" : "text-ctp-subtext1 hover:bg-ctp-base hover:text-ctp-text"}`;
}

function linkIsActive(pathname: string, search: string, to: string) {
  const target = new URL(to, window.location.origin);
  if (pathname !== target.pathname) return false;
  const current = new URLSearchParams(search);
  if (!target.search) return !current.has("tab");
  return Array.from(new URLSearchParams(target.search)).every(([key, value]) => current.get(key) === value);
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const location = useLocation();
  const isActive = (to: string) => linkIsActive(location.pathname, location.search, to);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return <div className="min-h-screen bg-ctp-base text-ctp-text">
    <header className="sticky top-0 z-40 border-b border-ctp-surface0 bg-ctp-base/95 backdrop-blur">
      <FeatureBanner />
      <div className="relative">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="shrink-0 font-semibold tracking-tight text-ctp-blue">Fan of Insight</Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {NAV_GROUPS.map((group) => {
              const active = group.paths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
              const open = openGroup === group.label;
              const menuId = `nav-links-${group.label.toLowerCase()}`;
              return <div key={group.label} className="relative" onMouseEnter={() => setOpenGroup(group.label)} onMouseLeave={() => setOpenGroup(null)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenGroup(null); }} onKeyDown={(event) => { if (event.key === "Escape") setOpenGroup(null); }}>
                <button type="button" aria-expanded={open} aria-controls={menuId} onClick={() => setOpenGroup(open ? null : group.label)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-ctp-surface0 text-ctp-blue" : "text-ctp-subtext1 hover:bg-ctp-mantle hover:text-ctp-text"}`}>{group.label}<span aria-hidden="true" className="ml-1 text-[10px] text-ctp-subtext0">▾</span></button>
                <div id={menuId} className={`absolute right-0 top-full z-50 min-w-52 pt-2 transition-opacity duration-150 ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
                  <div className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-1.5 shadow-xl shadow-black/20">{group.links.map((link) => <Link key={link.to} to={link.to} aria-current={isActive(link.to) ? "page" : undefined} className={linkClass(isActive(link.to))} onClick={() => setOpenGroup(null)}>{link.label}</Link>)}</div>
                </div>
              </div>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/account" aria-current={location.pathname === "/account" ? "page" : undefined} className={`hidden rounded-md border px-3 py-1.5 text-sm md:block ${location.pathname === "/account" ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>Account</Link>
            <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="mobile-nav" className="rounded-md border border-ctp-surface1 p-1.5 text-ctp-subtext1 hover:text-ctp-text md:hidden">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{menuOpen ? <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /> : <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />}</svg>
            </button>
          </div>
        </div>
        <LoadingBar />
      </div>
      {menuOpen && <nav id="mobile-nav" className="max-h-[calc(100vh-3.75rem)] overflow-y-auto border-t border-ctp-surface0 bg-ctp-mantle px-4 py-3 md:hidden" aria-label="Mobile navigation">
        <div className="space-y-1">{NAV_GROUPS.map((group) => {
          const open = mobileGroup === group.label;
          const groupId = `mobile-links-${group.label.toLowerCase()}`;
          return <section key={group.label} className="border-b border-ctp-surface0 pb-1 last:border-0">
            <h2><button type="button" aria-expanded={open} aria-controls={groupId} onClick={() => setMobileGroup(open ? null : group.label)} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm font-semibold text-ctp-text"><span>{group.label}</span><span aria-hidden="true" className="text-xs text-ctp-subtext0">{open ? "−" : "+"}</span></button></h2>
            {open && <div id={groupId} className="grid gap-1 pb-2">{group.links.map((link) => <Link key={link.to} to={link.to} aria-current={isActive(link.to) ? "page" : undefined} className={linkClass(isActive(link.to))} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}</div>}
          </section>;
        })}</div>
        <Link to="/account" aria-current={location.pathname === "/account" ? "page" : undefined} className={`mt-2 ${linkClass(location.pathname === "/account")}`} onClick={() => setMenuOpen(false)}>Account</Link>
      </nav>}
    </header>
    <main><AppRoutes /></main>
    <RandomFlavorFooter />
  </div>;
}
