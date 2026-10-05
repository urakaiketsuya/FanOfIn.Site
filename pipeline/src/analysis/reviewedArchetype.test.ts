import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyReviewedArchetypeEvidence, decodeCardLines, REMAINING_CHAMPION_IDENTITIES, REVIEWED_ARCHETYPE_CORES, ZANDER_IDENTITIES, type ArchetypeTaxonomyData, type DeckCardIndexData } from '@gatcg/shared';
const taxonomy: ArchetypeTaxonomyData = JSON.parse(readFileSync(new URL('../../../data/analysis/archetype-taxonomy.json', import.meta.url), 'utf8'));
const index: DeckCardIndexData = JSON.parse(readFileSync(new URL('../../../data/analysis/deck-card-index.json', import.meta.url), 'utf8'));
const cards = new Map(index.decks.map(deck => [deck.deckId, new Map(decodeCardLines([...deck.main, ...deck.material], index.cardNames).filter(c => c.quantity > 0).map(c => [c.name, c.quantity]))]));
test('published families retain all memberships and stats, and refresh is idempotent', () => {
  const copy = structuredClone(taxonomy);
  applyReviewedArchetypeEvidence(copy.strategyArchetypes, copy.clusters, cards);
  assert.deepEqual(copy, taxonomy);
  for (const identity of REVIEWED_ARCHETYPE_CORES) assert.ok(copy.strategyArchetypes.some(s => s.name === identity.name), identity.name);
});
test('missing data, ambiguous cores and insufficient recurrence restore generated label', () => {
  for (const mode of ['missing', 'ambiguous', 'players', 'events', 'build', 'zero']) {
    const strategy = structuredClone(taxonomy.strategyArchetypes.find(s => s.name === REVIEWED_ARCHETYPE_CORES.find(c => c.champion === 'Lorraine')!.name)!);
    const original = strategy.reviewedArchetypeEvidence!.originalName;
    const ids = taxonomy.clusters.filter(c => strategy.buildIds.includes(c.id)).flatMap(c => c.deckIds);
    const changed = new Map(cards);
    if (mode === 'missing') changed.delete(ids[0]);
    if (mode === 'ambiguous' || mode === 'zero') for (const id of ids) {
      const counts = new Map(changed.get(id));
      for (const identity of REVIEWED_ARCHETYPE_CORES.filter(c => c.champion === 'Lorraine')) for (const name of identity.core) counts.set(name, mode === 'zero' ? 0 : 1);
      changed.set(id, counts);
    }
    if (mode === 'players') strategy.playerCount = 4;
    if (mode === 'events') strategy.eventCount = 1;
    if (mode === 'build') strategy.buildIds.push('missing-build');
    applyReviewedArchetypeEvidence([strategy], taxonomy.clusters, changed);
    assert.equal(strategy.name, original, mode);
    assert.equal(strategy.identityCards, undefined, mode);
    assert.equal(strategy.reviewedArchetypeEvidence, undefined, mode);
  }
});

test('Slime identity spans three preserved families while Water package remains optional', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Silvie' && s.name === 'Tera Silvie — Slimes'));
  assert.equal(families.length, 3);
  assert.equal(families.flatMap(s => s.buildIds).length, 10);
  assert.deepEqual(families.map(s => s.reviewedArchetypeEvidence!.coreDeckCount), [3112, 91, 45]);
  assert.deepEqual(families.map(s => s.reviewedArchetypeEvidence!.waterPackageDeckCount), [0, 0, 42]);
  const water = families.find(s => s.deckCount === 45)!;
  assert.equal(water.confidence, 'emerging');
  const changed = new Map(cards);
  for (const build of taxonomy.clusters.filter(c => water.buildIds.includes(c.id))) for (const id of build.deckIds) {
    const counts = new Map(changed.get(id));
    counts.delete('Fracturize'); counts.delete('Primordial Ritual');
    changed.set(id, counts);
  }
  applyReviewedArchetypeEvidence([water], taxonomy.clusters, changed);
  assert.equal(water.name, 'Tera Silvie — Slimes');
  assert.equal(water.reviewedArchetypeEvidence!.waterPackageDeckCount, 0);
  assert.equal(water.reviewedArchetypeEvidence!.coreDeckCount, 45);
});

 test('Guo Jia shares seven command builds, keeps other families separate, and does not require the support package', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Guo Jia'));
  const reviewed = families.filter(s => s.name.endsWith('Shenju Commands'));
  assert.equal(reviewed.length, 3);
  assert.equal(reviewed.flatMap(s => s.buildIds).length, 7);
  assert.deepEqual(reviewed.map(s => s.reviewedArchetypeEvidence!.coreDeckCount), [1700, 829, 122]);
  assert.deepEqual(reviewed.map(s => s.reviewedArchetypeEvidence!.manifestationPackageDeckCount), [36, 322, 119]);
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts); copy.delete('Auspicious Manifestation'); copy.delete('Beseech the Winds');
    return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 9);
  for (const family of families.filter(s => s.name.endsWith('Shenju Commands'))) {
    assert.equal(family.name, 'Wind Guo Jia — Shenju Commands');
    assert.equal(family.reviewedArchetypeEvidence!.manifestationPackageDeckCount, 0);
  }
  for (const id of ['1kd37dt', 'w5bdy7']) assert.deepEqual(families.find(s => s.id === id), taxonomy.strategyArchetypes.find(s => s.id === id));
});

