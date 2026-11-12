// Import reviewed upstream scenario excerpts verbatim. No engine checkout is needed in CI.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = process.argv[2];
if (!root) throw new Error('Usage: node scripts/import-tcgengine-recursion.mjs /path/to/TCGEngine');
const prefixes = ['aenean-cyclic-winds', 'cyclical-breeze', 'primeval-ritual', 'breezy-looper', 'lost-wisdom', 'scavenge-the-distillery', 'advantageous-perch', 'reconstructive-surgery'];
const files = ['wind-actions5', 'cards-c', 'wind-actions2', 'wind-allies3', 'norm-actions4', 'norm-actions6', 'cards-a'];
const sha = value => createHash('sha256').update(value).digest('hex');
const scenarios = [];
for (const file of files) {
  const path = `DevTools/ga-fixtures/${file}.php`;
  const text = readFileSync(resolve(root, path), 'utf8');
  for (const match of text.matchAll(/gaScenario\('([^']+)'\)[\s\S]*?->register\(\);/g)) {
    if (prefixes.some(prefix => match[1].startsWith(prefix))) scenarios.push({ id: match[1], path, fileSha256: sha(text), excerptSha256: sha(match[0]), excerpt: match[0] });
  }
}
const catalog = JSON.parse(readFileSync('data/card-catalog.json', 'utf8')).cards;
const names = ['Aenean Cyclic Winds', 'Cyclical Breeze', 'Primeval Ritual', 'Breezy Looper', 'Lost Wisdom', 'Scavenge the Distillery', 'Advantageous Perch', 'Reconstructive Surgery'];
const cards = Object.fromEntries(names.map(name => { const { effect, cost_reserve, element, types, classes, subtypes } = catalog.find(card => card.name === name); return [name, { effect, cost_reserve, element, types, classes, subtypes }]; }));
writeFileSync('app/test/fixtures/tcgengine-recursion-contracts.json', JSON.stringify({ sourceRevision: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), description: 'Verbatim upstream fixtures; adapters test supported analytics clauses, not an engine replay. Surgery upstream case covers its buff mode only; recursion mode is catalog-derived.', scenarios, cards }, null, 2) + '\n');
