import { useHomeReveal } from "./useHomeReveal";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import CardArtTile from "../components/CardArtTile";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { computeDeckAnalysisReport } from "../lib/deckAnalysisReport";
import { HOME_EXAMPLE_DECK } from "./homeExampleDeck";

const CARD_NAMES = [...HOME_EXAMPLE_DECK.main, ...HOME_EXAMPLE_DECK.material].map((line) => line.name);
const TARGET = "Storm Slime";
const FEATURED = ["Silvie, Slime Sovereign", TARGET];

export default function HomeDeckInsight() {
  const cards = useCardsByNames(CARD_NAMES);
  const report = useMemo(() => computeDeckAnalysisReport(HOME_EXAMPLE_DECK.main, HOME_EXAMPLE_DECK.material, cards), [cards]);
  const checkpoint = report.checkpoints.findIndex(point => point.turn === 3 && point.order === "first");
  const target = report.cards.find(card => card.name === TARGET);
  const chance = target?.checkpoints[checkpoint]?.natural;
  const ready = !report.unresolved.length && target !== undefined && chance !== undefined;
  const reveal = useHomeReveal<HTMLDivElement>(ready);
  return <section className="min-w-0" aria-labelledby="home-insight-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Deck report</p>
      <h2 id="home-insight-heading" className="mt-3 text-xl font-bold sm:text-2xl">Will you find your key card?</h2>
      <div ref={reveal} className="home-report mt-5 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5">
        <p className="font-semibold">Storm Slime by turn 3</p>
        <p className="mt-1 text-xs text-ctp-subtext1">Silvie · Going first · Natural draws</p>
        <div className="home-report-art mt-4 grid max-w-64 grid-cols-2 gap-4">{FEATURED.map(name => {
          const card = cards.get(name);
          const content = <><CardArtTile card={card} name={name} /><span className="mt-2 block break-words text-xs">{name}</span></>;
          return card ? <Link key={name} to={`/cards/${card.slug}`} className="home-interactive rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={name}>{content}</div>;
        })}</div>
        {ready ? <div className="mt-5" aria-label="Storm Slime access by turn 3">
          <p className="text-4xl font-bold tracking-tight text-ctp-teal">{(chance * 100).toFixed(1)}<span className="text-2xl">%</span></p>
          <p className="mt-1 text-sm font-semibold">chance to see at least one copy</p>
          <div aria-hidden="true" className="mt-3 h-3 overflow-hidden rounded-full bg-ctp-surface0">
            <div className="home-access-fill h-full rounded-full bg-ctp-teal" style={{ width: `${chance * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-ctp-subtext1">{target.quantity} copies in a {report.size}-card Main Deck</p>
        </div> : <p role="status" className="mt-5 text-sm text-ctp-subtext1">Card access awaits complete card data.</p>}
        <Link to="/deck-analysis?publicDeck=xenbr4" className="mt-3 inline-flex min-h-12 items-center rounded text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore Silvie’s report →</Link>
      </div>
      <Link to="/deck-analysis" className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-ctp-blue px-5 text-sm font-semibold text-ctp-base hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Analyze your deck →</Link>
  </section>;
}
