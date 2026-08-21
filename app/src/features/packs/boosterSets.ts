import type { FeaturedSet, FeaturedSetGroup } from "@gatcg/shared";

/** Only base/First Edition/Alter Edition printings are sold as random boosters — Starter Decks, Re:Collection singles, Pantheon Decks, and supplemental releases (Armaments, Grimoire, Prelude, ...) are fixed-content products with no pack odds to simulate. */
export function isBoosterSet(set: FeaturedSet, group: FeaturedSetGroup): boolean {
  return set.name === group.name || set.name === `${group.name} First Edition` || set.name === `${group.name} Alter Edition`;
}

/** The most recently released genuine booster set across every featured expansion group, or null while data is still loading / nothing qualifies. */
export function latestBoosterSet(groups: FeaturedSetGroup[]): FeaturedSet | null {
  let latest: FeaturedSet | null = null;
  for (const group of groups) {
    for (const set of group.sets) {
      if (!isBoosterSet(set, group)) continue;
      if (!latest || set.release_date > latest.release_date) latest = set;
    }
  }
  return latest;
}
