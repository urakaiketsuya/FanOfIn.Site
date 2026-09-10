import { Link } from "react-router-dom";
import type { Card, CardInclusionEntry, PlayerTopCard, TopCardsBySection } from "@gatcg/shared";
import CardImage from "./CardImage";
import CardHoverPreview from "./CardHoverPreview";
import ElementIcon from "./ElementIcon";
import { VisualCardTile, VisualCommunityGate, type VisualFieldVisibility } from "./VisualCardTile";
import { useDeckPriceByName } from "../features/pricing/useDeckPriceByName";
import { usePriceTrendByName } from "../features/pricing/usePriceTrendByName";
import { useSimulatorEvidenceByName } from "../features/simulator/useSimulatorEvidenceByName";
import { useDecklistDisplayPrefs } from "../lib/decklistDisplayPrefs";

export interface ChampionWinRateContext { adjustedWinRate: number; deckCount: number; baselineWinRate: number }

function WinRateSignal({ value }: { value: ChampionWinRateContext }) {
  const delta = value.adjustedWinRate - value.baselineWinRate;
  const width = Math.min(50, Math.abs(delta) * 500);
  return <div className="min-w-24" title={`${value.deckCount} Champion decks; Champion baseline ${(value.baselineWinRate * 100).toFixed(0)}%`}><div className="flex items-center justify-between gap-2 text-[10px]"><span className="tabular-nums text-ctp-text">{(value.adjustedWinRate * 100).toFixed(0)}%</span><span className={delta >= 0 ? "text-ctp-green" : "text-ctp-red"}>{delta >= 0 ? "+" : ""}{(delta * 100).toFixed(0)}pp</span></div><div className="relative mt-1 h-px bg-ctp-surface1"><span className={`absolute top-0 h-0.5 ${delta >= 0 ? "bg-ctp-green" : "bg-ctp-red"}`} style={delta >= 0 ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }} /></div><div className="mt-1 text-[9px] text-ctp-subtext0">n={value.deckCount}</div></div>;
}

function CardRow({ card: topCard, resolved, winRate }: { card: PlayerTopCard; resolved: Card | undefined; winRate: ChampionWinRateContext | undefined }) {
  const inner = (
    <>
      {resolved?.editions[0] ? (
        <CardImage image={resolved.editions[0].image} alt={topCard.name} className="h-14 w-10 shrink-0 rounded object-cover object-top" />
      ) : (
        <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />
      )}
      {resolved && <ElementIcon element={resolved.element} size={14} />}
      <span className="flex-1 text-ctp-text">{topCard.name}</span>
      {winRate && <WinRateSignal value={winRate} />}
      <span className="text-ctp-subtext0">{topCard.deckCount} decks</span>
    </>
  );
  return (
    <CardHoverPreview image={resolved?.editions[0]?.image} alt={topCard.name}>
      {topCard.slug ? (
        <Link to={`/cards/${topCard.slug}`} className="flex items-center gap-2 text-sm hover:text-ctp-blue">
          {inner}
        </Link>
      ) : (
        <div className="flex items-center gap-2 text-sm">{inner}</div>
      )}
    </CardHoverPreview>
  );
}

type TopCardsSectionsProps = {
  topCards: TopCardsBySection;
  cardImages: Map<string, Card>;
  /** Swaps the Main column for a different (already-computed) list, e.g. one Champion page's type-filtered `mainByType` bucket, without touching Material/Sideboard. */
  mainOverride?: PlayerTopCard[];
  /** "grid" shows full card art with the same cost/price/trend/simulator/community footer as DecklistView's Visual mode, instead of CardRow's text list. Defaults to "list" so every other caller of this component is unaffected. */
  layout?: "list" | "grid";
  /** Card name -> adjusted win rate, scoped to whatever population this card list itself represents (e.g. `data/analysis/card-stats-by-champion.json` for a Champion page). Omitted by every caller that doesn't have a matching win-rate dataset, which is unaffected. */
  winRateByName?: Map<string, ChampionWinRateContext>;
};

/** Card usage split by deck section — main/material/sideboard are structurally different card pools, so lumping them together buries a defining material-deck piece among 40-card mainboard staples. */
export default function TopCardsSections(props: TopCardsSectionsProps) {
  return props.layout === "grid" ? <GridTopCardsSections {...props} /> : <ListTopCardsSections {...props} />;
}

function ListTopCardsSections({ topCards, cardImages, mainOverride, winRateByName }: TopCardsSectionsProps) {
  const sections = [
    { label: "Main", cards: mainOverride ?? topCards.main },
    { label: "Material", cards: topCards.material },
    { label: "Sideboard", cards: topCards.sideboard },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {sections.map(({ label, cards }) =>
        cards.length > 0 ? (
          <div key={label}>
            <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{label}</h3>
            <div className="mt-2 space-y-2">
              {cards.map((c) => (
                <CardRow key={c.name} card={c} resolved={cardImages.get(c.name)} winRate={winRateByName?.get(c.name)} />
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}

/**
 * Same visual treatment as a decklist's Visual display mode, including its stat footer — a top
 * card here has no natural "quantity," so every card is passed through as a plain `{ card, quantity: 1 }`
 * line, which simply suppresses `VisualCardTile`'s quantity badge. Fetches price/trend/simulator/
 * community data itself (gated the same way DecklistView gates them) rather than in the "list"
 * layout, so pages using the plain text-list layout don't pay for stats they don't show.
 */
function GridTopCardsSections({ topCards, cardImages, mainOverride, winRateByName }: TopCardsSectionsProps) {
  const priceByName = useDeckPriceByName();
  const priceTrendByName = usePriceTrendByName();
  const simulatorEvidenceByName = useSimulatorEvidenceByName();
  const displayPrefs = useDecklistDisplayPrefs();
  const fields: VisualFieldVisibility = {
    cost: displayPrefs.visualCost,
    price: displayPrefs.visualPrice,
    priceTrend: displayPrefs.visualPriceTrend,
    tags: displayPrefs.visualTags,
    simulator: displayPrefs.visualSimulator,
    community: displayPrefs.visualCommunity,
  };
  const sections = [
    { label: "Main", cards: mainOverride ?? topCards.main },
    { label: "Material", cards: topCards.material },
    { label: "Sideboard", cards: topCards.sideboard },
  ];

  function renderSections(communityInclusionByName: Map<string, CardInclusionEntry> | undefined) {
    return (
      <div className="space-y-6">
        {sections.map(({ label, cards }) =>
          cards.length > 0 ? (
            <div key={label}>
              <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{label}</h3>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {cards.map((c) => (
                  <div key={c.name}>
                    <VisualCardTile
                      line={{ card: c.name, quantity: 1 }}
                      card={cardImages.get(c.name)}
                      unitPrice={priceByName.get(c.name)}
                      priceTrend={priceTrendByName.get(c.name)}
                      simulatorEvidence={simulatorEvidenceByName.get(c.name)}
                      communityEntry={communityInclusionByName?.get(c.name)}
                      fields={fields}
                    />
                    <div className="mt-1 flex items-center justify-between text-[10px] text-ctp-subtext1">
                      <span>Popularity</span>
                      <span className="text-ctp-text">{c.deckCount} decks</span>
                    </div>
                    {winRateByName?.get(c.name) && <div className="mt-1"><WinRateSignal value={winRateByName.get(c.name)!} /></div>}
                  </div>
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>
    );
  }

  return displayPrefs.visualCommunity ? (
    <VisualCommunityGate>{renderSections}</VisualCommunityGate>
  ) : (
    renderSections(undefined)
  );
}
