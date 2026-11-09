import { CHAMPION_PACKAGE_SETTINGS as S, type ChampionPackage, type ChampionPackageCard, type ChampionPackagesData } from "@gatcg/shared";
import { resolveCard, type CardSignature } from "../cards/catalog.js";
import { buildDeckSignature } from "./decklists.js";
import { topChampionCard, type StapleObservation } from "./cardStaples.js";

const FORMAT = "standard";
type Deck = { recent: boolean; copies: Map<string, number> };
const key = (section: string, name: string) => `${section}\u0000${name}`;
const split = (value: string) => { const [section, name] = value.split("\u0000"); return { section: section as "main" | "material", name }; };

/** Cards that one champion build plays together (main + material, never sideboard).
 * Core = cards in at least 75% of the build's decks in the primary window (last 90 days when
 * there are enough decks, otherwise all). If too few decks hold the whole core, the least
 * common core card moves to options until enough do. Variants are exact core quantity patterns
 * counted only in decks that contain the whole core. Champion cards are the build's identity
 * and are left out. No win rate is needed: a package is what players play together.
 */
export function computeChampionPackages(observations: StapleObservation[], catalog: Map<string, CardSignature>, generatedAt: string, throughDate: string | null): ChampionPackagesData {
  const groups = new Map<string, { champion: string; championCard: string | null; decks: Deck[] }>();
  const identity = new Map<string, boolean>();
  const isChampion = (name: string) => { let v = identity.get(name); if (v === undefined) { v = !!resolveCard(catalog, name)?.types.includes("CHAMPION"); identity.set(name, v); } return v; };
  for (const { raw, format, periods } of observations) {
    if (format.toLowerCase() !== FORMAT) continue;
    const signature = buildDeckSignature(0, { main: raw.main ?? [], material: raw.material ?? [], sideboard: [] }, catalog);
    if (!signature.championName) continue;
    const championCard = topChampionCard(signature.materialCards, signature.championName, catalog);
    const copies = new Map<string, number>();
    for (const section of ["main", "material"] as const) for (const line of raw[section] ?? []) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;
      const name = resolveCard(catalog, line.card)?.name ?? line.card.trim();
      if (isChampion(name)) continue;
      const k = key(section, name);
      copies.set(k, (copies.get(k) ?? 0) + line.quantity);
    }
    const deck: Deck = { recent: periods.includes("90"), copies };
    for (const card of new Set([null, championCard])) {
      const id = JSON.stringify([signature.championName, card]);
      let group = groups.get(id);
      if (!group) { group = { champion: signature.championName, championCard: card, decks: [] }; groups.set(id, group); }
      group.decks.push(deck);
    }
  }
  const packages: ChampionPackage[] = [];
  for (const { champion, championCard, decks } of groups.values()) {
    if (decks.length < S.minDecks) continue;
    const pack = minePackage(champion, championCard, decks);
    if (pack) packages.push(pack);
    // Pilot the element pool on the validated level-three Jin build.
    if (championCard === "Jin, Undying Resolve") {
      const element = "EXIA";
      const pool = decks.map(deck => ({
        ...deck,
        copies: new Map([...deck.copies].filter(([k]) => resolveCard(catalog, split(k).name)?.elements.includes(element))),
      }));
      const elemental = minePackage(champion, championCard, pool);
      if (elemental) packages.push({ ...elemental, element });
    }
  }
  packages.sort((a, b) => b.decks - a.decks || a.champion.localeCompare(b.champion) || (a.championCard ?? "").localeCompare(b.championCard ?? ""));
  return { generatedAt, throughDate, format: FORMAT, packages };
}

function minePackage(champion: string, championCard: string | null, decks: Deck[]): ChampionPackage | null {
  const recent = decks.filter(d => d.recent);
  const basis = recent.length >= S.minRecentDecks ? "recent" : "all";
  const primary = basis === "recent" ? recent : decks;
  const count = (list: Deck[]) => { const m = new Map<string, number>(); for (const d of list) for (const k of d.copies.keys()) m.set(k, (m.get(k) ?? 0) + 1); return m; };
  const primaryCounts = count(primary), allCounts = count(decks), recentCounts = count(recent);
  const ranked = [...primaryCounts].sort((a, b) => b[1] - a[1] || (allCounts.get(b[0]) ?? 0) - (allCounts.get(a[0]) ?? 0) || a[0].localeCompare(b[0]));
  let core = ranked.filter(([, n]) => n / primary.length >= S.coreInclusion).slice(0, S.maxCore).map(([k]) => k);
  const holdsAll = (list: string[]) => decks.filter(d => list.every(k => d.copies.has(k)));
  let complete = holdsAll(core);
  while (core.length > 1 && complete.length < S.minComplete) { core = core.slice(0, -1); complete = holdsAll(core); }
  if (core.length < 2 || complete.length < S.minComplete) return null;
  const usual = (k: string) => { const q = new Map<number, number>(); for (const d of decks) { const n = d.copies.get(k); if (n) q.set(n, (q.get(n) ?? 0) + 1); } return [...q].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]; };
  const card = (k: string): ChampionPackageCard => ({ ...split(k), allInclusion: round((allCounts.get(k) ?? 0) / decks.length), recentInclusion: recent.length ? round((recentCounts.get(k) ?? 0) / recent.length) : null, usualCopies: usual(k) });
  const coreSet = new Set(core);
  const options = ranked.filter(([k, n]) => !coreSet.has(k) && n / primary.length >= S.optionInclusion).slice(0, S.maxOptions).map(([k]) => card(k));
  const variants = new Map<string, { copies: number[]; decks: number; recentDecks: number }>();
  for (const d of complete) {
    const copies = core.map(k => d.copies.get(k)!);
    const id = copies.join(",");
    const v = variants.get(id) ?? { copies, decks: 0, recentDecks: 0 };
    v.decks++; if (d.recent) v.recentDecks++;
    variants.set(id, v);
  }
  return {
    champion, championCard, decks: decks.length, recentDecks: recent.length, basis,
    core: core.map(card), options, completeDecks: complete.length, completeRecentDecks: complete.filter(d => d.recent).length,
    variants: [...variants.values()].sort((a, b) => (basis === "recent" ? b.recentDecks - a.recentDecks : 0) || b.decks - a.decks || a.copies.join().localeCompare(b.copies.join())).slice(0, S.maxVariants),
  };
}
const round = (v: number) => Math.round(v * 1e4) / 1e4;
