import type { AccountUser } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardImage from "../components/CardImage";
import HomeDeckInsight from "./HomeDeckInsight";
import HomeDamageForecast from "./HomeDamageForecast";

const PATHS = [
  { number: "01", title: "Explore decks", body: "Find tournament lists and see the choices behind them.", action: "Browse tournament decks", to: "/decks" },
  { number: "02", title: "Build a deck", body: "Choose a champion and spirit, then get recommendations from real lists.", action: "Open deck builder", to: "/deck-builder" },
  { number: "03", title: "Analyze my deck", body: "Check your list's consistency and find opportunities to improve it.", action: "Open deck analysis", to: "/deck-analysis" },
] as const;

export default function AboutIntro({ user }: { user: AccountUser | null }) {
  return (
    <div data-component="About">
      <section className="border-b border-ctp-surface0 px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-center md:gap-8 lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-subtext0">Grand Archive deck tools</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ctp-text sm:text-5xl">
              Build better decks with <span className="text-ctp-blue">real tournament data.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ctp-subtext1 sm:text-lg">
              Discover proven lists, understand the card choices, and make your next build with more confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/decks" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ctp-blue px-7 py-3.5 text-sm font-semibold text-ctp-crust transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Find a proven deck</Link>
              <Link to="/deck-builder" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ctp-surface1 bg-ctp-mantle px-7 py-3.5 text-sm font-semibold text-ctp-blue hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Start building <span aria-hidden="true" className="ml-2">→</span></Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-forest-surface bg-forest-surface/40 p-5 shadow-xl shadow-black/20" aria-label="Featured tournament deck">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ctp-blue">Featured deck · Silvie</p>
              <span className="rounded-full bg-forest-surface px-2.5 py-1 text-[11px] font-semibold text-ctp-blue">Tera / Wind</span>
            </div>
            <div className="mt-5 flex justify-center rounded-xl bg-ctp-crust/30 py-4">
              <Link to="/decks/xenbr4" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue" aria-label="Explore the Silvie deck">
                <CardImage image="/cards/images/tiptrzblqr.jpg" alt="Silvie card" className="h-52 w-36 rounded-lg border border-ctp-surface1 object-cover object-top shadow-xl" />
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-3 divide-x divide-ctp-surface1 text-center">
              <div className="px-1"><p className="text-xl font-bold text-ctp-text">55</p><p className="mt-1 text-[11px] text-ctp-subtext1">records</p></div>
              <div className="px-1"><p className="text-xl font-bold text-ctp-text">20</p><p className="mt-1 text-[11px] text-ctp-subtext1">events</p></div>
              <div className="px-1"><p className="text-xl font-bold text-ctp-text">4th</p><p className="mt-1 text-[11px] text-ctp-subtext1">best finish</p></div>
            </div>
            <Link to="/decks/xenbr4" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-ctp-blue/60 px-4 py-2 text-sm font-semibold text-ctp-blue hover:bg-forest-surface/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore this deck <span aria-hidden="true" className="ml-2">→</span></Link>
            <p className="mt-3 text-center text-[11px] text-ctp-subtext0">Historical tournament snapshot through September 2024</p>
          </aside>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 sm:py-12" aria-labelledby="home-paths-heading">
        <div className="mx-auto max-w-5xl">
          {user && (
            <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-forest-surface bg-forest-surface/35 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-ctp-text">Welcome back, {user.displayName}</p><p className="mt-1 text-sm text-ctp-subtext1">Pick up where you left off.</p></div>
              <Link to="/decks/edit" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ctp-blue/60 px-4 py-2 text-sm font-semibold text-ctp-blue hover:bg-forest-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Continue your decks</Link>
            </div>
          )}
          <h2 id="home-paths-heading" className="text-2xl font-bold text-ctp-text sm:text-3xl">What would you like to do?</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PATHS.map((path) => (
              <Link key={path.to} to={path.to} className="group flex min-h-48 flex-col rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5 transition-colors hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">
                <span className="text-xs font-semibold tracking-widest text-ctp-blue">{path.number}</span>
                <h3 className="mt-4 text-xl font-semibold text-ctp-text">{path.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ctp-subtext1">{path.body}</p>
                <span className="mt-auto pt-5 text-sm font-semibold text-ctp-blue group-hover:underline">{path.action} <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-ctp-surface0 px-6 pt-10 sm:px-8 sm:pt-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-ctp-text sm:text-3xl">See what you can learn from a deck</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ctp-subtext1 sm:text-base">Two real lists show how card choices change draw consistency and damage potential.</p>
        </div>
      </div>
      <HomeDeckInsight />
      <HomeDamageForecast />

      <section className="border-t border-ctp-surface0 bg-ctp-mantle/40 px-6 py-10 sm:px-8 sm:py-12" aria-labelledby="home-trust-heading">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 id="home-trust-heading" className="text-lg font-semibold text-ctp-text">Know what the numbers mean.</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-ctp-subtext1">Our analysis uses real event decklists. Results depend on the available sample, so we show the context behind the numbers.</p></div>
          <Link to="/methodology" className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">How we calculate results <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
        <div className="mx-auto mt-8 max-w-5xl border-t border-ctp-surface0 pt-5 text-sm text-ctp-subtext0">Looking for the latest additions? <Link to="/changelog" className="text-ctp-blue hover:underline">See what’s new</Link>.</div>
      </section>
    </div>
  );
}