test('Rai retains nine builds with optional Wind and build-specific Fire support', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Rai'));
  assert.equal(families.flatMap(s => s.buildIds).length, 9);
  assert.deepEqual(families.map(s => s.reviewedArchetypeEvidence!.coreDeckCount), [575, 356]);
  assert.deepEqual(families.map(s => s.reviewedArchetypeEvidence!.windPackageDeckCount), [0, 340]);
  const fire = Object.values(families[0].reviewedArchetypeEvidence!.firePackageByBuild!);
  assert.equal(fire.reduce((n, b) => n + b.count, 0), 497);
  assert.equal(fire.filter(b => b.count / b.total >= .9).length, 5);
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts);
    for (const name of ['Arcane Elemental', 'Disorienting Winds', 'Three Visits', 'Creative Shock', 'Fireball']) copy.delete(name);
    return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  for (const family of families) {
    assert.equal(family.name, 'Arcane Rai — Arcane Blast');
    assert.equal(family.reviewedArchetypeEvidence!.windPackageDeckCount, 0);
    assert.ok(Object.values(family.reviewedArchetypeEvidence!.firePackageByBuild!).every(b => b.count === 0));
  }
});

 test('Zander retains three identities across 21 builds with optional packages and other families unchanged', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Zander' && (ZANDER_IDENTITIES.some(identity => identity.name === s.name) || !s.reviewedArchetypeEvidence)));
  const reviewed = families.filter(s => ZANDER_IDENTITIES.some(identity => identity.name === s.name));
  assert.equal(reviewed.length, 7);
  assert.equal(reviewed.flatMap(s => s.buildIds).length, 21);
  const expected: Record<string, [number, Record<string, number>]> = {
    '6ifose': [1797, { vulnerability: 927 }], yiifay: [200, { vulnerability: 192 }],
    yscd1r: [447, { redHare: 161 }], p9z2kg: [313, { redHare: 313 }],
    '9wv386': [104, { gildas: 11, lunete: 37 }], vx12rn: [51, { gildas: 50, lunete: 11 }], '1xh5iad': [13, { gildas: 1, lunete: 13 }],
  };
  for (const family of reviewed) {
    assert.deepEqual([family.reviewedArchetypeEvidence!.coreDeckCount, family.reviewedArchetypeEvidence!.packageDeckCounts], expected[family.id]);
  }
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts);
    for (const name of ['Incapacitate', 'Exploit Vulnerability', 'Red Hare, Unrivaled Stallion', 'Xiao Qiao, Cinderkeeper', 'Gildas, Chronicler of Aesa', 'Halocline Scout', 'Song of Frost', 'Lunete, Frostbinder Priest', 'Nia, Mistveiled Scout', 'Sadi, Blood Harvester']) copy.delete(name);
    return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  for (const family of families) {
    if (expected[family.id]) {
      assert.equal(family.name, taxonomy.strategyArchetypes.find(s => s.id === family.id)!.name);
      assert.equal(family.reviewedArchetypeEvidence!.coreDeckCount, expected[family.id][0]);
      assert.ok(Object.values(family.reviewedArchetypeEvidence!.packageDeckCounts!).every(count => count === 0));
    } else assert.deepEqual(family, taxonomy.strategyArchetypes.find(s => s.id === family.id));
  }
});

 test('Tristan cores preserve optional support and all other family data', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Tristan'));
  const expected: Record<string, number> = { ux2yxk: 3834, '1vu1559': 52, '1rb0t9a': 169, '1van2rl': 210, '4mnxjk': 22, '15ytls8': 50, '1s3agra': 41 };
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 8);
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts);
    for (const name of ['Slice and Dice', 'Oath of the Sakura', 'Dilu, Auspicious Charger', 'Verita, Queen of Hearts', 'Three of Hearts', 'Straight Flare']) copy.delete(name);
    return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  for (const family of families) {
    const published = taxonomy.strategyArchetypes.find(s => s.id === family.id)!;
    if (!expected[family.id]) { assert.deepEqual(family, published); continue; }
    assert.equal(family.name, published.name);
    assert.equal(family.reviewedArchetypeEvidence!.coreDeckCount, expected[family.id]);
    assert.ok(Object.values(family.reviewedArchetypeEvidence!.packageDeckCounts!).every(count => count === 0));
    const { reviewedArchetypeEvidence: _a, ...actual } = family;
    const { reviewedArchetypeEvidence: _b, ...original } = published;
    assert.deepEqual(actual, original);
  }
});


