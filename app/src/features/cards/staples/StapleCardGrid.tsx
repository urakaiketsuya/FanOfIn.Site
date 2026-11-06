import { Link } from "react-router-dom";
import type { CardStaplesData, StapleRow } from "@gatcg/shared";
import CardArtTile from "../../../components/CardArtTile";
import type { useCardsByNames } from "../../events/useCardsByNames";
import { titleCase } from "./staplesPresentation";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** One staple card per tile: art, name, inclusion bar and usual copies. Shared by the Staples
 * page and champion pages so both show the same rows with the same calculations. At most 3
 * columns, inside the site's 4-column card-grid cap. */
export default function StapleCardGrid({ data, rows, population, art, unit = "decks", showCopies = true, showRank = true, heading: Heading = "h2" }: {
  data: CardStaplesData; rows: StapleRow[]; population: number | null; art: ReturnType<typeof useCardsByNames>;
  unit?: "decks" | "unique lists"; showCopies?: boolean; showRank?: boolean; heading?: "h2" | "h3";
}) {
  return <>{rows.map((row, index) => {
    const card = data.cards[row[0]];
    const share = population ? row[1] / population : 0;
    const identity = <><div className="w-24 shrink-0"><CardArtTile card={art.get(card.name)} name={card.name} /></div><div className="min-w-0">{showRank && <span className="text-xs text-ctp-subtext0">#{index + 1}</span>}<Heading className="mt-1 break-words font-semibold text-ctp-text">{card.name}</Heading><p className="mt-2 text-xs text-ctp-subtext1">{card.elements.map(titleCase).join(" · ")}{card.championLevel !== null ? ` · Level ${card.championLevel}` : ""}</p></div></>;
    return <article key={card.id} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" aria-label={card.name}>
      {card.slug ? <Link to={`/cards/${card.slug}`} className="flex gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{identity}</Link> : <div className="flex gap-3">{identity}</div>}
      {card.keywords.length > 0 && <p className="mt-3 break-words text-xs text-ctp-subtext1">{card.keywords.join(" · ")}</p>}
      <div className="mt-3 flex items-baseline justify-between gap-2"><strong className="text-xl text-ctp-blue">{population === null ? "—" : percent(share)}</strong><span className="text-xs text-ctp-subtext1">{row[1].toLocaleString()} {unit}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ctp-surface0" aria-hidden="true"><div className="h-full bg-ctp-blue" style={{ width: percent(share) }} /></div>
      {showCopies && <p className="mt-2 text-xs text-ctp-subtext1">Usually {row[3]} {row[3] === 1 ? "copy" : "copies"}</p>}
    </article>;
  })}</>;
}
