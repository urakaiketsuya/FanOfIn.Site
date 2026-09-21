import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import { splitDeckLabel, type ComparedDeck } from "./types";

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
  const { primary, secondary } = splitDeckLabel(deck.label);

  return (
    <div data-component="DeckChip" className={`relative w-32 shrink-0 snap-start overflow-hidden rounded-xl border transition-colors ${isBaseline ? "border-ctp-blue bg-ctp-blue/10 shadow-md shadow-ctp-blue/10" : "border-ctp-surface1 bg-ctp-surface0"}`}>
      <button type="button" onClick={onSetBaseline} aria-pressed={isBaseline} aria-label={`${deck.label}${isBaseline ? ", comparison baseline" : ", set as comparison baseline"}`} className="block w-full text-left">
        <CardHoverPreview image={championCard?.editions[0]?.image} alt={primary}>
          <div className="relative aspect-[5/3] w-full overflow-hidden bg-ctp-mantle">
            {championCard?.editions[0] && (
              <CardImage
                image={championCard.editions[0].image}
                alt={primary}
                className="h-full w-full object-cover object-[center_22%]"
              />
            )}
            {isBaseline && <span className="absolute left-1.5 top-1.5 rounded bg-ctp-blue px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ctp-crust">Baseline</span>}
          </div>
        </CardHoverPreview>
        <div className="min-w-0 p-2 pr-8 leading-tight">
          <div className={`truncate text-xs ${isBaseline ? "font-semibold text-ctp-blue" : "text-ctp-text"}`}>{primary}</div>
          {secondary && <div className="mt-0.5 truncate text-[10px] text-ctp-subtext0">{secondary}</div>}
        </div>
      </button>
      {deckHref && <Link to={deckHref} aria-label={`Open deck page for ${deck.label}`} title="Open deck page" className="absolute bottom-0 right-8 inline-flex min-h-8 min-w-8 items-center justify-center text-sm text-ctp-subtext0 hover:text-ctp-blue">↗</Link>}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${deck.label}`}
        title={`Remove ${deck.label}`}
        className="absolute bottom-0 right-0 min-h-8 min-w-8 text-ctp-subtext0 hover:text-ctp-red"
      >
        &times;
      </button>
    </div>
  );
}
