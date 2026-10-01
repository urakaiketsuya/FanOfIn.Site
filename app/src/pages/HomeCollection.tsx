import { Link } from "react-router-dom";
import CardArtTile from "../components/CardArtTile";
import { useCardsByNames } from "../features/events/useCardsByNames";

const EXAMPLE_CARDS = ["Dungeon Guide", "Forest Cake", "Storm Slime"];

export default function HomeCollection() {
  const cards = useCardsByNames(EXAMPLE_CARDS);

  return (
    <section className="border-t border-ctp-surface0 px-6 py-10 sm:px-8 sm:py-12" aria-labelledby="home-collection-heading">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Collection tracking</p>
        <h2 id="home-collection-heading" className="mt-3 text-2xl font-bold text-ctp-text sm:text-3xl">Know what you own. See what you can build.</h2>
        <div className="mt-6 grid gap-6 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5 sm:p-7 md:grid-cols-2 md:items-center">
          <div>
            <div className="grid grid-cols-3 gap-3">
              {EXAMPLE_CARDS.map((name) => (
                <Link key={name} to={`/cards/${name.toLowerCase().replaceAll(" ", "-")}`} className="min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">
                  <CardArtTile card={cards.get(name)} name={name} />
                  <span className="mt-2 block text-sm font-medium text-ctp-text">{name}</span>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs text-ctp-subtext0">Example cards from the featured Silvie list.</p>
          </div>
          <div>
            <p className="text-sm leading-relaxed text-ctp-subtext1 sm:text-base">Connect your collection to your decks, from the cards in your binder to the last copies you need.</p>
            <ul className="mt-4 space-y-3 text-sm text-ctp-subtext1">
              <li><strong className="text-ctp-text">Record your cards.</strong> Update owned quantities, track exact printings, or import a quantity list.</li>
              <li><strong className="text-ctp-text">Find the gaps.</strong> Check deck coverage, review missing cards, and add purchases to your collection.</li>
              <li><strong className="text-ctp-text">Lent a card to another player? Use the same cards across decks?</strong> Track exactly where each copy is.</li>
            </ul>
            <Link to="/collection" className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-ctp-blue px-4 py-3 text-sm font-semibold text-ctp-crust hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Open my collection</Link>
            <Link to="/card-locations" className="mt-2 flex min-h-12 items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Manage locations & loans</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
