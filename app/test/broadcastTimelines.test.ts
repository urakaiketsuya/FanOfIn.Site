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

test('verified SEA identities resolve and Swiss attachments use explicit stage lists', () => {
  const sea = find('ai-sentus');
  assert.deepEqual(sea.players.map(p => p.name), ['Awi', 'Centratus']);
  assert.ok(sea.players.every(p => p.eventDecklist === undefined));
  assert.doesNotMatch(JSON.stringify(sea), /Aidan047|TWLien/);
  const swiss = data.matches.filter(m => m.id.startsWith('worlds-swiss-'));
  assert.ok(swiss.length > 0);
  assert.equal(swiss.length, 11);
  const roster = read('omnidex/events/60488.json').players;
  const catalog = new Set(read('card-catalog.json').cards.map((c: { name: string }) => c.name));
  for (const match of swiss) for (const player of match.players) {
    assert.equal(player.eventDecklist, undefined);
    assert.equal(player.stageDecklist?.stage, 'Swiss');
    const source = player.stageDecklist!;
    assert.equal(roster.find((p: { id: number }) => p.id === source.playerId)?.username, player.name);
    assert.match(source.sourceUrl, /^https:\/\/silvie\.gg\/decklist\/\d+$/);
    for (const lines of Object.values(source.decklist)) for (const line of lines) {
      assert.ok(catalog.has(line.card), line.card);
      assert.ok(Number.isInteger(line.quantity) && line.quantity > 0);
    }
    assert.equal(source.decklist.material.reduce((sum, line) => sum + line.quantity, 0), 12);
    assert.ok(source.decklist.main.reduce((sum, line) => sum + line.quantity, 0) >= 60);
  }
  const jett = find('round5-gerthos-jet').players[1].stageDecklist!;
  assert.ok(jett.decklist.material.some(line => line.card === 'Lorraine, Spirit Ruler'));
  assert.ok(!jett.decklist.material.some(line => line.card.startsWith('Zander,')));
  const noel = find('round6-noel-asa').players[0].stageDecklist!;
  assert.ok(noel.decklist.material.some(line => line.card === 'Diao Chan, Enchantress'));
});

test('wider source windows resolve Gyre and Regal ownership', () => {
  const gyre = find('qf4-glennyboy-jet').games[0].beats[1];
  assert.equal(gyre.actor, 'p2');
  assert.match(gyre.text, /Jett plays Stifling Gyre naming Ghosts of Pendragon/);
  assert.ok(gyre.cards!.includes('Stifling Gyre'));
  const regal = find('qf-jett-chemcollapse').games[1].beats[1];
  assert.equal(regal.actor, 'p2');
  assert.match(regal.text, /ChemCollapse plays Regal Inquisition on Jett/);
  assert.match(regal.text, /Jett draws another copy/);
  assert.match(find('semifinal2-zero-livil').games[1].beats[0].text, /leaving the Incapacitates/);
});

test('verified broadcast draws stay separate from conflicting official match scores', () => {
  const match = find('marux-pewpewstan');
  assert.equal(match.result, 'Draw 1–1');
  assert.deepEqual(match.games.map(g => g.winner), ['p2', 'draw']);
  assert.match(match.sourceNote, /does not explain that score/);
  assert.match(match.players[1].deck, /^Fire Luxem Zander/);
});

