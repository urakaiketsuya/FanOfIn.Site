import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ChampionTrendsData } from "@gatcg/shared";
import { championRaceFrames } from "../src/features/champions/championRace";

const data: ChampionTrendsData = JSON.parse(readFileSync(new URL("../../data/analysis/champion-trends.json", import.meta.url), "utf8"));

test("race preserves published chronology and weighted share without renormalizing the top six", () => {
  const frames = championRaceFrames(data, "shareOfSeason");
  assert.deepEqual(frames.map((frame) => frame.name), data.seasonOrder);
  for (const frame of frames) {
    assert.ok(frame.rows.every((row, index) => index === 0 || frame.rows[index - 1].value >= row.value));
    for (const row of frame.rows) {
      const source = data.champions.find((champion) => champion.championName === row.name)!.seasons.find((season) => season.seasonName === frame.name)!;
      assert.equal(row.value, source.shareOfSeason);
      assert.equal(row.deckCount, source.deckCount);
    }
  }
});

test("top cuts retain zero-cut participants and assign equal ranks to ties", () => {
  for (const frame of championRaceFrames(data, "topCutCount")) {
    for (const row of frame.rows) {
      assert.equal(row.value, row.topCutCount);
      assert.equal(row.rank, 1 + frame.rows.filter((other) => other.value > row.value).length);
      assert.ok(row.deckCount > 0);
    }
  }
});

test("empty and missing seasons are safe, and IDs do not determine order", () => {
  assert.deepEqual(championRaceFrames({ ...data, champions: [], seasonOrder: [] }, "shareOfSeason"), []);
  const reversed = { ...data, seasonOrder: [...data.seasonOrder].reverse().concat("Unpublished") };
  const frames = championRaceFrames(reversed, "shareOfSeason");
  assert.equal(frames[0].name, data.seasonOrder.at(-1));
  assert.deepEqual(frames.at(-1)?.rows, []);
});
