import { useMemo } from "react";
import { Link } from "react-router-dom";
import CardArtTile from "../components/CardArtTile";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { computeDeckAnalysisReport } from "../lib/deckAnalysisReport";
import { HOME_EXAMPLE_DECK } from "./homeExampleDeck";

const CARD_NAMES = [...HOME_EXAMPLE_DECK.main, ...HOME_EXAMPLE_DECK.material].map((line) => line.name);
const FEATURED = ["Silvie, With the Pack", "Storm Slime", "Backup Charger"];

export default function HomeDeckInsight() {
  const cards = useCardsByNames(CARD_NAMES);
  const report = useMemo(() => computeDeckAnalysisReport(HOME_EXAMPLE_DECK.main, HOME_EXAMPLE_DECK.material, cards), [cards]);
  const points = report.checkpoints.filter(point => point.order === "first");
  return <section className="min-w-0" aria-labelledby="home-insight-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Deck report</p>
      <h2 id="home-insight-heading" className="mt-3 text-xl font-bold sm:text-2xl">Know your deck before you shuffle</h2>
      <div className="mt-5 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5">
        <p className="font-semibold">Silvie’s draw forecast</p>
        <p className="mt-1 text-xs text-ctp-subtext1">{report.size}-card Main Deck · going first</p>
        <div className="mt-4 grid max-w-sm grid-cols-3 gap-3">{FEATURED.map(name => {
          const card = cards.get(name);
          const content = <><CardArtTile card={card} name={name} /><span className="mt-2 block break-words text-xs">{name}</span></>;
          return card ? <Link key={name} to={`/cards/${card.slug}`} className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={name}>{content}</div>;
        })}</div>
        {report.unresolved.length ? <p role="status" className="mt-5 text-sm text-ctp-subtext1">Draw forecast awaiting card data.</p> : <div className="mt-5 space-y-3" aria-label="Estimated cards seen by turn">
          {points.map(point => <div key={point.turn}>
            <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs"><span>Turn {point.turn}</span><span><strong>{point.adjustedSeen}</strong> / {report.size} cards seen</span></div>
            <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-ctp-surface0">
              <div className="bg-ctp-blue" style={{ width: `${report.size ? point.seen / report.size * 100 : 0}%` }} />
              <div className="bg-ctp-teal" style={{ width: `${report.size ? (point.adjustedSeen - point.seen) / report.size * 100 : 0}%` }} />
            </div>
          </div>)}
          <p className="text-xs text-ctp-subtext1">Blue · natural draws · Teal · estimated extra draws</p>
        </div>}
        <Link to="/deck-analysis?publicDeck=xenbr4" className="mt-3 inline-flex min-h-12 items-center rounded text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore Silvie’s report →</Link>
      </div>
      <Link to="/deck-analysis" className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-ctp-blue px-5 text-sm font-semibold text-ctp-base hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Analyze your deck →</Link>
  </section>;
}