test('London finishing sequences restore source-verified Liu Bei identities', () => {
  const match = find('casual-vain');
  assert.ok(match.games[0].beats.at(-1)!.cards!.includes('Liu Bei, Oathkeeper'));
  assert.match(match.games[0].summary, /Liu Bei/);
  assert.ok(match.games[1].beats.at(-1)!.cards!.includes('Liu Bei, Oathkeeper'));
  assert.match(match.games[0].beats.at(-1)!.text, /V41N uses Tariff Ring during CasuaL’s recollection/);
  assert.ok(!match.games[1].beats[0].cards!.includes('Yuan Shao, Crown General'));
  assert.doesNotMatch(match.games[1].beats[2].text, /bait/);
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

test('Niagara semifinal includes both captioned games and correct deck ownership', () => {
  const match = find('sf-fruitcake-bratis');
  assert.deepEqual(match.games.map(game => game.winner), ['p2', 'p2']);
  assert.doesNotMatch(match.players[0].deck, /Trained Hawk|Regal Inquisition|Arcane Blast/);
  assert.match(match.players[1].deck, /Trained Hawk/);
  assert.match(match.games[0].beats[1].text, /question whether Polaris was sacrificed/);
  assert.match(match.games[0].beats[2].text, /concedes/);
  assert.ok(match.games[1].beats.at(-1)!.cards!.includes('Arcane Blast'));
  assert.equal(match.sideboardNotes![0].actor, 'p1');
  assert.match(match.sideboardNotes![0].text, /Suspicious Concoction/);
});

test('Diana boarding notes distinguish predictions from observed cards', () => {
  const final = find('grand-finals-quarax-jett');
  assert.match(final.sideboardNotes![0].text, /casters recommend/);
  assert.doesNotMatch(final.sideboardNotes![0].text, /brings in three|Drown in Aether/);
  assert.match(final.sideboardNotes![1].text, /Topsy Decree is later identified in Jett’s game-two hand/);
  assert.doesNotMatch(final.sideboardNotes![1].text, /stay out/);
  const round4 = find('shuteemdown-zetdivx');
  assert.doesNotMatch(round4.sideboardNotes!.find(note => note.actor === 'p1')!.text, /Aetheric Reforging/);
  assert.match(round4.sideboardNotes!.find(note => note.actor === 'p2')!.text, /Aetheric Reforging/);
});

test('SEA identity restoration agrees with official pairing, countries and decks', () => {
  const event = read('omnidex/events/56265.json');
  const sea = find('ai-sentus');
  const expected = [{ id: 16320, name: 'Awi', country: 'BN', champion: 'Zander, Blinding Steel' }, { id: 15277, name: 'Centratus', country: 'SG', champion: "Ciel, Mirage's Grave" }];
  for (const [index, player] of expected.entries()) {
    assert.equal(sea.players[index].name, player.name);
    assert.equal(event.players.find((p: { id: number }) => p.id === player.id).country, player.country);
    const deck = event.decklists.find((d: { player: number }) => d.player === player.id).decklist;
    assert.ok(deck.material.some((card: { card: string }) => card.card === player.champion));
  }
  const round = event.pairingsByRound.find((r: { round: { id: number } }) => r.round.id === 4);
  const pairing = round.pairings.find((p: { pairing: { id: number }[] }) => p.pairing.some(player => player.id === 16320));
  assert.deepEqual(pairing.pairing.map((p: { id: number; score: number }) => [p.id, p.score]), [[15277, 0], [16320, 2]]);
  assert.match(sea.games[0].beats[0].text, /Centratus’s non-imbued Topsy Decree makes Awi banish/);
});

test('SEA finishers preserve Ciel omen ownership and Topsy spellshroud timing', () => {
  const match = find('ai-sentus');
  assert.match(match.games[0].beats.at(-1)!.text, /Centratus plays two Baleful Oblations/);
  assert.match(match.games[0].summary, /recovery survives/);
  const second = match.games[1];
  assert.match(second.beats[1].text, /Once it resolves, Awi uses Topsy Decree’s spellshroud/);
  assert.match(second.beats[2].text, /Centratus reaches six omens/);
  assert.doesNotMatch(JSON.stringify(second), /Awi has six omens|give himself cards|lost to a Foe awakening/);
  assert.ok(second.beats[1].cards!.includes('Feu Awakening'));
  assert.equal(second.winner, 'p1');
});

test('Worlds opening match preserves Alice card ownership and the game-three sequence', () => {
  const match = find('round1-proan-duckhats');
  assert.deepEqual(match.games.map(game => game.winner), ['p2', 'p1', 'p2']);
  assert.doesNotMatch(match.players[1].deck, /Reflected Blight|Ducal Seal/);
  const third = match.games[2];
  assert.ok(third.beats[0].cards!.includes('Purifying Thurible'));
  assert.ok(third.beats[1].cards!.includes('Extricating Touch'));
  assert.equal(third.beats[1].actor, 'both');
  assert.match(third.beats[2].text, /DuckHats uses Cleansing Reunion/);
  assert.ok(third.beats[2].cards!.includes('Reflected Blight'));
  assert.doesNotMatch(JSON.stringify(third), /Dynastic Whirlpool/);
  assert.doesNotMatch(match.sideboardNotes![0].text, /Lustrous Slime/);
  assert.match(match.sideboardNotes![0].text, /boarding suggestions/);
});

test('Worlds round two separates the survived Burst from the later Missile finish', () => {
  const match = find('round2-raylam-caven');
  assert.deepEqual(match.games.map(game => game.winner), ['p1', 'p2', 'p1']);
  const defense = match.games[1].beats.at(-1)!;
  assert.equal(defense.actor, 'both');
  assert.ok(defense.cards!.includes('Feu Awakening'));
  assert.match(defense.text, /Refracting Missile finishes/);
  assert.match(match.games[2].beats[1].text, /discards Raylam’s Incapacitate/);
  assert.match(match.games[2].beats.at(-1)!.text, /third Oblation resolves/);
  assert.doesNotMatch(JSON.stringify(match), /Measure of Arar|Burst of Thunder|Nasome Blast|Incapacitate x1/);
});

test('Worlds round four keeps graveyard hate with Arisanna and boarding evidence with Superior', () => {
  const match = find('round4-superior-raingoddess');
  assert.equal(match.games[0].beats[0].actor, 'p2');
  assert.doesNotMatch(match.players[0].deck, /Censer|Lantern|Verdigris/);
  assert.match(match.games[0].beats[2].text, /TheRainGoddess’s Verdigris Decree destroys Superior’s/);
  assert.ok(match.games[0].beats[2].cards!.includes('Frostbind'));
  assert.equal(match.games[1].beats[0].actor, 'p1');
  assert.ok(match.games[1].beats[1].cards!.includes('Backup Charger'));
  assert.match(match.sideboardNotes![1].text, /Expel is milled, not played/);
  assert.match(match.games[1].beats[2].text, /norm element/);
  assert.deepEqual(match.games[1].beats[2].tags, ['ruling']);
});
