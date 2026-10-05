import type { AccountUser } from "@gatcg/shared";
import { Link } from "react-router-dom";
import HomeDeckInsight from "./HomeDeckInsight";
import HomeDiscovery from "./HomeDiscovery";

const PATHS = [
  { title: "Explore decks", body: "Find your next tournament list", to: "/decks" },
  { title: "Build a deck", body: "Start with your champion", to: "/deck-builder" },
  { title: "My collection", body: "Track cards and missing copies", to: "/collection" },
  { title: "Analyze a deck", body: "Test consistency and damage", to: "/deck-analysis" },
] as const;
const homeLinkClass = "inline-flex min-h-12 items-center rounded-lg px-3 text-sm font-semibold text-ctp-blue hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";

export default function AboutIntro({ user }: { user: AccountUser | null }) {
  return <div data-component="About">
    <section className="border-b border-ctp-surface0 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {user && <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ctp-mantle p-4">
          <p className="min-w-0 break-words font-semibold">Welcome back, {user.displayName}</p>
          <Link to="/decks/edit" className={homeLinkClass}>Continue your decks →</Link>
        </div>}
        <p className="text-xs font-semibold uppercase tracking-widest text-ctp-subtext0">Grand Archive · Fan of Insight</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Your next deck starts <span className="text-ctp-blue">with insight.</span></h1>
        <p className="mt-4 max-w-2xl text-base text-ctp-subtext1">Explore tournament lists, find your playstyle, and build with the cards you own.</p>
        <nav aria-label="Start here" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PATHS.map(path => <Link key={path.to} to={path.to} className="min-w-0 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-4 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">
            <span className="block font-semibold text-ctp-blue">{path.title} <span aria-hidden="true">→</span></span>
            <span className="mt-2 block text-sm text-ctp-subtext1">{path.body}</span>
          </Link>)}
        </nav>
      </div>
    </section>
    <HomeDiscovery />
    <HomeDeckInsight />
    <nav aria-label="More from Fan of Insight" className="mx-auto flex max-w-5xl flex-wrap gap-2 border-t border-ctp-surface0 px-4 py-6">
      <Link to="/methodology" className={homeLinkClass}>How we calculate results</Link>
      <Link to="/changelog" className={homeLinkClass}>What’s new</Link>
      <Link to="/docs/api" className={homeLinkClass}>Build with our API</Link>
    </nav>
  </div>;
}