test('Alice distinguishes Curse recovery from Chessmen and enforces the 90% boundary', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Alice'));
  assert.deepEqual(families.map(s => s.reviewedArchetypeEvidence!.coreDeckCount), [117, 51, 27, 24, 12]);
  const boundary = families.find(s => s.id === '5kbkr5')!;
  const original = boundary.reviewedArchetypeEvidence!.originalName;
  const ids = taxonomy.clusters.filter(b => boundary.buildIds.includes(b.id)).flatMap(b => b.deckIds);
  const changed = new Map(cards);
  const id = ids.find(id => ['Abnegation', 'Maledictum Vitae', 'Reflected Blight'].every(name => (cards.get(id)?.get(name) ?? 0) > 0))!;
  const counts = new Map(cards.get(id)); counts.delete('Reflected Blight'); changed.set(id, counts);
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  assert.equal(boundary.name, original);
  assert.equal(boundary.reviewedArchetypeEvidence, undefined);
  for (const family of families.filter(s => s.id !== boundary.id)) assert.deepEqual(family, taxonomy.strategyArchetypes.find(s => s.id === family.id));
});

test('Arisanna Fractals retain their identity without optional Burst Asunder', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Arisanna'));
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 11);
  const changed = new Map([...cards].map(([id, counts]) => {
    const next = new Map(counts);
    next.delete('Burst Asunder');
    return [id, next];
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  const water = families.filter(s => s.name === 'Water Arisanna — Fractals');
  assert.equal(water.length, 2);
  assert.deepEqual(water.map(s => s.reviewedArchetypeEvidence!.coreDeckCount), [190, 222]);
  for (const family of water) assert.equal(family.reviewedArchetypeEvidence!.packageDeckCounts!.burst, 0);
});

 test('Ciel keeps broad equipment family unchanged and separates eight specific families', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Ciel'));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, cards);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 8);
  assert.deepEqual(families.find(s => s.id === '1g8kos9'), taxonomy.strategyArchetypes.find(s => s.id === '1g8kos9'));
  assert.equal(families.find(s => s.id === '1g8kos9')!.reviewedArchetypeEvidence, undefined);
  assert.deepEqual(families.filter(s => s.name.endsWith('Feu Awakening')).map(s => s.reviewedArchetypeEvidence!.coreDeckCount), [728, 226]);
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts); copy.delete('Feu Awakening'); return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 6);
  for (const id of ['rsnhwz', '152xtyg']) assert.equal(families.find(s => s.id === id)!.reviewedArchetypeEvidence, undefined);
});

 test('Diana separates weapon plans and keeps overlapping elemental support optional', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Diana'));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, cards);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 15);
  const mixed = families.find(s => s.id === 'l2l0d9')!;
  assert.equal(mixed.name, 'Water / Astra Diana — Aquamirage Aethercharge');
  assert.equal(mixed.reviewedArchetypeEvidence!.coreDeckCount, 124);
  assert.deepEqual(mixed.reviewedArchetypeEvidence!.packageDeckCounts, { water: 124, astra: 122 });
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts); copy.delete('Deploy Gunshield'); copy.delete('Weaving Manastream'); return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 15);
  assert.equal(families.find(s => s.id === '1slms8l')!.reviewedArchetypeEvidence!.packageDeckCounts!.gunshield, 0);
  assert.equal(mixed.reviewedArchetypeEvidence!.packageDeckCounts!.water, 0);
  for (const [id, counts] of changed) { const copy = new Map(counts); copy.delete('Aquamirage Whisper'); changed.set(id, copy); }
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 12);
  assert.equal(mixed.name, 'Mixed Diana — Charge the Soul');
});

 test('Guo Jia adds six identities, retains the unresolved family, and treats Ruby as optional', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Guo Jia'));
  const fire = families.find(s => s.id === 'm4dyqa')!;
  assert.equal(fire.reviewedArchetypeEvidence!.coreDeckCount, 1342);
  assert.equal(fire.reviewedArchetypeEvidence!.packageDeckCounts!.ruby, 1298);
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts); copy.delete('Fabled Ruby Fatestone'); copy.delete("Suzaku's Command");
    return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 9);
  assert.equal(fire.name, 'Fire Guo Jia — Decree Burn');
  assert.equal(fire.reviewedArchetypeEvidence!.packageDeckCounts!.ruby, 0);
  assert.deepEqual(families.find(s => s.id === '194znzn'), taxonomy.strategyArchetypes.find(s => s.id === '194znzn'));
  for (const counts of changed.values()) counts.delete('Vermilion Decree');
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  assert.equal(fire.reviewedArchetypeEvidence, undefined);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 8);
});

