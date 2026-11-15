import test from "node:test";
import assert from "node:assert/strict";
import { championMatchups } from "../src/features/champions/matchupResults";

test("orients both sides, preserves draws, excludes mirrors and absent samples", () => {
  const rows = [
    { a: "A", b: "B", aWins: 4, bWins: 2, ties: 4, games: 10 },
    { a: "A", b: "A", aWins: 8, bWins: 2, ties: 0, games: 10 },
    { a: "A", b: "C", aWins: 0, bWins: 0, ties: 0, games: 0 },
  ];
  assert.deepEqual(championMatchups("A", rows), [{ opponent: "B", wins: 4, losses: 2, ties: 4, games: 10, winRate: 0.4, outlook: "Favorable" }]);
  assert.equal(championMatchups("B", rows)[0].outlook, "Unfavorable");
  assert.equal(championMatchups("B", rows)[0].winRate, 0.2);
  assert.deepEqual(championMatchups("Unknown", rows), []);
});
test("equal wins and losses are even and larger samples sort first", () => {
  const result = championMatchups("A", [
    { a: "A", b: "B", aWins: 1, bWins: 1, ties: 3, games: 5 },
    { a: "C", b: "A", aWins: 6, bWins: 2, ties: 2, games: 10 },
  ]);
  assert.deepEqual(result.map(row => [row.opponent, row.outlook]), [["C", "Unfavorable"], ["B", "Even"]]);
});
