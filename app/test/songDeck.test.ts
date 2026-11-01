import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@gatcg/shared";
import { automaticDeckSection, editDeck, editorSections, songDeckAvailable, type EditableDeck } from "../src/lib/deckEditing.ts";
import { deckDestinationEligibility } from "../src/lib/deckSectionEligibility.ts";
import { isSongCard } from "../src/lib/songDeck.ts";
import { buildChosenDeck } from "../src/features/deckbuilder/engine/buildChosenDeck.ts";
import { decodeCardSelections, encodeCardSelections } from "../src/features/deckbuilder/persistence/builderPersistence.ts";

const card = (name: string, types: string[], subtypes: string[] = []) => ({ name, types, subtypes }) as Card;
const songs = ["Skyward Requiem", "Chromatic", "Aiss Yustera", "Extra Song", "Fifth Song"];
const catalog = new Map<string, Card>([
  ["Casella, Volant Songstress", card("Casella, Volant Songstress", ["CHAMPION"])],
  ["Other Champion", card("Other Champion", ["CHAMPION"])],
  ["Ally", card("Ally", ["ALLY"])],
  ...songs.map((name): [string, Card] => [name, card(name, ["ACTION", "UNLOCKABLE"], ["SKILL", "SONG"])]),
]);
const deck = (material: string[] = ["Casella, Volant Songstress"]): EditableDeck => ({
  main: [], material: material.map(card => ({ card, quantity: 1 })), song: [], sideboard: [], maybeboard: [],
});
const add = (current: EditableDeck, name: string) => editDeck(current, { type: "quantity", section: "song", name, quantity: 1 }, catalog);

test("Song cards are recognised by Unlockable type or Song subtype", () => {
  assert.equal(isSongCard(catalog.get("Chromatic")), true);
  assert.equal(isSongCard(card("Odd", ["ACTION"], ["SONG"])), true);
  assert.equal(isSongCard(card("Plain", ["ACTION"], ["SPELL"])), false);
  assert.equal(isSongCard(undefined), false);
});

test("Song cards route only to the Song deck or Maybeboard", () => {
  const song = catalog.get("Chromatic");
  assert.equal(deckDestinationEligibility(song, "song").allowed, true);
  assert.equal(deckDestinationEligibility(song, "maybeboard").allowed, true);
  for (const section of ["main", "material", "sideboard"] as const) assert.equal(deckDestinationEligibility(song, section).allowed, false);
  assert.match(deckDestinationEligibility(song, "main").reason ?? "", /Song Deck/);
  assert.equal(deckDestinationEligibility(catalog.get("Ally"), "song").allowed, false);
  assert.equal(automaticDeckSection(song), "song");
  assert.equal(automaticDeckSection(catalog.get("Ally")), "main");
});

test("the Song deck needs a Casella Champion and rejects non-Song cards", () => {
  assert.equal(songDeckAvailable(deck(), catalog), true);
  assert.equal(songDeckAvailable(deck(["Other Champion"]), catalog), false);
  assert.equal(songDeckAvailable({ main: [], material: [], sideboard: [], maybeboard: [] }, catalog), false);
  const without = deck(["Other Champion"]);
  assert.equal(add(without, "Chromatic"), without);
  const withCasella = deck();
  assert.equal(add(withCasella, "Ally"), withCasella);
  assert.deepEqual(add(withCasella, "Chromatic").song, [{ card: "Chromatic", quantity: 1 }]);
});

test("the Song deck holds at most four different cards, and add-many is all-or-nothing", () => {
  let current = deck();
  for (const name of songs.slice(0, 4)) current = add(current, name);
  assert.equal(current.song?.length, 4);
  assert.equal(add(current, "Fifth Song"), current);
  assert.equal(add(current, "Chromatic").song?.length, 4);
  const start = deck();
  const additions = songs.map(name => ({ name, section: "song" as const, quantity: 1 }));
  assert.equal(editDeck(start, { type: "add-many", additions }, catalog), start);
});

test("existing Song cards stay editable after Casella leaves Material", () => {
  const withSong = add(deck(), "Chromatic");
  const lost = { ...withSong, material: [] };
  const removed = editDeck(lost, { type: "remove", section: "song", name: "Chromatic" }, catalog);
  assert.deepEqual(removed.song, []);
});

test("a deck without a Song section lists no Song section", () => {
  assert.equal(editorSections({ main: [], material: [], sideboard: [], maybeboard: [] }).some(section => section.key === "song"), false);
  assert.equal(editorSections(deck()).some(section => section.key === "song"), true);
});

test("Song cards survive share-link encoding and stay out of the built Main deck", () => {
  const selections = [{ name: "Chromatic", quantity: 1, section: "song" as const }, { name: "Ally", quantity: 4, section: "main" as const }];
  assert.deepEqual(decodeCardSelections(encodeCardSelections(selections)), selections);
  const build = buildChosenDeck(new Map([["Chromatic", 1], ["Ally", 4]]), new Map([["Chromatic", "song" as const], ["Ally", "main" as const]]), null, catalog);
  assert.deepEqual(build.main.map(line => line.cardName), ["Ally"]);
  assert.equal([...build.material, ...build.sideboard].length, 0);
});