test('Jin retains ambiguous families and restores labels when recovery evidence disappears', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Jin'));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, cards);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 5);
  for (const id of ['7y24dq', '1ss7e1z']) {
    assert.equal(families.find(s => s.id === id)!.reviewedArchetypeEvidence, undefined);
    assert.deepEqual(families.find(s => s.id === id), taxonomy.strategyArchetypes.find(s => s.id === id));
  }
  const changed = new Map([...cards].map(([id, counts]) => {
    const next = new Map(counts); next.delete('Mend Flesh'); return [id, next] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 0);
});

test('remaining champion identities retain exact reviewed counts and reject missing core cards', () => {
  const expected: Record<string, number> = {"1w1gdbj": 12, "5pw41t": 2141, "4roctd": 1472, "1bpxg7f": 980, "1735ou2": 752, "1r282yl": 517, "7iat6b": 465, "hkzckk": 534, "1rnreh4": 493, "fr1vlk": 389, "1yfaw6d": 247, "12zfjeo": 287, "1vnmlgr": 221, "m24iia": 254, "1v2a3cn": 213, "1b7a5kt": 239, "1dncwcf": 198, "1luimph": 130, "wow264": 155, "q0zqbs": 191, "1rz0yy7": 98, "1wbydqc": 91, "1t4fszi": 93, "1whnsh6": 55, "1mz606e": 48, "1j07ql1": 74, "1h7s8fh": 61, "9buhhj": 61, "1m4hrby": 60, "1i5wjpt": 44, "1rdvneh": 40, "1tm8u0i": 67, "939fom": 32, "1b10szx": 32, "1deqjx5": 34, "1slmmmx": 25, "1s770r4": 32, "1kwplit": 27, "eo03r0": 28, "12relxy": 38, "1w3acjh": 27, "128f2wt": 41, "1sofqdg": 19, "1q87i4k": 23, "9cn9aj": 20, "1p5ap5u": 16, "11u9itu": 16, "1doyf43": 15, "87l4mo": 14, "1kctna4": 13, "6uu7v8": 17, "1b1b5ez": 18, "e0ruve": 13, "1e29nhd": 10, "1vxrl71": 9, "1uquxnv": 11, "1t9bee9": 9, "tczxjk": 11, "ufxed5": 9, "1b5tycd": 7, "1nsfbg7": 10, "1xb3nh1": 11, "1s3b7uk": 6, "vcg117": 38, "1ieaj47": 5, "1cscyx8": 7};
  const names = new Set(REMAINING_CHAMPION_IDENTITIES.map(identity => identity.name));
  const families = structuredClone(taxonomy.strategyArchetypes.filter(family => names.has(family.name)));
  assert.equal(families.length, Object.keys(expected).length);
  for (const family of families) {
    assert.equal(family.reviewedArchetypeEvidence!.coreDeckCount, expected[family.id], family.id);
    const identity = REMAINING_CHAMPION_IDENTITIES.find(identity => identity.name === family.name)!;
    const changed = new Map(cards);
    for (const build of taxonomy.clusters.filter(build => family.buildIds.includes(build.id))) for (const id of build.deckIds) {
      const next = new Map(changed.get(id)); next.delete(identity.core[0]); changed.set(id, next);
    }
    const originalName = family.reviewedArchetypeEvidence!.originalName;
    applyReviewedArchetypeEvidence([family], taxonomy.clusters, changed);
    assert.notDeepEqual(family.identityCards, identity.core);
    if (!family.reviewedArchetypeEvidence) assert.equal(family.name, originalName);
  }
});

test('remaining optional variants never become required identifying cards', () => {
  for (const identity of REMAINING_CHAMPION_IDENTITIES) {
    const optional = identity.packages.flatMap(pkg => pkg.cards).filter(name => !identity.core.includes(name));
    if (!optional.length) continue;
    const families = structuredClone(taxonomy.strategyArchetypes.filter(family => family.name === identity.name && !optional.some(name => family.identityCards?.includes(name))));
    const changed = new Map(cards);
    for (const build of taxonomy.clusters.filter(build => families.some(family => family.buildIds.includes(build.id)))) for (const id of build.deckIds) {
      const next = new Map(changed.get(id)); for (const name of optional) next.delete(name); changed.set(id, next);
    }
    applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
    for (const family of families) {
      assert.equal(family.name, identity.name);
      assert.ok(Object.values(family.reviewedArchetypeEvidence!.packageDeckCounts!).every(count => count === 0));
    }
  }
});


test('Majesty alternatives qualify independently, preserve primary evidence, and reject distinct identities', () => {
  const identity = REMAINING_CHAMPION_IDENTITIES.find(i => i.name === 'Merlin — Majesty')!;
  const alternate = identity.alternateCores![0];
  const real = taxonomy.strategyArchetypes.find(f => f.id === '1w1gdbj')!;
  assert.deepEqual(real.identityCards, alternate);
  assert.equal(real.reviewedArchetypeEvidence!.coreDeckCount, 12);
  assert.deepEqual(taxonomy.strategyArchetypes.find(f => f.id === 'ufxed5')!.identityCards, identity.core);
  for (const mode of ['alternate', 'both', 'split', 'different', 'missing', 'zero']) {
    const family = structuredClone(real);
    const ids = [...new Set(taxonomy.clusters.filter(b => family.buildIds.includes(b.id)).flatMap(b => b.deckIds))];
    const changed = new Map(cards);
    ids.forEach((id, index) => {
      const names = mode === 'both' ? [...identity.core, ...alternate] : mode === 'split' && index < ids.length / 2 ? identity.core : alternate;
      const counts = new Map(names.map(name => [name, 1]));
      if (mode === 'different') for (const name of ['Arthur, Young Heir', 'Red Hare, Unrivaled Stallion', 'Blazing Throw']) counts.set(name, 1);
      if (mode === 'zero') counts.set('Incarnate Majesty', 0);
      changed.set(id, counts);
    });
    if (mode === 'missing') changed.delete(ids[0]);
    applyReviewedArchetypeEvidence([family], taxonomy.clusters, changed);
    if (mode === 'alternate' || mode === 'both') {
      assert.equal(family.name, identity.name);
      assert.deepEqual(family.identityCards, mode === 'both' ? identity.core : alternate);
      assert.equal(family.reviewedArchetypeEvidence!.coreDeckCount, ids.length);
    } else {
      assert.equal(family.name, real.reviewedArchetypeEvidence!.originalName, mode);
      assert.equal(family.identityCards, undefined, mode);
    }
  }
});
