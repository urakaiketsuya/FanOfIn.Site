import type { AccountUser } from "@gatcg/shared";
import { Link } from "react-router-dom";
import ClassIcon from "../components/ClassIcon";
import ElementIcon from "../components/ElementIcon";

const CLASSES = ["WARRIOR", "MAGE", "CLERIC", "ASSASSIN", "RANGER", "TAMER", "GUARDIAN"];
const ELEMENTS = ["FIRE", "WATER", "WIND", "CRUX", "UMBRA", "EXALTED", "LUXEM", "TERA"];

const ACTIONS = [
  { to: "/decks", className: "hover:border-ctp-blue", titleClassName: "text-ctp-blue", title: "Manage Your Decks", body: "Create and browse decklists with all sorts of useful analysis tools for free." },
  { to: "/deck-builder", className: "hover:border-ctp-mauve", titleClassName: "text-ctp-mauve", title: "Find Top Cards", body: "See the most used cards for each champion." },
  { to: "/collection", className: "hover:border-ctp-green", titleClassName: "text-ctp-green", title: "Easy To Get Started", body: "Import your existing decks from other sites and omnidex." },
  { to: "/decks/edit", className: "hover:border-ctp-yellow", titleClassName: "text-ctp-yellow", title: "Free Tools For Better Decks", body: "Import your existing decks to get suggestions. Find out how much damage you can do each turn and if you'll see a given card." },
] as const;

const UPDATES = [
  { to: "/deck-review", className: "hover:border-ctp-blue", title: "Deck Review", body: "Get suggestions as you build your deck." },
  { to: "/champions", className: "hover:border-ctp-mauve", title: "Champion Info", body: "The top cards of every champion for each element and level." },
  { to: "/deck-builder", className: "hover:border-ctp-green", title: "Blended Collection Tracking", body: "Add decks to your collection, then highlight which cards you use across decks for easy tracking." },
] as const;

export default function AboutIntro({ user }: { user: AccountUser | null | undefined }) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-ctp-surface0">
        <div className="pointer-events-none absolute inset-0 bg-cover bg-[center_20%]" style={{ backgroundImage: "url(https://api.gatcg.com/cards/images/gd06sut2vg.jpg)" }} />
        <div className="pointer-events-none absolute inset-0 bg-ctp-base/85" />
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:py-20">
          <h1 className="text-4xl font-bold text-ctp-blue sm:text-5xl">Fan of Insight</h1>
          <p className="mt-4 text-lg text-ctp-subtext1">&quot;Oh, it&apos;s like EDHRecs, but better.&quot;</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-ctp-subtext0">Build better decks using the same info the pros have.</p>
          <div className="mt-6 flex items-center justify-center gap-1.5">{CLASSES.map((value) => <ClassIcon key={value} cardClass={value} size={22} />)}</div>
          <div className="mt-2 flex items-center justify-center gap-1.5">{ELEMENTS.map((value) => <ElementIcon key={value} element={value} size={18} />)}</div>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/decks" className="rounded-md bg-ctp-blue px-5 py-2 text-sm font-semibold text-ctp-base hover:opacity-90">Find a proven deck</Link>
            <Link to="/collection" className="rounded-md border border-ctp-green/60 px-5 py-2 text-sm font-semibold text-ctp-green hover:border-ctp-green hover:bg-ctp-green/5">Build from my collection</Link>
            <Link to="/deck-builder" className="rounded-md border border-ctp-surface1 px-5 py-2 text-sm font-semibold text-ctp-text hover:border-ctp-mauve">Start building</Link>
          </div>
        </div>
      </section>

      <section className="border-b border-ctp-surface0 bg-ctp-mantle/40 px-4 py-10"><div className="mx-auto max-w-5xl">
        {user && <div className="mb-6 flex flex-col gap-3 rounded-xl border border-ctp-blue/40 bg-ctp-blue/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-ctp-text">Welcome back, {user.displayName}</p><p className="mt-0.5 text-sm text-ctp-subtext1">Pick up where you left off.</p></div><div className="flex flex-wrap gap-2"><Link to="/decks/edit" className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-semibold text-ctp-base hover:opacity-90">My Decks</Link><Link to="/collection" className="rounded-md border border-ctp-green/60 px-3 py-2 text-sm font-semibold text-ctp-green hover:bg-ctp-green/5">My Collection</Link><Link to="/deck-builder" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm font-semibold text-ctp-text hover:border-ctp-mauve">Continue Building</Link></div></div>}
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">What do you want to do?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ACTIONS.map((action) => <Link key={action.title} to={action.to} className={`rounded-xl border border-ctp-surface1 bg-ctp-base p-4 ${action.className}`}><p className={`text-xs font-semibold uppercase tracking-wide ${action.titleClassName}`}>{action.title}</p><p className="mt-2 text-sm text-ctp-subtext1">{action.body}</p></Link>)}</div>
      </div></section>

      <section className="border-b border-ctp-surface0 px-4 py-10"><div className="mx-auto max-w-5xl"><div className="flex items-end justify-between gap-4"><h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">New on Fan of Insight</h2><Link to="/changelog" className="shrink-0 text-xs text-ctp-blue hover:underline">Full changelog &rarr;</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{UPDATES.map((update) => <Link key={update.title} to={update.to} className={`rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4 ${update.className}`}><p className="font-semibold text-ctp-text">{update.title}</p><p className="mt-1 text-xs text-ctp-subtext1">{update.body}</p></Link>)}</div></div></section>
    </>
  );
}
