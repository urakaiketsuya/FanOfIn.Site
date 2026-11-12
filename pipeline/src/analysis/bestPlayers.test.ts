import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBestPlayers, withBestPlayerAchievements } from '@gatcg/shared';
import type { DeckCardIndexData, DeckSighting } from '@gatcg/shared';

test('rankings isolate scopes, exclude sideboards, deduplicate, enforce eligibility and retain tenth-place ties', () => {
  const index: DeckCardIndexData = { generatedAt: '2026-01-01', cardNames: ['Main', 'Material', 'Side'], decks: [] };
  const sightings: DeckSighting[] = [];
  for (let player = 1; player <= 12; player++) for (let event = 1; event <= (player === 12 ? 2 : 3); event++) {
    const deckId = `${event}:${player}`;
    index.decks.push({ deckId, main: [[0, 4]], material: [[0, 1], [1, 1]], sideboard: [[2, 4]] });
    sightings.push({ deckId, player, format: 'STANDARD', seasonId: 1, seasonName: 'First', eventDate: '2025-01-01', placement: 1, weightedScore: player >= 10 ? 1 : 12 - player, wins: 3, losses: 1, ties: 0 } as DeckSighting);
  }
  sightings.push(sightings[0]);
  sightings.push({ ...sightings[0], deckId: 'other:1', format: 'TEAM STANDARD' });
  index.decks.push({ ...index.decks[0], deckId: 'other:1' });
  const data = computeBestPlayers(index, sightings, '2026-01-01');
  assert.equal(data.rankings.length, 4);
  const ranking = data.rankings.find(g => g.card === 'Main' && g.seasonId === 1)!;
  assert.equal(ranking.players.length, 11);
  assert.equal(ranking.players[0].events, 3);
  assert.equal(ranking.players[0].score, 33);
  assert.deepEqual(ranking.players.slice(-2).map(r => r.rank), [10, 10]);
  assert.ok(!ranking.players.some(r => r.playerId === 12));
  const achievements = withBestPlayerAchievements({ generatedAt: data.generatedAt, definitions: [], unlocks: [] }, data);
  assert.equal(achievements.unlocks.length, 11);
  assert.deepEqual(withBestPlayerAchievements(achievements, data), achievements);
  assert.equal(withBestPlayerAchievements(achievements, { ...data, rankings: [] }).unlocks.length, 0);
});

test('unknown seasons only contribute all-time and insufficient matches never qualify', () => {
  const index: DeckCardIndexData = { generatedAt: '', cardNames: ['Card'], decks: [1, 2, 3].map(id => ({ deckId: `${id}:1`, main: [[0, 1]], material: [], sideboard: [] })) };
  const sightings = index.decks.map(d => ({ deckId: d.deckId, player: 1, format: 'STANDARD', seasonId: null, seasonName: null, eventDate: '2025-01-01', placement: 1, weightedScore: 1, wins: 1, losses: 0, ties: 0 }));
  assert.equal(computeBestPlayers(index, sightings, '2026-01-01').rankings.length, 0);
  const data = computeBestPlayers(index, sightings.map(s => ({ ...s, wins: 4 })), '2026-01-01');
  assert.equal(data.rankings.length, 1);
  assert.equal(data.rankings[0].seasonId, null);
  assert.equal(computeBestPlayers(index, sightings.map(s => ({ ...s, wins: 4, eventDate: '2027-01-01' })), '2026-01-01').rankings.length, 0);
});

test('formats and seasons cannot pool eligibility; missing placement is excluded', () => {
  const index: DeckCardIndexData = { generatedAt: '', cardNames: ['Card'], decks: Array.from({ length: 9 }, (_, i) => ({ deckId: `${i}:1`, main: [[0, 1]], material: [], sideboard: [] })) };
  const sightings = index.decks.map((d, i) => ({ deckId: d.deckId, player: 1, format: i < 6 ? 'standard' : 'pantheon', seasonId: i < 3 ? 1 : 2, seasonName: i < 3 ? 'First' : 'Second', eventDate: '2025-01-01', placement: i === 8 ? null : 1, weightedScore: 1, wins: 4, losses: 0, ties: 0 }));
  const data = computeBestPlayers(index, sightings, '2026-01-01');
  assert.equal(data.rankings.length, 3);
  assert.ok(data.rankings.every(g => g.format === 'standard'));
  assert.equal(data.rankings.find(g => g.seasonId === null)!.players[0].events, 6);
  assert.equal(data.rankings.find(g => g.seasonId === 1)!.players[0].events, 3);
  assert.equal(data.rankings.find(g => g.seasonId === 2)!.players[0].events, 3);
});
