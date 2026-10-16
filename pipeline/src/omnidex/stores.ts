import { readFile, writeFile } from 'node:fs/promises';
import { buildStoreDirectory, type OmnidexIndexData, type OmnidexVenueGeocodeData, type StoreOverride } from '@gatcg/shared';

/** Build from committed data too, so analysis-only runs keep the directory in sync. */
export async function writeStoreDirectory() {
  const root = new URL('../../../data/', import.meta.url);
  const index = JSON.parse(await readFile(new URL('omnidex/index.json', root), 'utf8')) as OmnidexIndexData;
  const geo = JSON.parse(await readFile(new URL('omnidex/venues.json', root), 'utf8')) as OmnidexVenueGeocodeData;
  const overrides = JSON.parse(await readFile(new URL('curated/store-overrides.json', root), 'utf8')) as Record<string, StoreOverride>;
  await writeFile(new URL('omnidex/stores.json', root), JSON.stringify({ generatedAt: new Date().toISOString(), stores: buildStoreDirectory(index.events, geo.venues, overrides) }));
}
