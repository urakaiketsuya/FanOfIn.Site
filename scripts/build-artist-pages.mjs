import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { artistDirectory } from '../shared/src/artistDirectory.ts';
import { readArtistGalleries } from './artist-gallery-data.mjs';
import { artistPageMetadata, artistPagePath, artistSocialImagePath, artistSocialImageAlt } from '../shared/src/artistSeo.ts';
import { buildArtistSocialImages } from './build-artist-social-images.mjs';
import { canonicalSiteUrl } from '../shared/src/seo.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const absolute = value => new URL(value, 'https://fanofin.site').href;
const artistLink = artist => `<a href="${artistPagePath(artist)}">${escape(artist.name)}</a>`;

export function renderArtistPage(shell, artist, gallery, galleries = []) {
  const meta = artistPageMetadata(artist, gallery);
  const url = canonicalSiteUrl(meta.path);
  const title = `${meta.title} · Fan of Insight`;
  const image = absolute(artistSocialImagePath(artist, gallery, galleries));
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escape(title)}</title>`);
  for (const [attr, key, value] of [
    ['name','description',meta.description], ['property','og:title',title],
    ['property','og:description',meta.description], ['property','og:url',url],
    ['name','twitter:title',title], ['name','twitter:description',meta.description],
    ['property','og:image',image], ['name','twitter:image',image],
    ['property','og:image:alt',artistSocialImageAlt(artist)],
    ['name','twitter:image:alt',artistSocialImageAlt(artist)],
  ]) {
    html = html.replace(new RegExp(`<meta\\b[^>]*\\b${attr}=["']${key}["'][^>]*>`, 'gi'), '');
    html = html.replace('</head>', () => `<meta ${attr}="${key}" content="${escape(value)}">\n</head>`);
  }
  html = html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '').replace(/<meta\b[^>]*\bproperty=["']og:image:(width|height|type)["'][^>]*>/gi, '');
  html = html.replace('</head>', '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/jpeg"></head>');
  const entity = artist && ['individual','studio'].includes(artist.kind) ? {
    '@type': artist.kind === 'studio' ? 'Organization' : 'Person', '@id': `${url}#artist`,
    name: artist.name, url, sameAs: artist.links.map(link => link.url),
    ...(artist.portrait && !artist.portrait.framing ? { image: absolute(artist.portrait.src) } : {}),
    alternateName: artist.credits.filter(name => name !== artist.name),
  } : undefined;
  const structured = { '@context':'https://schema.org', '@graph': [
    { '@type': artist ? 'WebPage' : 'CollectionPage', '@id':url, url, name:title, description:meta.description, image, ...(entity ? {about:entity} : {}), mainEntity: {
      '@type':'ItemList', itemListElement: artist ? (gallery?.cards ?? []).map((entry, i) => ({'@type':'ListItem',position:i+1,name:entry.card.name,url:absolute(`/cards/${encodeURIComponent(entry.card.slug)}`)})) : galleries.map((entry,i)=>({'@type':'ListItem',position:i+1,name:entry.name,url:absolute(artistPagePath(entry))})),
    } },
    { '@type':'BreadcrumbList', itemListElement:[{'@type':'ListItem',position:1,name:'Fan of Insight',item:absolute('/')},{'@type':'ListItem',position:2,name:'Artists',item:absolute('/artists/')}, ...(artist ? [{'@type':'ListItem',position:3,name:artist.name,item:url}] : [])] },
  ]};
  html = html.replace('</head>', () => `<link rel="canonical" href="${url}">\n<script id="artist-structured-data" data-canonical="${url}" type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script>\n</head>`);
  const studio = artistDirectory.find(candidate => candidate.id === artist?.studioId);
  const members = artist ? artistDirectory.filter(candidate => candidate.studioId === artist.id) : [];
  const content = artist ? `
    <a href="/artists/">All artists</a><h1>${escape(artist.name)}</h1><p>${escape(meta.description)}</p>
    ${artist.links.length ? `<nav aria-label="Official accounts">${artist.links.map(link=>`<a href="${escape(link.url)}" rel="noreferrer">${escape(link.platform)} · ${escape(link.label)}</a>`).join(' ')}</nav>` : ''}
    ${studio ? `<p>Credited with ${artistLink(studio)}</p>` : ''}
    ${members.length ? `<section><h2>Studio artists</h2><ul>${members.map(member=>`<li>${artistLink(member)}</li>`).join('')}</ul></section>` : ''}
    <section><h2>Grand Archive artwork</h2><p>${gallery?.cards.length ?? 0} cards · ${gallery?.printingCount ?? 0} printings</p><ul class="art-grid">${(gallery?.cards ?? []).map(entry=>{
      const edition=entry.editions[0];
      const src = /^\/cards\/images\/[\w-]+\.(?:jpg|jpeg|png|webp)$/.test(edition.image ?? '') ? `https://api.gatcg.com${edition.image}` : undefined;
      return `<li><a href="/cards/${encodeURIComponent(entry.card.slug)}?edition=${encodeURIComponent(edition.uuid)}">${src ? `<img src="${escape(src)}" width="200" height="279" loading="lazy" alt="${escape(entry.card.name)}">` : ''}<span>${escape(entry.card.name)}</span></a><p>${escape(edition.set.name)} #${escape(edition.collector_number)}</p></li>`;
    }).join('')}</ul></section>` : `<h1>Grand Archive artists</h1><p>${escape(meta.description)}</p><p>${galleries.length} artists and studios</p><div class="directory-grid">${galleries.map(entry=>`<article><h2>${artistLink(entry)}</h2>${entry.kind === 'studio' ? '<p>Studio</p>' : ''}<p>${entry.cards.length} cards · ${entry.printingCount} printings</p><div class="art-grid">${entry.cards.slice(0,3).map(({card,editions})=>{
      const edition=editions[0];
      const src=/^\/cards\/images\/[\w-]+\.(?:jpg|jpeg|png|webp)$/.test(edition.image??'') ? `https://api.gatcg.com${edition.image}` : undefined;
      return `<a href="/cards/${encodeURIComponent(card.slug)}?edition=${encodeURIComponent(edition.uuid)}">${src ? `<img src="${escape(src)}" width="200" height="279" loading="lazy" alt="${escape(card.name)}">` : ''}<span>${escape(card.name)}</span></a>`;
    }).join('')}</div></article>`).join('')}</div>`;
  if (!/<div id="root"><\/div>/.test(html)) throw new Error('Missing app root');
  return html.replace('<div id="root"></div>', () => `<div id="root"><style>.artist-entry{max-width:76rem;margin:auto;padding:1rem;font-family:system-ui;overflow-wrap:anywhere}.artist-entry h1{font-size:2rem;font-weight:700}.artist-entry h2{font-size:1.25rem;font-weight:600}.artist-entry p{margin:.75rem 0}.artist-entry a{text-decoration:underline;display:inline-flex;gap:.5rem;min-height:48px;align-items:center}.artist-entry a:focus-visible{outline:2px solid currentColor}.artist-entry nav{display:flex;flex-wrap:wrap;gap:1rem}.artist-entry .art-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem;padding:0;list-style:none}.artist-entry .directory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:1rem}.directory-grid article{border:1px solid #888;border-radius:12px;padding:1rem}.directory-grid .art-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.art-grid a{display:flex;flex-direction:column;align-items:start}.art-grid img{width:100%;height:auto;max-width:200px}</style><main class="artist-entry">${content}</main></div>`);
}

