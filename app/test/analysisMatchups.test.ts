import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import AnalysisMatchups from '../src/features/deck-analysis/AnalysisMatchups';
import type { DeckTestResult } from '../src/lib/deckTestResult';

const result = {
 classification: { status: 'matched', similarity: 0.84, cluster: { id: 'test', name: 'Test archetype' } },
 performance: { winRate: 0.54, interval95: { matches: 282 }, deckCount: 12, eventCount: 3, confidence: 'established' },
 matchups: [{ opponentClusterId: 'lorraine', opponentClusterName: 'Lorraine archetype', opponentChampionName: 'Lorraine', games: 86, baselineWinRate: 0.42 }],
 winConditions: [],
} as unknown as DeckTestResult;
const render = (props: Partial<Parameters<typeof AnalysisMatchups>[0]> = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AnalysisMatchups, { result, loading: false, cards: new Map(), ...props })));

test('matchup cards identify historical archetype rates without claiming exact-list predictions', () => {
 const html = render();
 assert.match(html,/42%/);
 assert.match(html,/54%/);
 assert.match(html,/Similar decks’ win rate/);
 assert.match(html,/86 recorded games/);
 assert.match(html,/data-component="CardArtTile"/);
 assert.doesNotMatch(html,/\/cutouts\//);
 assert.doesNotMatch(html,/<details|<summary|<select|Estimated win rate|win-rate change|Nearest similar/);
});
test('loading, failure and unmatched decks remain distinct', () => {
 assert.match(render({result:null,loading:true}),/Loading historical matchups/);
 const error = render({result:null,loading:true,error:'offline',onRetry:()=>{}});
 assert.match(error,/role="alert"/); assert.match(error,/Try again/); assert.doesNotMatch(error,/Loading historical/);
 assert.match(render({result:{...result,classification:{...result.classification,cluster:null}}}),/No matching archetype yet/);
});
test('missing matchups distinguish loading, empty and failure while preserving historical summary', () => {
 const empty = {...result,matchups:[]};
 assert.match(render({result:empty}),/No recorded opponent matchups/);
 assert.match(render({result:empty,matchupsLoading:true}),/Loading opponent matchups/);
 const failed = render({result:empty,matchupsError:'offline',onRetryMatchups:()=>{}});
 assert.match(failed,/Opponent matchups could not be loaded/); assert.match(failed,/54%/);
});
test('missing champion art preserves the name and opponent identity', () => {
 const unknown = {...result,matchups:[{...result.matchups[0],opponentChampionName:'Unknown Champion'}]};
 assert.match(render({result:unknown}),/Unknown Champion/);
 assert.match(render({result:unknown}),/Lorraine archetype/);
});
