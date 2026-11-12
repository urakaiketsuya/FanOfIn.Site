// Preserve upstream source, including the parameterized Wind Spirit fixture.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = process.argv[2];
if (!root) throw new Error('Usage: node scripts/import-tcgengine-champion-access.mjs /path/to/TCGEngine');
const sha = text => createHash('sha256').update(text).digest('hex');
const selection = {
  'cards-s': ['spirit-of-fire-on-enter-draw', 'spirit-of-water-on-enter-draw', 'spirit-of-wind-enter-draw-seven'],
  'fire-allies-d': ['aithne-spirit-of-fire-enter-draws-seven-cards', 'hanabi-spirit-of-fire-enter-draws-seven-cards', 'vyra-spirit-of-fire-enter-draws-seven-cards'],
  'water-allies': ['miao-spirit-of-water-enter-draws-seven-cards', 'minthe-spirit-of-water-enter-draws-seven-cards', 'sabrina-spirit-of-water-enter-draws-seven-cards'],
  'cards-p': ['exalted-card-is-not-playable-without-an-advanced-element'],
  'cards-r': ['rai-archmage-inherited-first-mage-action-enlighten', 'rai-spellcrafter-on-enter-enlighten', 'rai-storm-seer-level-per-arcane-mage-spell-banished'],
  'cards-t': ['tonoris-genesis-aegis-recollection-obelisk'],
  'cards-d': ['diao-chan-enchantress-enter-glimmer'],
  'phase-e-tera': ['flourishing-restoration-diao-chan-bonus-waives-the-element-for-two-more'],
};
const scenarios = [];
for (const [file, ids] of Object.entries(selection)) {
  const path = `DevTools/ga-fixtures/${file}.php`, text = readFileSync(resolve(root, path), 'utf8');
  for (const id of ids) {
    const match = [...text.matchAll(/gaScenario\('([^']+)'\)[\s\S]*?->register\(\);/g)].find(match => match[1] === id);
    if (!match) throw new Error(`Missing upstream fixture: ${id}`);
    scenarios.push({ id, path, fileSha256: sha(text), excerptSha256: sha(match[0]), excerpt: match[0] });
  }
}
const path = 'DevTools/ga-fixtures/wind-champions.php', text = readFileSync(resolve(root, path), 'utf8');
const excerpt = text.slice(text.indexOf('foreach ('), text.indexOf("gaScenario('fragmented")).trimEnd();
scenarios.push({ id: 'named-wind-spirits-parameterized', path, fileSha256: sha(text), excerptSha256: sha(excerpt), excerpt });
const catalog = JSON.parse(readFileSync('data/card-catalog.json', 'utf8')).cards;
const cards = catalog.filter(card => card.types.includes('CHAMPION') && (/Spirit of (Fire|Water|Wind)$/.test(card.name) || /^(Rai|Diao Chan|Tonoris),/.test(card.name)))
  .map(({ name, effect, element, level, cost_memory, life, classes }) => ({ name, effect, element, level, cost_memory, life, classes }));
writeFileSync('app/test/fixtures/tcgengine-champion-access.json', JSON.stringify({ sourceRevision: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), description: 'Verbatim upstream fixtures plus catalog snapshots. Wind source is a loop registering three scenarios. Analytics adapters are not PHP engine replays.', scenarios, cards }, null, 2) + '\n');
