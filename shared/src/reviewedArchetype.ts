import type { ArchetypeCluster, StrategyArchetype } from './analysis-types.js';

export const SILVIE_SLIME_CORE = ['Storm Slime', 'Limitless Slime', 'Ethereal Slime'];
export const SILVIE_WATER_PACKAGE = ['Fracturize', 'Primordial Ritual'];
export const SILVIE_SLIME_NAME = 'Tera Silvie — Slimes';

export const GUO_JIA_COMMAND_CORE = ["Byakko's Command", "Seiryuu's Command", 'Harness Lightning'];
export const GUO_JIA_MANIFESTATION_PACKAGE = ['Auspicious Manifestation', 'Beseech the Winds'];
export const GUO_JIA_COMMAND_NAME = 'Wind Guo Jia — Shenju Commands';

export const RAI_ARCANE_CORE = ['Arcane Blast', 'Arcane Sight', 'Spellshield: Arcane'];
export const RAI_WIND_PACKAGE = ['Arcane Elemental', 'Disorienting Winds', 'Three Visits'];
export const RAI_FIRE_PACKAGE = ['Creative Shock', 'Fireball'];
export const RAI_ARCANE_NAME = 'Arcane Rai — Arcane Blast';

export const ZANDER_IDENTITIES = [
  { champion: 'Zander', name: 'Luxem Zander — Reveal', core: ["Lightweaver's Assault", 'Gleaming Cut', 'Luxem Sight'], label: 'Reveal', packages: [
    { key: 'vulnerability', label: 'Incapacitate / Exploit Vulnerability variant', cards: ['Incapacitate', 'Exploit Vulnerability'] },
  ] },
  { champion: 'Zander', name: 'Fire Zander — Explosive Burn', core: ['Planted Explosive', 'Rococo, Explosive Maven', 'Blazing Throw'], label: 'Explosive Burn', packages: [
    { key: 'redHare', label: 'Red Hare / Xiao Qiao variant', cards: ['Red Hare, Unrivaled Stallion', 'Xiao Qiao, Cinderkeeper'] },
  ] },
  { champion: 'Zander', name: 'Water Zander — Control', core: ['Corhazi Trapper', 'Fracturize', 'Frostsworn Paladin'], label: 'Water Control', packages: [
    { key: 'gildas', label: 'Gildas / Halocline Scout variant', cards: ['Gildas, Chronicler of Aesa', 'Halocline Scout', 'Song of Frost'] },
    { key: 'lunete', label: 'Lunete / Nia / Sadi variant', cards: ['Lunete, Frostbinder Priest', 'Nia, Mistveiled Scout', 'Sadi, Blood Harvester'] },
  ] },
];

export const TRISTAN_IDENTITIES = [
  { champion: 'Tristan', name: 'Wind Tristan — Preparation', label: 'Preparation', core: ['Surveil the Winds', 'Incapacitate', 'Shadowstrike'], packages: [
    { key: 'slice', label: 'Slice and Dice variant', cards: ['Slice and Dice'] },
  ] },
  { champion: 'Tristan', name: 'Wind Tristan — Liu Bei Ranged', label: 'Liu Bei Ranged', core: ['Liu Bei, Oathkeeper', 'Skirting Step', 'Perse, Relentless Raptor'], packages: [
    { key: 'oath', label: 'Oath / Dilu variant', cards: ['Oath of the Sakura', 'Dilu, Auspicious Charger'] },
  ] },
  { champion: 'Tristan', name: 'Fire Tristan — Suited', label: 'Suited', core: ['Rouge, Ace of Hearts', 'Two of Hearts', 'Four of Hearts'], packages: [
    { key: 'verita', label: 'Verita / Straight Flare variant', cards: ['Verita, Queen of Hearts', 'Three of Hearts', 'Straight Flare'] },
  ] },
  { champion: 'Tristan', name: 'Water Tristan — Control', label: 'Water Control', core: ['Fracturize', 'Frostsworn Paladin', 'Frostbind'], packages: [] },
  { champion: 'Tristan', name: 'Fire Tristan — Explosive Burn', label: 'Explosive Burn', core: ['Planted Explosive', 'Rococo, Explosive Maven', 'Blazing Throw'], packages: [] },
];

export const ALLEN_IDENTITIES = [
  { champion: 'Allen', name: 'Wind Allen — Slimes / Geldus', label: 'Slimes / Geldus', core: ['Baby Green Slime', 'Limitless Slime', 'Geldus, Terror of Dorumegia'], packages: [] },
  { champion: 'Allen', name: 'Water Allen — Fractals', label: 'Fractals', core: ['Fractal of Rain', 'Fracturize', 'Refracting Missile'], packages: [] },
];

export const ALICE_IDENTITIES = [
  { champion: 'Alice', name: 'Umbra Alice — Curse Recovery', label: 'Curse Recovery', core: ['Abnegation', 'Maledictum Vitae', 'Reflected Blight'], packages: [] },
  { champion: 'Alice', name: 'Alice — Chessmen', label: 'Chessmen', core: ['Golden Bishop', 'Golden Gambit', 'Golden Pawn'], packages: [] },
];

