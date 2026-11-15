import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DetailedDeckSection, VisualDeckSections } from '../src/features/events/DecklistSections';

const lines = [{ card: 'Recorded card', quantity: 2 }, { card: 'Unknown card', quantity: 1 }];
const cardsByName = new Map();
const priceByName = new Map();
const rates = new Map([['Recorded card', 0]]);

for (const layout of ['list', 'rows', 'grid'] as const) {
  function render(winRateByName?: Map<string, number>) {
    return renderToStaticMarkup(layout === 'list'
      ? createElement(DetailedDeckSection, { title: 'Main', lines, cardsByName, priceByName, showThumbnails: false, winRateByName })
      : createElement(VisualDeckSections, {
        sections: [{ title: 'Main', lines }], cardsByName, priceByName,
        cardSize: layout === 'rows' ? 'rows' : 'medium', winRateByName,
        priceTrendByName: new Map(), simulatorEvidenceByName: new Map(), communityInclusionByName: undefined,
        fields: { cost: false, price: false, priceTrend: false, tags: false, simulator: false, community: false },
      }));
  }
  test(`${layout}: card rates preserve zero and distinguish missing evidence`, () => {
    const html = render(rates);
    assert.equal((html.match(/Adj\. win rate:/g) ?? []).length, 2);
    assert.match(html, />0%<\/span>/);
    assert.match(html, />—<\/span>/);
    assert.match(html, /Recorded card/);
    assert.match(html, /Unknown card/);
  });
  test(`${layout}: disabling card rates removes the field`, () => {
    assert.doesNotMatch(render(), /Adj\. win rate:/);
  });
}
