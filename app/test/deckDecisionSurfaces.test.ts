import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { fixedTargetCoverage, type Card } from '@gatcg/shared';
import { ComparableBuildReport, MatchupCoverageReport } from '../src/features/deck-analysis/ReportEvidence';
import PackageDecisionReport from '../src/features/deck-analysis/PackageDecisionReport';
import type { DeckWorkspace } from '../src/features/deckbuilder/persistence/deckWorkspace';
const deck = { main: [], material: [], sideboard: [], format: 'STANDARD' } as unknown as DeckWorkspace;
const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(MemoryRouter, null, element));
test('evidence failures offer recovery instead of an indefinite loader or empty claim', () => {
  const props = { deck, cards: new Map(), loading: true, error: 'offline', onRetry() {} };
  for (const element of [createElement(ComparableBuildReport, { ...props, references: [] }), createElement(MatchupCoverageReport, { ...props, matchups: [] })]) {
    const html = render(element);
    assert.match(html, /role="alert"/); assert.match(html, /Retry/); assert.doesNotMatch(html, /Loading/);
  }
});
test('empty packages and completed empty evidence have distinct states', () => {
  assert.match(render(createElement(PackageDecisionReport, { deck, cards: new Map(), onExplore() {} })), /No reviewed packages/);
  assert.match(render(createElement(ComparableBuildReport, { deck, cards: new Map(), loading: false, references: [], onRetry() {} })), /No comparable lists/);
  assert.match(render(createElement(MatchupCoverageReport, { deck, cards: new Map(), loading: true, matchups: [], onRetry() {} })), /Loading matchup/);
});
test('fixed target coverage preserves non-attack, ally and printed-life restrictions', () => {
  const target = (types: string[], life?: number) => ({ types, life } as Card);
  assert.equal(fixedTargetCoverage('Engulf', target(['ATTACK'])), null);
  assert.ok(fixedTargetCoverage('Engulf', target(['ACTION'])));
  assert.equal(fixedTargetCoverage('Frozen Dismissal', target(['ACTION'])), null);
  assert.ok(fixedTargetCoverage('Frozen Dismissal', target(['ALLY'])));
  assert.ok(fixedTargetCoverage('Thunderclap', target(['ALLY'], 4)));
  assert.equal(fixedTargetCoverage('Thunderclap', target(['ALLY'], 5)), null);
  assert.equal(fixedTargetCoverage('Thunderclap', target(['ALLY'])), null);
  assert.equal(fixedTargetCoverage('Tidal Lock', undefined), null);
});
