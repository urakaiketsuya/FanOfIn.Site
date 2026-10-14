import type { PublicDeck } from '../../shared/src/saved-deck-types.js';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** Fill the deployed app shell, preserving its current hashed assets and startup scripts. */
export function renderCommunityDeckPage(shell: string, deck: PublicDeck): string {
  const canonical = `https://fanofin.site/decks/${deck.publicSlug}`;
  const image = `https://accounts.fanofin.site/share/decks/${deck.publicSlug}/image.png`;
  const title = `${deck.title} · Fan of Insight`;
  const description = deck.description || `${deck.title} by ${deck.owner.displayName}. Grand Archive decklist.`;
  const robots = deck.visibility === 'public' ? 'index, follow' : 'noindex, nofollow';
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escape(title)}</title>`);
  const metadata = [
    ['name', 'description', description], ['name', 'robots', robots],
    ['property', 'og:title', title], ['property', 'og:description', description],
    ['property', 'og:url', canonical], ['property', 'og:image', image],
    ['property', 'og:image:type', 'image/png'], ['property', 'og:image:alt', deck.title],
    ['name', 'twitter:title', title], ['name', 'twitter:description', description],
    ['name', 'twitter:image', image], ['name', 'twitter:image:alt', deck.title],
    ['name', 'twitter:card', 'summary_large_image'],
  ];
  for (const [attribute, name, value] of metadata) {
    html = html.replace(new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${name}["'][^>]*>`, 'gi'), '');
    html = html.replace('</head>', () => `<meta ${attribute}="${name}" content="${escape(value)}" />\n</head>`);
  }
  html = html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');
  const sections = [['Material', deck.decklist.material], ['Main', deck.decklist.main]] as const;
  const structured = { '@context': 'https://schema.org', '@type': 'WebPage', url: canonical, name: title, description, image,
    mainEntity: { '@type': 'ItemList', itemListElement: sections.flatMap(([name, lines]) => lines.map(line => ({ '@type': 'ListItem', name: `${name}: ${line.quantity} × ${line.card}` }))).map((item, i) => ({ ...item, position: i + 1 })) } };
  html = html.replace('</head>', () => `<link rel="canonical" href="${canonical}" /><script id="deck-structured-data" data-canonical="${canonical}" type="application/ld+json">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script></head>`);
  if (!html.includes('<div id="root"></div>')) throw Error('Missing app shell root');
  const content = `<main class="deck-entry"><a href="/decks">Fan of Insight · Decks</a><img src="${image}" width="1200" height="630" alt="${escape(deck.title)}" /><h1>${escape(deck.title)}</h1><p>By ${escape(deck.owner.displayName)}</p><p>${escape(description)}</p>${sections.map(([name, lines]) => `<section><h2>${name} · ${lines.reduce((n, line) => n + line.quantity, 0)}</h2><ul>${lines.map(line => `<li>${line.quantity} × ${escape(line.card)}</li>`).join('')}</ul></section>`).join('')}</main>`;
  return html.replace('<div id="root"></div>', () => `<div id="root"><style>.deck-entry{max-width:64rem;margin:auto;padding:1rem;overflow-wrap:anywhere}.deck-entry img{display:block;width:100%;height:auto;border-radius:1rem}.deck-entry h1{font-size:2rem}.deck-entry h2{font-size:1.25rem}.deck-entry ul{list-style:none;padding:0}.deck-entry li{min-height:48px}.deck-entry a{display:inline-flex;align-items:center;min-height:48px;text-decoration:underline}.deck-entry a:focus-visible{outline:2px solid currentColor;outline-offset:2px}</style>${content}</div>`);
}