export async function buildArtistPages({dataDir=path.join(root,'data'),outDir=path.join(root,'app/dist')}={}) {
  const galleries=readArtistGalleries(dataDir);
  const identities=[...artistDirectory,...galleries.filter(gallery=>!artistDirectory.some(artist=>artist.id===gallery.id))];
  const shell=await readFile(path.join(outDir,'index.html'),'utf8');
  const pages=[{slug:'',html:renderArtistPage(shell,undefined,undefined,galleries)}];
  for (const artist of identities) {
    if (!artist.slug || /[\/\\]|^\.+$/.test(artist.slug)) throw new Error('Invalid artist slug');
    pages.push({slug:artist.slug,html:renderArtistPage(shell,artist,galleries.find(g=>g.id===artist.id),galleries)});
    for(const alias of artist.slugAliases ?? []) {
      if (/[\/\\]|^\.+$/.test(alias)) throw new Error('Invalid alias slug');
      const url=canonicalSiteUrl(artistPagePath(artist));
      pages.push({slug:alias,html:`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(artist.name)} · Fan of Insight</title><link rel="canonical" href="${url}"><meta http-equiv="refresh" content="0;url=${url}"></head><body><a href="${url}">${escape(artist.name)}</a></body></html>`});
    }
  }
  const sitemapPath=path.join(outDir,'sitemap.xml');
  const source=await readFile(sitemapPath,'utf8');
  if(!source.includes('</urlset>')) throw new Error('Invalid sitemap');
  const sitemap=source.replace(/\s*<url>\s*<loc>https:\/\/fanofin\.site\/artists(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>/g,'').replace(/\s*<\/urlset>/,`\n${[undefined,...identities].map(a=>`<url><loc>${canonicalSiteUrl(artistPagePath(a))}</loc></url>`).join('\n')}\n</urlset>`);
  if((sitemap.match(/<loc>/g)??[]).length>50000) throw new Error('Sitemap exceeds URL limit');
  await buildArtistSocialImages({ identities, galleries, outDir });
  await rm(path.join(outDir,'artists'),{recursive:true,force:true});
  for(const page of pages) {
    const directory=path.join(outDir,'artists',page.slug);
    await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'index.html'),page.html);
  }
  await writeFile(sitemapPath,sitemap);
  console.log(`Artist entry pages: ${identities.length} profiles, directory and ${pages.length-identities.length-1} alias redirects`);
  return pages.length;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await buildArtistPages();
