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

function CardRow({ card: topCard, resolved }: { card: PlayerTopCard; resolved: Card | undefined }) {
  const inner = (
    <>
      {resolved?.editions[0] ? (
        <CardImage image={resolved.editions[0].image} alt={topCard.name} className="h-14 w-10 shrink-0 rounded object-cover object-top" />
      ) : (
        <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />
      )}
      {resolved && resolved.element !== "NORM" && <ElementIcon element={resolved.element} size={14} />}
      <span className="flex-1 text-ctp-text">{topCard.name}</span>
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
};

/** Card usage split by deck section — main/material/sideboard are structurally different card pools, so lumping them together buries a defining material-deck piece among 40-card mainboard staples. */
export default function TopCardsSections(props: TopCardsSectionsProps) {
  return props.layout === "grid" ? <GridTopCardsSections {...props} /> : <ListTopCardsSections {...props} />;
}

function ListTopCardsSections({ topCards, cardImages, mainOverride }: TopCardsSectionsProps) {
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
                <CardRow key={c.name} card={c} resolved={cardImages.get(c.name)} />
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
function GridTopCardsSections({ topCards, cardImages, mainOverride }: TopCardsSectionsProps) {
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
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
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
