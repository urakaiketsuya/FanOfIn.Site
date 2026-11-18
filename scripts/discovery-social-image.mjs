import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wrap = (value, max, lines) => {
  const words = String(value).split(/\s+/), result = [''];
  for (const word of words) {
    const i = result.length - 1;
    if (result[i] && result[i].length + word.length + 1 > max) result.push(word);
    else result[i] += `${result[i] ? ' ' : ''}${word}`;
  }
  return result.slice(0, lines).map((line, i) => {
    const clipped = line.length > max || (i === lines - 1 && result.length > lines);
    return clipped ? line.slice(0, max - 1).trimEnd() + '…' : line;
  });
};
export async function bundledCardArt(card, artDirs) {
  for (const edition of card?.editions ?? []) {
    const file = /^\/cards\/images\/([\w-]+\.(?:jpg|png|webp|jpeg))$/.exec(edition.image ?? '')?.[1];
    if (!file) continue;
    for (const dir of artDirs) {
      try { return await readFile(path.join(dir, file)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  return undefined;
}
export async function renderDiscoveryImage({ title, label, subtitle, facts = [], cards = [] }, artDirs = []) {
  const layers = [];
  for (const card of cards.slice(0, 2)) {
    const art = await bundledCardArt(card, artDirs);
    if (!art) continue;
    const width = cards.length === 1 ? 300 : 220, height = cards.length === 1 ? 420 : 308;
    const png = await sharp(art).resize(width, height, { fit: 'contain', background: '#181825' }).png().toBuffer();
    const x = cards.length === 1 ? 820 : layers.length ? 938 : 710, y = cards.length === 1 ? 105 : layers.length ? 195 : 125;
    layers.push(`<image href="data:image/png;base64,${png.toString('base64')}" x="${x}" y="${y}" width="${width}" height="${height}"/>`);
  }
  const text = (value, x, y, size, fill = '#cdd6f4') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${escapeHtml(value)}</text>`;
  const titleLines = wrap(title, 26, 3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#1e1e2e"/><rect x="24" y="24" width="1152" height="582" rx="28" fill="#181825" stroke="#45475a"/><rect x="52" y="65" width="6" height="460" rx="3" fill="#89b4fa"/><g font-family="Arial, sans-serif" font-weight="700">${text(label.toUpperCase(), 80, 100, 20, '#89b4fa')}${titleLines.map((line, i) => text(line, 80, 166 + i * 54, 40)).join('')}${wrap(subtitle, 44, 2).map((line, i) => text(line, 80, 350 + i * 29, 23, '#a6adc8')).join('')}${facts.slice(0, 2).map((fact, i) => text(wrap(fact, 43, 1)[0], 80, 448 + i * 36, 24, '#cba6f7')).join('')}${layers.length ? layers.join('') : text('GA', 860, 320, 110, '#45475a')}${text('FAN OF INSIGHT', 80, 565, 20, '#a6adc8')}${text('GRAND ARCHIVE TCG', 900, 565, 16, '#a6adc8')}</g></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
}
