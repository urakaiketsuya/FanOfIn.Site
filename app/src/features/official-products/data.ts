import rawData from "./decks.json";

export interface OfficialProductCardLine {
  name: string;
  quantity: number;
  set: string | null;
  collectorNumber: string | null;
}

export interface OfficialProductDeck {
  id: string;
  name: string;
  productCode: string;
  champions: string[];
  sourceUrl: string;
  releaseDate: string;
  cards: Record<"main" | "material" | "sideboard" | "mastery" | "token" | "pantheon" | "generated" | "status", OfficialProductCardLine[]>;
}

export const PRODUCT_RELEASE_DATES: Record<string, string> = {
  PRDSD: "2026-08-21", RDOPD: "2026-04-03", DTRSD: "2025-07-25",
  "ReC-IDY": "2025-03-07", "ReC-HVF": "2025-03-07", AMBSD: "2024-10-11",
  "ReC-SLM": "2024-05-17", "ReC-SHD": "2024-05-17", ALCSD: "2024-01-26",
  DOASD: "2023-04-28", DOAp: "2023-01-01",
};

export const officialProductDecks = (rawData.decks as unknown as Omit<OfficialProductDeck, "releaseDate">[]).map((deck): OfficialProductDeck => ({ ...deck, releaseDate: PRODUCT_RELEASE_DATES[deck.productCode] }));
export const officialProductsSource = rawData.source;

export const PRODUCT_LABELS: Record<string, string> = {
  DTRSD: "Distorted Reflections",
  "ReC-IDY": "Re:Collection — Idyll Corsage",
  "ReC-HVF": "Re:Collection — Heaven's Favored",
  "ReC-SLM": "Re:Collection — Slime Sovereign",
  "ReC-SHD": "Re:Collection — Shadowdancer",
  AMBSD: "Mortal Ambition",
  ALCSD: "Alchemical Revolution",
  DOASD: "Dawn of Ashes",
  DOAp: "Dawn of Ashes Prelude",
  RDOPD: "Radiant Dawn of Pantheon",
  PRDSD: ".asphodel/paradise Starter Decks",
};
