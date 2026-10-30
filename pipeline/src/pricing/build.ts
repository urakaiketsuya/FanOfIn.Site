import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { CardPriceEntry, PriceData } from "@gatcg/shared";
import { selectGroupPrices } from "./select.js";
import { writeJsonAtomic } from "../lib/atomicWrite.js";
import { sleep } from "../lib/http.js";
import { findGrandArchiveCategoryId, fetchGroups, fetchProducts, fetchPrices } from "./tcgcsv.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data");
const GROUP_REQUEST_DELAY_MS = 150;

export async function buildPrices(): Promise<PriceData> {
  const categoryId = await findGrandArchiveCategoryId();
  const groups = await fetchGroups(categoryId);
  console.log(`pricing: ${groups.length} TCGCSV groups for Grand Archive (category ${categoryId})`);

  const prices: Record<string, CardPriceEntry> = {};

  for (const group of groups) {
    const [products, priceRows] = await Promise.all([
      fetchProducts(categoryId, group.groupId),
      fetchPrices(categoryId, group.groupId),
    ]);

    Object.assign(prices, selectGroupPrices(group, products, priceRows));

    await sleep(GROUP_REQUEST_DELAY_MS);
  }

  console.log(`pricing: resolved prices for ${Object.keys(prices).length} card editions`);

  return { generatedAt: new Date().toISOString(), prices };
}

export async function writePrices(data: PriceData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeJsonAtomic(path.join(DATA_DIR, "prices.json"), data, 0);
}
