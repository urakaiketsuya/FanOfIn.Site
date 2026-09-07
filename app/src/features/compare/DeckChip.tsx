import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import type { ComparedDeck } from "./types";

/**
 * Compact selected-deck tile for the tray above the comparison — a champion thumbnail plus
 * player/event on two lines, instead of a single long pill of `${player} @ ${event}` text that
 * wraps unpredictably once names get long. Sighting-deck labels are always built as
 * `${player} @ ${event}` (CompareIndex/DeckSearchByCards/ImportByPlayer/ImportTopDecks all
 * construct them that way), so splitting on " @ " reliably separates the two; a pasted ("custom")
 * deck's label has no such guarantee and is shown as a single line instead.
 */
export default function DeckChip({ deck, championCard, deckHref, isBaseline, onSetBaseline, onRemove }: {
  deck: ComparedDeck;
  championCard: Card | undefined;
  deckHref?: string;
  isBaseline: boolean;
  onSetBaseline: () => void;
  onRemove: () => void;
}) {
  const atIndex = deck.label.indexOf(" @ ");
  const primary = atIndex === -1 ? deck.label : deck.label.slice(0, atIndex);
  const secondary = atIndex === -1 ? null : deck.label.slice(atIndex + 3);

  return (
    <div data-component="DeckChip" className={`flex items-center rounded-lg border py-1 pl-1 pr-2 transition-colors ${isBaseline ? "border-ctp-blue bg-ctp-blue/10 shadow-sm" : "border-ctp-surface1 bg-ctp-surface0"}`}>
      <button type="button" onClick={onSetBaseline} aria-pressed={isBaseline} aria-label={`${deck.label}${isBaseline ? ", comparison baseline" : ", set as comparison baseline"}`} className="flex min-w-0 items-center gap-2 text-left">
        <CardHoverPreview image={championCard?.editions[0]?.image} alt={primary}>
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-ctp-mantle">
            {championCard?.editions[0] && (
              <CardImage
                image={championCard.editions[0].image}
                alt={primary}
                className="h-full w-full origin-[50%_20%] scale-[3] object-cover object-top"
              />
            )}
          </div>
        </CardHoverPreview>
        <div className="min-w-0 leading-tight">
          <div className={`max-w-[10rem] truncate text-sm sm:max-w-[14rem] ${isBaseline ? "font-semibold text-ctp-blue" : "text-ctp-text"}`}>{primary}</div>
          {secondary && <div className="max-w-[10rem] truncate text-[11px] text-ctp-subtext0 sm:max-w-[14rem]">{secondary}</div>}
        </div>
        {isBaseline && <span className="shrink-0 rounded bg-ctp-blue px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ctp-crust">Baseline</span>}
      </button>
      {deckHref && <Link to={deckHref} aria-label={`Open deck page for ${deck.label}`} title="Open deck page" className="ml-2 shrink-0 text-sm text-ctp-subtext0 hover:text-ctp-blue">↗</Link>}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${deck.label}`}
        title={`Remove ${deck.label}`}
        className="ml-2 shrink-0 text-ctp-subtext0 hover:text-ctp-red"
      >
        &times;
      </button>
    </div>
  );
}
