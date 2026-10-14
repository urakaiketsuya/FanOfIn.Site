// Manual refresh only. The normal production build reads these local thumbnails offline.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { buildArtistGalleries } from '../shared/src/artists.ts';
import { artistSocialEditions as artistSocialArt } from '../shared/src/artistSeo.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'scripts/assets/artist-social');
await mkdir(directory, { recursive: true });
const catalog = JSON.parse(await readFile(path.join(root, 'data/card-catalog.json'), 'utf8'));
const editions = [...new Map(buildArtistGalleries(catalog.cards).flatMap(artistSocialArt).map(edition => [edition.uuid, edition])).values()];
let index = 0;
const sources = {};
await Promise.all(Array.from({ length: 4 }, async () => {
  while (index < editions.length) {
    const edition = editions[index++];
    const target = path.join(directory, `${edition.uuid}.jpg`);
    const url = `https://api.gatcg.com${edition.image}`;
    sources[edition.uuid] = { url, illustrator: edition.illustrator };
    if (!process.argv.includes('--refresh')) {
      try { await readFile(target); continue; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    let downloaded;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`${response.status}: ${url}`);
        downloaded = await response.arrayBuffer(); break;
      } catch (error) { if (attempt === 2) throw error; }
    }
    await sharp(Buffer.from(downloaded)).rotate().resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(target);
  }
}));
await writeFile(path.join(directory, 'sources.json'), JSON.stringify(Object.fromEntries(Object.entries(sources).sort()), null, 2) + '\n');
console.log(`Prepared ${editions.length} credited printing thumbnails`);
