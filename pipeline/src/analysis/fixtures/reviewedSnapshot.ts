import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

/** Immutable review inputs; independent of daily published-data refreshes. */
export function readReviewedSnapshot(name: 'deck-index' | 'taxonomy' | 'card-catalog'): string {
  return gunzipSync(readFileSync(new URL(`./reviewed-${name}.json.gz`, import.meta.url))).toString('utf8');
}
