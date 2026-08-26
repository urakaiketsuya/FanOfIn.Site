import repl from "node:repl";
import { listCachedBundles } from "./omnidex/cache.js";
import { loadCardCatalog, buildCardIndex } from "./cards/catalog.js";
import { computeEloRatings } from "./analysis/elo.js";
import { computeCardStats } from "./analysis/cardStats.js";
import { computeArchetypeAnalysis } from "./analysis/archetypes.js";
import { computeHipsterScores } from "./analysis/hipster.js";
import { computeDeckSimilarity, weightedJaccard } from "./analysis/similarity.js";
import { computePlayerDeckProfiles } from "./analysis/playerDecks.js";
import { computeDeckSightings } from "./analysis/deckSightings.js";
import { computeChampionTrends } from "./analysis/championTrends.js";
import { computeDeckCardIndex } from "./analysis/deckCardIndex.js";
import { computeArchetypeTaxonomy } from "./analysis/archetypeTaxonomy.js";
import { buildEventDeckSignatures } from "./analysis/decklists.js";
import { createAnalysisContext } from "./analysis/context.js";

/**
 * Ad hoc exploration REPL over the pipeline's already-crawled cache — for validating a stat's
 * behavior against real data before trusting it, the same thing every analysis module in this
 * pipeline got checked against via throwaway /tmp scripts during development. Only `bundles`,
 * `catalog`, and `cardIndex` load eagerly (cheap); every compute* function is preloaded but NOT
 * invoked, so an expensive one (deck similarity, deck-card-index) only runs if you call it.
 */

console.log("Loading cached Omnidex bundles + card catalog...");
const allBundles = await listCachedBundles();
const bundles = allBundles.filter((b) => b.event.status === "complete");
const catalog = await loadCardCatalog();
const cardIndex = buildCardIndex(catalog);
const ctx = createAnalysisContext(cardIndex);

console.log(`Ready: ${bundles.length} complete events (of ${allBundles.length} cached), ${catalog.length} cards.`);
console.log("Preloaded: bundles, catalog, cardIndex, ctx, buildEventDeckSignatures, weightedJaccard, and every computeX analysis function.");
console.log("Heavy calls (computeDeckSimilarity, computeDeckCardIndex) are NOT run automatically — call them yourself.");
console.log("Example: computeDeckSightings(bundles, ctx).length");

const session = repl.start({ prompt: "gatcg> " });
Object.assign(session.context, {
  bundles,
  catalog,
  cardIndex,
  ctx,
  buildEventDeckSignatures,
  weightedJaccard,
  computeEloRatings,
  computeCardStats,
  computeArchetypeAnalysis,
  computeHipsterScores,
  computeDeckSimilarity,
  computePlayerDeckProfiles,
  computeDeckSightings,
  computeChampionTrends,
  computeDeckCardIndex,
  computeArchetypeTaxonomy,
});
