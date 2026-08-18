import { buildPrices, writePrices } from "./pricing/build.js";
import { crawlEvents, type CrawlMode } from "./omnidex/crawler.js";
import { buildOmnidexIndex, writeOmnidexData } from "./omnidex/build.js";
import { buildAnalysis } from "./analysis/build.js";
import { publishVods } from "./curated/vods.js";
import { writeSitemap } from "./sitemap.js";
import { writeManifest } from "./manifest.js";
import { config } from "./config.js";

async function main() {
  if (config.analysisOnly) {
    console.log("analysis-only mode: skipping pricing + Omnidex fetch, using whatever's already cached");
  } else {
    if (!config.fetchOnly) {
      try {
        const prices = await buildPrices();
        await writePrices(prices);
        console.log("pricing: done");
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

      const { index, players, judges, teams } = await buildOmnidexIndex();
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
      await buildAnalysis();
    } catch (err) {
      console.error("analysis pipeline failed", err);
      process.exitCode = 1;
    }
  }

  try {
    await publishVods();
  } catch (err) {
    console.error("vod publish failed", err);
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
