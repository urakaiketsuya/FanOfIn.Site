import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadAnalytics({ production = true, measurementId = 'G-R6Q0DXG947', doNotTrack = '0' } = {}) {
  const scripts: unknown[] = [];
  const window = { location: { href: 'https://fanofin.site/champions' }, dataLayer: [] as Array<ArrayLike<unknown>> };
  const exports: Record<string, (...args: unknown[]) => void> = {};
  const source = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8')
    .replaceAll('import.meta.env.VITE_GA_MEASUREMENT_ID', JSON.stringify(measurementId))
    .replaceAll('import.meta.env.PROD', JSON.stringify(production));
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, {
    exports, window, navigator: { doNotTrack },
    document: { createElement: () => ({}), head: { appendChild: (script: unknown) => scripts.push(script) } },
  });
  return { api: exports, window, scripts };
}

test('queues Google-compatible commands, one loader, and manual pageviews', () => {
  const { api, window, scripts } = loadAnalytics();
  api.initAnalytics();
  api.initAnalytics();
  api.trackPageview('/champions');
  api.trackEvent('test_interaction', { destination: 'champions' });
  assert.equal(scripts.length, 1);
  assert.equal((scripts[0] as { src: string }).src, 'https://www.googletagmanager.com/gtag/js?id=G-R6Q0DXG947');
  assert.equal(window.dataLayer.length, 4);
  for (const command of window.dataLayer) {
    assert.equal(Object.prototype.toString.call(command), '[object Arguments]');
    assert.equal(Array.isArray(command), false);
  }
  assert.equal(window.dataLayer[0][0], 'js');
  assert.equal(window.dataLayer[1][0], 'config');
  assert.equal(window.dataLayer[1][1], 'G-R6Q0DXG947');
  assert.equal((window.dataLayer[1][2] as { send_page_view: boolean }).send_page_view, false);
  assert.equal(window.dataLayer[2][1], 'page_view');
  assert.equal((window.dataLayer[2][2] as { page_path: string }).page_path, '/champions');
  assert.equal(window.dataLayer[3][1], 'test_interaction');
});

for (const settings of [{ production: false }, { measurementId: '' }, { doNotTrack: '1' }]) {
  test(`does not load or send analytics for ${JSON.stringify(settings)}`, () => {
    const { api, window, scripts } = loadAnalytics(settings);
    api.initAnalytics();
    api.trackPageview('/champions');
    api.trackEvent('test_interaction');
    assert.equal(scripts.length, 0);
    assert.equal(window.dataLayer.length, 0);
  });
}