export const REVIEWED_ARCHETYPE_CORES = [
  ...ALLEN_IDENTITIES,
  ...ALICE_IDENTITIES,
  ...ZANDER_IDENTITIES,
  ...TRISTAN_IDENTITIES,
  { champion: 'Rai', name: RAI_ARCANE_NAME, core: RAI_ARCANE_CORE },
  { champion: 'Guo Jia', name: GUO_JIA_COMMAND_NAME, core: GUO_JIA_COMMAND_CORE },
  { champion: 'Silvie', name: SILVIE_SLIME_NAME, core: SILVIE_SLIME_CORE },
  { champion: 'Lorraine', name: 'Fire Lorraine — Fire Sword', core: ['Blazing Throw', 'Rending Flames', 'Hone by Fire'] },
  { champion: 'Lorraine', name: 'Fire Lorraine — Embersong–Rhapsody', core: ['Embersong', 'Erupting Rhapsody', 'Fiery Momentum'] },
  { champion: 'Arisanna', name: 'Fire Arisanna — Potion Burn', core: ['Combustible Potion', 'Distilled Water', 'Cinder Geyser'] },
  { champion: 'Arisanna', name: 'Fire Arisanna — Cinderbloom Burn', core: ['Cinderbloom Tender', 'Ignite Fate', 'Kindling Flare'] },
];

export interface ReviewedArchetypeEvidence {
  packageDeckCounts?: Record<string, number>;
  originalName: string;
  evaluatedDeckCount: number;
  missingDeckCount: number;
  coreDeckCount?: number;
  /** Supporting package, independent of the required identifying core. */
  waterPackageDeckCount?: number;
  manifestationPackageDeckCount?: number;
  windPackageDeckCount?: number;
  firePackageByBuild?: Record<string, { count: number; total: number }>;
}

/** Naming only: callers supply positive main + material quantities, excluding sideboard. */
export function applyReviewedArchetypeEvidence(strategies: StrategyArchetype[], clusters: ArchetypeCluster[], cardsByDeck: ReadonlyMap<string, ReadonlyMap<string, number>>) {
  const builds = new Map(clusters.map(build => [build.id, build]));
  for (const strategy of strategies) {
    const candidates = REVIEWED_ARCHETYPE_CORES.filter(core => core.champion === strategy.championName);
    if (!candidates.length) continue;
    const previous = strategy.reviewedArchetypeEvidence;
    const ids = [...new Set(strategy.buildIds.flatMap(id => builds.get(id)?.deckIds ?? []))];
    const evaluatedDeckCount = ids.filter(id => cardsByDeck.has(id)).length;
    const matches = candidates.map(identity => ({ identity, count: ids.filter(id => identity.core.every(name => (cardsByDeck.get(id)?.get(name) ?? 0) > 0)).length }))
      .filter(match => ids.length > 0 && match.count / ids.length >= .9);
    if (previous) {
      strategy.name = previous.originalName;
      delete strategy.identityCards;
      delete strategy.reviewedArchetypeEvidence;
    }
    if (matches.length !== 1 || evaluatedDeckCount !== ids.length || strategy.buildIds.some(id => !builds.has(id)) || strategy.playerCount < 5 || strategy.eventCount < 2) continue;
    const { identity, count } = matches[0];
    strategy.reviewedArchetypeEvidence = { originalName: strategy.name, evaluatedDeckCount, missingDeckCount: 0, coreDeckCount: count };
    if (identity.name === SILVIE_SLIME_NAME) {
      strategy.reviewedArchetypeEvidence.waterPackageDeckCount = ids.filter(id => SILVIE_WATER_PACKAGE.every(name => (cardsByDeck.get(id)?.get(name) ?? 0) > 0)).length;
    }
    if (identity.name === GUO_JIA_COMMAND_NAME) {
      strategy.reviewedArchetypeEvidence.manifestationPackageDeckCount = ids.filter(id => GUO_JIA_MANIFESTATION_PACKAGE.every(name => (cardsByDeck.get(id)?.get(name) ?? 0) > 0)).length;
    }
    if (identity.name === RAI_ARCANE_NAME) {
      strategy.reviewedArchetypeEvidence.windPackageDeckCount = ids.filter(id => RAI_WIND_PACKAGE.every(name => (cardsByDeck.get(id)?.get(name) ?? 0) > 0)).length;
      strategy.reviewedArchetypeEvidence.firePackageByBuild = Object.fromEntries(strategy.buildIds.map(buildId => {
        const deckIds = [...new Set(builds.get(buildId)!.deckIds)];
        return [buildId, { count: deckIds.filter(id => RAI_FIRE_PACKAGE.every(name => (cardsByDeck.get(id)?.get(name) ?? 0) > 0)).length, total: deckIds.length }];
      }));
    }
    const configured = [...ZANDER_IDENTITIES, ...TRISTAN_IDENTITIES, ...ALICE_IDENTITIES, ...ALLEN_IDENTITIES].find(candidate => candidate.name === identity.name);
    if (configured) strategy.reviewedArchetypeEvidence.packageDeckCounts = Object.fromEntries(configured.packages.map(pkg => [pkg.key, ids.filter(id => pkg.cards.every(name => (cardsByDeck.get(id)?.get(name) ?? 0) > 0)).length]));
    strategy.name = identity.name;
    strategy.identityCards = [...identity.core];
  }
}
