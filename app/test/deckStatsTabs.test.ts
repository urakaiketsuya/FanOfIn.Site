import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DeckStatsTabs from '../src/features/account/DeckStatsTabs';

test('results render immediately while unopened specialist calculators stay lazy', () => {
  let resultsRendered = 0;
  function Results() {
    resultsRendered++;
    return createElement('p', null, 'Visible deck results');
  }
  function Calculator() { throw new Error('An unopened calculator should not run'); }
  const html = renderToStaticMarkup(createElement(DeckStatsTabs, {
    tabs: [
      { key: 'results', label: 'Results', content: createElement(Results) },
      { key: 'probability', label: 'Consistency', content: createElement(Calculator) },
    ],
  }));
  assert.equal(resultsRendered, 1);
  assert.match(html, /Visible deck results/);
  assert.match(html, /role="tab"[^>]*aria-selected="true"[^>]*>Results/);
  assert.match(html, /role="tab"[^>]*aria-selected="false"[^>]*>Consistency/);
  assert.match(html, /role="tabpanel"[^>]*hidden/);
  assert.doesNotMatch(html, /<summary|<details/);
});
