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
  const match = find('marux-pewpewstan');
  assert.equal(match.result, 'Draw 1–1');
  assert.deepEqual(match.games.map(g => g.winner), ['p2', 'unknown']);
});

test('London game one restores the source-verified Liu Bei identity', () => {
  const match = find('casual-vain');
  assert.ok(match.games[0].beats.at(-1)!.cards!.includes('Liu Bei, Oathkeeper'));
  assert.match(match.games[0].summary, /Liu Bei/);
  assert.ok(!match.games[1].beats.at(-1)!.cards!.includes('Liu Bei, Oathkeeper'));
});

test('verified NA Round 3 game outcomes produce the recorded match draw', () => {
  const match = find('noel-tress');
  assert.equal(match.result, 'Draw 1–1');
  assert.deepEqual(match.games.map(g => g.winner), ['p2', 'p1']);
});

test('recap prose uses canonical champion names without rewriting source aliases', () => {
  for (const match of data.matches) {
    const { sourceNote: _sourceNote, ...recap } = match;
    assert.doesNotMatch(JSON.stringify(recap), /\b(?:Ry|Xander|Diaochan)\b/, match.id);
  }
  assert.match(find('round5-mario-wind-rye').sourceNote!, /"Ry"/);
});

test('unsupported card identities, ownership and sideboard counts stay out of recaps', () => {
  assert.doesNotMatch(JSON.stringify(find('round10-casual-vain')), /Lu Bu/);
  assert.doesNotMatch(JSON.stringify(find('jett-chemcollapse')), /Jett's Regal|must discard cards/);
  assert.doesNotMatch(JSON.stringify(find('second-asa-liftdraasil')), /Asuna uses the reclaim to level to Lorraine/);
  assert.doesNotMatch(JSON.stringify(find('semifinal-zetdivx-jett')), /Dissuading Aether|Tariff Ring and Tariff Ring|dead from one HP/);
  assert.ok(find('semifinal-zetdivx-jett').games[2].beats[1].cards!.includes('Drown in Aether'));
  assert.doesNotMatch(JSON.stringify(find('grand-finals-quarax-jett')), /Dissuading Aether/);
  assert.doesNotMatch(JSON.stringify(find('round10-muck-zero')), /Topsy Decree from ZeRoMagus/);
  assert.doesNotMatch(JSON.stringify(find('sf-fruitcake-bratis')), /Bratus can empower/);
  const finalBeat = find('grandfinals-jet-zero').games.find(g => g.gameNumber === 5)!.beats.at(-1)!;
  assert.equal(finalBeat.actor, 'p1');
  assert.match(finalBeat.text, /Jett responds with Lightweaver's Assault, revealing two Gleaming Cuts/);
  assert.match(finalBeat.text, /Zero0000000000 rebuilds influence with Ghosts of Pendragon/);
  assert.ok(finalBeat.cards?.includes('Gleaming Cut'));
  assert.ok(finalBeat.cards?.includes('Aesan Protector'));
  assert.doesNotMatch(find('grandfinals-jet-zero').games[4].summary, /Poisoned Dagger/);
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

test('Manila source distinguishes boarding and interrupted plays from predictions', () => {
  const match = find('round10-muck-zero');
  const note = match.sideboardNotes!.find(n => n.text.includes('Harmonious Mantra'))!;
  assert.equal(note.actor, 'p2');
  const beat = match.games[1].beats[1];
  assert.equal(beat.actor, 'both');
  assert.ok(beat.cards!.includes('Topsy Decree'));
  assert.match(beat.text, /Muck1234’s Topsy Decree interrupts/);
  assert.doesNotMatch(beat.text, /brings out all four|forgets/);
  assert.ok(!beat.tags!.includes('ruling'));
});

test('Worlds Swiss captions keep Lorraine and Dream Fairy plays with Lifdrasyl', () => {
  const match = find('second-asa-liftdraasil');
  const closingBeat = match.games[1].beats.at(-1)!;
  assert.ok(closingBeat.cards!.includes('Annul Spell'));
  assert.doesNotMatch(closingBeat.text, /Enfeebling Orb/);
  const opening = match.games[2].beats[0];
  assert.equal(opening.actor, 'p2');
  assert.match(opening.text, /Lifdrasyl then levels to Lorraine/);
  assert.ok(opening.cards!.includes('Sword of Seeking'));
  const response = match.games[2].beats[1];
  assert.equal(response.actor, 'both');
  assert.match(response.text, /Lifdrasyl plays Dream Fairy/);
  assert.match(response.text, /Asuna responds with Escape the Wreckage to save his Magistrate/);
  assert.match(response.text, /does not replay it/);
});
