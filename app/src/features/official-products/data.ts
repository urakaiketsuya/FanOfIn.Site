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
  cards: Record<"main" | "material" | "sideboard" | "mastery" | "token" | "pantheon" | "generated" | "status", OfficialProductCardLine[]>;
}

export const officialProductDecks = rawData.decks as OfficialProductDeck[];
export const officialProductsSource = rawData.source;

export const PRODUCT_LABELS: Record<string, string> = {
  DTRSD: "Distorted Reflections",
  "ReC-IDY": "Re:Collection — Idyll Corsage",
  "ReC-HVF": "Re:Collection — Heaven's Favored",
  "ReC-SLM": "Re:Collection — Slime Sovereign",
  "ReC-SHD": "Re:Collection — Shadowdancer",
  AMBSD: "Abyssal Heaven",
  ALCSD: "Alchemical Revolution",
  DOASD: "Dawn of Ashes",
  DOAp: "Dawn of Ashes Prelude",
};
