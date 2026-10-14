import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { artistSocialImagePath } from '../shared/src/artistSeo.ts';
import { artistSocialEditions as artistSocialArt } from '../shared/src/artistSeo.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]));
const embed = buffer => `data:image/png;base64,${buffer.toString('base64')}`;

async function localImage(file, width, height, fit = 'cover') {
  try {
    return await sharp(await readFile(file)).resize(width, height, { fit, background: '#232a35' }).png().toBuffer();
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

/** Rasterized text uses Pango's CJK fallback and wraps long names inside the safe area. */
async function nameLayer(name) {
  const input = { text: { text: `<span foreground="#f1f4fa">${escape(name)}</span>`, font: 'sans-serif 78', width: 570, wrap: 'word-char', rgba: true } };
  const image = await sharp(input).png().toBuffer();
  const { height } = await sharp(image).metadata();
  return height > 112 ? sharp(image).resize({ height: 112 }).png().toBuffer() : image;
}

export async function renderArtistSocialImage({ artist, gallery, galleries = [], publicDir = path.join(root, 'app/public'), assetDir = path.join(root, 'scripts/assets/artist-social') } = {}) {
  const featured = artist ? gallery : galleries.find(entry => entry.id === 'a004') ?? galleries[0];
  const artwork = [];
  for (const edition of artistSocialArt(featured)) {
    const image = await localImage(path.join(assetDir, `${edition.uuid}.jpg`), 360, 690);
    if (image) artwork.push(image);
  }
  const portrait = artist?.portrait && !artist.portrait.framing && /^\/images\/artists\/[\w.-]+$/.test(artist.portrait.src)
    ? await localImage(path.join(publicDir, artist.portrait.src), 108, 108, artist.portrait.fit === 'contain' ? 'contain' : 'cover') : undefined;
  const portraits = [];
  if (!artist) {
    for (const id of ['a022', 'a047', 'a006']) {
      const source = galleries.find(entry => entry.id === id)?.portrait?.src;
      if (!source || !/^\/images\/artists\/[\w.-]+$/.test(source)) continue;
      const image = await localImage(path.join(publicDir, source), 52, 52);
      if (image) portraits.push(image);
    }
  }
  const art = artwork.map((image, index) => `<image href="${embed(image)}" x="${740 + index * 310}" y="${-35 + index * 140}" width="360" height="690" transform="rotate(9 ${920 + index * 310} 315)"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="wash"><stop offset=".43" stop-color="#181c23"/><stop offset=".77" stop-color="#181c23" stop-opacity="0"/></linearGradient>
    <clipPath id="portrait"><circle cx="118" cy="172" r="54"/></clipPath>
    ${portraits.map((_, i) => `<clipPath id="p${i}"><circle cx="${90 + 48 * i}" cy="512" r="26"/></clipPath>`).join('')}</defs>
    <rect width="1200" height="630" fill="#181c23"/>
    <path d="M850 -60L1200 90V630H970L700 300Z" fill="#232a35"/>
    ${art}<rect width="1200" height="630" fill="url(#wash)"/>
    <g font-family="sans-serif" fill="#f1f4fa">
      <path d="M76 45l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#9ccaf2"/>
      <text x="106" y="72" font-size="27" fill="#bac7d8">Fan of Insight</text>
      ${artist ? `
        <circle cx="118" cy="172" r="55" fill="#232a35" stroke="#394554" stroke-width="2"/>
        ${portrait ? `<image href="${embed(portrait)}" x="64" y="118" width="108" height="108" clip-path="url(#portrait)"/>` : ''}
        <text x="64" y="275" font-size="19" letter-spacing="3" fill="#9ccaf2">${artist.kind === 'studio' ? 'GRAND ARCHIVE STUDIO' : 'GRAND ARCHIVE ARTIST'}</text>
        <text x="64" y="456" font-size="27" fill="#bac7d8">Explore the artwork.</text>
        <text x="64" y="495" font-size="27" fill="#bac7d8">${artist.links.length ? 'Find the official accounts.' : 'Discover their credited cards.'}</text>
        ${gallery?.cards.length ? `<text x="64" y="541" font-size="22" fill="#9ccaf2">${gallery.cards.length} credited ${gallery.cards.length === 1 ? 'card' : 'cards'}</text>` : ''}
      ` : `
        <text x="64" y="206" font-size="20" letter-spacing="4" fill="#9ccaf2">GRAND ARCHIVE</text>
        <text x="60" y="300" font-size="88" font-weight="600" letter-spacing="-4">Meet the</text>
        <text x="60" y="392" font-size="88" font-weight="600" letter-spacing="-4">artists.</text>
        <text x="64" y="440" font-size="27" fill="#bac7d8">The people and studios</text>
        <text x="64" y="479" font-size="27" fill="#bac7d8">behind the cards.</text>
        ${portraits.map((image, i) => `<image href="${embed(image)}" x="${64 + 48 * i}" y="486" width="52" height="52" clip-path="url(#p${i})"/>`).join('')}
      `}
      <text x="64" y="590" font-size="22" letter-spacing="1" fill="#bac7d8">fanofin.site/artists</text>
    </g>
  </svg>`;
  const layers = [];
  if (artist) {
    layers.push({ input: await nameLayer(artist.name), left: 64, top: 304 });
    if (!portrait) {
      const initial = await sharp({ text: { text: `<span foreground="#9ccaf2">${escape(Array.from(artist.name)[0] ?? 'A')}</span>`, font: 'sans-serif 54', rgba: true } }).png().toBuffer();
      const bounds = await sharp(initial).metadata();
      layers.push({ input: initial, left: Math.max(65, Math.round(118 - bounds.width / 2)), top: Math.round(172 - bounds.height / 2) });
    }
  }
  return sharp(Buffer.from(svg)).composite(layers).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

export async function buildArtistSocialImages({ identities, galleries, outDir, publicDir, assetDir }) {
  const targets = [undefined, ...identities];
  for (const artist of targets) {
    const gallery = galleries.find(entry => entry.id === artist?.id);
    const file = path.join(outDir, artistSocialImagePath(artist, gallery, galleries));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, await renderArtistSocialImage({ artist, gallery, galleries, publicDir, assetDir }));
  }
  console.log(`Artist sharing images: ${targets.length} at 1200×630`);
}
