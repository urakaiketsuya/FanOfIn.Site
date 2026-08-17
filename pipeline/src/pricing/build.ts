import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { CardPriceEntry, PriceData, PriceQuote } from "@gatcg/shared";
import { priceKey } from "@gatcg/shared";
import { sleep } from "../lib/http.js";
import { findGrandArchiveCategoryId, fetchGroups, fetchProducts, fetchPrices, type TcgcsvProduct } from "./tcgcsv.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data");
const GROUP_REQUEST_DELAY_MS = 150;

function extendedValue(product: TcgcsvProduct, name: string): string | undefined {
  return product.extendedData.find((f) => f.name === name)?.value;
}

function toQuote(p: { lowPrice: number | null; midPrice: number | null; highPrice: number | null; marketPrice: number | null }): PriceQuote {
  return { low: p.lowPrice, mid: p.midPrice, high: p.highPrice, market: p.marketPrice };
}

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

    const pricesByProduct = new Map<number, typeof priceRows>();
    for (const row of priceRows) {
      const list = pricesByProduct.get(row.productId) ?? [];
      list.push(row);
      pricesByProduct.set(row.productId, list);
    }

    for (const product of products) {
      const collectorNumber = extendedValue(product, "Number");
      if (!collectorNumber) continue; // sealed product (booster pack, box, etc.), not a card

      const rows = pricesByProduct.get(product.productId) ?? [];
      const normalRow = rows.find((r) => r.subTypeName === "Normal");
      const foilRow = rows.find((r) => r.subTypeName === "Foil");
      if (!normalRow && !foilRow) continue;

      const key = priceKey(group.abbreviation, collectorNumber);
      prices[key] = {
        cardName: product.name,
        tcgplayerProductId: product.productId,
        tcgplayerUrl: product.url,
        normal: normalRow ? toQuote(normalRow) : null,
        foil: foilRow ? toQuote(foilRow) : null,
      };
    }

    await sleep(GROUP_REQUEST_DELAY_MS);
  }

  console.log(`pricing: resolved prices for ${Object.keys(prices).length} card editions`);

  return { generatedAt: new Date().toISOString(), prices };
}

export async function writePrices(data: PriceData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, "prices.json"), JSON.stringify(data), "utf-8");
}
