import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { BroadcastTimelines } from '@gatcg/shared';

const read = (path: string) => JSON.parse(readFileSync(new URL(`../../data/${path}`, import.meta.url), 'utf8'));
const data: BroadcastTimelines = read('broadcast-timelines.json');
const find = (id: string) => {
  const match = data.matches.find(m => m.id.includes(id));
  assert.ok(match, id);
  return match;
};

test('published recaps have valid actors, outcomes, sequences and canonical card mentions', () => {
  const catalog = new Set(read('card-catalog.json').cards.map((c: { name: string }) => c.name));
  assert.equal(data.schemaVersion, 1);
  assert.equal(new Set(data.matches.map(m => m.id)).size, data.matches.length);
  for (const match of data.matches) {
    assert.deepEqual(match.players.map(p => p.id), ['p1', 'p2'], match.id);
    for (const player of match.players) {
      assert.ok(player.name.trim() && player.deck.trim(), match.id);
      assert.ok([undefined, 'unverified-identity', 'unverified-stage'].includes(player.eventDecklist), match.id);
    }
    assert.equal(new Set(match.games.map(g => g.gameNumber)).size, match.games.length, match.id);
    for (const note of match.sideboardNotes ?? []) {
      assert.ok(['p1', 'p2', 'both'].includes(note.actor), match.id);
      assert.ok(Number.isInteger(note.beforeGame) && note.beforeGame > 0, match.id);
    }
    for (const game of match.games) {
      assert.ok(['p1', 'p2', 'draw', 'unknown'].includes(game.winner), match.id);
      assert.ok(Number.isInteger(game.gameNumber) && game.gameNumber > 0, match.id);
      game.beats.forEach((beat, index) => {
        assert.equal(beat.order, index + 1, match.id);
        assert.ok(['p1', 'p2', 'both'].includes(beat.actor), match.id);
        for (const card of beat.cards ?? []) assert.ok(catalog.has(card), `${match.id}: ${card}`);
        for (const tag of beat.tags ?? []) assert.ok(['combo', 'swing', 'sideboard', 'ruling', 'lethal', 'stabilize'].includes(tag), match.id);
      });
    }
  }
  assert.equal(read('manifest.json')['broadcast-timelines'], data.generatedAt);
});

test('unverified identities and Swiss-stage lists cannot auto-attach tournament decks', () => {
  const sea = find('ai-sentus');
  assert.deepEqual(sea.players.map(p => p.name), ['AI', 'Sentus']);
  assert.ok(sea.players.every(p => p.eventDecklist === 'unverified-identity'));
  assert.doesNotMatch(JSON.stringify(sea), /Aidan047|TWLien/);
  const swiss = data.matches.filter(m => m.id.startsWith('worlds-swiss-'));
  assert.ok(swiss.length > 0);
  assert.ok(swiss.every(m => m.players.every(p => p.eventDecklist === 'unverified-stage')));
});

test('disputed game boundaries do not override official match draws', () => {
  for (const id of ['marux-pewpewstan', 'noel-tress']) {
    const match = find(id);
    assert.equal(match.result, 'Draw 1–1');
    assert.ok(match.games.every(g => g.winner === 'unknown'));
  }
});

test('unsupported card identities, ownership and sideboard counts stay out of recaps', () => {
  assert.doesNotMatch(JSON.stringify(find('round10-casual-vain')), /Lu Bu/);
  assert.doesNotMatch(JSON.stringify(find('jett-chemcollapse')), /Jett's Regal|must discard cards/);
  assert.doesNotMatch(JSON.stringify(find('second-asa-liftdraasil')), /Asuna uses the reclaim to level to Lorraine/);
  assert.doesNotMatch(JSON.stringify(find('semifinal-zetdivx-jett')), /Dissuading Aether|Tariff Ring and Tariff Ring|dead from one HP/);
  assert.doesNotMatch(JSON.stringify(find('grand-finals-quarax-jett')), /Dissuading Aether/);
  assert.doesNotMatch(JSON.stringify(find('round10-muck-zero')), /Topsy Decree from ZeRoMagus/);
  assert.doesNotMatch(JSON.stringify(find('sf-fruitcake-bratis')), /Bratus can empower/);
  const finalBeat = find('grandfinals-jet-zero').games.find(g => g.gameNumber === 5)!.beats.at(-1)!;
  assert.doesNotMatch(finalBeat.text, /Gleaming Cuts/);
  assert.ok(!finalBeat.cards?.includes('Gleaming Cut'));
  const note = find('shuteemdown-zetdivx').sideboardNotes!.find(n => n.actor === 'p2')!;
  assert.match(note.text, /number boarded in is unconfirmed/);
  assert.doesNotMatch(note.text, /four/);
});

test('Celednb–Quakems summaries agree with their recorded game sequences', () => {
  const match = find('celednb-quakems');
  assert.doesNotMatch(JSON.stringify(match.games[0]), /get to game three/);
  const decidingGame = match.games.find(g => g.gameNumber === 3)!;
  assert.equal(decidingGame.winner, 'p2');
  assert.match(decidingGame.summary, /survives Celednb/);
  assert.match(decidingGame.beats.at(-1)!.text, /Cosmic Focus for lethal/);
});
