import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Card, CardInclusionEntry, DeckFormat, OmnidexDecklistCardLine } from "@gatcg/shared";
import CardArtTile from "./CardArtTile";
import CardHoverPreview from "./CardHoverPreview";
import CostIcon from "./CostIcon";
import type { PriceTrendEntry } from "../features/pricing/usePriceTrendByName";
import type { SimulatorCardEvidence } from "../features/deckbuilder/useSimulatorSuggestedBuild";
import { useCommunityBlendedCardInclusion } from "../features/community/data";
import { formatUsd } from "../lib/format";

export interface VisualFieldVisibility {
  cost: boolean;
  price: boolean;
  priceTrend: boolean;
  tags: boolean;
  simulator: boolean;
  community: boolean;
}

/**
 * The toggleable stat rows (cost, price, price trend, simulator evidence, community inclusion) —
 * split out so a card can get this same treatment somewhere it's only *named* (e.g. a linked/combo
 * card in ChampionSynergy's New Releases section) without pulling in a second full art tile.
 */
export function CardStatRows({
  card,
  quantity = 1,
  unitPrice,
  priceTrend,
  simulatorEvidence,
  communityEntry,
  fields,
}: {
  card: Card | undefined;
  quantity?: number;
  unitPrice: number | undefined;
  priceTrend: PriceTrendEntry | undefined;
  simulatorEvidence: SimulatorCardEvidence | undefined;
  communityEntry: CardInclusionEntry | undefined;
  fields: VisualFieldVisibility;
}) {
  return (
    <>
      {fields.cost && card && card.cost.type !== "none" && card.cost.value !== null && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-ctp-subtext1">
          <span>Cost</span>
          <span className="flex items-center gap-0.5 text-ctp-text">
            <CostIcon kind={card.cost.type} size={10} />
            {card.cost.value}
          </span>
        </div>
      )}
      {fields.price && unitPrice !== undefined && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-ctp-subtext1">
          <span>Price</span>
          <span className="text-ctp-text">{formatUsd(unitPrice * quantity)}</span>
        </div>
      )}
      {fields.priceTrend && priceTrend && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-ctp-subtext1">
          <span>Trend</span>
          <span className={priceTrend.pctChange >= 0 ? "text-ctp-green" : "text-ctp-red"}>
            {priceTrend.pctChange >= 0 ? "▲" : "▼"} {Math.abs(priceTrend.pctChange * 100).toFixed(0)}%
          </span>
        </div>
      )}
      {fields.simulator && simulatorEvidence && (
        <div className="mt-1 text-[10px] text-ctp-mauve" title="Anonymous Clarent simulator telemetry; experimental">
          {simulatorEvidence.games} sim game{simulatorEvidence.games === 1 ? "" : "s"}
          {simulatorEvidence.winRate === null ? "" : ` · ${(simulatorEvidence.winRate * 100).toFixed(0)}%`}
        </div>
      )}
      {fields.community && communityEntry && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-ctp-subtext1">
          <span>Community</span>
          <span className="text-ctp-mauve" title="Share of all tracked community decks (any Champion) that include this card">
            {Math.round(communityEntry.percentOfDecks * 100)}% brewed
          </span>
        </div>
      )}
    </>
  );
}

/**
 * One card with full art plus an optional footer of toggleable fields (cost, price, price trend,
 * simulator evidence, community inclusion) — the "same component" wherever a card is named with
 * its real stats, not just an image. Originally DecklistView's Visual display mode; also used by
 * TopCardsSections' grid layout and ChampionSynergy's New Releases grid.
 */
export function VisualCardTile({
  line,
  card,
  unitPrice,
  priceTrend,
  simulatorEvidence,
  communityEntry,
  fields,
  linkToCard = true,
  footer,
}: {
  line: OmnidexDecklistCardLine;
  card: Card | undefined;
  unitPrice: number | undefined;
  priceTrend: PriceTrendEntry | undefined;
  simulatorEvidence: SimulatorCardEvidence | undefined;
  communityEntry: CardInclusionEntry | undefined;
  fields: VisualFieldVisibility;
  /** Set false when the tile is embedded in something already interactive (e.g. a level-select button) — nesting a `<Link>` inside a `<button>` is invalid HTML and would fight the parent's own click handler. */
  linkToCard?: boolean;
  /** Page-specific rows rendered after the standard visual-decklist stats. */
  footer?: ReactNode;
}) {
  const tags = [...(card?.elements.filter((e) => e !== "NORM") ?? []), ...(card?.classes ?? [])];
  const image = (
    <CardArtTile
      card={card}
      name={line.card}
      cornerBadge={line.quantity > 1 ? `${line.quantity}x` : undefined}
      tags={fields.tags ? tags : undefined}
    />
  );

  return (
    <CardHoverPreview image={card?.editions[0]?.image} alt={line.card}>
      <div title={line.card}>
        {linkToCard && card ? <Link to={`/cards/${card.slug}`} className="block">{image}</Link> : image}
        <CardStatRows
          card={card}
          quantity={line.quantity}
          unitPrice={unitPrice}
          priceTrend={priceTrend}
          simulatorEvidence={simulatorEvidence}
          communityEntry={communityEntry}
          fields={fields}
        />
        {footer}
      </div>
    </CardHoverPreview>
  );
}

/**
 * Fetches the blended community-inclusion dataset (~1MB) and resolves its format-wide `overall`
 * array to a per-card map, then hands it to `children` — only mounted when the viewer has the
 * Community field switched on, so a page that doesn't need it skips this fetch entirely.
 *
 * Deliberately format-wide, not Champion-scoped: `CardInclusionData.byChampion` is keyed by
 * ShoutAtYourDecks' own per-print champion slug (e.g. "diao-chan-enchantress"), which has no
 * reliable mapping back to this app's base Champion names (e.g. "Diao Chan", from the tournament
 * pipeline) — `DeckBuilderIndex.tsx`'s own `championToSlug(championName)` lookup into `byChampion`
 * has this same mismatch against current real data, confirmed empirically (every one of the 22
 * live `byChampion` keys carries a print-specific suffix a base name can't produce). Using
 * `overall` here sidesteps that rather than repeating it.
 */
export function VisualCommunityGate({
  format,
  children,
}: {
  format?: DeckFormat;
  children: (communityInclusionByName: Map<string, CardInclusionEntry> | undefined) => ReactNode;
}) {
  const communityCardInclusion = useCommunityBlendedCardInclusion(format);
  const communityInclusionByName = useMemo(() => {
    if (!communityCardInclusion) return undefined;
    return new Map(communityCardInclusion.overall.map((c) => [c.name, c]));
  }, [communityCardInclusion]);
  return <>{children(communityInclusionByName)}</>;
}
