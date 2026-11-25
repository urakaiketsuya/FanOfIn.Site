import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoveryIndexMetadata, championMetadata, archetypeMetadata, eventMetadata, championPath, latestChampionSeason, STATIC_SITEMAP_ROUTES, RETIRED_SITEMAP_ROUTES, SITEMAP_EVENT_CATEGORIES } from '../shared/src/discoverySeo.ts';
import { canonicalSiteUrl } from '../shared/src/seo.ts';
import { renderDiscoveryImage, escapeHtml as escape } from './discovery-social-image.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const link = (url, label) => `<a href="${escape(url)}">${escape(label)}</a>`;
const list = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
const styles = `<style>.discovery-entry{max-width:64rem;margin:auto;padding:20px;font-family:system-ui;color:#cdd6f4;background:#1e1e2e;overflow-wrap:anywhere}.discovery-entry *{box-sizing:border-box}.discovery-entry h1{font-size:clamp(24px,4vw,40px)}.discovery-entry a{display:inline-flex;align-items:center;min-height:48px;min-width:48px;color:#89b4fa}.discovery-entry a:focus-visible{outline:3px solid #cba6f7;outline-offset:2px}.discovery-entry p{line-height:1.6}.discovery-entry ul{padding-left:20px}.discovery-entry .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:16px;max-width:700px}.discovery-entry .cards a{display:flex;flex-direction:column;align-items:stretch;gap:8px}.discovery-entry img{width:100%;height:auto;border-radius:12px}.discovery-entry section{margin-block:24px}.discovery-entry .result{padding:16px;border:1px solid #45475a;border-radius:12px;background:#181825}</style>`;
export function renderDiscoveryPage(shell, meta, body) {
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escape(meta.title)} · Fan of Insight</title>`);
  const fields = [
    ['name', 'description', meta.description], ['property', 'og:title', meta.title], ['property', 'og:description', meta.description],
    ['property', 'og:url', meta.url], ['property', 'og:type', 'website'], ['name', 'twitter:title', meta.title], ['name', 'twitter:description', meta.description],
    ['name', 'twitter:card', 'summary_large_image'], ['property', 'og:image', meta.image], ['name', 'twitter:image', meta.image],
    ['property', 'og:image:alt', meta.imageAlt ?? meta.title], ['name', 'twitter:image:alt', meta.imageAlt ?? meta.title],
    ['property', 'og:image:width', String(meta.imageWidth ?? 1200)], ['property', 'og:image:height', String(meta.imageHeight ?? 630)], ['property', 'og:image:type', meta.imageType ?? 'image/jpeg'],
  ];
  for (const [attr, key, value] of fields) {
    html = html.replace(new RegExp(`<meta\\b[^>]*\\b${attr}=["']${key}["'][^>]*>`, 'gi'), '');
    html = html.replace('</head>', () => `<meta ${attr}="${key}" content="${escape(value)}">\n</head>`);
  }
  html = html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '').replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const structured = { '@context': 'https://schema.org', '@type': 'WebPage', name: meta.title, description: meta.description, url: meta.url, image: meta.image };
  html = html.replace('</head>', () => `<link rel="canonical" href="${escape(meta.url)}"><script type="application/ld+json" data-canonical="${escape(meta.url)}">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script></head>`);
  if (!html.includes('<div id="root"></div>')) throw new Error('Build shell is missing empty root');
  return html.replace('<div id="root"></div>', () => `<div id="root">${styles}<main class="discovery-entry">${link('/', 'Fan of Insight')}<h1>${escape(meta.title)}</h1>${body}</main></div>`);
}
function cardTiles(cards) {
  return `<div class="cards">${cards.map(card => {
    const image = card.editions?.find(e => /^\/cards\/images\/[\w-]+\.(jpg|png|webp|jpeg)$/.test(e.image ?? ''))?.image;
    return `<a href="${escape(canonicalSiteUrl(`/cards/${card.slug}`))}">${image ? `<img src="https://api.gatcg.com${escape(image)}" alt="" width="250" height="349">` : ''}<span>${escape(card.name)}</span></a>`;
  }).join('')}</div>`;
}
export function championCard(name, cards) {
  return cards.filter(card => card.types.includes('CHAMPION') && (card.name === name || card.name.startsWith(`${name},`)))
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || a.name.localeCompare(b.name))[0];
}
export function materialChampion(names, championName, cards) {
  const selected = cards.filter(card => names.includes(card.name) && card.types.includes('CHAMPION') && (card.name === championName || card.name.startsWith(`${championName},`)));
  return selected.sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || a.name.localeCompare(b.name))[0];
}
export function championEntry(champion, clusters, cards, generatedAt, stats = false) {
  const meta = championMetadata(champion.championName, stats), latest = latestChampionSeason(champion);
  const portrait = championCard(champion.championName, cards);
  const builds = clusters.filter(c => c.championName === champion.championName);
  const summary = latest ? `${latest.seasonName} · ${latest.deckCount} deck sightings · ${latest.eventCount} events` : 'Tournament decks and card synergies';
  const seasons = champion.seasons.filter(s => s.deckCount > 0);
  const body = `${cardTiles(portrait ? [portrait] : [])}<p class="result">${escape(summary)}</p><p>Updated ${escape(generatedAt.slice(0, 10))}</p>${link(championPath(champion.championName, !stats), stats ? 'Decks and synergies' : 'Season statistics')}
    ${stats ? `<section><h2>Season results</h2>${seasons.length ? list(seasons.map(s => `${escape(s.seasonName)}: ${s.deckCount} deck sightings · ${s.eventCount} events · ${(s.avgWinRate * 100).toFixed(1)}% average win rate`)) : '<p>No recorded season results.</p>'}</section>` : ''}
    <section><h2>Deck archetypes</h2>${builds.length ? list(builds.map(c => link(archetypeMetadata(c).path, c.name))) : '<p>No recorded archetypes.</p>'}</section>`;
  return { meta, body, image: { title: champion.championName, label: stats ? 'Champion statistics' : 'Decks & synergies', subtitle: latest?.seasonName ?? 'Grand Archive', facts: [latest ? `${latest.deckCount} deck sightings · ${latest.eventCount} events` : 'Explore tournament decks', `Updated ${generatedAt.slice(0, 10)}`], cards: portrait ? [portrait] : [] } };
}
export function archetypeEntry(cluster, cards, generatedAt) {
  const meta = archetypeMetadata(cluster), catalog = new Map(cards.map(card => [card.name, card]));
  const defining = cluster.mainDefiningCards ?? cluster.definingCards;
  const featured = defining.slice(0, 4).map(c => catalog.get(c.name)).filter(Boolean);
  const portrait = materialChampion((cluster.materialDefiningCards ?? []).map(c => c.name), cluster.championName, cards);
  const body = `${cardTiles(featured)}<p class="result">${cluster.deckCount} deck sightings · ${cluster.playerCount} players · ${cluster.eventCount} events</p><p>Updated ${escape(generatedAt.slice(0, 10))}</p>${link(championPath(cluster.championName), `${cluster.championName} decks`)}
    <section><h2>Frequently played Main cards</h2>${list(defining.slice(0, 12).map(c => `${catalog.has(c.name) ? link(canonicalSiteUrl(`/cards/${catalog.get(c.name).slug}`), c.name) : escape(c.name)} · ${(c.prevalence * 100).toFixed(0)}% of deck sightings`))}</section>
    <section><h2>Tournament decklists</h2>${list(cluster.deckIds.slice(0, 8).map(id => { const [eventId, player] = id.split(':'); return link(`/events/${eventId}/?tab=decklists&player=${encodeURIComponent(player)}`, `Event ${eventId} · Player ${player}`); }))}</section>`;
  return { meta, body, image: { title: cluster.name, label: 'Deck archetype', subtitle: `${cluster.championName} · Tournament builds`, facts: [`${cluster.playerCount} players · ${cluster.eventCount} events`, `Updated ${generatedAt.slice(0, 10)}`], cards: [portrait, featured[0]].filter(Boolean) } };
}
export function eventEntry(event, bundle, cards) {
  const meta = eventMetadata(event), top = event.topPlayerIdentity;
  const decklists = Array.isArray(bundle.decklists) ? bundle.decklists : [];
  // A known top deck is not necessarily first place; never infer a winner from it.
  const topText = top ? `#${top.placement} ${top.playerName} · ${top.championName}` : `${event.playerCount} players`;
  const topPlayer = top && bundle.players.find(p => p.username === top.playerName && p.finalPlacement === top.placement);
  const topDeck = topPlayer && decklists.find(d => d.player === topPlayer.id && d.visible)?.decklist;
  const portrait = topDeck && top ? materialChampion((topDeck.material ?? []).map(c => c.card), top.championName, cards) : undefined;
  const players = [...bundle.players].filter(p => p.finalPlacement != null).sort((a, b) => a.finalPlacement - b.finalPlacement || a.id - b.id);
  const body = `${portrait ? cardTiles([portrait]) : ''}<p class="result">${escape(event.date.slice(0, 10))} · ${event.playerCount} players · ${escape(event.status)}</p><p>${escape(event.hostName)}</p>
    ${top ? `<p>${escape(topText)}</p>` : ''}<section><h2>Recorded standings</h2>${players.length ? list(players.map(p => `${link(`/players/${p.id}`, `#${p.finalPlacement} ${p.username}`)}${decklists.some(d => d.player === p.id && d.visible && d.decklist) ? ` · ${link(`${meta.path}?tab=decklists&player=${p.id}`, 'Decklist')}` : ''}`)) : '<p>No placements recorded.</p>'}</section>`;
  return { meta, body, image: { title: event.name, label: event.status === 'complete' ? 'Tournament results' : 'Tournament', subtitle: `${event.date.slice(0, 10)} · ${event.playerCount} players`, facts: [topText], cards: portrait ? [portrait] : [] } };
}
export function refreshDiscoverySitemap(xml, urls) {
  if (!xml.includes('</urlset>')) throw new Error('Invalid sitemap');
  const known = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const retained = known.filter(url => {
    const pathname = new URL(url.replace(/&amp;/g, '&')).pathname.replace(/\/$/, '') || '/';
    return !RETIRED_SITEMAP_ROUTES.has(pathname) && !/^\/(champions|archetypes|events)(\/|$)/.test(pathname);
  });
  const all = [...new Set([...retained.map(url => canonicalSiteUrl(new URL(url.replace(/&amp;/g, '&')).pathname)), ...STATIC_SITEMAP_ROUTES.map(canonicalSiteUrl), ...urls])].sort();
  if (all.length > 50000) throw new Error('Sitemap exceeds URL limit');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map(url => `  <url><loc>${escape(url.replace(/&amp;/g, '&'))}</loc></url>`).join('\n')}\n</urlset>\n`;
}
export async function buildDiscoveryPages({ dataDir = path.join(root, 'data'), outDir = path.join(root, 'app/dist'), artDirs = ['discovery-social', 'match-social', 'artist-social'].map(dir => path.join(root, 'scripts/assets', dir)) } = {}) {
  const [trends, taxonomy, index, { cards }, shell, sitemap] = await Promise.all([
    readJson(path.join(dataDir, 'analysis/champion-trends.json')), readJson(path.join(dataDir, 'analysis/archetype-taxonomy.json')),
    readJson(path.join(dataDir, 'omnidex/index.json')), readJson(path.join(dataDir, 'card-catalog.json')), readFile(path.join(outDir, 'index.html'), 'utf8'), readFile(path.join(outDir, 'sitemap.xml'), 'utf8'),
  ]);
  if (!trends.champions.length || !taxonomy.clusters.length || !cards.length) throw new Error('Missing discovery data');
  const entries = trends.champions.flatMap(c => [false, true].map(stats => championEntry(c, taxonomy.clusters, cards, trends.generatedAt, stats)));
  entries.push(...taxonomy.clusters.map(c => archetypeEntry(c, cards, taxonomy.generatedAt)));
  for (const event of index.events.filter(e => SITEMAP_EVENT_CATEGORIES.has(e.category))) {
    const bundle = await readJson(path.join(dataDir, `omnidex/events/${event.id}.json`));
    if (bundle.id !== event.id) throw new Error(`Event bundle mismatch: ${event.id}`);
    entries.push(eventEntry(event, bundle, cards));
  }
  for (const [section, title, selected] of [
    ['champions', 'Grand Archive Champions', entries.filter(e => e.meta.path.startsWith('/champions/') && !e.meta.path.endsWith('/stats/'))],
    ['archetypes', 'Grand Archive Deck Archetypes', entries.filter(e => e.meta.path.startsWith('/archetypes/'))],
    ['events', 'Grand Archive Tournament Results', entries.filter(e => e.meta.path.startsWith('/events/')).reverse()],
  ]) {
    const meta = discoveryIndexMetadata(section);
    entries.push({ meta, body: list(selected.map(e => link(e.meta.path, e.image.title))), image: { title, label: 'Explore Grand Archive', subtitle: `${selected.length} ${section}`, cards: cards.filter(c => c.types.includes('CHAMPION') && c.level === 3).slice(0, 2) } });
  }
  if (new Set(entries.map(e => e.meta.path)).size !== entries.length) throw new Error('Duplicate discovery URLs');
  for (const entry of entries) {
    if (!/^\/(?:champions\/[\w%-]+(?:\/stats)?|archetypes\/[a-z0-9]+|events\/\d+|champions|archetypes|events)\/$/.test(entry.meta.path)) throw new Error(`Unsafe route: ${entry.meta.path}`);
    entry.html = renderDiscoveryPage(shell, entry.meta, entry.body);
  }
  const xml = refreshDiscoverySitemap(sitemap, entries.map(e => e.meta.url));
  for (const dir of ['champions', 'archetypes', 'events', 'media/discovery']) await rm(path.join(outDir, dir), { recursive: true, force: true });
  let imageBytes = 0, htmlBytes = 0;
  // Bound image work to four independent pages instead of keeping thousands of rasters in memory.
  for (let offset = 0; offset < entries.length; offset += 4) {
    await Promise.all(entries.slice(offset, offset + 4).map(async entry => {
    const dir = path.join(outDir, decodeURIComponent(entry.meta.path));
    const imagePath = path.join(outDir, decodeURIComponent(new URL(entry.meta.image).pathname));
    await mkdir(dir, { recursive: true }); await mkdir(path.dirname(imagePath), { recursive: true });
    const image = await renderDiscoveryImage(entry.image, artDirs);
    await writeFile(path.join(dir, 'index.html'), entry.html); await writeFile(imagePath, image);
    imageBytes += image.length; htmlBytes += Buffer.byteLength(entry.html);
    }));
  }
  await writeFile(path.join(outDir, 'sitemap.xml'), xml);
  console.log(`Discovery: ${entries.length} entry pages, ${(htmlBytes / 1e6).toFixed(1)} MB HTML, ${(imageBytes / 1e6).toFixed(1)} MB images`);
  return entries.length;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildDiscoveryPages();
