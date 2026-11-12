import "./HomeMotion.css";
import type { AccountUser } from "@gatcg/shared";
import { Link } from "react-router-dom";
import HomeDamageForecast from "./HomeDamageForecast";
import HomeDiscovery from "./HomeDiscovery";
import HomeMatchRecaps from "./HomeMatchRecaps";
import HomeReturnDeck from "./HomeReturnDeck";
import { HomeFeaturedDeck } from "./HomeTournamentHighlights";

const homeLinkClass = "inline-flex min-h-12 items-center rounded-lg px-3 text-sm font-semibold text-ctp-blue hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";

export default function AboutIntro({ user }: { user: AccountUser | null }) {
  return <div data-component="About">
    <section className="home-hero border-b border-ctp-surface0 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {user && <HomeReturnDeck key={user.id} user={user} />}
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-ctp-subtext0">Grand Archive · Fan of Insight</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Your next deck starts <span className="text-ctp-blue">with insight.</span></h1>
        <p className="mt-4 max-w-2xl text-base text-ctp-subtext1">Explore tournament decks, catch up on match recaps, and see how your deck performs.</p>
        <nav aria-label="Start here" className="mt-6 flex flex-wrap gap-3">
          <Link to="/decks" className="inline-flex min-h-12 items-center rounded-lg bg-ctp-blue px-5 font-semibold text-ctp-base hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore decks →</Link>
          <Link to="/deck-builder" className="inline-flex min-h-12 items-center rounded-lg border border-ctp-surface1 px-5 font-semibold hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Build a deck</Link>
        </nav>
        <nav aria-label="Your tools" className="mt-2 flex flex-wrap gap-1">
          <Link to="/collection" className={homeLinkClass}>My collection →</Link>
          <Link to="/deck-analysis" className={homeLinkClass}>Deck report →</Link>
        </nav>
        </div>
        <HomeFeaturedDeck />
        </div>
      </div>
    </section>
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-8 sm:py-10 lg:grid-cols-2">
      <HomeMatchRecaps />
      <HomeDamageForecast />
    </div>
    <HomeDiscovery />
    <nav aria-label="More from Fan of Insight" className="mx-auto flex max-w-5xl flex-wrap gap-2 border-t border-ctp-surface0 px-4 py-6">
      <Link to="/methodology" className={homeLinkClass}>How we calculate results</Link>
      <Link to="/changelog" className={homeLinkClass}>What’s new</Link>
      <Link to="/docs/api" className={homeLinkClass}>Build with our API</Link>
    </nav>
  </div>;
}
