import { useMemo, type ComponentProps } from "react";
import { availableDeckElements, buildSpiritCanonicalNames, shortHash } from "@gatcg/shared";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import CardBrowser from "../../components/deck-editor/CardBrowser";
import { findDeckChampionName } from "../../lib/ttsExport";
import { buildCardCategoryRecommendations } from "../deckbuilder/cardCategoryRecommendations";
import { findSpiritName, useDeckBuilderPopulation } from "../deckbuilder/useDeckBuilderPopulation";

/** Reuse the builder's ranked card evidence for saved and unsaved deck editing. */
export default function DeckAddCardBrowser(props: ComponentProps<typeof CardBrowser>) {
  const { deck, catalog, format = "UNKNOWN" } = props;
  const material = deck.material.filter(line => line.quantity > 0);
  const championCard = findDeckChampionName(material, catalog);
  const champion = championCard && !catalog.get(championCard)?.subtypes.includes("SPIRIT") ? championCard.split(",")[0].trim() : null;
  const spiritName = findSpiritName(material.map(line => ({ name: line.card, quantity: line.quantity })), catalog);
  const cards = useMemo(() => [...catalog.values()], [catalog]);
  const canonicalSpirits = useMemo(() => buildSpiritCanonicalNames(cards), [cards]);
  const spirit = spiritName ? canonicalSpirits.get(spiritName) ?? spiritName : null;
  const population = useDeckBuilderPopulation(champion && spirit ? champion : null);
  const championHash = shortHash(champion ?? "Unknown");
  const scopedStatus = usePublishedDataStatus(`champion-decks-${championHash}`, `/data/analysis/champion-decks/${championHash}.json`, false);
  const cardIndexStatus = usePublishedDataStatus("analysis-deck-card-index", "/data/analysis/deck-card-index.json", false);
  const popularityStatus = usePublishedDataStatus("analysis-deck-popularity-index", "/data/analysis/deck-popularity-index.json", false);
  const failed = population.loading && scopedStatus.phase === "error" && (cardIndexStatus.phase === "error" || popularityStatus.phase === "error");
  const identityElements = availableDeckElements(material.flatMap(line => {
    const card = catalog.get(line.card);
    return card?.types.includes("CHAMPION") ? [card] : [];
  }));
  const elementKey = [...identityElements].sort().join("|");
  const suggestedNames = useMemo(() => [...new Set(buildCardCategoryRecommendations({
    catalog: cards,
    rows: population.rows.filter(row => row.spiritName === spirit),
    identityElements: new Set(elementKey.split("|").filter(Boolean)),
    format,
    source: "tournament",
  }).map(item => item.card.name))], [cards, population.rows, spirit, elementKey, format]);
  const status = !champion || !spirit
    ? "Search for a Champion and Spirit to start your deck’s suggestions."
    : failed ? "Suggestions could not load. Search for cards or reload to try again."
    : population.loading ? "Loading suggestions…"
    : !suggestedNames.length ? "No suggestions for this deck yet. Search to find cards." : null;
  return <CardBrowser {...props} identityElements={identityElements} suggestedNames={suggestedNames}
    suppressResults={Boolean(status)} suggestionStatus={status && <p role={failed ? "alert" : "status"} className="py-3 text-sm text-ctp-subtext1">{status}</p>} />;
}
