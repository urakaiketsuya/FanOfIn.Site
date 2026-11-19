import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_PAGE_ROUTES, canonicalSiteUrl } from '../shared/src/seo.ts';
import { renderDiscoveryPage } from './build-discovery-pages.mjs';
import { escapeHtml as escape } from './discovery-social-image.mjs';
import { PRODUCTS } from '../app/src/features/products/data.ts';
import { normalizeCardTags } from '../shared/src/cardTags.ts';
import { merchandiseCatalog } from '../shared/src/merchandiseCollectionCatalog.ts';
import { announcedBans, BANLIST_REVIEW } from '../app/src/features/cards/banlistData.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const link = (url, label) => `<a href="${escape(url)}">${escape(label)}</a>`;
const list = rows => `<ul>${rows.map(row => `<li>${row}</li>`).join('')}</ul>`;
const section = (title, body) => `<section><h2>${escape(title)}</h2>${body}</section>`;
const paragraph = text => `<p>${escape(text)}</p>`;
const page = (route, title, description, body) => ({ route, meta: { title, description, url: canonicalSiteUrl(route), image: 'https://fanofin.site/media/social/fan-of-insight-v1.jpg' }, body: paragraph(description) + body });
function tiles(cards) {
  return `<div class="cards">${cards.map(card => {
    const image = card.image ? `/images/spoilers/${card.image}` : card.editions?.[0]?.image;
    const src = image?.startsWith('/images/spoilers/') ? image : image ? `https://api.gatcg.com${image}` : null;
    return `<a href="${escape(card.slug ? canonicalSiteUrl(`/cards/${card.slug}`) : canonicalSiteUrl('/cards/spoilers'))}">${src ? `<img loading="lazy" src="${escape(src)}" alt="" width="250" height="349">` : ''}<span>${escape(card.name)}</span></a>`;
  }).join('')}</div>`;
}

/** Uses published data only; never requires an account or a live API during a build. */
export function publicEntries(data) {
  const { cards, index, primers, official, stats, spoilers, stores, teams, achievements, tags, strategies, changelog, matches } = data;
  const byName = new Map(cards.map(card => [card.name, card]));
  const featured = stats.cards.slice(0, 12).flatMap(card => byName.has(card.name) ? [byName.get(card.name)] : []);
  const cardLinks = names => tiles(names.flatMap(name => byName.has(name) ? [byName.get(name)] : [{ name }]));
  const seasons = list(index.seasons.map(season => link(canonicalSiteUrl(`/seasons/${season.slug}`), season.name)));
  const deckLinks = list(primers.map(guide => link(canonicalSiteUrl(`/official-decks/${guide.slug}/primer`), official.decks.find(deck => deck.id === guide.deckId)?.name ?? guide.slug)));
  const championLinks = list([...new Set(cards.filter(card => card.types.includes('CHAMPION') && card.level > 0).map(card => card.name.split(',')[0]))].sort().map(name => link(canonicalSiteUrl(`/champions/${encodeURIComponent(name)}`), name)));
  const bodies = {
    '/cards': tiles(cards.slice(0, 24)) + section('Explore cards', list(['/cards/stats', '/cards/spoilers', '/cards/tags', '/cards/banlist'].map(route => link(canonicalSiteUrl(route), PUBLIC_PAGE_ROUTES.find(item => item[0] === route)[1])))),
    '/cards/stats': tiles(featured) + list(stats.cards.slice(0, 20).map(card => `${link(canonicalSiteUrl(`/cards/${card.slug}`), card.name)} · ${card.deckCount} decks · ${card.eventCount} events`)),
    '/cards/staples': tiles(featured),
    '/cards/spoilers': tiles(spoilers.cards.slice(-24).reverse()),
    '/cards/banlist': section('Standard', cardLinks(announcedBans('STANDARD'))) + section('Pantheon', cardLinks(announcedBans('PANTHEON'))) + paragraph(`List effective ${BANLIST_REVIEW.effective}; reviewed ${BANLIST_REVIEW.verified}.`) + link(BANLIST_REVIEW.announcement, 'Official banned and restricted announcement'),
    '/cards/search-reference': section('Card search fields', list(['name: quoted card names', 'type: card types', 'class: champion classes', 'element: card elements', 'set: printing sets'].map(escape))) + link(canonicalSiteUrl('/cards'), 'Search the card database'),
    '/cards/packages': tiles(featured) + link(canonicalSiteUrl('/archetypes/strategies'), 'Explore published strategy packages'),
    '/stores': list(stores.stores.slice(0, 80).map(store => `${escape(store.name)} · ${escape(store.country ?? '')} · ${escape(store.address ?? '')}`)),
    '/thema': paragraph('Thema tracks Grand Archive card price rankings. The interactive leaderboard loads current rankings from the official card API.') + link('https://api.gatcg.com', 'Grand Archive card API'),
    '/seasons': seasons,
    '/players': paragraph('Player profiles bring together recorded tournament appearances, placements and competition results.') + link(canonicalSiteUrl('/events'), 'Browse tournament results'),
    '/teams': list(teams.teams.slice(0, 30).map(team => `${escape(team.teamName)} · ${escape(team.eventName)} · ${escape(team.eventDate.slice(0, 10))}`)),
    '/achievements': list(achievements.definitions.map(item => `<strong>${escape(item.name)}</strong>: ${escape(item.description)}`)),
    '/battle-chart': championLinks,
    '/metagame': championLinks + link(canonicalSiteUrl('/archetypes'), 'Tournament archetypes'),
    '/decks': tiles(featured) + list(['/archetypes', '/decks/shared', '/official-decks'].map(route => link(canonicalSiteUrl(route), route === '/archetypes' ? 'Tournament builds' : route === '/decks/shared' ? 'Community decks' : 'Official decks'))),
    '/decks/shared': paragraph('Published community decks include the author’s selected cards, description and version. Use the interactive browse view to search current public decks.') + link(canonicalSiteUrl('/official-decks'), 'Official decklists and primers'),
    '/pantheon': paragraph('Pantheon decks use their own format and card restrictions. Explore published community decklists in the interactive browse view.') + link(canonicalSiteUrl('/cards/banlist'), 'Card restrictions by format'),
    '/compare': tiles(featured) + paragraph('Select decklists in the interactive view to compare shared cards and quantities.') + link(canonicalSiteUrl('/decks'), 'Find a deck to compare'),
    '/official-decks': deckLinks,
    '/products': list(PRODUCTS.map(product => `<strong>${escape(product.name)}</strong> · ${escape(product.type)} · ${escape(product.releaseDate)}`)) + link(canonicalSiteUrl('/official-decks'), 'Starter and Re:Collection decks'),
    '/merchandise': list(merchandiseCatalog.slice(0, 60).map(item => `${escape(item.name)} · ${escape(item.category)}`)) + link(canonicalSiteUrl('/products'), 'Grand Archive product releases'),
    '/cards/tags': list(normalizeCardTags(tags).tags.filter(tag => tag.cardCount > 0).map(tag => `${escape(tag.name)} · ${tag.cardCount} cards`)),
    '/archetypes/strategies': strategies.entries.map(entry => section(entry.definition.name, cardLinks(entry.coreCards) + paragraph(entry.description))).join(''),
    '/methodology': section('Sources', paragraph('Card facts come from the Grand Archive catalog. Competition results come from Omnidex tournament records; deck analysis uses published decklists.')) + section('Scope', paragraph('Deck identity uses Main and Material cards. Sideboards are excluded from grouping and statistics. Recorded tournament associations are not predictions of future results.')) + list(['/cards/stats', '/champions', '/archetypes', '/events'].map(route => link(canonicalSiteUrl(route), route.slice(1)))),
    '/docs/api': section('Base URL', paragraph('https://fanofin-public-api-production.fanofin-match-ingestion-worker.workers.dev')) + section('Read endpoints', list(['/v1/cards', '/v1/cards/:slug/stats', '/v1/archetypes', '/v1/meta'].map(escape))) + paragraph('Read endpoints support GET and HEAD. List endpoints provide cursor pagination; retain the returned cursor when loading the next page. Responses include published data freshness information.'),
    '/changelog': list(changelog.entries.slice(0, 40).map(entry => `${escape(entry.date.slice(0, 10))} · ${escape(entry.summary)}`)),
    '/timelines/combos': matches.matches.flatMap(match => match.games.flatMap(game => game.beats.filter(beat => beat.tags?.includes('combo')).map(beat => ({ match, game, beat })))).slice(0, 40).map(({ match, game, beat }) => section(`${match.event} · Game ${game.gameNumber}`, cardLinks(beat.cards ?? []) + paragraph(beat.text) + link(canonicalSiteUrl(`/timelines/${match.id}`), `${match.players.map(player => player.name).join(' vs. ')}`))).join('') || paragraph('No combos tagged yet.'),
  };
  const entries = PUBLIC_PAGE_ROUTES.map(([route, title, description]) => {
    if (!bodies[route]) throw new Error(`Missing public content for ${route}`);
    return page(route, title, description, bodies[route]);
  });
  for (const season of index.seasons) {
    const events = index.events.filter(event => event.seasonId === season.id);
    entries.push(page(`/seasons/${season.slug}`, `${season.name} · Grand Archive Season`, `Grand Archive tournament events and results for ${season.name}.`, paragraph(`${events.length} recorded events`) + list(events.slice(-60).reverse().map(event => `${link(canonicalSiteUrl(`/events/${event.id}`), event.name)} · ${escape(event.date.slice(0, 10))}`)) + section('All seasons', seasons)));
  }
  for (const guide of primers) {
    const deck = official.decks.find(deck => deck.id === guide.deckId);
    if (!deck) throw new Error(`Missing official deck ${guide.deckId}`);
    entries.push(page(`/official-decks/${guide.slug}/primer`, `${deck.name} · Deck Primer`, guide.summary,
      cardLinks(guide.cards) + section('Opening turns', paragraph(guide.opening)) + section('Leveling', paragraph(guide.leveling)) + section('Card sequence', paragraph(guide.sequence)) + section('Before you commit', list(guide.mistakes.map(escape))) + section('Card synergies', cardLinks(guide.synergyCards ?? []) + paragraph(guide.sequence)) + section('How you win', cardLinks(guide.winCards ?? []) + paragraph(guide.winText ?? '')) + link(canonicalSiteUrl('/official-decks'), 'All official decks')));
  }
  if (new Set(entries.map(entry => entry.meta.url)).size !== entries.length) throw new Error('Duplicate public entry URL');
  return entries;
}

export async function buildPublicPages({ dataDir = path.join(root, 'data'), outDir = path.join(root, 'app/dist'), appDir = path.join(root, 'app/src') } = {}) {
  const read = async file => JSON.parse(await readFile(path.join(dataDir, file), 'utf8'));
  const appRead = async file => JSON.parse(await readFile(path.join(appDir, file), 'utf8'));
  const [catalog, index, primers, official, stats, spoilers, stores, teams, achievements, tags, strategies, changelog, matches] = await Promise.all([
    read('card-catalog.json'), read('omnidex/index.json'), appRead('features/official-products/primers/guides.json'), appRead('features/official-products/decks.json'), read('analysis/cards.json'), read('reference/card-spoilers-2026-11-01.json'), read('omnidex/stores.json'), read('omnidex/teams.json'), read('analysis/achievements.json'), read('community/card-tags.json'), read('reference/curated-strategies.json'), read('changelog.json'), read('broadcast-timelines.json'),
  ]);
  // Mark only our root content so repeated generation keeps an empty app shell.
  let shell = (await readFile(path.join(outDir, 'index.html'), 'utf8')).replace(/<!--public-entry-start-->[\s\S]*?<!--public-entry-end-->/, '');
  // Community deck delivery fetches /index.html and requires the empty app root.
  shell = shell.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '').replace(/<script\b(?=[^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '');
  if (!shell.includes('<div id="root"></div>')) throw new Error('Missing empty shared app shell');
  shell = shell.replace('</head>', '<link rel="canonical" href="https://fanofin.site/"></head>');
  const entries = publicEntries({ cards: catalog.cards, index, primers, official, stats, spoilers, stores, teams, achievements, tags, strategies, changelog, matches });
  for (const entry of entries) {
    entry.html = renderDiscoveryPage(shell, entry.meta, entry.body).replace('<div id="root">', '<div id="root"><!--public-entry-start-->').replace('</main></div>', '</main><!--public-entry-end--></div>');
  }
  let xml = await readFile(path.join(outDir, 'sitemap.xml'), 'utf8');
  const urls = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => canonicalSiteUrl(new URL(match[1]).pathname)));
  urls.add(canonicalSiteUrl('/'));
  // Primers and seasons are generated from the current source, dropping removed entries.
  for (const url of urls) if (/\/(?:seasons\/[^/]+|official-decks\/[^/]+\/primer)\/$/.test(new URL(url).pathname)) urls.delete(url);
  for (const entry of entries) urls.add(entry.meta.url);
  xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
  for (const entry of entries) {
    const dir = path.join(outDir, decodeURIComponent(new URL(entry.meta.url).pathname));
    await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, 'index.html'), entry.html);
  }
  await writeFile(path.join(outDir, 'index.html'), shell);
  await writeFile(path.join(outDir, 'sitemap.xml'), xml);
  console.log(`Public entry pages: ${entries.length} landing pages, seasons and primers`);
  return entries.length;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPublicPages();
