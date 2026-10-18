import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitEventBrowserData, joinEventBrowserData } from '../../shared/src/eventBrowserData';
import { filterAndSortEvents } from '../src/features/tournaments/eventBrowser';

test('split discovery data round trips the published index and preserves search ordering', () => {
  const original = JSON.parse(readFileSync(new URL('../../data/omnidex/index.json', import.meta.url), 'utf8'));
  const { summaries, search } = splitEventBrowserData(original);
  assert.ok(summaries.events.every(event => !('participantNames' in event) && !('championNames' in event)));
  const joined = joinEventBrowserData(summaries, search)!;
  assert.deepEqual(joined, original);
  for (const query of ['', 'a', 'lorraine', 'morgan', 'osaka', 'no-such-event']) {
    for (const sort of ['date', 'size', 'type', 'relevance'] as const) {
      const options = { search: query, sort, minPlayers: 0, category: null, setting: null, seasonId: null, country: null, dateFrom: '', dateTo: '', decklists: 'any' as const, coverage: 'any' as const };
      assert.deepEqual(filterAndSortEvents(joined.events, options, () => 0), filterAndSortEvents(original.events, options, () => 0));
    }
  }
  assert.equal(joinEventBrowserData(summaries, { ...search, generatedAt: 'other-generation' }), undefined);
});
