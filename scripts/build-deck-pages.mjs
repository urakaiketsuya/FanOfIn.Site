import { readdir, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Stage the rollout with independently played builds; generating every historical
// build would exceed the remaining GitHub Pages size budget with the current data.
export function collectDeckPages(partitions) {
  const builds = new Map();
  for (const partition of partitions) {
    const cards = new Set(partition.cards.decks.map(deck => deck.deckId));
    for (const sighting of partition.popularity.entries) {
      if (!cards.has(sighting.deckId)) throw new Error(`Missing cards for ${sighting.deckId}`);
      const hash = sighting.deckHash;
      if (!/^[a-z0-9]{1,7}$/.test(hash ?? '')) throw new Error(`Invalid tournament deck hash: ${hash}`);
      let build = builds.get(hash);
      if (!build) {
        build = { hash, champion: sighting.championName || 'Grand Archive TCG', players: new Set() };
        builds.set(hash, build);
      }
      build.players.add(sighting.player);
    }
  }
  return [...builds.values()].filter(build => build.players.size > 1).sort((a, b) => a.hash.localeCompare(b.hash));
}

export function renderDeckPage(shell, build) {
  const title = `${build.champion} deck · Fan of Insight`;
  const description = `A popular ${build.champion} decklist, independently played by ${build.players.size} players.`;
  const url = `https://fanofin.site/decks/${build.hash}`;
  // Change only the built document's metadata. Keep the app entry, assets and
  // root intact, and never modify the protected source app/index.html.
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escape(title)}</title>`);
  for (const [attribute, name, value] of [
    ['name', 'description', description], ['property', 'og:title', title],
    ['property', 'og:description', description], ['property', 'og:url', url],
    ['name', 'twitter:title', title], ['name', 'twitter:description', description],
  ]) {
    const tag = new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${name}["'][^>]*>`, 'i');
    if (!tag.test(html)) throw new Error(`Build shell is missing ${name}`);
    html = html.replace(tag, () => `<meta ${attribute}="${name}" content="${escape(value)}" />`);
  }
  html = html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');
  return html.replace('</head>', `<link rel="canonical" href="${url}" />\n</head>`);
}

export async function buildDeckPages({ dataDir = path.join(root, 'data'), outDir = path.join(root, 'app/dist') } = {}) {
  const directory = path.join(dataDir, 'analysis/deck-details');
  const files = (await readdir(directory)).filter(file => /^[0-9a-f]{2}\.json$/.test(file)).sort();
  if (files.length !== 256) throw new Error(`Expected 256 deck partitions, found ${files.length}`);
  const partitions = [];
  for (const file of files) partitions.push(JSON.parse(await readFile(path.join(directory, file), 'utf8')));
  const pages = collectDeckPages(partitions);
  const shell = await readFile(path.join(outDir, 'index.html'), 'utf8');
  // Render before removing old output so malformed inputs fail without partial output.
  const rendered = pages.map(build => ({ hash: build.hash, html: renderDeckPage(shell, build) }));
  const output = path.join(outDir, 'decks');
  await rm(output, { recursive: true, force: true });
  for (const page of rendered) {
    const directory = path.join(output, page.hash);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), page.html);
  }
  console.log(`Deck entry pages: ${pages.length} independently played tournament builds`);
  return pages.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildDeckPages();
