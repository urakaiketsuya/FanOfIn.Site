import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DeckStatsTabs from '../src/features/account/DeckStatsTabs';

test('closed specialist sections do not run their calculators during initial rendering', () => {
  function Calculator() { throw new Error('An unopened calculator should not run'); }
  const html = renderToStaticMarkup(createElement(DeckStatsTabs, {
    tabs: [{ key: 'probability', label: 'Probability & damage', content: createElement(Calculator) }],
  }));
  assert.match(html, /Probability &amp; damage/);
  assert.match(html, /<summary/);
  assert.doesNotMatch(html, /<details[^>]*\sopen/);
});
