import type { ShoppingChoice } from "./collectionShopping";
export const SHOPPING_DRAFT_KEY = "fanofin.quick-buy.v1";
export function readShoppingDraft(): Record<string, ShoppingChoice> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SHOPPING_DRAFT_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, ShoppingChoice] => {
      const choice = entry[1];
      return !!choice && typeof choice === "object" && typeof choice.name === "string" && choice.name.length > 0 && choice.name.length <= 300 && Number.isInteger(choice.quantity) && choice.quantity > 0 && choice.quantity <= 99;
    }));
  } catch { return {}; }
}
