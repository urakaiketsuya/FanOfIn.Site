// Import existing upstream mechanics; do not manufacture tournament decks or outcomes.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = process.argv[2];
if (!root) throw new Error('Supply the TCGEngine checkout path');
const sha = value => createHash('sha256').update(value).digest('hex');
const selected = {
  neos: ['automata-genesis-summons-three-titan-mk-ii-tokens-and-the-tonoris-bonus-buffs-each-by-the-token-count', 'cordelia-aurous-kaiser-enter-summons-two-automaton-drones', 'cordelia-aurous-kaiser-class-bonus-tokens-are-reservable', 'blade-of-creation-class-bonus-costs-one-less-per-token-and-cleaves', 'atmos-armor-type-ares-enter-summons-two-atmos-shield-tokens-and-class-bonus-gains-power-per-shield', 'production-crawldroid-enter-summons-two-powercell-tokens', 'reactivate-drone-summons-a-rested-automaton-drone-with-a-buff-counter'],
  'cards-t': ['tonoris-genesis-aegis-recollection-obelisk'],
  'cards-a': ['archon-broadsword-class-bonus-token-power'],
  'cards-n': ['neos-sight-eight-objects-memory-draw'],
  'cards-d': ['dormant-sacrificial-altar-sacrifice-automaton-and-human-mills-two'],
  'norm-domains2': ['the-eternal-kingdom-class-bonus-domains-you-control-have-reservable'],
  'norm-actions6': ['edge-of-tomorrow-scavenge-eight-for-a-domain-card'],
  'norm-actions4': ['lost-wisdom-class-bonus-with-a-unique-ally-costs-two-less-and-returns-a-spell-to-memory'],
  'water-allies': ['imperial-apprentice-spell-activation-banishes-a-floating-memory-card-to-draw'],
  'wind-allies5': ['winbless-forecaster-adds-one-to-enlighten-counters-put-on-your-champion'],
  'wind-actions2': ['primeval-ritual-sacrifices-an-ally-and-returns-a-wind-card-to-memory', 'primeval-ritual-cannot-be-activated-without-an-ally-to-sacrifice'],
};
const scenarios = [];
for (const [file, ids] of Object.entries(selected)) {
  const path = `DevTools/ga-fixtures/${file}.php`, text = readFileSync(resolve(root, path), 'utf8');
  for (const id of ids) {
    const excerpt = [...text.matchAll(/gaScenario\('([^']+)'\)[\s\S]*?->register\(\);/g)].find(match => match[1] === id)?.[0];
    if (!excerpt) throw new Error(`Missing scenario ${id}`);
    scenarios.push({ id, path, fileSha256: sha(text), excerptSha256: sha(excerpt), excerpt });
  }
}
writeFileSync('app/test/fixtures/tcgengine-recommendations.json', JSON.stringify({ sourceRevision: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), description: 'Verbatim upstream mechanics. Construction adapters do not replay PHP or establish optimal swaps.', scenarios }, null, 2) + '\n');
