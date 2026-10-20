import test from 'node:test';
import assert from 'node:assert/strict';
import { compareDrawAccess, drawAccessReport } from '@gatcg/shared';

const deck = (n: number, size = 60) => [{ name: 'Veiling Breeze', quantity: n }, { name: 'Other', quantity: size - n }];
test('known-answer single-copy access uses the actual Main library', () => {
  const report = drawAccessReport(deck(1));
  assert.equal(report.size, 60);
  const row = report.rows.find(row => row.name === 'Veiling Breeze')!;
  for (const point of row.points) assert.ok(Math.abs(point.probability - point.seen / 60) < 1e-12);
  assert.equal(drawAccessReport([{ name: 'Breeze', quantity: 1 }]).rows[0].points[0].probability, 1);
  assert.deepEqual(drawAccessReport([]), { size: 0, rows: [] });
});
test('fourth copy improves access at every checkpoint; unchanged lists have no differences', () => {
  const rows = compareDrawAccess(deck(3), deck(4));
  const breeze = rows.find(row => row.name === 'Veiling Breeze')!;
  assert.equal(breeze.beforeCopies, 3);
  assert.equal(breeze.afterCopies, 4);
  for (const point of breeze.points) assert.ok(point.after > point.before);
  assert.deepEqual(compareDrawAccess(deck(4), deck(4)), []);
});
test('library size changes access even with unchanged source copies; removed cards reach zero', () => {
  const row = compareDrawAccess(deck(4), deck(4, 70)).find(row => row.name === 'Veiling Breeze')!;
  assert.ok(row.points.every(point => point.after < point.before));
  assert.ok(compareDrawAccess(deck(4), deck(0)).find(row => row.name === 'Veiling Breeze')!.points.every(point => point.after === 0));
});
test('duplicate lines are aggregated without depending on catalog coverage', () => {
  const report = drawAccessReport([{ name: 'Unknown', quantity: 2 }, { name: 'Unknown', quantity: 2 }, { name: 'Other', quantity: 56 }]);
  assert.equal(report.rows.find(row => row.name === 'Unknown')!.quantity, 4);
  assert.equal(report.size, 60);
});

test('package checkpoints display joint access, including zero when support is missing', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { MemoryRouter } = await import('react-router-dom');
  const { default: CardScenarios } = await import('../src/features/analytics/CardScenarios');
  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CardScenarios, {
    deck: { main: [{ name: 'Burst Asunder', quantity: 4 }, { name: 'Other', quantity: 56 }], material: [] }, cardsByName: new Map(),
  })));
  const packageSection = html.slice(html.indexOf('Chance to draw source and support'));
  assert.ok(packageSection.length > 0);
  assert.ok((packageSection.match(/0\.0%/g) ?? []).length >= 4);
  assert.doesNotMatch(html, /<input|<select|Adjust scenario/);
});
