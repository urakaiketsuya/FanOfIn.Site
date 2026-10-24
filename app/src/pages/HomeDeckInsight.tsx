import { useMemo } from "react";
import { Link } from "react-router-dom";
import CardArtTile from "../components/CardArtTile";
import CardsSeenReport from "../components/CardsSeenReport";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { computeDeckAnalysisReport } from "../lib/deckAnalysisReport";
import { HOME_EXAMPLE_DECK } from "./homeExampleDeck";

const CARD_NAMES = [...HOME_EXAMPLE_DECK.main, ...HOME_EXAMPLE_DECK.material].map((line) => line.name);
const FEATURED = ["Silvie, With the Pack", "Storm Slime", "Backup Charger"];

export default function HomeDeckInsight() {
  const cards = useCardsByNames(CARD_NAMES);
  const report = useMemo(() => computeDeckAnalysisReport(HOME_EXAMPLE_DECK.main, HOME_EXAMPLE_DECK.material, cards), [cards]);
  return <section className="border-t border-ctp-surface0 px-4 py-8 sm:px-8 sm:py-10" aria-labelledby="home-insight-heading">
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Draw consistency</p>
      <h2 id="home-insight-heading" className="mt-3 text-xl font-bold text-ctp-text sm:text-2xl">How many cards will I see?</h2>
      <p className="mt-3 text-sm text-ctp-subtext1">Silvie · {report.size}-card Main Deck · going first</p>
      <div className="mt-6 grid gap-6 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          {report.unresolved.length ? <p role="status" className="text-sm text-ctp-subtext1">Draw forecast awaiting card data.</p> : <CardsSeenReport points={report.checkpoints.filter((point) => point.order === "first")} deckSize={report.size} hasExtraDraws={report.sources.length > 0} />}
          <Link to="/decks/xenbr4?tab=performance" className="mt-5 inline-flex min-h-12 items-center rounded-lg border border-ctp-blue/60 px-4 py-2 text-sm font-semibold text-ctp-blue hover:bg-forest-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Open the full deck analysis →</Link>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-ctp-subtext1">Featured draw cards</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">{FEATURED.map((name) => {
            const card = cards.get(name);
            const content = <><CardArtTile card={card} name={name} /><span className="mt-2 block text-xs">{name}</span></>;
            return card ? <Link key={name} to={`/cards/${card.slug}`} className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={name}>{content}</div>;
          })}</div>
        </div>
      </div>
      <Link to="/deck-analysis" className="mt-4 inline-flex min-h-12 items-center rounded text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">Analyze your own deck →</Link>
    </div>
  </section>;
}
