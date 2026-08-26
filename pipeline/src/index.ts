import { buildPrices, writePrices } from "./pricing/build.js";
import { updatePriceHistory, writePriceHistory } from "./pricing/history.js";
import { crawlEvents, type CrawlMode } from "./omnidex/crawler.js";
import { buildOmnidexIndex, writeOmnidexData } from "./omnidex/build.js";
import { listCachedBundles, type OmnidexEventBundle } from "./omnidex/cache.js";
import { buildAnalysis } from "./analysis/build.js";
import { publishVods } from "./curated/vods.js";
import { publishChangelog } from "./changelog.js";
import { writeSitemap } from "./sitemap.js";
import { writeManifest } from "./manifest.js";
import { runHarvest, runMetadataFetch, runDecklistFetch, runBuild as runShoutAtYourDecksBuild } from "./shoutatyourdecks/run.js";
import { runAnalytics as runShoutAtYourDecksAnalytics } from "./shoutatyourdecks/analytics/build.js";
import { installGracefulShutdown } from "./shoutatyourdecks/shutdown.js";
import { config } from "./config.js";
import { exportSimulatorSummary } from "./simulator/export.js";

/**
 * ShoutAtYourDecks is deliberately NOT part of the default pipeline run below — it needs a real
 * browser (Playwright) and a full crawl can take hours across ~21k decks, which would blow past
 * data-refresh.yml's 180-minute CI budget. Run explicitly via GATCG_SYD_MODE, same way the Omnidex
 * *backfill* (as opposed to its normal incremental run) is split out via GATCG_OMNIDEX_MODE=backfill
 * rather than folded into the weekly job. See pipeline/src/shoutatyourdecks/README.md.
 */
async function runShoutAtYourDecksMode(mode: string): Promise<void> {
  installGracefulShutdown();
  try {
    if (mode === "harvest") await runHarvest();
    else if (mode === "metadata") await runMetadataFetch();
    else if (mode === "decklists") await runDecklistFetch();
    else if (mode === "build") await runShoutAtYourDecksBuild();
    else if (mode === "analytics") await runShoutAtYourDecksAnalytics();
    else throw new Error(`unknown GATCG_SYD_MODE "${mode}" — expected harvest|metadata|decklists|build|analytics`);
  } catch (err) {
    console.error("shoutatyourdecks pipeline failed", err);
    process.exitCode = 1;
  }
}

/**
 * The Omnidex cache (~20,700 event files, ~398MB) is otherwise re-read from disk independently
 * by buildOmnidexIndex, buildAnalysis, and publishVods — three full listCachedBundles() scans
 * per run. Memoized per-`main()`-invocation (not a module-level singleton) so it's still read
 * fresh on each pipeline run and, critically, only ever loaded *after* crawlEvents has had a
 * chance to update the cache earlier in this run.
 */
function makeBundleLoader(): () => Promise<OmnidexEventBundle[]> {
  let bundles: Promise<OmnidexEventBundle[]> | null = null;
  return () => (bundles ??= listCachedBundles());
}

async function main() {
  const getBundles = makeBundleLoader();

  if (process.env.GATCG_SIMULATOR_ONLY === "1") {
    await exportSimulatorSummary();
    await writeManifest();
    return;
  }
  if (process.env.GATCG_SYD_MODE) {
    await runShoutAtYourDecksMode(process.env.GATCG_SYD_MODE);
    return;
  }

  if (config.analysisOnly) {
    console.log("analysis-only mode: skipping pricing + Omnidex fetch, using whatever's already cached");
  } else {
    if (config.skipPricing) {
      console.log("skip-pricing mode: leaving prices/price history untouched this run");
    } else if (!config.fetchOnly) {
      try {
        const prices = await buildPrices();
        await writePrices(prices);
        console.log("pricing: done");

        const priceHistory = await updatePriceHistory(prices);
        await writePriceHistory(priceHistory);
        console.log(`pricing: history now tracks ${Object.keys(priceHistory.history).length} editions`);
      } catch (err) {
        console.error("pricing pipeline failed", err);
        process.exitCode = 1;
      }
    }

    try {
      const mode: CrawlMode =
        process.env.GATCG_OMNIDEX_MODE === "backfill"
          ? { kind: "backfill-year", year: config.backfillYear }
          : { kind: "incremental" };
      const result = await crawlEvents(mode);
      console.log(`omnidex: scanned ${result.scanned}, deep-fetched ${result.deepFetched}, max id ${result.maxIdSeen}`);

      const { index, players, judges, teams } = await buildOmnidexIndex(await getBundles());
      await writeOmnidexData(index, players, judges, teams);
      console.log(
        `omnidex: published ${index.events.length} events, ${players.length} players, ${judges.length} judges, ${teams.length} team sightings`,
      );
    } catch (err) {
      console.error("omnidex pipeline failed", err);
      process.exitCode = 1;
    }
  }

  if (config.fetchOnly) {
    console.log("fetch-only mode: skipping analysis build — run with GATCG_ANALYSIS_ONLY=1 once every year's fetch is done");
  } else {
    try {
      await buildAnalysis(await getBundles());
    } catch (err) {
      console.error("analysis pipeline failed", err);
      process.exitCode = 1;
    }
  }

  if (process.env.GATCG_SIMULATOR_API_URL) {
    try {
      await exportSimulatorSummary();
    } catch (err) {
      console.error("simulator analytics export failed", err);
      process.exitCode = 1;
    }
  }

  try {
    await publishVods(await getBundles());
  } catch (err) {
    console.error("vod publish failed", err);
    process.exitCode = 1;
  }

  try {
    await publishChangelog();
  } catch (err) {
    console.error("changelog publish failed", err);
    process.exitCode = 1;
  }

  try {
    await writeSitemap();
  } catch (err) {
    console.error("sitemap generation failed", err);
    process.exitCode = 1;
  }

  await writeManifest();
  console.log("pipeline: done");
}

main().catch((err: unknown) => {
  console.error("pipeline failed", err);
  process.exitCode = 1;
});
