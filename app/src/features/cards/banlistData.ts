import type { Card } from "@gatcg/shared";

// Reviewed against the current official B&R, not inferred from catalog limit: 0.
// Update this snapshot and verification date together after each official announcement.
export const BANLIST_REVIEW = {
  verified: "2026-10-25",
  effective: "2026-10-16",
  announcement: "https://www.gatcg.com/article/ban-and-restricted-october-16th-2026",
  seasonalAnnouncement: "https://www.gatcg.com/article/introducing-seasonal-banlists",
};
export type BanlistFormat = "STANDARD" | "PANTHEON";
export const STANDARD_BANS = [
  "Baby Green Slime", "Carpsong Coda", "Crystal of Empowerment", "Corhazi Outlook",
  "Dissonant Fractal", "Erupting Rhapsody", "Grim Pastiche", "Icebound Slam",
  "Lost in Thought", "Ranger Strides", "Reckless Conversion", "Rile the Abyss",
  "Sword of Avarice", "Unmake Duality",
];
export const SEASONAL_BANS = ["Baleful Oblation", "Fabled Azurite Fatestone", "Spirit Blade: Ascension"];
export function announcedBans(format: BanlistFormat) {
  return format === "STANDARD" ? [...STANDARD_BANS, ...SEASONAL_BANS].sort((a, b) => a.localeCompare(b)) : [];
}
/** Unavailable does not assert a reason: zero limits also cover tokens and format-only cards. */
export function otherUnavailableCards(cards: readonly Card[], format: BanlistFormat) {
  const announced = new Set(announcedBans(format));
  return [...new Map(cards.filter(card => card.legality?.[format]?.limit === 0 && !announced.has(card.name))
    .map(card => [card.name, card])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
}
