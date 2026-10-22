import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardPageMetadata, cardPagePath, cardSocialImage } from '../shared/src/cardSeo.ts';
import { canonicalSiteUrl, isCardPageSlug } from '../shared/src/seo.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function cardStats(card) {
  const cost = card.cost?.value != null && card.cost.type !== 'none' ? [`${card.cost.type === 'memory' ? 'Memory' : 'Reserve'} cost`, card.cost.value] : undefined;
  return [cost, ['Level', card.level], ['Power', card.power], ['Life', card.life], ['Durability', card.durability], ['Speed', card.speed ? 'Fast' : undefined]]
    .filter(entry => entry && entry[1] != null && entry[1] !== '');
}

// Head metadata carries only name, keywords and effect text (see cardPageMetadata);
// the readable body keeps the full card: art, stats, flavor, printings and related cards.
export function renderCardPage(shell, card, catalog = new Map()) {
  if (!isCardPageSlug(card.slug)) throw new Error(`Invalid card slug: ${card.slug}`);
  const meta = cardPageMetadata(card);
  const url = canonicalSiteUrl(meta.path);
  const title = `${meta.title} · Fan of Insight`;
  const social = cardSocialImage(card);
  // The readable initial root is replaced by React on startup. Assets and the
  // protected source app/index.html remain untouched.
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escape(title)}</title>`);
  const tags = [
    ['name','description',meta.description], ['property','og:title',title],
    ['property','og:description',meta.description], ['property','og:url',url],
    ['name','twitter:title',title], ['name','twitter:description',meta.description],
    ...(social ? [['property','og:image',social.src], ['name','twitter:image',social.src],
      ['property','og:image:alt',social.alt], ['name','twitter:image:alt',social.alt], ['name','twitter:card','summary']] : []),
  ];
  for (const [attr, key, value] of tags) {
    html = html.replace(new RegExp(`<meta\\b[^>]*\\b${attr}=["']${key}["'][^>]*>`, 'gi'), '');
    html = html.replace('</head>', () => `<meta ${attr}="${key}" content="${escape(value)}">\n</head>`);
  }
  // Card art is portrait, not the default site's 1200×630 landscape image.
  if (social) html = html.replace(/<meta\b[^>]*\bproperty=["']og:image:(width|height|type)["'][^>]*>/gi, '');
  html = html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');
  html = html.replace('</head>', () => `<link rel="canonical" href="${url}">\n</head>`);
  const printings = card.editions.filter(edition => edition.set?.name);
  const related = [...new Map([...(card.references ?? []), ...(card.referenced_by ?? [])]
    .map(ref => catalog.get(ref.slug ?? '') ?? catalog.get(ref.name ?? ''))
    .filter(other => other && other.slug !== card.slug && isCardPageSlug(other.slug))
    .map(other => [other.slug, other])).values()];
  const stats = cardStats(card);
  const content = `<a href="/cards">Fan of Insight · Cards</a><h1>${escape(card.name)}</h1>
    ${meta.typeLine ? `<p>${escape(meta.typeLine)}</p>` : ''}
    ${social ? `<img src="${escape(social.src)}" width="250" height="349" alt="${escape(social.alt)}">` : ''}
    ${stats.length ? `<dl>${stats.map(([label, value]) => `<dt>${escape(label)}</dt><dd>${escape(value)}</dd>`).join('')}</dl>` : ''}
    ${meta.keywords.length ? `<p>Keywords: ${meta.keywords.map(escape).join(', ')}</p>` : ''}
    ${card.effect_raw ? `<section><h2>Effect</h2><p>${escape(card.effect_raw)}</p></section>` : ''}
    ${card.flavor ? `<blockquote>${escape(card.flavor)}</blockquote>` : ''}
    ${printings.length ? `<section><h2>Printings</h2><ul>${printings.map(edition => `<li><a href="${cardPagePath(card.slug)}?edition=${encodeURIComponent(edition.uuid)}">${escape(edition.set.name)} #${escape(edition.collector_number)}</a>${edition.illustrator ? ` · Art by ${escape(edition.illustrator)}` : ''}</li>`).join('')}</ul></section>` : ''}
    ${related.length ? `<section><h2>Related cards</h2><ul>${related.map(other => `<li><a href="${cardPagePath(other.slug)}">${escape(other.name)}</a></li>`).join('')}</ul></section>` : ''}`;
  if (!/<div id="root"><\/div>/.test(html)) throw new Error('Build shell is missing empty root');
  return html.replace('<div id="root"></div>', () => `<div id="root"><style>.card-entry{max-width:64rem;margin:auto;padding:1rem;font-family:system-ui;overflow-wrap:anywhere}.card-entry h1{font-size:2rem;font-weight:700}.card-entry h2{font-size:1.25rem;font-weight:600;margin-top:1.5rem}.card-entry img{max-width:250px;height:auto}.card-entry dl{display:grid;grid-template-columns:max-content 1fr;gap:.25rem 1rem}.card-entry dd{margin:0}.card-entry ul{list-style:none;padding:0}.card-entry a{display:inline-flex;align-items:center;min-height:48px;text-decoration:underline}.card-entry a:focus-visible{outline:2px solid currentColor;outline-offset:2px}</style><main class="card-entry">${content}</main></div>`);
}

export async function buildCardPages({dataDir=path.join(root,'data'),outDir=path.join(root,'app/dist')}={}) {
  const { cards } = JSON.parse(await readFile(path.join(dataDir,'card-catalog.json'),'utf8'));
  if (!Array.isArray(cards) || !cards.length) throw new Error('Card catalog is empty');
  const catalog = new Map(cards.flatMap(card => [[card.slug, card], [card.name, card]]));
  const shell = await readFile(path.join(outDir,'index.html'),'utf8');
  // Render before removing old output so malformed inputs fail without partial output.
  const pages = cards.map(card => ({ slug: card.slug, html: renderCardPage(shell, card, catalog) }));
  const sitemapPath = path.join(outDir,'sitemap.xml');
  const source = await readFile(sitemapPath,'utf8');
  if (!source.includes('</urlset>')) throw new Error('Invalid sitemap');
  // Replace every card detail URL with the catalog's canonical set; app routes under /cards stay.
  const sitemap = source.replace(/\s*<url>\s*<loc>https:\/\/fanofin\.site\/cards\/([^<\/]+)\/?<\/loc>[\s\S]*?<\/url>/g, (entry, slug) => isCardPageSlug(slug) ? '' : entry)
    .replace(/\s*<\/urlset>/, `\n${pages.map(page => `  <url><loc>${canonicalSiteUrl(cardPagePath(page.slug))}</loc></url>`).join('\n')}\n</urlset>`);
  if ((sitemap.match(/<loc>/g) ?? []).length > 50000) throw new Error('Sitemap exceeds URL limit');
  // app/public has no /cards folder, so removing it only drops stale generated card pages.
  await rm(path.join(outDir,'cards'),{recursive:true,force:true});
  for (const page of pages) {
    const directory = path.join(outDir,'cards',page.slug);
    await mkdir(directory,{recursive:true});
    await writeFile(path.join(directory,'index.html'),page.html);
  }
  await writeFile(sitemapPath,sitemap);
  console.log(`Card entry pages: ${pages.length} cards`);
  return pages.length;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildCardPages();
