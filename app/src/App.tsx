import RouteBreadcrumbs from "./components/RouteBreadcrumbs";
import DiscordIcon from "./components/DiscordIcon";
import { NAV_ENTRIES, entryIsActive, linkIsActive } from "./lib/navigation";
import MenuDetails from "./components/ui/MenuDetails";
import AuroraBackground from "./components/AuroraBackground";
import ConnectivityNotice from "./components/ui/toast/ConnectivityNotice";
import ToastViewport from "./components/ui/toast/ToastViewport";
import DisclosureChevron from "./components/DisclosureChevron";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AppRoutes from "./routes";
import RandomFlavorFooter from "./components/RandomFlavorFooter";
import LoadingBar from "./components/LoadingBar";
import FeatureBanner from "./components/FeatureBanner";
import { initAnalytics, trackPageview } from "./lib/analytics";

function linkClass(active: boolean) {
  return `flex min-h-control items-center rounded px-3 py-2 text-sm font-medium ${active ? "bg-forest-surface text-ctp-blue ring-1 ring-inset ring-ctp-blue/40" : "text-ctp-subtext1 hover:bg-ctp-base hover:text-ctp-text"}`;
}

export default function App() {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const location = useLocation();
  const isActive = (to: string) => linkIsActive(location.pathname, location.search, to);

  useEffect(() => {
    setMenuOpen(false);
    setMobileGroup(null);
  }, [location.key]);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return <div data-component="App" className="relative isolate min-h-screen bg-ctp-base text-ctp-text">
    <AuroraBackground />
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ctp-base focus:p-4 focus:text-ctp-blue">Skip to content</a>
    {!["/deck-builder", "/decks/draft", "/decks/new"].includes(location.pathname) && <FeatureBanner />}
    <header className="sticky top-0 z-40 flex max-h-dvh flex-col border-b border-ctp-surface0 bg-ctp-base/95 backdrop-blur">
      <div className="relative">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex min-h-control shrink-0 items-center font-semibold tracking-tight text-ctp-blue">Fan of Insight</Link>
          <nav className="hidden min-w-0 flex-wrap items-center gap-1 xl:flex" aria-label="Primary navigation">
            {NAV_ENTRIES.map((entry) => {
              if (entry.kind === "link") {
                return (
                  <Link
                    key={entry.to}
                    to={entry.to} target={entry.external ? "_blank" : undefined} rel={entry.external ? "noopener noreferrer" : undefined} aria-label={entry.external ? `${entry.label} (opens in a new tab)` : undefined}
                    aria-current={entryIsActive(entry, location.pathname) ? (isActive(entry.to) ? "page" : "location") : undefined}
                    className={`flex min-h-control items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${entryIsActive(entry, location.pathname) ? "bg-forest-surface text-ctp-blue ring-1 ring-inset ring-ctp-blue/40" : "text-ctp-subtext1 hover:bg-ctp-mantle hover:text-ctp-text"}`}
                  >
                    {entry.icon === "discord" && <DiscordIcon />}{entry.label}
                  </Link>
                );
              }
              const group = entry;
              const active = entryIsActive(group, location.pathname);
              return <MenuDetails key={group.label} className="relative group/nav">
                <summary className={`flex min-h-control min-w-control cursor-pointer list-none items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden ${active ? "bg-forest-surface text-ctp-blue ring-1 ring-inset ring-ctp-blue/40" : "text-ctp-subtext1 hover:bg-ctp-mantle hover:text-ctp-text"}`}>{group.label}<DisclosureChevron className="ml-1 group-open/nav:rotate-180" /></summary>
                <div className="absolute right-0 top-full z-50 min-w-52 pt-2">
                  <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain rounded-xl border border-ctp-surface1 bg-ctp-mantle p-1.5 shadow-xl shadow-black/20">{group.links.map((link) => <Link key={link.to} to={link.to} aria-current={isActive(link.to) ? "page" : undefined} className={linkClass(isActive(link.to))}>{link.label}</Link>)}</div>
                </div>
              </MenuDetails>;

            })}
          </nav>
          <div className="flex items-center gap-2">
            <button ref={menuButtonRef} type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="mobile-nav" className="flex min-h-control min-w-control items-center justify-center rounded-md border border-ctp-surface1 p-2 text-ctp-subtext1 hover:text-ctp-text xl:hidden">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{menuOpen ? <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /> : <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />}</svg>
            </button>
          </div>
        </div>
        <LoadingBar />
      </div>
      {menuOpen && <nav id="mobile-nav" onKeyDown={(event) => { if (event.key === "Escape") { setMenuOpen(false); menuButtonRef.current?.focus(); } }} className="min-h-0 overflow-y-auto overscroll-contain border-t border-ctp-surface0 bg-ctp-mantle px-4 py-3 xl:hidden" aria-label="Mobile navigation">
        <div className="space-y-1">{NAV_ENTRIES.map((entry) => {
          if (entry.kind === "link") {
            return (
              <section key={entry.to} className="border-b border-ctp-surface0 pb-1 last:border-0">
                <Link to={entry.to} target={entry.external ? "_blank" : undefined} rel={entry.external ? "noopener noreferrer" : undefined} aria-label={entry.external ? `${entry.label} (opens in a new tab)` : undefined} aria-current={entryIsActive(entry, location.pathname) ? (isActive(entry.to) ? "page" : "location") : undefined} className={linkClass(entryIsActive(entry, location.pathname))} onClick={() => { setMenuOpen(false); setMobileGroup(null); menuButtonRef.current?.focus(); }}>{entry.icon === "discord" && <DiscordIcon />}{entry.label}</Link>
              </section>
            );
          }
          const group = entry;
          const open = mobileGroup === group.label;
          const groupId = `mobile-links-${group.label.toLowerCase()}`;
          return <section key={group.label} className="border-b border-ctp-surface0 pb-1 last:border-0">
            <h2><button type="button" aria-expanded={open} aria-controls={groupId} onClick={() => setMobileGroup(open ? null : group.label)} className={`${linkClass(entryIsActive(group, location.pathname))} w-full justify-between text-left font-semibold`}><span>{group.label}</span><DisclosureChevron className={open ? "rotate-180" : ""} /></button></h2>
            {open && <div id={groupId} className="grid gap-1 pb-2">{group.links.map((link) => <Link key={link.to} to={link.to} aria-current={isActive(link.to) ? "page" : undefined} className={linkClass(isActive(link.to))} onClick={() => { setMenuOpen(false); setMobileGroup(null); menuButtonRef.current?.focus(); }}>{link.label}</Link>)}</div>}
          </section>;
        })}</div>
      </nav>}
      <ConnectivityNotice />
      <ToastViewport />
    </header>
    <main id="main-content" tabIndex={-1}><RouteBreadcrumbs /><AppRoutes /></main>
    <RandomFlavorFooter />
  </div>;
}
