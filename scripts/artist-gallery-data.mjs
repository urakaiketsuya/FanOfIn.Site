import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildArtistGalleries } from '../shared/src/artists.ts';

/** Use the same published tournament usage for HTML, sharing art and browser manifest. */
export function readArtistGalleries(dataDir = fileURLToPath(new URL('../data', import.meta.url))) {
  const catalog = JSON.parse(readFileSync(path.join(dataDir, 'card-catalog.json'), 'utf8'));
  let popularity;
  try { popularity = JSON.parse(readFileSync(path.join(dataDir, 'analysis/cards.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return buildArtistGalleries(catalog.cards, popularity?.cards);
}
